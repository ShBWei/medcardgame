#!/bin/bash
# ── MediCard 医杀 — Firewall + Fail2ban Hardening ──────────────
# Run: sudo bash config/setup-firewall.sh

set -e

echo "=== MediCard Firewall Setup ==="

# ── 1. UFW — minimum ports only ────────────────────────────────
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment 'SSH'
ufw allow 80/tcp    comment 'HTTP'
ufw allow 443/tcp   comment 'HTTPS'
ufw --force enable
ufw status verbose

# ── 2. iptables — connection rate limits ───────────────────────
# SSH: max 5 new connections per minute
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 6 -j DROP

# HTTP: max 30 new connections per minute from same IP
iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 31 -j DROP

# HTTPS: max 30 new connections per minute
iptables -A INPUT -p tcp --dport 443 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 443 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 31 -j DROP

# Drop invalid packets
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

# Limit SYN floods
iptables -A INPUT -p tcp --syn -m limit --limit 100/s --limit-burst 150 -j ACCEPT
iptables -A INPUT -p tcp --syn -j DROP

# Block port scans
iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP
iptables -A INPUT -p tcp --tcp-flags ALL ALL -j DROP

# Save iptables rules
if command -v netfilter-persistent &>/dev/null; then
  netfilter-persistent save
elif command -v iptables-save &>/dev/null; then
  iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
fi

echo "iptables rules applied"

# ── 3. Sysctl — network hardening ──────────────────────────────
cat >> /etc/sysctl.d/99-medicard-hardening.conf <<'SYSCTL'
# IP spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
# Ignore source-routed packets
net.ipv4.conf.all.accept_source_route = 0
# SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
# Reduce TIME_WAIT
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
# Disable IP forwarding
net.ipv4.ip_forward = 0
SYSCTL
sysctl -p /etc/sysctl.d/99-medicard-hardening.conf

# ── 4. fail2ban — jails ────────────────────────────────────────
if ! command -v fail2ban-server &>/dev/null; then
  apt-get update -qq && apt-get install -y fail2ban
fi

cat > /etc/fail2ban/jail.local <<'FAIL2BAN'
[DEFAULT]
bantime = 600
findtime = 300
maxretry = 6
banaction = iptables-multiport

[sshd]
enabled = true
mode = aggressive
maxretry = 3
bantime = 1800

[nginx-http-auth]
enabled = true
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-botsearch]
enabled = true
logpath = /var/log/nginx/access.log
maxretry = 3
findtime = 60

[nginx-limit-req]
enabled = true
logpath = /var/log/nginx/error.log
maxretry = 5

[medicard-404]
enabled = true
logpath = /var/log/nginx/access.log
maxretry = 20
findtime = 60
failregex = ^<HOST>.* 404 .*/(wp-admin|\.env|\.git|admin\.php|xmlrpc|\.sql|config)
FAIL2BAN

systemctl restart fail2ban
fail2ban-client status

echo "=== Firewall + fail2ban setup complete ==="
