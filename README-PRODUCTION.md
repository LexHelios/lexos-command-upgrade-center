# LexOS Command Center - Production Deployment Guide

## 🚀 Quick Start

```bash
# Install dependencies
npm run install:all

# Start production services
npm start

# Check status
npm run status

# View logs
npm run logs
```

## 📋 System Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended)
- **Node.js**: v18+ (v22+ recommended)
- **Memory**: 4GB+ RAM (8GB+ recommended)
- **Storage**: 10GB+ free space
- **Network**: Stable internet connection for AI model access

## 🔧 Installation

### 1. Clone and Setup

```bash
git clone <repository-url>
cd lexos-combined
npm run install:all
```

### 2. Environment Configuration

Create environment files:

```bash
# Development
cp .env.example .env.development

# Production
cp .env.example .env.production
```

Key environment variables:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# AI Model Configuration
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
REPLICATE_API_KEY=your_replicate_key

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Database (if using)
DATABASE_URL=your_database_url

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

### 3. HTTPS Setup (Recommended)

```bash
# Generate SSL certificates
npm run setup:https

# Start with HTTPS
npm run start:https
```

## 🚀 Production Deployment

### Method 1: Direct Deployment

```bash
# Build the application
npm run build

# Start production services
npm start
```

### Method 2: Using Systemd Service

1. Create service file:

```bash
sudo nano /etc/systemd/system/lexos.service
```

2. Add service configuration:

```ini
[Unit]
Description=LexOS Command Center
After=network.target

[Service]
Type=simple
User=lexos
WorkingDirectory=/path/to/lexos-combined
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

3. Enable and start service:

```bash
sudo systemctl enable lexos
sudo systemctl start lexos
sudo systemctl status lexos
```

### Method 3: Docker Deployment

```bash
# Build Docker image
docker build -t lexos-command-center .

# Run container
docker run -d \
  --name lexos \
  -p 3000:3000 \
  -p 3001:3001 \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  lexos-command-center
```

## 📊 Monitoring and Management

### Service Management

```bash
# Start services
npm start

# Stop services
npm stop

# Restart services
npm run restart

# Check status
npm run status

# View logs
npm run logs
npm run logs:backend
npm run logs:frontend
```

### Health Checks

```bash
# Check backend health
curl http://localhost:3000/health

# Check API status
curl http://localhost:3000/api/ai/status

# Check frontend
curl http://localhost:3001
```

### Log Management

```bash
# View real-time logs
tail -f logs/backend.log
tail -f logs/frontend.log

# Clean old logs
npm run clean:logs

# Archive logs
tar -czf logs-$(date +%Y%m%d).tar.gz logs/
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001

# Kill processes
kill $(lsof -t -i:3000)
kill $(lsof -t -i:3001)
```

#### 2. Memory Issues

```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Restart with more memory
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

#### 3. Service Won't Start

```bash
# Check logs
tail -f logs/backend.log
tail -f logs/frontend.log

# Check dependencies
npm run install:all

# Clean and rebuild
npm run clean
npm run install:all
npm run build
```

#### 4. API Errors

```bash
# Check API health
curl -v http://localhost:3000/health

# Check environment variables
echo $NODE_ENV
echo $OPENAI_API_KEY

# Restart backend only
cd server && npm run start
```

### Performance Optimization

#### 1. Memory Optimization

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Use PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js
```

#### 2. Database Optimization

```bash
# If using PostgreSQL
sudo -u postgres psql -c "VACUUM ANALYZE;"

# If using SQLite
sqlite3 database.db "VACUUM;"
```

#### 3. Network Optimization

```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize TCP settings
echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
sysctl -p
```

## 🔒 Security Considerations

### 1. Environment Variables

- Never commit `.env` files to version control
- Use strong, unique secrets for production
- Rotate API keys regularly

### 2. Network Security

```bash
# Configure firewall
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw enable

# Use reverse proxy (nginx)
sudo apt install nginx
sudo cp nginx.conf /etc/nginx/sites-available/lexos
sudo ln -s /etc/nginx/sites-available/lexos /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

### 3. SSL/TLS

```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## 📈 Monitoring and Alerting

### 1. System Monitoring

```bash
# Monitor system resources
htop
iotop
nethogs

# Monitor application logs
tail -f logs/backend.log | grep ERROR
tail -f logs/frontend.log | grep ERROR
```

### 2. Application Metrics

```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/health"

# Monitor memory usage
watch -n 1 'ps aux | grep node'
```

### 3. Log Analysis

```bash
# Find errors in logs
grep -i "error\|exception\|failed" logs/backend.log

# Count API calls
grep "POST /api/ai" logs/backend.log | wc -l

# Monitor response times
grep "response time" logs/backend.log | tail -10
```

## 🔄 Backup and Recovery

### 1. Application Backup

```bash
# Create backup
tar -czf lexos-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude=node_modules \
  --exclude=logs \
  --exclude=.git \
  .

# Restore from backup
tar -xzf lexos-backup-YYYYMMDD-HHMMSS.tar.gz
npm run install:all
```

### 2. Database Backup

```bash
# If using PostgreSQL
pg_dump lexos_db > lexos_db_backup.sql

# If using SQLite
cp database.db database_backup.db
```

### 3. Configuration Backup

```bash
# Backup configuration
cp .env.production .env.production.backup
cp server/.env server/.env.backup
```

## 🚀 Scaling

### 1. Horizontal Scaling

```bash
# Run multiple instances
npm start -- --port 3000
npm start -- --port 3002
npm start -- --port 3004

# Use load balancer
sudo apt install haproxy
```

### 2. Vertical Scaling

```bash
# Increase memory allocation
export NODE_OPTIONS="--max-old-space-size=8192"

# Use PM2 cluster mode
pm2 start ecosystem.config.js -i max
```

## 📞 Support

### Logs Location

- Backend logs: `logs/backend.log`
- Frontend logs: `logs/frontend.log`
- Error logs: `logs/error.log`

### Useful Commands

```bash
# Quick status check
npm run status

# View all logs
npm run logs

# Health check
npm run health

# Restart everything
npm run restart

# Clean everything
npm run clean
```

### Emergency Procedures

1. **Service Down**: `npm run restart`
2. **Memory Issues**: `npm run clean && npm start`
3. **API Errors**: Check logs and restart backend
4. **Complete Reset**: `npm run clean && npm run install:all && npm start`

---

**Last Updated**: July 2025  
**Version**: 2025.7  
**Support**: Check logs and run `npm run status` for diagnostics