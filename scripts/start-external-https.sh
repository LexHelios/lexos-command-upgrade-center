#!/bin/bash

echo "🔒 Starting Lexos with HTTPS for external access..."

# Check if IP certificates exist
if [ ! -f "certs/server.pem" ] || [ ! -f "certs/server-key.pem" ]; then
    echo "📜 Generating SSL certificates for IP access..."
    ./scripts/generate-ip-certs.sh
fi

echo "🚀 Starting services with external access enabled..."

# Start both frontend and backend
echo "Frontend: https://159.26.94.14:8080"
echo "Backend: https://159.26.94.14:3000"
echo ""

# Use npm-run-all to start both services
npm run dev:all &

echo ""
echo "✅ Services starting..."
echo ""
echo "🌐 Access Lexos from:"
echo "   - https://159.26.94.14:8080 (external)"
echo "   - https://localhost:8080 (local)"
echo ""
echo "⚠️  Certificate Warning:"
echo "   Browsers will show a security warning for self-signed certificates."
echo "   Click 'Advanced' → 'Proceed' to continue."
echo ""
echo "🎤 Microphone Access:"
echo "   HTTPS is now enabled for microphone access from any device!"
echo ""
echo "Press Ctrl+C to stop the servers."

# Keep the script running
wait