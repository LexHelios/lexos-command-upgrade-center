#!/bin/bash

# Lexos Command Center Status Monitor

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to check if a process is running
is_process_running() {
    if [ -f "$1" ]; then
        local pid=$(cat "$1")
        if ps -p $pid > /dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    else
        return 1
    fi
}

# Function to get process info
get_process_info() {
    if [ -f "$1" ]; then
        local pid=$(cat "$1")
        if ps -p $pid > /dev/null 2>&1; then
            local cmd=$(ps -p $pid -o cmd= 2>/dev/null | head -c 50)
            local mem=$(ps -p $pid -o %mem= 2>/dev/null)
            local cpu=$(ps -p $pid -o %cpu= 2>/dev/null)
            echo "PID: $pid | CPU: ${cpu}% | MEM: ${mem}% | CMD: $cmd"
        else
            echo "Process not running"
        fi
    else
        echo "PID file not found"
    fi
}

# Function to check service health
check_service_health() {
    local url=$1
    local service_name=$2
    
    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $service_name is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ $service_name is not responding${NC}"
        return 1
    fi
}

# Function to get system resources
get_system_resources() {
    echo -e "${BLUE}System Resources:${NC}"
    
    # Memory
    local total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    local used_mem=$(free -m | awk 'NR==2{printf "%.0f", $3}')
    local mem_percent=$((used_mem * 100 / total_mem))
    echo "Memory: ${used_mem}MB / ${total_mem}MB (${mem_percent}%)"
    
    # Disk
    local disk_usage=$(df / | awk 'NR==2{printf "%.0f", $5}')
    echo "Disk Usage: ${disk_usage}%"
    
    # CPU load
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    echo "CPU Load: $cpu_load"
    
    # Network connections
    local connections=$(netstat -an | grep ESTABLISHED | wc -l)
    echo "Active Connections: $connections"
}

# Function to get recent logs
get_recent_logs() {
    local log_file=$1
    local lines=${2:-10}
    
    if [ -f "$log_file" ]; then
        echo -e "${BLUE}Recent logs from $log_file:${NC}"
        tail -n $lines "$log_file"
    else
        echo -e "${YELLOW}Log file $log_file not found${NC}"
    fi
}

# Main status check
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Lexos Command Center Status Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check processes
echo -e "${BLUE}Process Status:${NC}"
if is_process_running .backend.pid; then
    echo -e "${GREEN}✓ Backend: $(get_process_info .backend.pid)${NC}"
else
    echo -e "${RED}✗ Backend: Not running${NC}"
fi

if is_process_running .frontend.pid; then
    echo -e "${GREEN}✓ Frontend: $(get_process_info .frontend.pid)${NC}"
else
    echo -e "${RED}✗ Frontend: Not running${NC}"
fi

echo ""

# Check ports
echo -e "${BLUE}Port Status:${NC}"
if check_port $BACKEND_PORT; then
    echo -e "${GREEN}✓ Port $BACKEND_PORT (Backend): Listening${NC}"
else
    echo -e "${RED}✗ Port $BACKEND_PORT (Backend): Not listening${NC}"
fi

if check_port $FRONTEND_PORT; then
    echo -e "${GREEN}✓ Port $FRONTEND_PORT (Frontend): Listening${NC}"
else
    echo -e "${RED}✗ Port $FRONTEND_PORT (Frontend): Not listening${NC}"
fi

echo ""

# Check service health
echo -e "${BLUE}Service Health:${NC}"
check_service_health "http://localhost:$BACKEND_PORT/health" "Backend API"
check_service_health "http://localhost:$FRONTEND_PORT" "Frontend"

echo ""

# Get system resources
get_system_resources

echo ""

# Show URLs
echo -e "${BLUE}Service URLs:${NC}"
echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
echo "🔧 Backend API: http://localhost:$BACKEND_PORT"
echo "📊 Health Check: http://localhost:$BACKEND_PORT/health"
echo "📊 API Status: http://localhost:$BACKEND_PORT/api/ai/status"

echo ""

# Show log files
echo -e "${BLUE}Log Files:${NC}"
if [ -f "logs/backend.log" ]; then
    echo "📁 Backend: logs/backend.log ($(wc -l < logs/backend.log) lines)"
else
    echo "📁 Backend: logs/backend.log (not found)"
fi

if [ -f "logs/frontend.log" ]; then
    echo "📁 Frontend: logs/frontend.log ($(wc -l < logs/frontend.log) lines)"
else
    echo "📁 Frontend: logs/frontend.log (not found)"
fi

echo ""

# Show recent errors if any
echo -e "${BLUE}Recent Errors (last 5):${NC}"
if [ -f "logs/backend.log" ]; then
    echo "Backend errors:"
    grep -i "error\|exception\|failed" logs/backend.log | tail -n 5 || echo "No recent errors"
fi

if [ -f "logs/frontend.log" ]; then
    echo "Frontend errors:"
    grep -i "error\|exception\|failed" logs/frontend.log | tail -n 5 || echo "No recent errors"
fi

echo ""

# Show uptime
if [ -f ".backend.pid" ] && [ -f ".frontend.pid" ]; then
    echo -e "${BLUE}Uptime:${NC}"
    if is_process_running .backend.pid; then
        local backend_pid=$(cat .backend.pid)
        local backend_uptime=$(ps -p $backend_pid -o etime= 2>/dev/null || echo "Unknown")
        echo "Backend: $backend_uptime"
    fi
    
    if is_process_running .frontend.pid; then
        local frontend_pid=$(cat .frontend.pid)
        local frontend_uptime=$(ps -p $frontend_pid -o etime= 2>/dev/null || echo "Unknown")
        echo "Frontend: $frontend_uptime"
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Interactive menu
echo ""
echo -e "${BLUE}Options:${NC}"
echo "1. View backend logs"
echo "2. View frontend logs"
echo "3. Restart services"
echo "4. Stop services"
echo "5. Exit"
echo ""
read -p "Enter option (1-5): " choice

case $choice in
    1)
        if [ -f "logs/backend.log" ]; then
            tail -f logs/backend.log
        else
            echo "Backend log file not found"
        fi
        ;;
    2)
        if [ -f "logs/frontend.log" ]; then
            tail -f logs/frontend.log
        else
            echo "Frontend log file not found"
        fi
        ;;
    3)
        echo "Restarting services..."
        ./stop-production.sh
        sleep 2
        ./start-production.sh
        ;;
    4)
        echo "Stopping services..."
        ./stop-production.sh
        ;;
    5)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid option"
        ;;
esac 