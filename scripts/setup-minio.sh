#!/bin/bash

# Ensure MinIO is running (assumes docker-compose has started minio on port 9000)
# Uses the MinIO Client (mc). Download it if you don't have it.

echo "Setting up MinIO dev bucket..."

# Configure mc alias for local dev
mc alias set localdev http://localhost:9000 minioadmin minioadmin

# Create bucket
mc mb localdev/campusverse-media

# Set bucket policy to public read
mc anonymous set download localdev/campusverse-media

echo "MinIO dev bucket 'campusverse-media' is ready!"
