#!/bin/bash
# Backup script for Postgres Database
# Usage: ./backup-db.sh

set -e

# Configuration
DB_USER=${POSTGRES_USER:-user}
DB_HOST=${POSTGRES_HOST:-localhost}
DB_NAME=${POSTGRES_DB:-campusverse}
BACKUP_DIR=${BACKUP_DIR:-"/var/backups/postgres"}
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"

echo "Starting database backup for ${DB_NAME} at ${DATE}..."

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Run pg_dump and compress the output
pg_dump -U "${DB_USER}" -h "${DB_HOST}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"

echo "Backup completed successfully: ${BACKUP_FILE}"

# Optional: Upload to S3
# aws s3 cp "${BACKUP_FILE}" s3://my-backup-bucket/db-backups/
