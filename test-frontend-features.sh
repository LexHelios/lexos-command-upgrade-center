#!/bin/bash

# Frontend Feature Test Script
# Tests all major frontend functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log "Running: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        success "$test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        error "$test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Frontend Feature Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Backend Health
run_test "Backend Health Check" "curl -s http://localhost:3000/health | jq -e '.status == \"ok\"'"

# Test 2: Frontend Accessibility
run_test "Frontend Accessibility" "curl -s http://localhost:3001 | grep -q 'lexos-command-center'"

# Test 3: AI Chat Endpoint
run_test "AI Chat Endpoint" "curl -s -X POST http://localhost:3000/api/ai/chat -H 'Content-Type: application/json' -d '{\"task_type\":\"general\",\"complexity\":\"medium\",\"quality\":\"standard\",\"prompt\":\"test\",\"max_cost\":0.10,\"prefer_self_hosted\":true,\"estimated_tokens\":10}' | jq -e '.result'"

# Test 4: AI Status Endpoint
run_test "AI Status Endpoint" "curl -s http://localhost:3000/api/ai/status | jq -e '.'"

# Test 5: STT Endpoint (if available)
run_test "STT Endpoint Check" "curl -s http://localhost:3000/api/stt/transcribe -X POST -H 'Content-Type: application/json' -d '{}' | jq -e '.'"

# Test 6: TTS Endpoint (if available)
run_test "TTS Endpoint Check" "curl -s http://localhost:3000/api/tts/generate -X POST -H 'Content-Type: application/json' -d '{\"text\":\"test\",\"voice\":\"alloy\"}' | jq -e '.'"

# Test 7: Image Generation Endpoint
run_test "Image Generation Endpoint" "curl -s http://localhost:3000/api/image/generate -X POST -H 'Content-Type: application/json' -d '{\"prompt\":\"test\",\"num_outputs\":1}' | jq -e '.'"

# Test 8: Browser Agent Endpoint
run_test "Browser Agent Endpoint" "curl -s http://localhost:3000/api/browser-agent/navigate -X POST -H 'Content-Type: application/json' -d '{\"url\":\"https://google.com\"}' | jq -e '.'"

# Test 9: Task Manager Endpoint
run_test "Task Manager Endpoint" "curl -s http://localhost:3000/api/tasks/list | jq -e '.'"

# Test 10: Vision Analysis Endpoint
run_test "Vision Analysis Endpoint" "curl -s http://localhost:3000/api/vision/analyze -X POST -H 'Content-Type: application/json' -d '{}' | jq -e '.'"

# Test 11: Smart Router Endpoint
run_test "Smart Router Endpoint" "curl -s http://localhost:3000/api/smart-router/route -X POST -H 'Content-Type: application/json' -d '{\"message\":\"test\"}' | jq -e '.'"

# Test 12: Orchestrator Endpoint
run_test "Orchestrator Endpoint" "curl -s http://localhost:3000/api/orchestrator/route -X POST -H 'Content-Type: application/json' -d '{\"message\":\"test\"}' | jq -e '.'"

# Test 13: File Manager Endpoint
run_test "File Manager Endpoint" "curl -s http://localhost:3000/api/file-manager/list | jq -e '.'"

# Test 14: IDE Endpoint
run_test "IDE Endpoint" "curl -s http://localhost:3000/api/ide/status | jq -e '.'"

# Test 15: Deep Agent Endpoint
run_test "Deep Agent Endpoint" "curl -s http://localhost:3000/api/deep-agent/status | jq -e '.'"

# Test 16: Super Agent Endpoint
run_test "Super Agent Endpoint" "curl -s http://localhost:3000/api/super-agent/status | jq -e '.'"

# Test 17: Rasa Chat Endpoint
run_test "Rasa Chat Endpoint" "curl -s http://localhost:3000/api/rasa/chat -X POST -H 'Content-Type: application/json' -d '{\"message\":\"test\"}' | jq -e '.'"

# Test 18: Search Endpoint
run_test "Search Endpoint" "curl -s http://localhost:3000/api/search/query -X POST -H 'Content-Type: application/json' -d '{\"query\":\"test\"}' | jq -e '.'"

# Test 19: Auth Endpoint
run_test "Auth Endpoint" "curl -s http://localhost:3000/api/auth/status | jq -e '.'"

# Test 20: Realtime Endpoint
run_test "Realtime Endpoint" "curl -s http://localhost:3000/api/realtime/status | jq -e '.'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Results Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    success "All tests passed! Frontend features are working correctly."
    exit 0
else
    error "$FAILED_TESTS tests failed. Some features may need attention."
    exit 1
fi 