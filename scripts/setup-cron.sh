#!/bin/bash

# LexOS Command Center Cron Setup Script
# This script sets up automatic monitoring and updates

CRON_USER="user"
PROJECT_DIR="/home/user/lexos-command-center"
SCRIPT_PATH="$PROJECT_DIR/scripts/auto-deploy.sh"

# Create cron jobs
echo "Setting up automatic cron jobs for LexOS Command Center..."

# Create temporary cron file
TEMP_CRON=$(mktemp)

# Add cron jobs
cat > "$TEMP_CRON" << EOF
# LexOS Command Center Automatic Management
# Check for updates and redeploy every 6 hours
0 */6 * * * $SCRIPT_PATH deploy >> $PROJECT_DIR/cron.log 2>&1

# Health check every 15 minutes
*/15 * * * * $SCRIPT_PATH health >> $PROJECT_DIR/health.log 2>&1

# System resource monitoring every hour
0 * * * * $SCRIPT_PATH status >> $PROJECT_DIR/status.log 2>&1

# Clean old logs weekly
0 2 * * 0 find $PROJECT_DIR -name "*.log" -mtime +7 -delete

# Backup configuration daily
0 3 * * * cp $PROJECT_DIR/.env.example $PROJECT_DIR/backup/env.backup.\$(date +\%Y\%m\%d) 2>/dev/null || true
EOF

# Install cron jobs
crontab -u "$CRON_USER" "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

echo "✅ Cron jobs installed successfully!"
echo "📋 Installed jobs:"
echo "   - Auto-deploy every 6 hours"
echo "   - Health check every 15 minutes"
echo "   - Status check every hour"
echo "   - Log cleanup weekly"
echo "   - Configuration backup daily"

# Make scripts executable
chmod +x "$SCRIPT_PATH"
chmod +x "$PROJECT_DIR/scripts/setup-cron.sh"

echo "🔧 Scripts made executable"
echo "🚀 LexOS Command Center is now fully automated!" 