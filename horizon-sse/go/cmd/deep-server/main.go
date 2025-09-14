package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"math/rand"
	"net/http"
	"os"
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
}

type StreamResponse struct {
	ID        string    `json:"id"`
	Object    string    `json:"object"`
	Created   int64     `json:"created"`
	Model     string    `json:"model"`
	Choices   []Choice  `json:"choices"`
}

type Choice struct {
	Index int    `json:"index"`
	Delta Delta  `json:"delta"`
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

	s := &DeepServer{
		router: mux.NewRouter(),
		logger: logger,
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
	defer atomic.AddInt64(&s.activeStreams, -1)

	s.logger.WithFields(logrus.Fields{
		"stream_id":     streamID,
		"active_streams": atomic.LoadInt64(&s.activeStreams),
	}).Info("Stream started")

	// Simulate token generation over 15 seconds with variable delays
	tokens := []string{
		"Hello", " there", "!", " I'm", " a", " simulated", " AI", " response", 
		" that", " streams", " tokens", " slowly", " over", " time", ".",
		" This", " mimics", " the", " behavior", " of", " real", " AI", " APIs",
		" like", " OpenAI", "'s", " GPT", " models", ".", " Each", " token",
		" represents", " a", " small", " piece", " of", " the", " complete", " response",
		".", " The", " streaming", " allows", " for", " a", " more", " interactive",
		" experience", " as", " users", " can", " see", " the", " response", " being",
		" generated", " in", " real", "-time", " rather", " than", " waiting", " for",
		" the", " entire", " response", " to", " complete", ".", " This", " test",
		" server", " simulates", " this", " behavior", " by", " sending", " tokens",
		" at", " regular", " intervals", " over", " a", " 15", "-second", " period",
		".", " The", " proxy", " server", " will", " buffer", " and", " forward",
		" these", " tokens", " to", " connected", " clients", ".",
		" Additional", " tokens", " are", " added", " to", " extend", " the", " streaming",
		" duration", " to", " properly", " test", " the", " system", " under", " longer",
		" streaming", " conditions", ".", " This", " helps", " verify", " that", " the",
		" proxy", " server", " can", " handle", " extended", " SSE", " connections",
		" and", " properly", " buffer", " responses", " over", " a", " longer", " period",
		".", " The", " total", " stream", " time", " is", " now", " approximately",
		" 15", " seconds", " to", " better", " simulate", " real-world", " AI", " response",
		" times", " for", " complex", " queries", " or", " longer", " generated", " content",
	}

	// Stream over 15 seconds for hardcore testing
	// This tests the system under extended streaming conditions
	streamDuration := 15 * time.Second
	baseDelay := streamDuration / time.Duration(len(tokens))
	tokenDelay := baseDelay
	
	for i, token := range tokens {
		response := StreamResponse{
			ID:      streamID,
			Object:  "chat.completion.chunk",
			Created: time.Now().Unix(),
			Model:   "gpt-4-turbo",
			Choices: []Choice{
				{
					Index: 0,
					Delta: Delta{
						Content: token,
					},
					FinishReason: nil,
				},
			},
		}

		if i == 0 {
			response.Choices[0].Delta.Role = "assistant"
		}

		data, _ := json.Marshal(response)
		fmt.Fprintf(w, "data: %s\n\n", string(data))
		flusher.Flush()

		select {
		case <-r.Context().Done():
			s.logger.WithField("stream_id", streamID).Info("Client disconnected")
			return
		case <-time.After(tokenDelay):
			// Continue to next token
		}
	}

	// Send finish message
	finishReason := "stop"
	finalResponse := StreamResponse{
		ID:      streamID,
		Object:  "chat.completion.chunk",
		Created: time.Now().Unix(),
		Model:   "gpt-4-turbo",
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

	atomic.AddInt64(&s.completedStreams, 1)
	s.logger.WithField("stream_id", streamID).Info("Stream completed")
}

func (s *DeepServer) handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{
		"active_streams": %d,
		"total_streams": %d,
		"completed_streams": %d,
		"timestamp": "%s"
	}`,
		atomic.LoadInt64(&s.activeStreams),
		atomic.LoadInt64(&s.totalStreams),
		atomic.LoadInt64(&s.completedStreams),
		time.Now().Format(time.RFC3339),
	)
}

func (s *DeepServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status": "healthy", "service": "deep-server"}`)
}

func main() {
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
		"port": *port,
		"service": "deep-server",
	}).Info("Starting Deep Server (OpenAI simulator)")

	// Add random delays to simulate real API behavior
	rand.Seed(time.Now().UnixNano())

	// Create optimized HTTP server for high concurrent load
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