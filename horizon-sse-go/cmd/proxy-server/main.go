package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

type ProxyServer struct {
	router            *mux.Router
	logger            *logrus.Logger
	deepServerURL     string
	activeConnections int64
	totalConnections  int64
	proxiedMessages   int64
	failedConnections int64
	bufferPool        sync.Pool
}

func NewProxyServer(deepServerURL string) *ProxyServer {
	logger := logrus.New()
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	s := &ProxyServer{
		router:        mux.NewRouter(),
		logger:        logger,
		deepServerURL: deepServerURL,
		bufferPool: sync.Pool{
			New: func() interface{} {
				return new(bytes.Buffer)
			},
		},
	}

	s.setupRoutes()
	return s
}

func (s *ProxyServer) setupRoutes() {
	s.router.HandleFunc("/sse", s.handleSSEProxy).Methods("GET")
	s.router.HandleFunc("/metrics", s.handleMetrics).Methods("GET")
	s.router.HandleFunc("/health", s.handleHealth).Methods("GET")
}

func (s *ProxyServer) handleSSEProxy(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		atomic.AddInt64(&s.failedConnections, 1)
		return
	}

	clientID := r.URL.Query().Get("client_id")
	if clientID == "" {
		clientID = fmt.Sprintf("proxy-client-%d", time.Now().UnixNano())
	}

	atomic.AddInt64(&s.activeConnections, 1)
	atomic.AddInt64(&s.totalConnections, 1)
	defer atomic.AddInt64(&s.activeConnections, -1)

	s.logger.WithFields(logrus.Fields{
		"client_id":          clientID,
		"active_connections": atomic.LoadInt64(&s.activeConnections),
	}).Info("Client connected to proxy")

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Accel-Buffering", "no")

	// Create request to deep server
	reqBody := map[string]interface{}{
		"model": "gpt-4-turbo",
		"messages": []map[string]string{
			{"role": "user", "content": "Generate test response"},
		},
		"stream": true,
	}

	jsonBody, _ := json.Marshal(reqBody)
	deepReq, err := http.NewRequestWithContext(r.Context(), "POST", 
		fmt.Sprintf("%s/v1/chat/completions", s.deepServerURL), 
		bytes.NewReader(jsonBody))
	
	if err != nil {
		s.logger.WithError(err).Error("Failed to create deep server request")
		http.Error(w, "Failed to connect to deep server", http.StatusInternalServerError)
		atomic.AddInt64(&s.failedConnections, 1)
		return
	}

	deepReq.Header.Set("Content-Type", "application/json")

	// Make request to deep server with timeout for 10 second streams
	client := &http.Client{
		Timeout: 20 * time.Second,
	}

	resp, err := client.Do(deepReq)
	if err != nil {
		s.logger.WithError(err).Error("Failed to connect to deep server")
		http.Error(w, "Failed to connect to deep server", http.StatusBadGateway)
		atomic.AddInt64(&s.failedConnections, 1)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		s.logger.WithField("status", resp.StatusCode).Error("Deep server returned error")
		http.Error(w, "Deep server error", http.StatusBadGateway)
		atomic.AddInt64(&s.failedConnections, 1)
		return
	}

	// Buffer and forward the stream
	scanner := bufio.NewScanner(resp.Body)
	buffer := s.bufferPool.Get().(*bytes.Buffer)
	defer func() {
		buffer.Reset()
		s.bufferPool.Put(buffer)
	}()

	messageCount := 0
	lastFlush := time.Now()
	flushInterval := 50 * time.Millisecond // Batch messages for efficiency

	for scanner.Scan() {
		line := scanner.Text()
		
		// Write to buffer
		buffer.WriteString(line)
		buffer.WriteString("\n")

		// Check for complete SSE message
		if line == "" || time.Since(lastFlush) > flushInterval {
			// Flush buffered data to client
			if buffer.Len() > 0 {
				_, err := w.Write(buffer.Bytes())
				if err != nil {
					s.logger.WithFields(logrus.Fields{
						"client_id": clientID,
						"error":     err,
					}).Error("Failed to write to client")
					atomic.AddInt64(&s.failedConnections, 1)
					return
				}
				flusher.Flush()
				
				if line != "" && line != "data: [DONE]" {
					messageCount++
					atomic.AddInt64(&s.proxiedMessages, 1)
				}
				
				buffer.Reset()
				lastFlush = time.Now()
			}
		}

		// Check if stream is complete
		if line == "data: [DONE]" {
			// Write the [DONE] message to buffer first
			buffer.WriteString(line)
			buffer.WriteString("\n")
			break
		}
	}

	// Final flush
	if buffer.Len() > 0 {
		w.Write(buffer.Bytes())
		flusher.Flush()
	}

	if err := scanner.Err(); err != nil {
		s.logger.WithError(err).Error("Error reading from deep server")
		atomic.AddInt64(&s.failedConnections, 1)
		return
	}

	s.logger.WithFields(logrus.Fields{
		"client_id":      clientID,
		"message_count":  messageCount,
	}).Info("Proxy stream completed")
}

func (s *ProxyServer) handleMetrics(w http.ResponseWriter, r *http.Request) {
	// Get deep server metrics
	deepMetrics := make(map[string]interface{})
	resp, err := http.Get(fmt.Sprintf("%s/metrics", s.deepServerURL))
	if err == nil {
		defer resp.Body.Close()
		json.NewDecoder(resp.Body).Decode(&deepMetrics)
	}

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{
		"proxy": {
			"active_connections": %d,
			"total_connections": %d,
			"proxied_messages": %d,
			"failed_connections": %d
		},
		"deep_server": %s,
		"timestamp": "%s"
	}`,
		atomic.LoadInt64(&s.activeConnections),
		atomic.LoadInt64(&s.totalConnections),
		atomic.LoadInt64(&s.proxiedMessages),
		atomic.LoadInt64(&s.failedConnections),
		func() string {
			if len(deepMetrics) > 0 {
				data, _ := json.Marshal(deepMetrics)
				return string(data)
			}
			return "{}"
		}(),
		time.Now().Format(time.RFC3339),
	)
}

func (s *ProxyServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	// Check deep server health
	deepHealthy := false
	resp, err := http.Get(fmt.Sprintf("%s/health", s.deepServerURL))
	if err == nil {
		defer resp.Body.Close()
		deepHealthy = resp.StatusCode == http.StatusOK
	}

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status": "healthy", "service": "proxy-server", "deep_server_healthy": %v}`, deepHealthy)
}

func main() {
	defaultPort := 10080
	if envPort := os.Getenv("PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			defaultPort = p
		}
	}
	
	defaultDeepURL := "http://localhost:10081"
	if envURL := os.Getenv("DEEP_SERVER"); envURL != "" {
		defaultDeepURL = envURL
	}
	
	port := flag.Int("port", defaultPort, "Proxy server port")
	deepServerURL := flag.String("deep-server", defaultDeepURL, "Deep server URL")
	flag.Parse()

	server := NewProxyServer(*deepServerURL)
	
	server.logger.WithFields(logrus.Fields{
		"port":           *port,
		"deep_server":    *deepServerURL,
		"service":        "proxy-server",
	}).Info("Starting SSE Proxy Server")

	// Create optimized HTTP server
	addr := fmt.Sprintf(":%d", *port)
	httpServer := &http.Server{
		Addr:           addr,
		Handler:        server.router,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   30 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}
	
	server.logger.Fatal(httpServer.ListenAndServe())
}