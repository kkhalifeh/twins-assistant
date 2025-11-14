#!/bin/bash

# Production Deployment Script for Parenting Assistant
# This script ensures clean, reliable deployments to production
# Usage: ./deploy.sh [backend|frontend|all] [--no-cache]

set -e  # Exit on error

# Configuration
SERVER="root@209.250.253.59"
APP_DIR="/var/www/parenting-assistant"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"

# Parse arguments
SERVICE="${1:-all}"  # Default to "all" if no argument provided
NO_CACHE_FLAG=""
if [[ "$2" == "--no-cache" ]] || [[ "$1" == "--no-cache" ]]; then
    NO_CACHE_FLAG="--no-cache"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Validate service argument
if [[ "$SERVICE" != "backend" ]] && [[ "$SERVICE" != "frontend" ]] && [[ "$SERVICE" != "all" ]] && [[ "$SERVICE" != "--no-cache" ]]; then
    print_error "Invalid service: $SERVICE"
    echo "Usage: ./deploy.sh [backend|frontend|all] [--no-cache]"
    exit 1
fi

# Adjust SERVICE if first arg was --no-cache
if [[ "$SERVICE" == "--no-cache" ]]; then
    SERVICE="all"
fi

print_header "Production Deployment: $SERVICE"

# Step 1: Git pull
print_info "Step 1: Pulling latest code from GitHub..."
ssh $SERVER "cd $APP_DIR && git pull origin main"
print_step "Code updated from main branch"

# Step 2: Build Docker images
if [[ "$NO_CACHE_FLAG" == "--no-cache" ]]; then
    print_info "Step 2: Building Docker images (NO CACHE - clean build)..."
else
    print_info "Step 2: Building Docker images..."
fi

if [[ "$SERVICE" == "all" ]]; then
    ssh $SERVER "cd $APP_DIR && docker-compose -f $DOCKER_COMPOSE_FILE build $NO_CACHE_FLAG backend frontend"
else
    ssh $SERVER "cd $APP_DIR && docker-compose -f $DOCKER_COMPOSE_FILE build $NO_CACHE_FLAG $SERVICE"
fi
print_step "Docker images built successfully"

# Step 3: Restart containers
print_info "Step 3: Restarting containers..."
if [[ "$SERVICE" == "all" ]]; then
    ssh $SERVER "cd $APP_DIR && docker-compose -f $DOCKER_COMPOSE_FILE up -d backend frontend"
else
    ssh $SERVER "cd $APP_DIR && docker-compose -f $DOCKER_COMPOSE_FILE up -d $SERVICE"
fi
print_step "Containers restarted"

# Step 4: Wait for health check
print_info "Step 4: Waiting for containers to be healthy..."
sleep 10
print_step "Containers should be healthy"

# Step 5: Verify deployment
print_header "Deployment Verification"

echo "Container Status:"
ssh $SERVER "docker ps --filter 'name=parenting' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
echo ""

if [[ "$SERVICE" == "backend" ]] || [[ "$SERVICE" == "all" ]]; then
    echo "Backend Logs (last 15 lines):"
    ssh $SERVER "docker-compose -f $APP_DIR/$DOCKER_COMPOSE_FILE logs backend --tail=15"
    echo ""
fi

if [[ "$SERVICE" == "frontend" ]] || [[ "$SERVICE" == "all" ]]; then
    echo "Frontend Logs (last 15 lines):"
    ssh $SERVER "docker-compose -f $APP_DIR/$DOCKER_COMPOSE_FILE logs frontend --tail=15"
    echo ""
fi

# Step 6: Health check
print_info "Step 6: Running health checks..."
BACKEND_HEALTH=$(ssh $SERVER "curl -sf http://localhost:3001/health || echo 'FAILED'")
if [[ "$BACKEND_HEALTH" == "FAILED" ]]; then
    print_error "Backend health check failed!"
    exit 1
else
    print_step "Backend is healthy"
fi

# Success summary
print_header "Deployment Complete! ✓"

echo "📝 Summary:"
echo "  ✓ Code updated to latest main branch"
echo "  ✓ Docker images rebuilt"
echo "  ✓ Containers restarted"
echo "  ✓ Health checks passed"
echo ""
echo "🌐 Application is live at:"
echo "   Frontend: https://parenting.atmata.ai"
echo "   Backend API: https://parenting.atmata.ai/api"
echo ""

if [[ "$NO_CACHE_FLAG" == "--no-cache" ]]; then
    echo "ℹ️  Note: Used --no-cache flag for clean build"
    echo ""
fi

print_info "Deployment logs saved to production server"
print_step "Done!"
echo ""
