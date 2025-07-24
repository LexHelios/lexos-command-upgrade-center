#!/bin/bash

# Lexos Command Center Production Startup Script

echo "🚀 Starting Lexos Command Center Production Services..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
HEALTH_CHECK_TIMEOUT=60
STARTUP_TIMEOUT=120

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check if a process is running
is_process_running() {
    if ps -p $1 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local timeout=$3
    
    log "Waiting for $service_name to be ready..."
    for i in $(seq 1 $timeout); do
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            log "${GREEN}✓ $service_name is ready!${NC}"
            return 0
        fi
        if [ $i -eq $timeout ]; then
            log "${RED}✗ $service_name failed to start within ${timeout}s${NC}"
            return 1
        fi
        sleep 1
    done
}

# Function to check system resources
check_system_resources() {
    log "${BLUE}Checking system resources...${NC}"
    
    # Check available memory
    local available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7*100/$2}')
    if [ $available_mem -lt 20 ]; then
        log "${YELLOW}Warning: Low memory available (${available_mem}%)${NC}"
    else
        log "${GREEN}Memory OK (${available_mem}% available)${NC}"
    fi
    
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2{printf "%.0f", $5}')
    if [ $disk_usage -gt 90 ]; then
        log "${YELLOW}Warning: High disk usage (${disk_usage}%)${NC}"
    else
        log "${GREEN}Disk space OK (${disk_usage}% used)${NC}"
    fi
    
    # Check CPU load
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    log "${GREEN}CPU load: $cpu_load${NC}"
}

# Function to cleanup on exit
cleanup() {
    log "${YELLOW}Shutting down services...${NC}"
    
    if [ -f .backend.pid ]; then
        local backend_pid=$(cat .backend.pid)
        if is_process_running $backend_pid; then
            log "Stopping backend (PID: $backend_pid)"
            kill $backend_pid 2>/dev/null || true
        fi
    fi
    
    if [ -f .frontend.pid ]; then
        local frontend_pid=$(cat .frontend.pid)
        if is_process_running $frontend_pid; then
            log "Stopping frontend (PID: $frontend_pid)"
            kill $frontend_pid 2>/dev/null || true
        fi
    fi
    
    # Clean up PID files
    rm -f .backend.pid .frontend.pid
}

# Set up trap to cleanup on script exit
trap cleanup EXIT

# Check system resources
check_system_resources

# Kill existing processes on our ports
log "${YELLOW}Stopping existing services...${NC}"
if check_port $BACKEND_PORT; then
    log "Stopping process on port $BACKEND_PORT..."
    kill $(lsof -t -i:$BACKEND_PORT) 2>/dev/null || true
    sleep 2
fi

if check_port $FRONTEND_PORT; then
    log "Stopping process on port $FRONTEND_PORT..."
    kill $(lsof -t -i:$FRONTEND_PORT) 2>/dev/null || true
    sleep 2
fi

# Create log directory
mkdir -p logs

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Install dependencies if needed
log "${BLUE}Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    log "Installing frontend dependencies..."
    npm install --production
fi

if [ ! -d "server/node_modules" ]; then
    log "Installing backend dependencies..."
    cd server
    npm install --production
    cd ..
fi

# Start backend server
log "${GREEN}Starting backend server on port $BACKEND_PORT...${NC}"
cd server
nohup npm run start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
log "Backend PID: $BACKEND_PID"
cd ..

# Save backend PID
echo $BACKEND_PID > .backend.pid

# Wait for backend to start
if ! wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend" $HEALTH_CHECK_TIMEOUT; then
    log "${RED}Backend failed to start. Check logs/backend.log${NC}"
    tail -n 20 logs/backend.log
    exit 1
fi

# Start proxy server (serves frontend and proxies API)
log "${GREEN}Starting proxy server on port $FRONTEND_PORT...${NC}"
nohup node simple-server.js > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
log "Proxy PID: $FRONTEND_PID"

# Save frontend PID
echo $FRONTEND_PID > .frontend.pid

# Wait for frontend
if ! wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend" 30; then
    log "${RED}Frontend failed to start. Check logs/frontend.log${NC}"
    tail -n 20 logs/frontend.log
    exit 1
fi

# Final health check
log "${BLUE}Performing final health checks...${NC}"

# Check backend health
if curl -s "http://localhost:$BACKEND_PORT/health" | grep -q '"status":"ok"'; then
    log "${GREEN}✓ Backend health check passed${NC}"
else
    log "${RED}✗ Backend health check failed${NC}"
fi

# Check frontend
if curl -s "http://localhost:$FRONTEND_PORT" | grep -q "LexOS"; then
    log "${GREEN}✓ Frontend is serving content${NC}"
else
    log "${YELLOW}⚠ Frontend content check inconclusive${NC}"
fi

# Display startup information
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Lexos Command Center is running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
echo "🔧 Backend API: http://localhost:$BACKEND_PORT"
echo "📊 Health Check: http://localhost:$BACKEND_PORT/health"
echo "📊 API Status: http://localhost:$BACKEND_PORT/api/ai/status"
echo ""
echo "📁 Logs:"
echo "   - Backend: logs/backend.log"
echo "   - Frontend: logs/frontend.log"
echo ""
echo "🔧 Management:"
echo "   - Stop services: ./stop-production.sh"
echo "   - View logs: tail -f logs/backend.log"
echo "   - Monitor: ./status.sh"
echo ""
echo "📈 Process IDs:"
echo "   - Backend: $BACKEND_PID"
echo "   - Frontend: $FRONTEND_PID"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Start monitoring loop
log "${BLUE}Starting service monitoring...${NC}"
while true; do
    # Check if processes are still running
    if ! is_process_running $BACKEND_PID; then
        log "${RED}Backend process died unexpectedly${NC}"
        break
    fi
    
    if ! is_process_running $FRONTEND_PID; then
        log "${RED}Frontend process died unexpectedly${NC}"
        break
    fi
    
    # Check service health every 30 seconds
    if ! curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
        log "${YELLOW}Backend health check failed${NC}"
    fi
    
    sleep 30
done