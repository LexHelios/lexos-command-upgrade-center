# HTTPS Setup Guide for Lexos

## Why HTTPS is Required

Modern browsers require HTTPS for accessing sensitive APIs like:
- 🎤 **Microphone** (MediaRecorder API)
- 📷 **Camera** (getUserMedia)
- 📍 **Geolocation**
- 🔔 **Notifications**

Without HTTPS, you'll see errors like:
```
NotAllowedError: Permission denied
getUserMedia() no longer works on insecure origins
```

## Quick Setup

### 1. Generate Certificates (One-time setup)

```bash
npm run setup:https
```

This creates self-signed certificates in the `./certs` directory.

### 2. Start with HTTPS

```bash
npm run dev:https
```

This will:
1. Generate certificates if they don't exist
2. Start both frontend and backend with HTTPS
3. Enable microphone access

### 3. Trust the Certificate

When you first visit https://localhost:8080, your browser will warn about the self-signed certificate.

**Chrome/Edge:**
1. Click "Advanced"
2. Click "Proceed to localhost (unsafe)"

**Firefox:**
1. Click "Advanced"
2. Click "Accept the Risk and Continue"

**Safari:**
1. Click "Show Details"
2. Click "visit this website"
3. Enter your password to trust the certificate

## Manual Setup

### Generate Certificates

```bash
cd /home/user/lexos-combined
./scripts/generate-certs.sh
```

This creates:
- `certs/localhost-key.pem` - Private key
- `certs/localhost.pem` - Certificate
- `certs/localhost-combined.pem` - Combined file

### Start Services

Frontend (Vite) - automatically uses HTTPS if certs exist:
```bash
npm run dev
```

Backend - automatically uses HTTPS if certs exist:
```bash
npm run dev:backend
```

## URLs After HTTPS Setup

- Frontend: https://localhost:8080
- Backend: https://localhost:3000
- Health Check: https://localhost:3000/health

## Troubleshooting

### Certificate Not Trusted
- Each browser needs to trust the certificate once
- Private/Incognito mode requires re-trusting

### Microphone Still Not Working
1. Check browser permissions: Click the lock icon in address bar
2. Ensure "Microphone" is set to "Allow"
3. Try refreshing the page

### Port Already in Use
```bash
# Find what's using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>
```

### Certificate Errors
If you see SSL errors, regenerate certificates:
```bash
rm -rf certs/
npm run setup:https
```

## Production Deployment

For production, use real certificates from:
- Let's Encrypt (free)
- Cloudflare (free with their CDN)
- Traditional CA (paid)

Example with Let's Encrypt:
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

Then update the cert paths in:
- `vite.config.ts`
- `server/src/index.ts`

## Security Notes

1. **Never commit certificates** - They're in `.gitignore`
2. **Self-signed certs are for development only**
3. **Regenerate certificates annually** (they expire after 365 days)
4. **Keep private keys secure** - Never share `*-key.pem` files

## Alternative: ngrok

For testing on other devices or sharing:
```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 8080
```

This provides a public HTTPS URL like `https://abc123.ngrok.io`