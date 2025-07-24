#!/bin/bash

echo "🔒 Starting Lexos with HTTPS for External Access"
echo "================================================"

# Check certificates
if [ ! -f "certs/server.pem" ]; then
    echo "📜 Generating certificates..."
    ./scripts/generate-ip-certs.sh
fi

# Kill any existing Vite process
pkill -f "vite" 2>/dev/null

echo ""
echo "🚀 Starting Frontend with HTTPS..."
HTTPS=true npx vite --host 0.0.0.0 --port 8080 &

echo ""
echo "✅ Lexos is starting..."
echo ""
echo "🌐 Access from any device at:"
echo "   https://159.26.94.14:8080"
echo ""
echo "📱 Or locally at:"
echo "   https://localhost:8080"
echo ""
echo "⚠️  Browser will show certificate warning - click 'Advanced' → 'Proceed'"
echo "🎤 Microphone will work with HTTPS!"
echo ""
echo "Press Ctrl+C to stop"

# Wait
wait