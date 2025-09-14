package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

type DeepServer struct {
	router           *mux.Router
	logger           *logrus.Logger
	activeStreams    int64
	totalStreams     int64
	completedStreams int64
	tokens           []string
}

type StreamResponse struct {
	ID      string   `json:"id"`
	Object  string   `json:"object"`
	Created int64    `json:"created"`
	Model   string   `json:"model"`
	Choices []Choice `json:"choices"`
}

type Choice struct {
	Index        int     `json:"index"`
	Delta        Delta   `json:"delta"`
	FinishReason *string `json:"finish_reason"`
}

type Delta struct {
	Content string `json:"content,omitempty"`
	Role    string `json:"role,omitempty"`
}

func NewDeepServer() *DeepServer {
	logger := logrus.New()
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	// EXACTLY 109 tokens to match Node.js
	tokens := make([]string, 109)
	for i := 0; i < 109; i++ {
		tokens[i] = fmt.Sprintf("Token_%d ", i)
	}

	s := &DeepServer{
		router: mux.NewRouter(),
		logger: logger,
		tokens: tokens,
	}

	s.setupRoutes()
	return s
}

func (s *DeepServer) setupRoutes() {
	s.router.HandleFunc("/v1/chat/completions", s.handleStream).Methods("POST")
	s.router.HandleFunc("/metrics", s.handleMetrics).Methods("GET")
	s.router.HandleFunc("/health", s.handleHealth).Methods("GET")
}

func (s *DeepServer) handleStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Accel-Buffering", "no")

	streamID := fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano())
	atomic.AddInt64(&s.activeStreams, 1)
	atomic.AddInt64(&s.totalStreams, 1)
	defer func() {
		atomic.AddInt64(&s.activeStreams, -1)
		atomic.AddInt64(&s.completedStreams, 1)
	}()

	// Stream over 10 seconds with exactly 109 tokens
	streamDuration := 10 * time.Second
	tokenDelay := streamDuration / time.Duration(len(s.tokens))
	
	ticker := time.NewTicker(tokenDelay)
	defer ticker.Stop()
	
	tokenIndex := 0
	for tokenIndex < len(s.tokens) {
		select {
		case <-r.Context().Done():
			s.logger.WithField("stream_id", streamID).Info("Client disconnected")
			return
		case <-ticker.C:
			response := StreamResponse{
				ID:      streamID,
				Object:  "chat.completion.chunk",
				Created: time.Now().Unix(),
				Model:   "gpt-4",
				Choices: []Choice{
					{
						Index: 0,
						Delta: Delta{
							Content: s.tokens[tokenIndex],
						},
						FinishReason: nil,
					},
				},
			}
			
			if tokenIndex == 0 {
				response.Choices[0].Delta.Role = "assistant"
			}
			
			data, _ := json.Marshal(response)
			fmt.Fprintf(w, "data: %s\n\n", string(data))
			flusher.Flush()
			
			tokenIndex++
		}
	}

	// Send finish message
	finishReason := "stop"
	finalResponse := StreamResponse{
		ID:      streamID,
		Object:  "chat.completion.chunk",
		Created: time.Now().Unix(),
		Model:   "gpt-4",
		Choices: []Choice{
			{
				Index:        0,
				Delta:        Delta{},
				FinishReason: &finishReason,
			},
		},
	}

	data, _ := json.Marshal(finalResponse)
	fmt.Fprintf(w, "data: %s\n\n", string(data))
	fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()

	s.logger.WithField("stream_id", streamID).Info("Stream completed")
}

func (s *DeepServer) handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	metrics := map[string]interface{}{
		"active_streams":    atomic.LoadInt64(&s.activeStreams),
		"total_streams":     atomic.LoadInt64(&s.totalStreams),
		"completed_streams": atomic.LoadInt64(&s.completedStreams),
		"timestamp":         time.Now().Format(time.RFC3339),
	}
	json.NewEncoder(w).Encode(metrics)
}

func (s *DeepServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status": "healthy", "service": "deep-server"}`)
}

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	
	defaultPort := 10081
	if envPort := os.Getenv("PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			defaultPort = p
		}
	}
	port := flag.Int("port", defaultPort, "Server port")
	flag.Parse()

	server := NewDeepServer()
	
	server.logger.WithFields(logrus.Fields{
		"port":    *port,
		"service": "deep-server",
		"tokens":  len(server.tokens),
	}).Info("Starting Deep Server (Clean - 109 tokens)")

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