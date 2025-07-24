#!/bin/bash

# LexOS Command Center Monitoring Dashboard
# Real-time status and health monitoring

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/home/user/lexos-command-center"
PORT=3001
PID_FILE="$PROJECT_DIR/vite.pid"
LOG_FILE="$PROJECT_DIR/deploy.log"

# Function to print header
print_header() {
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    LexOS Command Center Monitor              ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# Function to check server status
check_server_status() {
    echo -e "${BLUE}🔍 Server Status:${NC}"
    
    # Check PID file
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "  ${GREEN}✅ Process running (PID: $PID)${NC}"
        else
            echo -e "  ${RED}❌ Process not running${NC}"
        fi
    else
        echo -e "  ${RED}❌ No PID file found${NC}"
    fi
    
    # Check port
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null; then
        echo -e "  ${GREEN}✅ Port $PORT is listening${NC}"
    else
        echo -e "  ${RED}❌ Port $PORT is not listening${NC}"
    fi
    
    # Check HTTP response
    if curl -s http://localhost:$PORT > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ HTTP server responding${NC}"
    else
        echo -e "  ${RED}❌ HTTP server not responding${NC}"
    fi
}

# Function to check system resources
check_system_resources() {
    echo -e "${BLUE}💻 System Resources:${NC}"
    
    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo -e "  CPU Usage: ${YELLOW}${CPU_USAGE}%${NC}"
    
    # Memory usage
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    echo -e "  Memory Usage: ${YELLOW}${MEMORY_USAGE}%${NC}"
    
    # Disk usage
    DISK_USAGE=$(df /home/user | tail -1 | awk '{print $5}')
    echo -e "  Disk Usage: ${YELLOW}${DISK_USAGE}${NC}"
    
    # Load average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    echo -e "  Load Average: ${YELLOW}${LOAD_AVG}${NC}"
}

# Function to check application logs
check_logs() {
    echo -e "${BLUE}📋 Recent Logs:${NC}"
    
    if [ -f "$LOG_FILE" ]; then
        echo -e "  ${GREEN}Last 5 log entries:${NC}"
        tail -5 "$LOG_FILE" | while read line; do
            echo -e "    ${CYAN}$line${NC}"
        done
    else
        echo -e "  ${RED}No log file found${NC}"
    fi
}

# Function to check network connectivity
check_network() {
    echo -e "${BLUE}🌐 Network Status:${NC}"
    
    # Check external connectivity
    if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ External connectivity${NC}"
    else
        echo -e "  ${RED}❌ No external connectivity${NC}"
    fi
    
    # Check application URLs
    if curl -s http://localhost:$PORT > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Local: http://localhost:$PORT${NC}"
    else
        echo -e "  ${RED}❌ Local: http://localhost:$PORT${NC}"
    fi
    
    if curl -s http://159.26.94.14:$PORT > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ External: http://159.26.94.14:$PORT${NC}"
    else
        echo -e "  ${RED}❌ External: http://159.26.94.14:$PORT${NC}"
    fi
}

# Function to check dependencies
check_dependencies() {
    echo -e "${BLUE}📦 Dependencies:${NC}"
    
    cd "$PROJECT_DIR"
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        echo -e "  ${GREEN}✅ node_modules directory exists${NC}"
    else
        echo -e "  ${RED}❌ node_modules directory missing${NC}"
    fi
    
    # Check package.json
    if [ -f "package.json" ]; then
        echo -e "  ${GREEN}✅ package.json exists${NC}"
    else
        echo -e "  ${RED}❌ package.json missing${NC}"
    fi
    
    # Check if npm is available
    if command -v npm > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ npm is available${NC}"
    else
        echo -e "  ${RED}❌ npm not found${NC}"
    fi
}

# Function to show quick actions
show_actions() {
    echo -e "${BLUE}⚡ Quick Actions:${NC}"
    echo -e "  ${CYAN}1.${NC} Restart server: ${YELLOW}./scripts/auto-deploy.sh restart${NC}"
    echo -e "  ${CYAN}2.${NC} Check status: ${YELLOW}./scripts/auto-deploy.sh status${NC}"
    echo -e "  ${CYAN}3.${NC} View logs: ${YELLOW}./scripts/auto-deploy.sh logs${NC}"
    echo -e "  ${CYAN}4.${NC} Run tests: ${YELLOW}./scripts/auto-deploy.sh test${NC}"
    echo -e "  ${CYAN}5.${NC} Full deploy: ${YELLOW}./scripts/auto-deploy.sh deploy${NC}"
}

# Function to show cron status
show_cron_status() {
    echo -e "${BLUE}⏰ Cron Jobs:${NC}"
    
    if crontab -l 2>/dev/null | grep -q "auto-deploy.sh"; then
        echo -e "  ${GREEN}✅ Cron jobs are installed${NC}"
        echo -e "  ${CYAN}Installed jobs:${NC}"
        crontab -l 2>/dev/null | grep "auto-deploy.sh" | while read job; do
            echo -e "    ${YELLOW}$job${NC}"
        done
    else
        echo -e "  ${RED}❌ No cron jobs found${NC}"
        echo -e "  ${CYAN}Run:${NC} ${YELLOW}./scripts/setup-cron.sh${NC} to install"
    fi
}

# Main monitoring function
monitor() {
    clear
    print_header
    
    check_server_status
    echo
    
    check_system_resources
    echo
    
    check_network
    echo
    
    check_dependencies
    echo
    
    show_cron_status
    echo
    
    check_logs
    echo
    
    show_actions
    echo
    
    echo -e "${PURPLE}🔄 Auto-refresh in 30 seconds... (Ctrl+C to exit)${NC}"
}

# Continuous monitoring
if [ "$1" = "watch" ]; then
    while true; do
        monitor
        sleep 30
    done
else
    monitor
fi 