#!/bin/bash

# Create certs directory
mkdir -p certs

# Get the machine's IP address
IP_ADDRESS="159.26.94.14"
HOSTNAME=$(hostname)

echo "🔒 Generating SSL certificates for IP: $IP_ADDRESS and hostname: $HOSTNAME"

# Create a config file for the certificate with IP SAN
cat > certs/openssl.cnf <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = State
L = City
O = LexOS
CN = $IP_ADDRESS

[v3_req]
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = $HOSTNAME
IP.1 = 127.0.0.1
IP.2 = $IP_ADDRESS
IP.3 = ::1
EOF

# Generate private key
openssl genrsa -out certs/server-key.pem 2048

# Generate certificate with the config
openssl req -new -x509 -sha256 -key certs/server-key.pem -out certs/server.pem -days 365 -config certs/openssl.cnf -extensions v3_req

# Create combined certificate
cat certs/server.pem certs/server-key.pem > certs/server-combined.pem

# Also keep localhost certificates for compatibility
cp certs/server.pem certs/localhost.pem
cp certs/server-key.pem certs/localhost-key.pem

echo "✅ SSL certificates generated with IP SAN support"
echo ""
echo "Files created:"
echo "  - certs/server-key.pem (private key)"
echo "  - certs/server.pem (certificate)"
echo "  - certs/server-combined.pem (combined)"
echo ""
echo "Certificate includes:"
echo "  - IP: $IP_ADDRESS"
echo "  - IP: 127.0.0.1"
echo "  - DNS: localhost"
echo "  - DNS: $HOSTNAME"
echo ""
echo "Access your app at:"
echo "  - https://$IP_ADDRESS:8080"
echo "  - https://localhost:8080"