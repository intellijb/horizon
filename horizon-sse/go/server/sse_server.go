package server

import (
	"fmt"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

type SSEServer struct {
	router            *mux.Router
	logger            *logrus.Logger
	activeConnections int64
	totalConnections  int64
	completedStreams  int64
	failedStreams     int64
}

func NewSSEServer() *SSEServer {
	logger := logrus.New()
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	s := &SSEServer{
		router: mux.NewRouter(),
		logger: logger,
	}

	s.setupRoutes()
	return s
}

func (s *SSEServer) setupRoutes() {
	s.router.HandleFunc("/sse", s.handleSSE).Methods("GET")
	s.router.HandleFunc("/metrics", s.handleMetrics).Methods("GET")
	s.router.HandleFunc("/health", s.handleHealth).Methods("GET")
}

func (s *SSEServer) handleSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		atomic.AddInt64(&s.failedStreams, 1)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	clientID := r.URL.Query().Get("client_id")
	if clientID == "" {
		clientID = fmt.Sprintf("client-%d", time.Now().UnixNano())
	}

	atomic.AddInt64(&s.activeConnections, 1)
	atomic.AddInt64(&s.totalConnections, 1)
	defer atomic.AddInt64(&s.activeConnections, -1)

	s.logger.WithFields(logrus.Fields{
		"client_id":          clientID,
		"active_connections": atomic.LoadInt64(&s.activeConnections),
	}).Info("Client connected")

	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	timeout := time.After(10 * time.Second)
	messageCount := 0

	for {
		select {
		case <-r.Context().Done():
			s.logger.WithField("client_id", clientID).Info("Client disconnected")
			atomic.AddInt64(&s.failedStreams, 1)
			return

		case <-ticker.C:
			messageCount++
			data := fmt.Sprintf("id: %d\ndata: {\"client_id\": \"%s\", \"message\": \"Stream message %d\", \"timestamp\": \"%s\", \"active_connections\": %d}\n\n",
				messageCount,
				clientID,
				messageCount,
				time.Now().Format(time.RFC3339),
				atomic.LoadInt64(&s.activeConnections),
			)

			_, err := fmt.Fprint(w, data)
			if err != nil {
				s.logger.WithFields(logrus.Fields{
					"client_id": clientID,
					"error":     err,
				}).Error("Failed to write to client")
				atomic.AddInt64(&s.failedStreams, 1)
				return
			}
			flusher.Flush()

		case <-timeout:
			finalMessage := fmt.Sprintf("id: final\ndata: {\"client_id\": \"%s\", \"message\": \"Stream completed\", \"total_messages\": %d}\n\n",
				clientID,
				messageCount,
			)
			fmt.Fprint(w, finalMessage)
			flusher.Flush()

			s.logger.WithFields(logrus.Fields{
				"client_id":      clientID,
				"total_messages": messageCount,
			}).Info("Stream completed successfully")
			atomic.AddInt64(&s.completedStreams, 1)
			return
		}
	}
}

func (s *SSEServer) handleMetrics(w http.ResponseWriter, r *http.Request) {
	metrics := map[string]int64{
		"active_connections": atomic.LoadInt64(&s.activeConnections),
		"total_connections":  atomic.LoadInt64(&s.totalConnections),
		"completed_streams":  atomic.LoadInt64(&s.completedStreams),
		"failed_streams":     atomic.LoadInt64(&s.failedStreams),
	}

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{
		"active_connections": %d,
		"total_connections": %d,
		"completed_streams": %d,
		"failed_streams": %d,
		"timestamp": "%s"
	}`,
		metrics["active_connections"],
		metrics["total_connections"],
		metrics["completed_streams"],
		metrics["failed_streams"],
		time.Now().Format(time.RFC3339),
	)
}

func (s *SSEServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status": "healthy", "timestamp": "%s"}`, time.Now().Format(time.RFC3339))
}

func (s *SSEServer) Start(addr string) error {
	s.logger.WithField("address", addr).Info("Starting SSE server")
	return http.ListenAndServe(addr, s.router)
}