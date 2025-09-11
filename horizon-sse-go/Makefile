.PHONY: build run-server run-loadtest clean deps test-100 test-500 test-1000

build:
	go build -o bin/server cmd/server/main.go
	go build -o bin/loadtest cmd/loadtest/main.go

deps:
	go mod download
	go mod tidy

run-server:
	go run cmd/server/main.go

run-loadtest:
	go run cmd/loadtest/main.go

test-100:
	@echo "Testing with 100 concurrent clients..."
	go run cmd/loadtest/main.go -clients 100 -rampup 5s

test-500:
	@echo "Testing with 500 concurrent clients..."
	go run cmd/loadtest/main.go -clients 500 -rampup 10s

test-1000:
	@echo "Testing with 1000 concurrent clients..."
	go run cmd/loadtest/main.go -clients 1000 -rampup 15s

clean:
	rm -rf bin/

monitor:
	curl -s http://localhost:10080/metrics | jq .