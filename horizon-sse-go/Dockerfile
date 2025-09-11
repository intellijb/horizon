# Multi-stage build for all services
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o deep-server cmd/deep-server/main_clean.go
RUN go build -o proxy-server cmd/proxy-server/main.go
RUN go build -o loadtest cmd/loadtest/main.go

# Deep server image
FROM alpine:latest AS deep-server
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/deep-server .
EXPOSE 8081
CMD ["./deep-server"]

# Proxy server image
FROM alpine:latest AS proxy-server
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/proxy-server .
EXPOSE 8080
CMD ["./proxy-server"]

# Load test client image
FROM alpine:latest AS loadtest
RUN apk --no-cache add ca-certificates curl
WORKDIR /root/
COPY --from=builder /app/loadtest .
CMD ["./loadtest"]