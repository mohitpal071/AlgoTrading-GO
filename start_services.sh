#!/bin/bash

# Function to handle cleanup on exit
cleanup() {
    echo "Stopping services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

echo "Starting REST Service on port 8080..."
cd REST-Service
go run main.go &
REST_PID=$!
cd ..

echo "Starting Ticker Service..."
cd Ticker-Service
go run main.go &
TICKER_PID=$!
cd ..

echo "Services started. Press Ctrl+C to stop."
wait $REST_PID $TICKER_PID
