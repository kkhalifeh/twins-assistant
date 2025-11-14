#!/bin/bash
set -e

echo "🚀 Starting frontend deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="parenting_frontend"
IMAGE_NAME="parenting-assistant-frontend"
PORT=3000
ENV_VAR="NEXT_PUBLIC_API_URL=https://parenting.atmata.ai/api"

echo -e "${YELLOW}Step 1: Stopping and removing existing container...${NC}"
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo -e "${YELLOW}Step 2: Removing old image...${NC}"
docker rmi $IMAGE_NAME 2>/dev/null || true

echo -e "${YELLOW}Step 3: Building fresh frontend image...${NC}"
docker build -t $IMAGE_NAME -f frontend/Dockerfile frontend/

echo -e "${YELLOW}Step 4: Starting new frontend container...${NC}"
docker run -d \
  --name $CONTAINER_NAME \
  --restart=always \
  -p 127.0.0.1:$PORT:$PORT \
  -e $ENV_VAR \
  $IMAGE_NAME

echo -e "${YELLOW}Step 5: Waiting for container to be healthy...${NC}"
sleep 10

echo -e "${YELLOW}Step 6: Checking container status...${NC}"
docker ps | grep $CONTAINER_NAME

echo -e "${YELLOW}Step 7: Reloading nginx...${NC}"
systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true

echo -e "${GREEN}✅ Frontend deployment completed successfully!${NC}"
echo -e "${GREEN}Frontend is now running on port $PORT${NC}"
