package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

// Connection pool for deep server connections
var httpClient = &http.Client{
	Timeout: 30 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 100,
		MaxConnsPerHost:     100,
		IdleConnTimeout:     90 * time.Second,
		DisableCompression:  true, // SSE doesn't benefit from compression
	},
}

// Buffer pool to reduce allocations
var bufferPool = sync.Pool{
	New: func() interface{} {
		return new(bytes.Buffer)
	},
}

type ProxyServer struct {
	router            *mux.Router
	logger            *logrus.Logger
	deepServerURL     string
	activeConnections int64
	totalConnections  int64
	proxiedMessages   int64
	failedConnections int64
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
	}

	s.setupRoutes()
	return s
}

func (s *ProxyServer) setupRoutes() {
	s.router.HandleFunc("/v1/chat/completions", s.handleProxy).Methods("POST")
	s.router.HandleFunc("/metrics", s.handleMetrics).Methods("GET")
	s.router.HandleFunc("/health", s.handleHealth).Methods("GET")
}

func (s *ProxyServer) handleProxy(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	// Set SSE headers with optimizations
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Accel-Buffering", "no")
	w.Header().Set("Transfer-Encoding", "chunked")

	atomic.AddInt64(&s.activeConnections, 1)
	atomic.AddInt64(&s.totalConnections, 1)
	defer atomic.AddInt64(&s.activeConnections, -1)

	// Create request to deep server
	deepReq, err := http.NewRequestWithContext(r.Context(), "POST", s.deepServerURL+"/v1/chat/completions", r.Body)
	if err != nil {
		s.logger.WithError(err).Error("Failed to create deep server request")
		atomic.AddInt64(&s.failedConnections, 1)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Copy headers
	deepReq.Header = r.Header.Clone()

	// Make request to deep server using pooled client
	resp, err := httpClient.Do(deepReq)
	if err != nil {
		s.logger.WithError(err).Error("Failed to connect to deep server")
		atomic.AddInt64(&s.failedConnections, 1)
		http.Error(w, "Failed to connect to deep server", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Stream response with optimized buffering
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 4096), 1024*1024) // Pre-allocate buffer
	
	for scanner.Scan() {
		line := scanner.Text()
		
		// Write line directly without extra allocations
		if _, err := fmt.Fprintf(w, "%s\n", line); err != nil {
			s.logger.WithError(err).Error("Failed to write to client")
			return
		}
		
		// Count messages
		if len(line) > 6 && line[:6] == "data: " {
			atomic.AddInt64(&s.proxiedMessages, 1)
		}
		
		// Flush after each data line for real-time streaming
		if line == "" || (len(line) > 6 && line[:6] == "data: ") {
			flusher.Flush()
		}
		
		// Check for end of stream
		if line == "data: [DONE]" {
			fmt.Fprint(w, "\n")
			flusher.Flush()
			break
		}
	}

	if err := scanner.Err(); err != nil {
		s.logger.WithError(err).Error("Error reading from deep server")
	}
}

func (s *ProxyServer) handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	// Get deep server metrics with timeout
	deepMetrics := make(map[string]interface{})
	ctx, cancel := r.Context(), func() {}
	if r.Context().Err() == nil {
		ctx, cancel = r.Context(), func() {}
	}
	defer cancel()
	
	req, _ := http.NewRequestWithContext(ctx, "GET", s.deepServerURL+"/metrics", nil)
	if resp, err := httpClient.Do(req); err == nil {
		defer resp.Body.Close()
		json.NewDecoder(resp.Body).Decode(&deepMetrics)
	}

	// Use json.Marshal for proper formatting
	metrics := map[string]interface{}{
		"proxy": map[string]interface{}{
			"active_connections":  atomic.LoadInt64(&s.activeConnections),
			"total_connections":   atomic.LoadInt64(&s.totalConnections),
			"proxied_messages":    atomic.LoadInt64(&s.proxiedMessages),
			"failed_connections":  atomic.LoadInt64(&s.failedConnections),
		},
		"deep_server": deepMetrics,
		"timestamp":   time.Now().Format(time.RFC3339),
	}
	
	json.NewEncoder(w).Encode(metrics)
}

func (s *ProxyServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status": "healthy", "service": "proxy-server"}`)
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
		"port":        *port,
		"deep_server": *deepServerURL,
		"service":     "proxy-server",
	}).Info("Starting SSE Proxy Server (Optimized)")

	// Create optimized HTTP server
	addr := fmt.Sprintf(":%d", *port)
	httpServer := &http.Server{
		Addr:           addr,
		Handler:        server.router,
		ReadTimeout:    5 * time.Second,
		WriteTimeout:   30 * time.Second,
		IdleTimeout:    120 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}
	
	server.logger.Fatal(httpServer.ListenAndServe())
}