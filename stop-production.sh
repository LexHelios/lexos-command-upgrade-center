#!/bin/bash

# Lexos Command Center Production Stop Script

echo "🛑 Stopping Lexos Command Center..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Stop backend
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        rm .backend.pid
        echo -e "${GREEN}✓ Backend stopped${NC}"
    else
        echo "Backend process not found"
        rm .backend.pid
    fi
else
    echo "No backend PID file found"
fi

# Stop frontend
if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        rm .frontend.pid
        echo -e "${GREEN}✓ Frontend stopped${NC}"
    else
        echo "Frontend process not found"
        rm .frontend.pid
    fi
else
    echo "No frontend PID file found"
fi

# Double check by port
echo "Checking for remaining processes..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
    echo "Found process on port 3000, stopping..."
    kill $(lsof -t -i:3000) 2>/dev/null || true
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null; then
    echo "Found process on port 3001, stopping..."
    kill $(lsof -t -i:3001) 2>/dev/null || true
fi

echo -e "${GREEN}✨ All services stopped${NC}"