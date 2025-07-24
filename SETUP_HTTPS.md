# 🔒 Enable HTTPS for Microphone Access

The microphone requires HTTPS to work. Here's how to set it up:

## Quick Setup (Recommended)

Open a terminal and run:

```bash
cd /home/user/lexos-combined
npm run dev:https
```

This single command will:
1. Generate SSL certificates
2. Start the app with HTTPS enabled
3. Enable microphone access

## Access the App

After running the command, open:
**https://localhost:8080**

⚠️ **First Time Only**: Your browser will show a certificate warning. This is normal for development:
- Chrome/Edge: Click "Advanced" → "Proceed to localhost"
- Firefox: Click "Advanced" → "Accept the Risk"
- Safari: Click "Show Details" → "visit this website"

## Manual Setup (if needed)

```bash
# 1. Generate certificates
./scripts/generate-certs.sh

# 2. Start frontend with HTTPS
npm run dev

# 3. Start backend with HTTPS
npm run dev:backend
```

## Troubleshooting

If microphone still doesn't work:
1. Check the padlock icon in your browser's address bar
2. Make sure "Microphone" is set to "Allow"
3. Refresh the page

## Why HTTPS?

Modern browsers require HTTPS for:
- 🎤 Microphone access
- 📷 Camera access
- 📍 Location services
- 🔔 Push notifications

This is a security feature to protect user privacy.