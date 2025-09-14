package main

import (
	"crypto/sha256"
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

// Pre-allocated response pool to reduce GC pressure
var responsePool = sync.Pool{
	New: func() interface{} {
		return &StreamResponse{}
	},
}

type DeepServer struct {
	router           *mux.Router
	logger           *logrus.Logger
	activeStreams    int64
	totalStreams     int64
	completedStreams int64
	tokens           []string
	tokenResponses   [][]byte // Pre-serialized responses
}

type StreamResponse struct {
	ID       string   `json:"id"`
	Object   string   `json:"object"`
	Created  int64    `json:"created"`
	Model    string   `json:"model"`
	Choices  []Choice `json:"choices"`
	Checksum string   `json:"checksum,omitempty"` // Add checksum for CPU work
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

// CPU-intensive function to calculate prime numbers
func calculatePrimes(limit int) []int {
	if limit < 2 {
		return []int{}
	}
	
	sieve := make([]bool, limit+1)
	for i := 2; i <= limit; i++ {
		sieve[i] = true
	}
	
	for i := 2; i*i <= limit; i++ {
		if sieve[i] {
			for j := i * i; j <= limit; j += i {
				sieve[j] = false
			}
		}
	}
	
	primes := []int{}
	for i := 2; i <= limit; i++ {
		if sieve[i] {
			primes = append(primes, i)
		}
	}
	return primes
}

// CPU-intensive work: calculate checksum and do prime calculation
func performCPUWork(data string) string {
	// Calculate SHA256 hash multiple times for CPU load
	hash := sha256.Sum256([]byte(data))
	for i := 0; i < 100; i++ {
		hash = sha256.Sum256(hash[:])
	}
	
	// Calculate some primes to add CPU load
	_ = calculatePrimes(1000)
	
	// Do some floating point math
	result := 0.0
	for i := 1; i <= 100; i++ {
		result += math.Sqrt(float64(i)) * math.Sin(float64(i))
	}
	
	return fmt.Sprintf("%x", hash)
}

func NewDeepServer() *DeepServer {
	logger := logrus.New()
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	// Use exactly 109 tokens to match Node.js
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
		" at", " regular", " intervals", " over", " a", " 10", "-second", " period",
		".", " The", " proxy", " server", " will", " buffer", " and", " forward",
		" these", " tokens", " to", " connected", " clients", ".",
		" Additional", " tokens", " to", " extend", " streaming", " duration", ".",
		" Testing", " complete", ".",
	}

	s := &DeepServer{
		router: mux.NewRouter(),
		logger: logger,
		tokens: tokens,
	}

	// Pre-serialize token responses to avoid repeated JSON marshaling
	s.tokenResponses = make([][]byte, len(tokens))
	for i, token := range tokens {
		// Perform CPU work for each token
		checksum := performCPUWork(token + strconv.Itoa(i))
		
		response := StreamResponse{
			ID:       "chatcmpl-static",
			Object:   "chat.completion.chunk",
			Created:  time.Now().Unix(),
			Model:    "gpt-4-turbo",
			Checksum: checksum,
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
		s.tokenResponses[i] = data
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

	// Set optimized SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Accel-Buffering", "no")
	w.Header().Set("Transfer-Encoding", "chunked")

	streamID := fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano())
	atomic.AddInt64(&s.activeStreams, 1)
	atomic.AddInt64(&s.totalStreams, 1)
	defer func() {
		atomic.AddInt64(&s.activeStreams, -1)
		atomic.AddInt64(&s.completedStreams, 1)
	}()

	// Stream over 10 seconds for fair comparison
	streamDuration := 10 * time.Second
	tokenDelay := streamDuration / time.Duration(len(s.tokens))
	
	// Use a ticker for more consistent timing
	ticker := time.NewTicker(tokenDelay)
	defer ticker.Stop()
	
	tokenIndex := 0
	for tokenIndex < len(s.tokens) {
		select {
		case <-r.Context().Done():
			s.logger.WithField("stream_id", streamID).Info("Client disconnected")
			return
		case <-ticker.C:
			// Perform CPU-intensive work for each token
			token := s.tokens[tokenIndex]
			checksum := performCPUWork(streamID + token + strconv.Itoa(tokenIndex))
			
			// Create response with checksum
			response := StreamResponse{
				ID:       streamID,
				Object:   "chat.completion.chunk",
				Created:  time.Now().Unix(),
				Model:    "gpt-4-turbo",
				Checksum: checksum,
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
			
			if tokenIndex == 0 {
				response.Choices[0].Delta.Role = "assistant"
			}
			
			// Marshal and send
			data, _ := json.Marshal(response)
			
			// Write the data line
			if _, err := w.Write([]byte("data: ")); err != nil {
				return
			}
			if _, err := w.Write(data); err != nil {
				return
			}
			if _, err := w.Write([]byte("\n\n")); err != nil {
				return
			}
			
			flusher.Flush()
			tokenIndex++
		}
	}

	// Send finish message with final CPU work
	finalChecksum := performCPUWork(streamID + "DONE")
	finishReason := "stop"
	finalResponse := StreamResponse{
		ID:       streamID,
		Object:   "chat.completion.chunk",
		Created:  time.Now().Unix(),
		Model:    "gpt-4-turbo",
		Checksum: finalChecksum,
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
	// Use all available CPUs
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
		"cpus":    runtime.NumCPU(),
	}).Info("Starting Deep Server (CPU-Intensive)")

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