#!/bin/bash

# ===========================================
# SSL Certificate Setup for Cloudflare
# ===========================================

set -e

SSL_DIR="docker/nginx/ssl"

echo "🔐 SSL Certificate Setup"
echo ""

# Create SSL directory
mkdir -p $SSL_DIR

# Check if certificates already exist
if [ -f "$SSL_DIR/origin.crt" ] && [ -f "$SSL_DIR/origin.key" ]; then
    echo "⚠️  SSL certificates already exist."
    read -p "Overwrite? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

echo ""
echo "📋 Instructions:"
echo ""
echo "1. Go to Cloudflare Dashboard"
echo "2. Select your domain"
echo "3. Go to SSL/TLS > Origin Server"
echo "4. Click 'Create Certificate'"
echo "5. Keep the default options (RSA 2048, 15 years)"
echo "6. Copy the certificate and private key"
echo ""

# Get certificate
echo "Paste your Origin Certificate (end with Ctrl+D on a new line):"
cat > "$SSL_DIR/origin.crt"

echo ""

# Get private key
echo "Paste your Private Key (end with Ctrl+D on a new line):"
cat > "$SSL_DIR/origin.key"

# Set permissions
chmod 600 "$SSL_DIR/origin.key"
chmod 644 "$SSL_DIR/origin.crt"

echo ""
echo "✅ SSL certificates saved to $SSL_DIR/"
echo ""
echo "Next: Run ./scripts/deploy.sh to start the application"
