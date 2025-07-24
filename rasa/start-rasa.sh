#!/bin/bash

# Start Rasa services

echo "Starting Rasa services..."

# Change to rasa directory
cd "$(dirname "$0")"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Train the model if it doesn't exist
if [ ! -d "models" ] || [ -z "$(ls -A models 2>/dev/null)" ]; then
    echo "No trained model found. Training Rasa model..."
    docker run --rm -v "$(pwd):/app" rasa/rasa:3.6.0-full train
fi

# Start services with docker-compose
echo "Starting Rasa core and action server..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check if services are running
echo "Checking service health..."
curl -s http://localhost:5005 > /dev/null && echo "✓ Rasa Core is running on port 5005" || echo "✗ Rasa Core failed to start"
curl -s http://localhost:5055/health > /dev/null && echo "✓ Rasa Actions is running on port 5055" || echo "✗ Rasa Actions failed to start"
curl -s http://localhost:8000 > /dev/null && echo "✓ Duckling is running on port 8000" || echo "✗ Duckling failed to start"

echo ""
echo "Rasa services started. To view logs, run: docker-compose logs -f"
echo "To stop services, run: docker-compose down"