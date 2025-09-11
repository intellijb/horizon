package main

import (
	"flag"
	"fmt"
	"horizon-sse-go/server"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/sirupsen/logrus"
)

func main() {
	port := flag.Int("port", 10080, "Server port")
	flag.Parse()

	logger := logrus.New()
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	logger.WithFields(logrus.Fields{
		"port":       *port,
		"goroutines": runtime.NumGoroutine(),
		"cpu_cores":  runtime.NumCPU(),
		"go_version": runtime.Version(),
	}).Info("Starting SSE server")

	runtime.GOMAXPROCS(runtime.NumCPU())

	sseServer := server.NewSSEServer()

	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		
		for range ticker.C {
			var m runtime.MemStats
			runtime.ReadMemStats(&m)
			
			logger.WithFields(logrus.Fields{
				"goroutines":    runtime.NumGoroutine(),
				"heap_mb":       m.Alloc / 1024 / 1024,
				"sys_mb":        m.Sys / 1024 / 1024,
				"gc_runs":       m.NumGC,
			}).Info("Runtime stats")
		}
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		logger.Info("Shutting down server...")
		os.Exit(0)
	}()

	addr := fmt.Sprintf(":%d", *port)
	logger.Fatal(sseServer.Start(addr))
}