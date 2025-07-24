#!/bin/bash

# LexOS Combined Deployment Script
# Simple script to deploy frontend and backend together

set -e

# Configuration
PROJECT_DIR="/home/user/lexos-combined"
FRONTEND_PORT=3001
BACKEND_PORT=3000
BACKEND_PID_FILE="$PROJECT_DIR/backend.pid"
FRONTEND_PID_FILE="$PROJECT_DIR/frontend.pid"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Helper functions
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

# Stop all services
stop_all() {
    log "Stopping all services..."
    
    # Stop backend
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID
            success "Backend stopped (PID: $PID)"
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    pkill -f "node.*$BACKEND_PORT" || true
    
    # Stop frontend
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID
            success "Frontend stopped (PID: $PID)"
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    pkill -f "serve.*$FRONTEND_PORT" || true
}

# Start backend
start_backend() {
    log "Starting backend server..."
    cd "$PROJECT_DIR/server"
    
    nohup node dist/index.js > "$PROJECT_DIR/backend.log" 2>&1 &
    local pid=$!
    echo $pid > "$BACKEND_PID_FILE"
    
    # Wait for backend to start
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
            success "Backend started on port $BACKEND_PORT (PID: $pid)"
            return 0
        fi
        sleep 1
        attempts=$((attempts + 1))
    done
    
    error "Failed to start backend"
    return 1
}

# Start frontend
start_frontend() {
    log "Starting frontend server..."
    cd "$PROJECT_DIR"
    
    nohup npx serve dist -l $FRONTEND_PORT -s > "$PROJECT_DIR/frontend.log" 2>&1 &
    local pid=$!
    echo $pid > "$FRONTEND_PID_FILE"
    
    # Wait for frontend to start
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
            success "Frontend started on port $FRONTEND_PORT (PID: $pid)"
            return 0
        fi
        sleep 1
        attempts=$((attempts + 1))
    done
    
    error "Failed to start frontend"
    return 1
}

# Check status
status() {
    log "Checking service status..."
    
    # Check backend
    if [ -f "$BACKEND_PID_FILE" ] && ps -p $(cat "$BACKEND_PID_FILE") > /dev/null 2>&1; then
        success "Backend is running (PID: $(cat "$BACKEND_PID_FILE"))"
    else
        error "Backend is not running"
    fi
    
    # Check frontend
    if [ -f "$FRONTEND_PID_FILE" ] && ps -p $(cat "$FRONTEND_PID_FILE") > /dev/null 2>&1; then
        success "Frontend is running (PID: $(cat "$FRONTEND_PID_FILE"))"
    else
        error "Frontend is not running"
    fi
    
    # Check ports
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null; then
        success "Backend port $BACKEND_PORT is listening"
    else
        error "Backend port $BACKEND_PORT is not listening"
    fi
    
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null; then
        success "Frontend port $FRONTEND_PORT is listening"
    else
        error "Frontend port $FRONTEND_PORT is not listening"
    fi
}

# Main deployment
deploy() {
    log "Starting deployment..."
    
    # Build if needed
    if [ "$1" == "build" ]; then
        log "Building project..."
        cd "$PROJECT_DIR"
        npm run build || exit 1
        success "Build completed"
    fi
    
    # Stop existing services
    stop_all
    
    # Start services
    start_backend || exit 1
    start_frontend || exit 1
    
    # Final status
    sleep 2
    status
    
    success "Deployment complete!"
    log "Frontend: http://localhost:$FRONTEND_PORT"
    log "Backend API: http://localhost:$BACKEND_PORT"
    log "External: http://159.26.94.14:$FRONTEND_PORT"
}

# Process commands
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "build-deploy")
        deploy build
        ;;
    "start")
        start_backend
        start_frontend
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        stop_all
        sleep 2
        start_backend
        start_frontend
        ;;
    "status")
        status
        ;;
    "logs")
        if [ "$2" == "backend" ]; then
            tail -f "$PROJECT_DIR/backend.log"
        elif [ "$2" == "frontend" ]; then
            tail -f "$PROJECT_DIR/frontend.log"
        else
            echo "Usage: $0 logs [backend|frontend]"
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|build-deploy|start|stop|restart|status|logs}"
        echo "  deploy       - Deploy without building"
        echo "  build-deploy - Build and deploy"
        echo "  start        - Start services"
        echo "  stop         - Stop services"
        echo "  restart      - Restart services"
        echo "  status       - Check status"
        echo "  logs         - View logs (backend|frontend)"
        exit 1
        ;;
esac