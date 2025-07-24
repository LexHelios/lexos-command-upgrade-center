#!/bin/bash

echo "🔒 Starting Lexos with HTTPS on external IP..."

# Kill any existing processes on ports
echo "Cleaning up ports..."
lsof -ti:8080 | xargs -r kill -9 2>/dev/null
lsof -ti:3000 | xargs -r kill -9 2>/dev/null

# Generate certificates if needed
if [ ! -f "certs/server.pem" ]; then
    echo "📜 Generating certificates..."
    ./scripts/generate-ip-certs.sh
fi

# Export HTTPS environment variables
export HTTPS=true
export SSL_CRT_FILE=./certs/server.pem
export SSL_KEY_FILE=./certs/server-key.pem
export HOST=0.0.0.0

echo "🚀 Starting backend..."
cd server && npm run dev &
BACKEND_PID=$!

echo "🚀 Starting frontend with HTTPS..."
cd ..

# Start Vite with explicit HTTPS config
npx vite --host 0.0.0.0 --port 8080 --https --config vite.config.ts &
FRONTEND_PID=$!

echo ""
echo "✅ Services starting..."
echo ""
echo "🌐 Access at:"
echo "   External: https://159.26.94.14:8080"
echo "   Local: https://localhost:8080"
echo ""
echo "⚠️  Accept the certificate warning in your browser"
echo ""
echo "Press Ctrl+C to stop"

# Handle Ctrl+C
trap "kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; exit" INT

# Wait for processes
wait