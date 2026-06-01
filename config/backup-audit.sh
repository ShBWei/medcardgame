#!/bin/bash
# ── MediCard 医杀 — Backup + Audit + Integrity Check ───────────
# Crontab: 0 3 * * * /home/ubuntu/medcardgame/config/backup-audit.sh

set -e
TS=$(date +%Y%m%d_%H%M%S)
PROJECT="/home/ubuntu/medcardgame"
BACKUP_DIR="/home/ubuntu/backups/medicard"
LOG="$BACKUP_DIR/audit-$TS.log"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# ── 1. Integrity check ─────────────────────────────────────────
echo "=== Integrity Check $TS ===" > "$LOG"

# Check if server running
if pgrep -f "node.*server.js" >/dev/null; then
  echo "OK server.js running" >> "$LOG"
else
  echo "CRITICAL server.js NOT running" >> "$LOG"
fi

# Check for modified files (exclude node_modules)
if command -v git &>/dev/null; then
  cd "$PROJECT"
  if git status --porcelain | grep -v node_modules | grep -v '.log' | grep -v 'backups' > /tmp/git-diff.log 2>/dev/null; then
    if [ -s /tmp/git-diff.log ]; then
      echo "WARN Uncommitted changes:" >> "$LOG"
      cat /tmp/git-diff.log >> "$LOG"
    fi
  fi
fi

# Check for suspicious files (executable in src/)
find "$PROJECT/src" -type f -executable 2>/dev/null | while read f; do
  echo "WARN Executable in src: $f" >> "$LOG"
done

# Check for world-writable files
find "$PROJECT" -not -path "*/node_modules/*" -perm -002 -type f 2>/dev/null | while read f; do
  echo "WARN World-writable: $f" >> "$LOG"
done

# Check for files owned by unexpected users
find "$PROJECT" -not -user root -not -user ubuntu -not -path "*/node_modules/*" 2>/dev/null | while read f; do
  echo "WARN Strange owner: $f" >> "$LOG"
done

# ── 2. Audit suspicious auth attempts ──────────────────────────
echo "=== Auth Audit ===" >> "$LOG"
if [ -f /var/log/auth.log ]; then
  grep "Failed password" /var/log/auth.log | tail -20 >> "$LOG" 2>/dev/null || true
  grep "authentication failure" /var/log/auth.log | tail -10 >> "$LOG" 2>/dev/null || true
fi

# ── 3. Check active connections ────────────────────────────────
echo "=== Active Connections ===" >> "$LOG"
ss -tunlp 2>/dev/null | grep -E '(8080|9000|80|443)' >> "$LOG" || true

# ── 4. Disk usage ──────────────────────────────────────────────
echo "=== Disk Usage ===" >> "$LOG"
df -h / >> "$LOG"
du -sh "$PROJECT" >> "$LOG"

# ── 5. Check fail2ban status ───────────────────────────────────
if command -v fail2ban-client &>/dev/null; then
  echo "=== Fail2ban ===" >> "$LOG"
  fail2ban-client status medicard-404 2>/dev/null >> "$LOG" || echo "  medicard-404 jail not found" >> "$LOG"
  fail2ban-client status sshd 2>/dev/null >> "$LOG" || true
fi

# ── 6. Check for malware patterns ──────────────────────────────
echo "=== Malware Scan ===" >> "$LOG"
# Check for common backdoor patterns
grep -rn 'eval.*base64_decode\|eval.*gzinflate\|eval.*strrev\|system.*$_' \
  "$PROJECT/src" --include="*.js" 2>/dev/null >> "$LOG" && echo "  CRITICAL: Suspicious pattern found!" >> "$LOG" || echo "  Clean" >> "$LOG"

# Check for miner patterns
grep -rn 'coinhive\|cryptonight\|stratum\|mining' \
  "$PROJECT" --include="*.js" --include="*.html" 2>/dev/null >> "$LOG" && echo "  CRITICAL: Miner pattern!" >> "$LOG" || echo "  No miners" >> "$LOG"

# ── 7. Create backup ───────────────────────────────────────────
BACKUP_FILE="$BACKUP_DIR/medicard-$TS.tar.gz"
tar czf "$BACKUP_FILE" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='backups' \
  -C "$(dirname "$PROJECT")" "$(basename "$PROJECT")"

echo "Backup: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))" >> "$LOG"

# ── 8. Clean old backups ───────────────────────────────────────
find "$BACKUP_DIR" -name "medicard-*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "audit-*.log" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

echo "=== Audit complete $TS ===" >> "$LOG"
