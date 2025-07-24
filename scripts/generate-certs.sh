#!/bin/bash

# Create certs directory
mkdir -p certs

# Generate private key
openssl genrsa -out certs/localhost-key.pem 2048

# Generate certificate signing request
openssl req -new -key certs/localhost-key.pem -out certs/localhost.csr -subj "/C=US/ST=State/L=City/O=LexOS/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -in certs/localhost.csr -signkey certs/localhost-key.pem -out certs/localhost.pem -days 365

# Create a combined certificate for some servers
cat certs/localhost.pem certs/localhost-key.pem > certs/localhost-combined.pem

echo "✅ Self-signed certificates generated in ./certs directory"
echo ""
echo "Files created:"
echo "  - certs/localhost-key.pem (private key)"
echo "  - certs/localhost.pem (certificate)"
echo "  - certs/localhost-combined.pem (combined)"
echo ""
echo "⚠️  Remember to trust these certificates in your browser!"