#!/bin/bash

# ===========================================
# Cloudflare Tunnel Setup Script
# ===========================================

set -e

echo "============================================"
echo "  Cloudflare Tunnel Setup for AdWatch"
echo "============================================"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "Installing cloudflared..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install cloudflare/cloudflare/cloudflared
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared.deb
        rm cloudflared.deb
    else
        echo "Unsupported OS. Please install cloudflared manually."
        echo "https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
        exit 1
    fi
fi

echo "cloudflared version: $(cloudflared --version)"
echo ""

# Check if already logged in
if ! cloudflared tunnel list &> /dev/null; then
    echo "Step 1: Login to Cloudflare"
    echo "This will open a browser window..."
    cloudflared tunnel login
    echo ""
fi

echo "Step 2: Create Tunnel"
echo ""

read -p "Enter tunnel name (e.g., adwatch-prod): " TUNNEL_NAME

if [ -z "$TUNNEL_NAME" ]; then
    TUNNEL_NAME="adwatch-prod"
fi

# Create tunnel
echo "Creating tunnel: $TUNNEL_NAME"
cloudflared tunnel create "$TUNNEL_NAME"

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
echo ""
echo "Tunnel ID: $TUNNEL_ID"

echo ""
echo "Step 3: Configure DNS"
echo ""

read -p "Enter your domain (e.g., api.adwatch.app): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "Domain is required!"
    exit 1
fi

# Create DNS route
echo "Creating DNS route: $DOMAIN -> $TUNNEL_NAME"
cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN"

echo ""
echo "Step 4: Generate Tunnel Token"
echo ""

# Get tunnel token
TUNNEL_TOKEN=$(cloudflared tunnel token "$TUNNEL_NAME")

echo "============================================"
echo "  SETUP COMPLETE!"
echo "============================================"
echo ""
echo "Add this to your .env file:"
echo ""
echo "CLOUDFLARE_TUNNEL_TOKEN=$TUNNEL_TOKEN"
echo "APP_URL=https://$DOMAIN"
echo ""
echo "============================================"
echo ""
echo "To start the service, run:"
echo "  docker-compose -f docker-compose.tunnel.yml up -d"
echo ""
echo "To check tunnel status:"
echo "  docker logs adwatch-tunnel"
echo ""
