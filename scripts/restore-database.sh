#!/bin/bash

# Database Restore Script for Parenting Assistant
# This script restores the PostgreSQL database from a backup file

set -e

# Configuration
BACKUP_DIR="/var/backups/parenting-assistant"
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

# Function to show usage
usage() {
    echo "Usage: $0 [BACKUP_FILE]"
    echo ""
    echo "If no backup file is specified, the latest backup will be used."
    echo ""
    echo "Examples:"
    echo "  $0                                    # Restore from latest backup"
    echo "  $0 parenting_assistant_backup_20251223_010000.sql.gz"
    echo ""
    echo "Available backups:"
    ls -lht "$BACKUP_DIR"/parenting_assistant_backup_*.sql.gz 2>/dev/null | head -10 || echo "  No backups found"
    exit 1
}

# Parse arguments
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    usage
fi

# Determine backup file to restore
if [ -z "$1" ]; then
    # Use latest backup
    BACKUP_FILE="${BACKUP_DIR}/latest_backup.sql.gz"
    if [ ! -f "$BACKUP_FILE" ]; then
        error "No latest backup found at $BACKUP_FILE"
        usage
    fi
    log "Using latest backup: $(readlink -f $BACKUP_FILE)"
else
    # Use specified backup
    if [[ "$1" == /* ]]; then
        BACKUP_FILE="$1"
    else
        BACKUP_FILE="${BACKUP_DIR}/$1"
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        error "Backup file not found: $BACKUP_FILE"
        usage
    fi
fi

# Check if database container is running
if ! docker ps | grep -q "$DB_CONTAINER"; then
    error "Database container '$DB_CONTAINER' is not running"
    exit 1
fi

# Verify backup file integrity
log "Verifying backup integrity..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
        error "Backup file is corrupted!"
        exit 1
    fi
fi
log "Backup integrity verified"

# Confirm restore
warn "⚠️  WARNING: This will REPLACE the current database with the backup!"
warn "Database: $DB_NAME"
warn "Backup: $(basename $BACKUP_FILE)"
warn "Backup date: $(stat -c %y "$BACKUP_FILE" 2>/dev/null || stat -f %Sm "$BACKUP_FILE")"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Restore cancelled"
    exit 0
fi

# Create a backup before restore (just in case)
SAFETY_BACKUP="/tmp/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
log "Creating safety backup before restore..."
docker exec "$DB_CONTAINER" sh -c "PGPASSWORD='$DB_PASSWORD' pg_dump -U $DB_USER $DB_NAME" | gzip > "$SAFETY_BACKUP"
log "Safety backup created: $SAFETY_BACKUP"

# Stop backend to prevent connections during restore
log "Stopping backend container..."
docker stop parenting_backend 2>/dev/null || warn "Backend container not running"

# Drop and recreate database
log "Dropping existing database..."
docker exec "$DB_CONTAINER" sh -c "PGPASSWORD='$DB_PASSWORD' psql -U $DB_USER -c 'DROP DATABASE IF EXISTS $DB_NAME;'"

log "Creating new database..."
docker exec "$DB_CONTAINER" sh -c "PGPASSWORD='$DB_PASSWORD' psql -U $DB_USER -c 'CREATE DATABASE $DB_NAME;'"

# Restore from backup
log "Restoring database from backup..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" sh -c "PGPASSWORD='$DB_PASSWORD' psql -U $DB_USER $DB_NAME"
else
    cat "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" sh -c "PGPASSWORD='$DB_PASSWORD' psql -U $DB_USER $DB_NAME"
fi

log "Database restored successfully"

# Restart backend
log "Starting backend container..."
docker start parenting_backend

# Wait for backend to be healthy
log "Waiting for backend to be ready..."
sleep 5

# Verify restore
log "Verifying database connection..."
if docker exec "$DB_CONTAINER" sh -c "PGPASSWORD='$DB_PASSWORD' psql -U $DB_USER $DB_NAME -c 'SELECT COUNT(*) FROM \"User\";'" > /dev/null 2>&1; then
    log "✅ Database restore completed successfully!"
    log "Safety backup kept at: $SAFETY_BACKUP"
    log "You can delete it if everything looks good."
else
    error "Database verification failed!"
    warn "Safety backup available at: $SAFETY_BACKUP"
    exit 1
fi

exit 0
