package main

import (
	"flag"
	"fmt"
	"horizon-sse-go/client"
	"time"

	"github.com/sirupsen/logrus"
)

func main() {
	serverURL := flag.String("url", "http://localhost:10080", "Server URL")
	numClients := flag.Int("clients", 1000, "Number of concurrent clients")
	rampUp := flag.Duration("rampup", 10*time.Second, "Ramp-up time for spawning clients")
	monitorInterval := flag.Duration("monitor", 2*time.Second, "Metrics monitoring interval")
	flag.Parse()

	logger := logrus.New()
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	logger.WithFields(logrus.Fields{
		"server_url":       *serverURL,
		"num_clients":      *numClients,
		"ramp_up_time":     *rampUp,
		"monitor_interval": *monitorInterval,
	}).Info("Starting load test")

	sseClient := client.NewSSEClient(*serverURL)

	go sseClient.MonitorMetrics(*monitorInterval, 20*time.Second+*rampUp)

	fmt.Println("\n" + strings.Repeat("=", 80))
	fmt.Printf("LOAD TEST: %d concurrent SSE clients over %v\n", *numClients, *rampUp)
	fmt.Printf("Server: %s\n", *serverURL)
	fmt.Printf("Each client will receive ~100 messages over 10 seconds\n")
	fmt.Println(strings.Repeat("=", 80) + "\n")

	sseClient.RunLoadTest(*numClients, *rampUp)
}

var strings = struct {
	Repeat func(string, int) string
}{
	Repeat: func(s string, count int) string {
		result := ""
		for i := 0; i < count; i++ {
			result += s
		}
		return result
	},
}