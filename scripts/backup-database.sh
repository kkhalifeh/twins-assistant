#!/bin/bash

# Database Backup Script for Parenting Assistant
# This script creates a full backup of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/var/backups/parenting-assistant"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="parenting_assistant_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
RETENTION_DAYS=30

# Database credentials
DB_CONTAINER="parenting_postgres"
DB_NAME="parenting_assistant"
DB_USER="parenting_user"
DB_PASSWORD="pArent1ng2024!"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    log "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Check if database container is running
if ! docker ps | grep -q "$DB_CONTAINER"; then
    error "Database container '$DB_CONTAINER' is not running"
    exit 1
fi

log "Starting database backup..."

# Create the backup
if docker exec "$DB_CONTAINER" sh -c "PGPASSWORD='$DB_PASSWORD' pg_dump -U $DB_USER $DB_NAME" > "$BACKUP_PATH"; then
    log "Database backup created successfully: $BACKUP_FILE"

    # Compress the backup
    log "Compressing backup..."
    gzip "$BACKUP_PATH"
    BACKUP_PATH="${BACKUP_PATH}.gz"

    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    log "Compressed backup size: $BACKUP_SIZE"

    # Create a "latest" symlink
    ln -sf "$BACKUP_PATH" "${BACKUP_DIR}/latest_backup.sql.gz"
    log "Updated latest backup symlink"
else
    error "Failed to create database backup"
    exit 1
fi

# Clean up old backups (keep only last RETENTION_DAYS)
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "parenting_assistant_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "parenting_assistant_backup_*.sql.gz" -type f | wc -l)
log "Retained $REMAINING_BACKUPS backup(s)"

# Verify backup integrity
log "Verifying backup integrity..."
if gzip -t "$BACKUP_PATH" 2>/dev/null; then
    log "Backup integrity verified successfully"
else
    error "Backup file is corrupted!"
    exit 1
fi

# Log backup completion
log "✅ Backup completed successfully!"
log "Backup location: $BACKUP_PATH"

# Optional: Send notification (uncomment and configure if needed)
# curl -X POST "https://your-notification-service.com/notify" \
#   -H "Content-Type: application/json" \
#   -d "{\"message\": \"Database backup completed successfully\", \"file\": \"$BACKUP_FILE\", \"size\": \"$BACKUP_SIZE\"}"

exit 0
