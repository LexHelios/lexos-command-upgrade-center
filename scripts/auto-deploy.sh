#!/bin/bash

# LexOS Command Center Auto-Deployment Script
# This script automatically tests, builds, and deploys the application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="lexos-combined"
PROJECT_DIR="/home/user/lexos-combined"
FRONTEND_PORT=3001
BACKEND_PORT=3000
HOST="0.0.0.0"
LOG_FILE="/home/user/lexos-combined/deploy.log"
FRONTEND_PID_FILE="/home/user/lexos-combined/frontend.pid"
BACKEND_PID_FILE="/home/user/lexos-combined/backend.pid"

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        warning "Port $port is already in use. Stopping existing process..."
        pkill -f "node.*$port" || true
        pkill -f "vite.*$port" || true
        pkill -f "serve.*$port" || true
        sleep 2
    fi
}

# Function to stop backend server
stop_backend() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            log "Stopping backend server (PID: $PID)..."
            kill $PID
            rm -f "$BACKEND_PID_FILE"
        fi
    fi
    pkill -f "node.*$BACKEND_PORT" || true
}

# Function to stop frontend server
stop_frontend() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            log "Stopping frontend server (PID: $PID)..."
            kill $PID
            rm -f "$FRONTEND_PID_FILE"
        fi
    fi
    pkill -f "serve.*$FRONTEND_PORT" || true
}

# Function to stop all servers
stop_all() {
    stop_backend
    stop_frontend
}

# Function to start backend server
start_backend() {
    log "Starting backend server..."
    cd $PROJECT_DIR/server
    
    # Start server in background and save PID
    nohup node dist/index.js > "$PROJECT_DIR/backend.log" 2>&1 &
    local server_pid=$!
    echo $server_pid > "$BACKEND_PID_FILE"
    
    # Wait for server to start
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
            # Verify the PID is still valid
            if ps -p $server_pid > /dev/null 2>&1; then
                success "Server started successfully on port $PORT (PID: $server_pid)"
                return 0
            else
                # Try to find the actual Vite process
                local vite_pid=$(pgrep -f "vite.*$PORT" | head -1)
                if [ -n "$vite_pid" ]; then
                    echo $vite_pid > "$PID_FILE"
                    success "Server started successfully on port $PORT (PID: $vite_pid)"
                    return 0
                fi
            fi
        fi
        sleep 1
        attempts=$((attempts + 1))
    done
    
    error "Failed to start server after 30 attempts"
    return 1
}

# Function to run tests
run_tests() {
    log "Running tests..."
    cd /home/user/lexos-command-center
    
    if npm test -- --passWithNoTests --silent; then
        success "All tests passed"
        return 0
    else
        error "Tests failed"
        return 1
    fi
}

# Function to run linting
run_lint() {
    log "Running linting..."
    cd /home/user/lexos-command-center
    
    if npm run lint --silent; then
        success "Linting passed"
        return 0
    else
        warning "Linting issues found (continuing deployment)"
        return 0
    fi
}

# Function to build project
build_project() {
    log "Building project..."
    cd /home/user/lexos-command-center
    
    if npm run build; then
        success "Build completed successfully"
        return 0
    else
        error "Build failed"
        return 1
    fi
}

# Function to check dependencies
check_dependencies() {
    log "Checking dependencies..."
    cd /home/user/lexos-command-center
    
    if [ ! -d "node_modules" ]; then
        log "Installing dependencies..."
        npm install
    fi
    
    success "Dependencies are up to date"
}

# Function to check system resources
check_resources() {
    log "Checking system resources..."
    
    # Check disk space
    DISK_USAGE=$(df /home/user | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 90 ]; then
        warning "Disk usage is high: ${DISK_USAGE}%"
    else
        success "Disk usage: ${DISK_USAGE}%"
    fi
    
    # Check memory
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ $MEMORY_USAGE -gt 90 ]; then
        warning "Memory usage is high: ${MEMORY_USAGE}%"
    else
        success "Memory usage: ${MEMORY_USAGE}%"
    fi
}

