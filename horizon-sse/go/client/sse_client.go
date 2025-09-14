package client

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/sirupsen/logrus"
)

type SSEClient struct {
	baseURL          string
	logger           *logrus.Logger
	activeClients    int64
	successfulClients int64
	failedClients    int64
	totalMessages    int64
}

type ClientResult struct {
	ClientID     string
	Success      bool
	Duration     time.Duration
	MessageCount int
	Error        error
}

func NewSSEClient(baseURL string) *SSEClient {
	logger := logrus.New()
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	return &SSEClient{
		baseURL: baseURL,
		logger:  logger,
	}
}

func (c *SSEClient) connectToSSE(ctx context.Context, clientID string) ClientResult {
	start := time.Now()
	result := ClientResult{
		ClientID: clientID,
		Success:  false,
	}

	atomic.AddInt64(&c.activeClients, 1)
	defer atomic.AddInt64(&c.activeClients, -1)

	url := fmt.Sprintf("%s/sse?client_id=%s", c.baseURL, clientID)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		result.Error = err
		atomic.AddInt64(&c.failedClients, 1)
		return result
	}

	// Timeout for 10 second streams with buffer for high load
	client := &http.Client{
		Timeout: 20 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		result.Error = err
		atomic.AddInt64(&c.failedClients, 1)
		return result
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		result.Error = fmt.Errorf("unexpected status code: %d", resp.StatusCode)
		atomic.AddInt64(&c.failedClients, 1)
		return result
	}

	scanner := bufio.NewScanner(resp.Body)
	messageCount := 0

	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "data:") {
			messageCount++
			atomic.AddInt64(&c.totalMessages, 1)
			
			// Check for completion in either format
			if strings.Contains(line, "[DONE]") || strings.Contains(line, "Stream completed") {
				result.Success = true
				result.Duration = time.Since(start)
				result.MessageCount = messageCount
				atomic.AddInt64(&c.successfulClients, 1)
				
				c.logger.WithFields(logrus.Fields{
					"client_id":     clientID,
					"duration":      result.Duration,
					"message_count": messageCount,
				}).Info("Client completed successfully")
				return result
			}
		}
	}

	if err := scanner.Err(); err != nil {
		result.Error = err
		atomic.AddInt64(&c.failedClients, 1)
	} else if messageCount > 0 {
		// Stream ended without explicit [DONE] but we received messages
		// This happens when the server closes the connection after streaming
		c.logger.WithFields(logrus.Fields{
			"client_id":     clientID,
			"message_count": messageCount,
			"duration":      time.Since(start),
		}).Warn("Stream ended without [DONE] marker, treating as incomplete")
		atomic.AddInt64(&c.failedClients, 1)
		result.Error = fmt.Errorf("stream ended without completion marker")
	}

	result.Duration = time.Since(start)
	result.MessageCount = messageCount
	return result
}

func (c *SSEClient) RunLoadTest(numClients int, rampUpTime time.Duration) {
	c.logger.WithFields(logrus.Fields{
		"num_clients":  numClients,
		"ramp_up_time": rampUpTime,
	}).Info("Starting load test")

	var wg sync.WaitGroup
	results := make(chan ClientResult, numClients)
	
	// Calculate timeout based on number of clients and ramp-up time
	// Need enough time for: ramp-up + 10s stream + buffer
	// Add extra buffer for high-concurrency scenarios
	streamTime := 10 * time.Second
	bufferTime := 10 * time.Second
	totalTimeout := rampUpTime + streamTime + bufferTime
	
	// For very large tests, ensure minimum timeout
	minTimeout := 60 * time.Second
	if totalTimeout < minTimeout {
		totalTimeout = minTimeout
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), totalTimeout)
	defer cancel()

	delayBetweenClients := time.Duration(0)
	if numClients > 1 {
		delayBetweenClients = rampUpTime / time.Duration(numClients-1)
	}

	startTime := time.Now()

	for i := 0; i < numClients; i++ {
		wg.Add(1)
		clientID := fmt.Sprintf("client-%d", i+1)
		
		go func(id string) {
			defer wg.Done()
			result := c.connectToSSE(ctx, id)
			results <- result
		}(clientID)

		if i < numClients-1 {
			time.Sleep(delayBetweenClients)
		}

		if (i+1)%100 == 0 {
			c.logger.WithFields(logrus.Fields{
				"spawned":    i + 1,
				"active":     atomic.LoadInt64(&c.activeClients),
				"successful": atomic.LoadInt64(&c.successfulClients),
				"failed":     atomic.LoadInt64(&c.failedClients),
			}).Info("Progress update")
		}
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	var allResults []ClientResult
	for result := range results {
		allResults = append(allResults, result)
	}

	totalDuration := time.Since(startTime)
	c.printResults(allResults, totalDuration)
}

