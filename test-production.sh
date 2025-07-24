#!/bin/bash

# LexOS Command Center Production Test Suite

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
TEST_TIMEOUT=30

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="${3:-0}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log "${BLUE}Running: $test_name${NC}"
    
    if eval "$test_command" > /dev/null 2>&1; then
        log "${GREEN}✓ PASS: $test_name${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        log "${RED}✗ FAIL: $test_name${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

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

# Function to wait for service
wait_for_service() {
    local url=$1
    local service_name=$2
    local timeout=${3:-30}
    
    log "Waiting for $service_name to be ready..."
    for i in $(seq 1 $timeout); do
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            log "${GREEN}✓ $service_name is ready!${NC}"
            return 0
        fi
        sleep 1
    done
    
    log "${RED}✗ $service_name failed to start within ${timeout}s${NC}"
    return 1
}

# Main test suite
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🧪 LexOS Command Center Production Test Suite${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Test 1: Check if services are running
echo -e "${BLUE}📋 Test 1: Service Status${NC}"
run_test "Backend process running" "is_process_running .backend.pid"
run_test "Frontend process running" "is_process_running .frontend.pid"
run_test "Backend port listening" "check_port $BACKEND_PORT"
run_test "Frontend port listening" "check_port $FRONTEND_PORT"

# Test 2: Service Health Checks
echo -e "${BLUE}📋 Test 2: Health Checks${NC}"
run_test "Backend health endpoint" "curl -s --max-time 5 http://localhost:$BACKEND_PORT/health > /dev/null"
run_test "Frontend serving content" "curl -s --max-time 5 http://localhost:$FRONTEND_PORT > /dev/null"
run_test "API status endpoint" "curl -s --max-time 5 http://localhost:$BACKEND_PORT/api/ai/status > /dev/null"

# Test 3: API Functionality
echo -e "${BLUE}📋 Test 3: API Functionality${NC}"
run_test "AI API endpoint accessible" "curl -s --max-time 10 -X POST http://localhost:$BACKEND_PORT/api/ai/smart-router -H 'Content-Type: application/json' -d '{\"prompt\":\"test\",\"task_type\":\"general\"}' > /dev/null"

# Test 4: File System
echo -e "${BLUE}📋 Test 4: File System${NC}"
run_test "Log directory exists" "[ -d logs ]"
run_test "Backend log file exists" "[ -f logs/backend.log ]"
run_test "Frontend log file exists" "[ -f logs/frontend.log ]"
run_test "PID files exist" "[ -f .backend.pid ] && [ -f .frontend.pid ]"

# Test 5: System Resources
echo -e "${BLUE}📋 Test 5: System Resources${NC}"
run_test "Sufficient disk space" "[ \$(df / | awk 'NR==2{print \$4}') -gt 1000000 ]"  # 1GB free
run_test "Sufficient memory" "[ \$(free -m | awk 'NR==2{print \$7}') -gt 500 ]"  # 500MB free

# Test 6: Network Connectivity
echo -e "${BLUE}📋 Test 6: Network Connectivity${NC}"
run_test "Internet connectivity" "curl -s --max-time 5 https://www.google.com > /dev/null"
run_test "DNS resolution" "nslookup google.com > /dev/null 2>&1"

# Test 7: Dependencies
echo -e "${BLUE}📋 Test 7: Dependencies${NC}"
run_test "Node.js installed" "node --version > /dev/null"
run_test "npm installed" "npm --version > /dev/null"
run_test "Frontend dependencies" "[ -d node_modules ]"
run_test "Backend dependencies" "[ -d server/node_modules ]"

# Test 8: Build Status
echo -e "${BLUE}📋 Test 8: Build Status${NC}"
run_test "Frontend build exists" "[ -d dist ]"
run_test "Backend build exists" "[ -d server/dist ]"

# Test 9: Security
echo -e "${BLUE}📋 Test 9: Security${NC}"
run_test "No sensitive files exposed" "[ ! -f .env ] || [ ! -f server/.env ]"
run_test "HTTPS certificates exist" "[ -f certs/server.pem ] || [ -f certs/localhost.pem ]"

# Test 10: Performance
echo -e "${BLUE}📋 Test 10: Performance${NC}"
run_test "Backend response time < 5s" "timeout 5 curl -s http://localhost:$BACKEND_PORT/health > /dev/null"
run_test "Frontend response time < 3s" "timeout 3 curl -s http://localhost:$FRONTEND_PORT > /dev/null"

# Test 11: Log Analysis
echo -e "${BLUE}📋 Test 11: Log Analysis${NC}"
run_test "Backend logs accessible" "tail -n 1 logs/backend.log > /dev/null"
run_test "Frontend logs accessible" "tail -n 1 logs/frontend.log > /dev/null"
run_test "No critical errors in backend logs" "! grep -i 'critical\|fatal' logs/backend.log > /dev/null 2>&1"

# Test 12: Configuration
echo -e "${BLUE}📋 Test 12: Configuration${NC}"
run_test "Package.json exists" "[ -f package.json ]"
run_test "Server package.json exists" "[ -f server/package.json ]"
run_test "Start script exists" "[ -f start-production.sh ]"
run_test "Stop script exists" "[ -f stop-production.sh ]"
run_test "Status script exists" "[ -f status.sh ]"

# Display test results
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! LexOS is ready for production.${NC}"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: http://localhost:$FRONTEND_PORT"
    echo "   Backend: http://localhost:$BACKEND_PORT"
    echo "   Health: http://localhost:$BACKEND_PORT/health"
    echo ""
    echo "📊 Monitor with: npm run status"
    echo "📝 View logs with: npm run logs"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please check the issues above.${NC}"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Check logs: npm run logs"
    echo "   2. Restart services: npm run restart"
    echo "   3. Check status: npm run status"
    echo "   4. Clean and rebuild: npm run clean && npm run install:all"
    exit 1
fi 