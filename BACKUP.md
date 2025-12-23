# Database Backup & Restore Guide

This document explains how to backup and restore the Parenting Assistant database.

## Automated Backups

The application automatically creates daily backups at **1:00 AM** server time.

### Backup Details

- **Schedule**: Daily at 1:00 AM
- **Location**: `/var/backups/parenting-assistant/`
- **Retention**: 30 days (older backups are automatically deleted)
- **Format**: Compressed SQL dumps (`.sql.gz`)
- **Naming**: `parenting_assistant_backup_YYYYMMDD_HHMMSS.sql.gz`
- **Log File**: `/var/log/parenting-backup.log`

### Backup Features

- ✅ Automatic compression to save disk space
- ✅ Integrity verification after each backup
- ✅ Automatic cleanup of old backups (30+ days)
- ✅ Symlink to latest backup for easy access
- ✅ Detailed logging

## Manual Backup

To create a manual backup:

```bash
# SSH into the server
ssh root@209.250.253.59

# Run the backup script
/var/www/parenting-assistant/scripts/backup-database.sh
```

The backup will be saved to `/var/backups/parenting-assistant/`

## Viewing Backups

To list all available backups:

```bash
ssh root@209.250.253.59 "ls -lh /var/backups/parenting-assistant/"
```

To view the backup log:

```bash
ssh root@209.250.253.59 "tail -f /var/log/parenting-backup.log"
```

## Restoring from Backup

### Restore from Latest Backup

```bash
# SSH into the server
ssh root@209.250.253.59

# Run the restore script (uses latest backup)
/var/www/parenting-assistant/scripts/restore-database.sh
```

### Restore from Specific Backup

```bash
# List available backups first
/var/www/parenting-assistant/scripts/restore-database.sh --help

# Restore from specific backup
/var/www/parenting-assistant/scripts/restore-database.sh parenting_assistant_backup_20251223_010000.sql.gz
```

### Important Notes About Restore

⚠️ **WARNING**: Restoring will REPLACE the current database!

- The restore script creates a safety backup before restoring
- The backend is automatically stopped during restore
- The backend is automatically restarted after restore
- Database integrity is verified after restore

## Downloading Backups

To download a backup to your local machine:

```bash
# Download the latest backup
scp root@209.250.253.59:/var/backups/parenting-assistant/latest_backup.sql.gz ./

# Download a specific backup
scp root@209.250.253.59:/var/backups/parenting-assistant/parenting_assistant_backup_20251223_010000.sql.gz ./
```

## Manual Database Operations

### Create Manual Backup (Without Script)

```bash
docker exec parenting_postgres sh -c "PGPASSWORD='pArent1ng2024!' pg_dump -U parenting_user parenting_assistant" | gzip > backup.sql.gz
```

### Restore Manual Backup (Without Script)

```bash
# Stop backend
docker stop parenting_backend

# Drop and recreate database
docker exec parenting_postgres sh -c "PGPASSWORD='pArent1ng2024!' psql -U parenting_user -c 'DROP DATABASE IF EXISTS parenting_assistant;'"
docker exec parenting_postgres sh -c "PGPASSWORD='pArent1ng2024!' psql -U parenting_user -c 'CREATE DATABASE parenting_assistant;'"

# Restore from backup
gunzip -c backup.sql.gz | docker exec -i parenting_postgres sh -c "PGPASSWORD='pArent1ng2024!' psql -U parenting_user parenting_assistant"

# Start backend
docker start parenting_backend
```

## Monitoring Backups

### Check Backup Status

```bash
# View last 20 lines of backup log
ssh root@209.250.253.59 "tail -20 /var/log/parenting-backup.log"

# Check if backups are running
ssh root@209.250.253.59 "crontab -l | grep backup"

# Check disk space used by backups
ssh root@209.250.253.59 "du -sh /var/backups/parenting-assistant/"
```

### Check Cron Job

```bash
# View all cron jobs
ssh root@209.250.253.59 "crontab -l"

# Check if cron service is running
ssh root@209.250.253.59 "systemctl status cron"
```

## Troubleshooting

### Backup Failed

1. Check the log file:
   ```bash
   ssh root@209.250.253.59 "tail -50 /var/log/parenting-backup.log"
   ```

2. Check if database container is running:
   ```bash
   ssh root@209.250.253.59 "docker ps | grep parenting_postgres"
   ```

3. Check disk space:
   ```bash
   ssh root@209.250.253.59 "df -h"
   ```

4. Run backup manually to see errors:
   ```bash
   ssh root@209.250.253.59 "/var/www/parenting-assistant/scripts/backup-database.sh"
   ```

### Restore Failed

1. Check that the backup file exists and is valid:
   ```bash
   gzip -t /var/backups/parenting-assistant/backup_file.sql.gz
   ```

2. Check database container logs:
   ```bash
   docker logs parenting_postgres
   ```

3. The restore script creates a safety backup before restore at `/tmp/pre_restore_backup_*.sql.gz`

## Configuration

### Change Backup Schedule

To change the backup schedule, edit the crontab:

```bash
ssh root@209.250.253.59 "crontab -e"
```

Example schedules:
- `0 1 * * *` - Daily at 1:00 AM (current)
- `0 */6 * * *` - Every 6 hours
- `0 2 * * 0` - Weekly on Sunday at 2:00 AM
- `0 3 1 * *` - Monthly on the 1st at 3:00 AM

### Change Retention Period

Edit `/var/www/parenting-assistant/scripts/backup-database.sh` and modify:

```bash
RETENTION_DAYS=30  # Change to desired number of days
```

## Best Practices

1. **Test Restores Regularly**: Periodically test the restore process to ensure backups are valid
2. **Monitor Disk Space**: Keep an eye on `/var/backups/` disk usage
3. **Download Critical Backups**: For important data, download backups to a separate location
4. **Check Logs**: Regularly review `/var/log/parenting-backup.log` for any issues
5. **Keep Multiple Copies**: Consider copying backups to cloud storage or another server

## Emergency Recovery

If the database is completely lost:

1. Download the latest backup from the server
2. SSH into the server
3. Run the restore script:
   ```bash
   /var/www/parenting-assistant/scripts/restore-database.sh
   ```
4. Verify the application is working correctly

## Support

For issues with backups or restores, check:
- `/var/log/parenting-backup.log` - Backup logs
- `docker logs parenting_postgres` - Database logs
- `docker logs parenting_backend` - Backend logs