# Function to monitor server health
monitor_health() {
    log "Monitoring server health..."
    
    if curl -s http://localhost:$PORT > /dev/null 2>&1; then
        success "Server is healthy"
        return 0
    else
        error "Server is not responding"
        return 1
    fi
}

# Function to update from git
update_from_git() {
    log "Checking for updates from git..."
    cd /home/user/lexos-command-center
    
    git fetch origin
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        log "Updates found, pulling latest changes..."
        git pull origin main
        success "Updated from git"
        return 0
    else
        success "Already up to date"
        return 0
    fi
}

# Main deployment function
deploy() {
    log "Starting auto-deployment process..."
    
    # Check system resources
    check_resources
    
    # Update from git
    update_from_git
    
    # Check dependencies
    check_dependencies
    
    # Run tests
    if ! run_tests; then
        error "Deployment aborted due to test failures"
        exit 1
    fi
    
    # Run linting
    run_lint
    
    # Build project
    if ! build_project; then
        error "Deployment aborted due to build failures"
        exit 1
    fi
    
    # Stop existing server
    stop_server
    
    # Check port availability
    check_port
    
    # Start server
    if ! start_server; then
        error "Failed to start server"
        exit 1
    fi
    
    # Monitor health
    sleep 5
    if ! monitor_health; then
        error "Server health check failed"
        exit 1
    fi
    
    success "Auto-deployment completed successfully!"
    log "Server is running at: http://159.26.94.14:$PORT"
    log "Local access: http://localhost:$PORT"
}

# Function to fix PID file
fix_pid_file() {
    log "Attempting to fix PID file..."
    
    # Try to find the actual Vite process
    local vite_pid=$(pgrep -f "vite.*$PORT" | head -1)
    if [ -n "$vite_pid" ]; then
        echo $vite_pid > "$PID_FILE"
        success "PID file fixed (PID: $vite_pid)"
        return 0
    else
        error "No Vite process found for port $PORT"
        return 1
    fi
}

# Function to show status
status() {
    log "Checking deployment status..."
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            success "Server is running (PID: $PID)"
        else
            warning "Server PID file exists but process is not running"
            if fix_pid_file; then
                PID=$(cat "$PID_FILE")
                success "Server is running (PID: $PID)"
            else
                error "Server PID file exists but process is not running"
            fi
        fi
    else
        warning "No server PID file found"
        if fix_pid_file; then
            PID=$(cat "$PID_FILE")
            success "Server is running (PID: $PID)"
        else
            error "No server PID file found"
        fi
    fi
    
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null; then
        success "Port $PORT is listening"
    else
        error "Port $PORT is not listening"
    fi
    
    if curl -s http://localhost:$PORT > /dev/null 2>&1; then
        success "Server is responding to HTTP requests"
    else
        error "Server is not responding to HTTP requests"
    fi
}

# Function to restart server
restart() {
    log "Restarting servers..."
    stop_all
    sleep 2
    start_backend
    start_frontend
}

# Function to show logs
logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        error "No log file found"
    fi
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "status")
        status
        ;;
    "restart")
        restart
        ;;
    "stop")
        stop_all
        success "All servers stopped"
        ;;
    "logs")
        logs
        ;;
    "test")
        run_tests
        ;;
    "build")
        build_project
        ;;
    "health")
        monitor_health
        ;;
    *)
        echo "Usage: $0 {deploy|status|restart|stop|logs|test|build|health}"
        echo "  deploy  - Full deployment process (default)"
        echo "  status  - Check server status"
        echo "  restart - Restart server"
        echo "  stop    - Stop server"
        echo "  logs    - Show deployment logs"
        echo "  test    - Run tests only"
        echo "  build   - Build project only"
        echo "  health  - Check server health"
        exit 1
        ;;
esac 