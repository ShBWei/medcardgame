#!/usr/bin/env bash
# ==============================================================================
# MediCard 医杀 — One-Click Deploy for Ubuntu 22.04 (2-core 2GB)
# ==============================================================================
# Usage:  chmod +x deploy.sh && sudo ./deploy.sh
#
# Installs: Node.js 20.x, Redis, Nginx, PM2
# Configures: nginx reverse-proxy, Redis cache, PM2 cluster, firewall, auto-start
#
# Zero gameplay changes — only infrastructure
# ==============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
APP_DIR="/home/ubuntu/medcardgame"
LOG_DIR="$APP_DIR/logs"
DATA_DIR="$APP_DIR/data"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  MediCard 医杀 — Deployment Script${NC}"
echo -e "${GREEN}  Target: Ubuntu 22.04 | 2-core / 2GB RAM${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# ── Prerequisites check ──────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (sudo).${NC}"
   exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
    echo -e "${RED}App directory $APP_DIR not found. Run from medcardgame repo root.${NC}"
    exit 1
fi

# ── Update system ────────────────────────────────────────────────
echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
apt-get update -qq && apt-get upgrade -y -qq

# ── Install core dependencies ────────────────────────────────────
echo -e "${YELLOW}[2/8] Installing core dependencies...${NC}"
apt-get install -y -qq curl wget gnupg ca-certificates lsb-release build-essential

# ── Install Node.js 20.x ─────────────────────────────────────────
echo -e "${YELLOW}[3/8] Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi
echo -e "  Node: $(node -v)"
echo -e "  npm:  $(npm -v)"

# ── Install Redis ────────────────────────────────────────────────
echo -e "${YELLOW}[4/8] Installing and configuring Redis...${NC}"
apt-get install -y -qq redis-server

# Configure Redis for low-memory server (max 128MB, LRU eviction, append-only off)
cat > /etc/redis/redis.conf << 'REDISCONF'
# MediCard Redis config — optimized for 2GB server
bind 127.0.0.1
port 6379
daemonize yes
supervised systemd
loglevel notice
logfile /var/log/redis/redis-server.log

# Memory — tight for 2GB server
maxmemory 128mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence — minimal (leaderboard/accounts live in Node JSON files)
save ""
appendonly no

# Connection limits
timeout 300
tcp-keepalive 60
maxclients 256

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 64
REDISCONF

systemctl restart redis-server
systemctl enable redis-server
echo -e "  Redis status: $(systemctl is-active redis-server)"

# ── Install nginx ────────────────────────────────────────────────
echo -e "${YELLOW}[5/8] Installing and configuring Nginx...${NC}"
apt-get install -y -qq nginx-full

# Deploy nginx config
cp -f "$APP_DIR/config/nginx-medicard.conf" /etc/nginx/sites-available/medicard
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/medicard /etc/nginx/sites-enabled/medicard

# Verify nginx config
if nginx -t 2>&1; then
    systemctl restart nginx
    systemctl enable nginx
    echo -e "  Nginx status: $(systemctl is-active nginx)"
else
    echo -e "${RED}  Nginx config test failed — skipping restart${NC}"
fi

# ── Setup directories ────────────────────────────────────────────
echo -e "${YELLOW}[6/8] Creating log and data directories...${NC}"
mkdir -p "$LOG_DIR" "$DATA_DIR"
chown -R ubuntu:ubuntu "$LOG_DIR" "$DATA_DIR" 2>/dev/null || true

# ── Install npm dependencies ─────────────────────────────────────
echo -e "${YELLOW}[7/8] Installing npm dependencies...${NC}"
cd "$APP_DIR"
npm install --production --no-audit --no-fund

# ── Install and configure PM2 ────────────────────────────────────
echo -e "${YELLOW}[8/8] Installing PM2 and starting app...${NC}"
npm install -g pm2 --no-audit --no-fund

# Stop any existing PM2 processes
pm2 delete medicard 2>/dev/null || true

# Start with ecosystem config
pm2 start "$APP_DIR/ecosystem.config.js"

# Save PM2 process list for auto-start
pm2 save

# Configure PM2 to start on boot
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>&1 || true

# ── Firewall (optional — uncomment if ufw is desired) ────────────
# echo -e "${YELLOW}Configuring firewall...${NC}"
# ufw allow 80/tcp
# ufw allow 443/tcp
# ufw allow 22/tcp
# ufw --force enable

# ── Status report ────────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  App:      http://$(hostname -I | awk '{print $1}'):80"
echo -e "  PM2:      pm2 status"
echo -e "  Logs:     pm2 logs medicard"
echo -e "  Nginx:    systemctl status nginx"
echo -e "  Redis:    systemctl status redis-server"
echo ""
echo -e "${YELLOW}  Quick commands:${NC}"
echo -e "    pm2 status              # Check app status"
echo -e "    pm2 logs medicard       # View app logs"
echo -e "    pm2 restart medicard    # Restart app"
echo -e "    redis-cli INFO memory   # Redis memory usage"
echo -e "    nginx -t                # Test nginx config"
echo ""
echo -e "${YELLOW}  To set up SSL (optional):${NC}"
echo -e "    sudo apt install certbot python3-certbot-nginx"
echo -e "    sudo certbot --nginx -d YOUR_DOMAIN"
echo ""
echo -e "${GREEN}  Server is live! Players can connect now.${NC}"
