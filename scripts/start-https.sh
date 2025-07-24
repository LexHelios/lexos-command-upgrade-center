#!/bin/bash

echo "🔒 Starting Lexos with HTTPS support..."

# Check if certificates exist
if [ ! -f "certs/localhost.pem" ] || [ ! -f "certs/localhost-key.pem" ]; then
    echo "📜 Generating SSL certificates..."
    ./scripts/generate-certs.sh
fi

echo "🚀 Starting services..."

# Start both frontend and backend
echo "Starting frontend on https://localhost:8080"
echo "Starting backend on http://localhost:3000"

# Use npm-run-all to start both services
npm run dev:all

echo ""
echo "✅ Services started!"
echo ""
echo "🌐 Access Lexos at: https://localhost:8080"
echo ""
echo "⚠️  First time? Your browser will show a certificate warning."
echo "   This is normal for development. Accept the certificate to continue."