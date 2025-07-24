#!/bin/bash

# LexOS Command Center Full Automation Setup
# This script sets up complete automation for testing, deployment, and monitoring

set -e

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
SCRIPTS_DIR="$PROJECT_DIR/scripts"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              LexOS Command Center Automation Setup           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo

# Function to print status
print_status() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Verify we're in the right directory
print_status "Step 1: Verifying project directory..."
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    print_error "package.json not found. Please run this script from the lexos-command-center directory."
    exit 1
fi
print_success "Project directory verified"

# Step 2: Make all scripts executable
print_status "Step 2: Making scripts executable..."
chmod +x "$SCRIPTS_DIR"/*.sh
print_success "All scripts made executable"

# Step 3: Install dependencies
print_status "Step 3: Installing dependencies..."
cd "$PROJECT_DIR"
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Step 4: Run initial build
print_status "Step 4: Running initial build..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Step 5: Set up cron jobs
print_status "Step 5: Setting up cron jobs..."
"$SCRIPTS_DIR/setup-cron.sh"
print_success "Cron jobs configured"

# Step 6: Set up systemd service (optional)
print_status "Step 6: Setting up systemd service..."
if command -v systemctl > /dev/null 2>&1; then
    sudo cp "$SCRIPTS_DIR/lexos.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable lexos.service
    print_success "Systemd service configured"
    print_warning "To start the service: sudo systemctl start lexos"
    print_warning "To check status: sudo systemctl status lexos"
else
    print_warning "systemctl not available, skipping systemd setup"
fi

# Step 7: Create backup directory
print_status "Step 7: Setting up backup directory..."
mkdir -p "$PROJECT_DIR/backup"
print_success "Backup directory created"

# Step 8: Test the deployment
print_status "Step 8: Testing deployment..."
if "$SCRIPTS_DIR/auto-deploy.sh" deploy; then
    print_success "Deployment test successful"
else
    print_error "Deployment test failed"
    exit 1
fi

# Step 9: Verify everything is working
print_status "Step 9: Verifying deployment..."
sleep 5
if "$SCRIPTS_DIR/auto-deploy.sh" status; then
    print_success "Deployment verification successful"
else
    print_error "Deployment verification failed"
    exit 1
fi

# Step 10: Set up monitoring
print_status "Step 10: Setting up monitoring..."
echo "#!/bin/bash" > "$PROJECT_DIR/monitor"
echo "cd \"$PROJECT_DIR\"" >> "$PROJECT_DIR/monitor"
echo "\"$SCRIPTS_DIR/monitor.sh\" \"\$@\"" >> "$PROJECT_DIR/monitor"
chmod +x "$PROJECT_DIR/monitor"
print_success "Monitoring script created"

# Step 11: Create quick access aliases
print_status "Step 11: Creating quick access aliases..."
cat > "$PROJECT_DIR/quick-commands.sh" << 'EOF'
#!/bin/bash

# Quick commands for LexOS Command Center
# Source this file to get access to quick commands

alias lexos-status="cd /home/user/lexos-command-center && ./scripts/auto-deploy.sh status"
alias lexos-deploy="cd /home/user/lexos-command-center && ./scripts/auto-deploy.sh deploy"
alias lexos-restart="cd /home/user/lexos-command-center && ./scripts/auto-deploy.sh restart"
alias lexos-logs="cd /home/user/lexos-command-center && ./scripts/auto-deploy.sh logs"
alias lexos-monitor="cd /home/user/lexos-command-center && ./scripts/monitor.sh"
alias lexos-watch="cd /home/user/lexos-command-center && ./scripts/monitor.sh watch"

echo "LexOS quick commands loaded:"
echo "  lexos-status   - Check server status"
echo "  lexos-deploy   - Full deployment"
echo "  lexos-restart  - Restart server"
echo "  lexos-logs     - View logs"
echo "  lexos-monitor  - Show monitoring dashboard"
echo "  lexos-watch    - Continuous monitoring"
EOF

chmod +x "$PROJECT_DIR/quick-commands.sh"
print_success "Quick commands created"

# Step 12: Create a comprehensive README
print_status "Step 12: Creating automation documentation..."
cat > "$PROJECT_DIR/AUTOMATION.md" << 'EOF'
# LexOS Command Center Automation

## 🚀 Quick Start

The application is now fully automated! Here's what's been set up:

### Automatic Features
- ✅ **Auto-deployment every 6 hours**
- ✅ **Health checks every 15 minutes**
- ✅ **Status monitoring every hour**
- ✅ **Log cleanup weekly**
- ✅ **Configuration backup daily**

### Quick Commands
```bash
# Load quick commands
source ./quick-commands.sh

# Check status
lexos-status

# Full deployment
lexos-deploy

# Restart server
lexos-restart

# View logs
lexos-logs

# Monitor dashboard
lexos-monitor

# Continuous monitoring
lexos-watch
```

### Manual Commands
```bash
# Check status
./scripts/auto-deploy.sh status

# Full deployment
./scripts/auto-deploy.sh deploy

# Restart server
./scripts/auto-deploy.sh restart

# Stop server
./scripts/auto-deploy.sh stop

# View logs
./scripts/auto-deploy.sh logs

# Run tests only
./scripts/auto-deploy.sh test

# Build only
./scripts/auto-deploy.sh build

# Health check
./scripts/auto-deploy.sh health
```

### Monitoring Dashboard
```bash
# Show current status
./scripts/monitor.sh

# Continuous monitoring
./scripts/monitor.sh watch
```

### Systemd Service (if available)
```bash
# Start service
sudo systemctl start lexos

# Stop service
sudo systemctl stop lexos

# Check status
sudo systemctl status lexos

# Enable auto-start
sudo systemctl enable lexos
```

### Cron Jobs
The following cron jobs are automatically installed:
- **Auto-deploy**: Every 6 hours
- **Health check**: Every 15 minutes
- **Status check**: Every hour
- **Log cleanup**: Weekly
- **Backup**: Daily

### Log Files
- `deploy.log` - Deployment and operation logs
- `cron.log` - Cron job execution logs
- `health.log` - Health check logs
- `status.log` - Status check logs

### URLs
- **Local**: http://localhost:3001
- **External**: http://159.26.94.14:3001

### Troubleshooting
1. **Server not starting**: Run `./scripts/auto-deploy.sh deploy`
2. **PID file issues**: Run `./scripts/auto-deploy.sh status` (auto-fixes PID)
3. **Port conflicts**: The script automatically handles port conflicts
4. **Dependency issues**: Run `npm install` in the project directory

### Automation Features
- **Git Integration**: Automatically pulls updates from repository
- **Dependency Management**: Automatically installs missing dependencies
- **Build Verification**: Ensures successful builds before deployment
- **Health Monitoring**: Continuous health checks
- **Resource Monitoring**: Tracks CPU, memory, and disk usage
- **Log Management**: Automatic log rotation and cleanup
- **Backup System**: Daily configuration backups

The system is now fully automated and will maintain itself!
EOF

print_success "Documentation created"

# Final summary
echo
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    Setup Complete! 🎉                        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo
print_success "LexOS Command Center is now fully automated!"
echo
echo -e "${BLUE}📋 What's been set up:${NC}"
echo -e "  ✅ Auto-deployment every 6 hours"
echo -e "  ✅ Health checks every 15 minutes"
echo -e "  ✅ Status monitoring every hour"
echo -e "  ✅ Log cleanup weekly"
echo -e "  ✅ Configuration backup daily"
echo -e "  ✅ Systemd service (if available)"
echo -e "  ✅ Quick command aliases"
echo -e "  ✅ Monitoring dashboard"
echo
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo -e "  Local:   http://localhost:3001"
echo -e "  External: http://159.26.94.14:3001"
echo
echo -e "${BLUE}⚡ Quick Commands:${NC}"
echo -e "  source ./quick-commands.sh  # Load quick commands"
echo -e "  lexos-status                # Check status"
echo -e "  lexos-deploy                # Full deployment"
echo -e "  lexos-monitor               # Monitoring dashboard"
echo
echo -e "${BLUE}📚 Documentation:${NC}"
echo -e "  See AUTOMATION.md for complete documentation"
echo
print_success "Your LexOS Command Center is now running automatically!"
print_success "No more manual approvals needed! 🚀" 