func (c *SSEClient) printResults(results []ClientResult, totalDuration time.Duration) {
	successful := 0
	failed := 0
	var totalResponseTime time.Duration
	totalMessages := 0
	var errors []map[string]interface{}

	for _, r := range results {
		if r.Success {
			successful++
			totalResponseTime += r.Duration
			totalMessages += r.MessageCount
		} else {
			failed++
			if r.Error != nil {
				errors = append(errors, map[string]interface{}{
					"client_id": r.ClientID,
					"error":     r.Error.Error(),
				})
				c.logger.WithFields(logrus.Fields{
					"client_id": r.ClientID,
					"error":     r.Error,
				}).Error("Client failed")
			}
		}
	}

	avgResponseTime := time.Duration(0)
	if successful > 0 {
		avgResponseTime = totalResponseTime / time.Duration(successful)
	}

	successRate := float64(successful) / float64(len(results)) * 100
	
	c.logger.WithFields(logrus.Fields{
		"total_duration":        totalDuration,
		"total_clients":         len(results),
		"successful_clients":    successful,
		"failed_clients":        failed,
		"success_rate":          fmt.Sprintf("%.2f%%", successRate),
		"avg_response_time":     avgResponseTime,
		"total_messages":        totalMessages,
		"messages_per_second":   float64(totalMessages) / totalDuration.Seconds(),
		"requests_per_second":   float64(len(results)) / totalDuration.Seconds(),
	}).Info("Load test completed")

	// Save results to JSON file
	c.saveResultsToFile(results, totalDuration, successful, failed, totalMessages, avgResponseTime, successRate, errors)
}

func (c *SSEClient) saveResultsToFile(results []ClientResult, totalDuration time.Duration, 
	successful, failed, totalMessages int, avgResponseTime time.Duration, successRate float64, errors []map[string]interface{}) {
	
	// Get final metrics from servers
	proxyMetrics := make(map[string]interface{})
	deepMetrics := make(map[string]interface{})
	
	if resp, err := http.Get(fmt.Sprintf("%s/metrics", c.baseURL)); err == nil {
		defer resp.Body.Close()
		json.NewDecoder(resp.Body).Decode(&proxyMetrics)
	}
	
	// Assuming deep server is on port 10081
	deepURL := strings.Replace(c.baseURL, "10080", "10081", 1)
	if resp, err := http.Get(fmt.Sprintf("%s/metrics", deepURL)); err == nil {
		defer resp.Body.Close()
		json.NewDecoder(resp.Body).Decode(&deepMetrics)
	}

	resultData := map[string]interface{}{
		"timestamp":     time.Now().Format(time.RFC3339),
		"test_duration": totalDuration.String(),
		"summary": map[string]interface{}{
			"total_clients":        len(results),
			"successful_clients":   successful,
			"failed_clients":       failed,
			"success_rate":         fmt.Sprintf("%.2f%%", successRate),
			"avg_response_time":    avgResponseTime.String(),
			"total_messages":       totalMessages,
			"messages_per_second":  float64(totalMessages) / totalDuration.Seconds(),
			"requests_per_second":  float64(len(results)) / totalDuration.Seconds(),
		},
		"proxy_metrics": proxyMetrics,
		"deep_metrics":  deepMetrics,
		"errors":        errors,
		"test_config": map[string]interface{}{
			"num_clients": len(results),
			"server_url":  c.baseURL,
		},
	}

	// Save to file
	jsonData, err := json.MarshalIndent(resultData, "", "  ")
	if err != nil {
		c.logger.WithError(err).Error("Failed to marshal results to JSON")
		return
	}

	// Write to current working directory (which will be /work in Docker)
	filename := "test-results.json"
	if err := os.WriteFile(filename, jsonData, 0644); err != nil {
		c.logger.WithError(err).Error("Failed to write results to file")
		return
	}

	c.logger.WithField("file", filename).Info("Test results saved to file")
}

func (c *SSEClient) MonitorMetrics(interval time.Duration, duration time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	timeout := time.After(duration)

	for {
		select {
		case <-ticker.C:
			resp, err := http.Get(fmt.Sprintf("%s/metrics", c.baseURL))
			if err != nil {
				c.logger.WithError(err).Error("Failed to fetch metrics")
				continue
			}
			
			body := make([]byte, 1024)
			n, _ := resp.Body.Read(body)
			resp.Body.Close()
			
			c.logger.WithField("metrics", string(body[:n])).Info("Server metrics")

		case <-timeout:
			return
		}
	}
}