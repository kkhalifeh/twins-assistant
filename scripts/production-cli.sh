#!/bin/bash

# Production Management CLI
# Manage your production server from your local machine

SERVER="root@209.250.253.59"
APP_DIR="/var/www/parenting-assistant"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to display help
show_help() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Production Management CLI${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Usage: ./scripts/production-cli.sh [command]"
  echo ""
  echo "Available commands:"
  echo ""
  echo -e "  ${GREEN}status${NC}              Check server and container status"
  echo -e "  ${GREEN}logs [service]${NC}      View logs (backend|frontend|all)"
  echo -e "  ${GREEN}deploy${NC}              Trigger manual deployment"
  echo -e "  ${GREEN}restart [service]${NC}   Restart services (backend|frontend|all)"
  echo ""
  echo -e "  ${YELLOW}db:status${NC}           View database tables and migration status"
  echo -e "  ${YELLOW}db:migrate${NC}          Run pending database migrations"
  echo -e "  ${YELLOW}db:clean${NC}            Delete all data (keeps schema)"
  echo -e "  ${YELLOW}db:backup${NC}           Create database backup"
  echo ""
  echo -e "  ${RED}data:delete-all${NC}     Delete all user data"
  echo -e "  ${RED}data:delete-feeding${NC} Delete all feeding logs"
  echo -e "  ${RED}data:delete-sleep${NC}   Delete all sleep logs"
  echo -e "  ${RED}data:delete-diapers${NC} Delete all diaper logs"
  echo ""
  echo -e "  ${BLUE}ssh${NC}                 SSH into the server"
  echo -e "  ${BLUE}help${NC}                Show this help message"
  echo ""
}

# Execute command on server
remote_exec() {
  ssh $SERVER "cd $APP_DIR && $1"
}

# Command: Status
cmd_status() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Production Server Status${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  echo -e "${YELLOW}📦 Container Status:${NC}"
  remote_exec "docker ps | grep parenting"
  echo ""

  echo -e "${YELLOW}🔌 Backend Health:${NC}"
  ssh $SERVER "curl -s http://localhost:3001/health | jq ." || echo -e "${RED}❌ Backend not responding${NC}"
  echo ""

  echo -e "${YELLOW}🌐 Frontend Status:${NC}"
  ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000" | \
    grep -q "200" && echo -e "${GREEN}✅ Frontend is running${NC}" || echo -e "${RED}❌ Frontend not responding${NC}"
  echo ""

  echo -e "${YELLOW}🗄️  Database:${NC}"
  remote_exec "docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c '\\\dt' | head -15"
}

# Command: Logs
cmd_logs() {
  local service=$1

  if [ "$service" = "backend" ]; then
    echo -e "${BLUE}📋 Backend Logs (last 50 lines):${NC}"
    ssh $SERVER "docker logs parenting_backend --tail 50 -f"
  elif [ "$service" = "frontend" ]; then
    echo -e "${BLUE}📋 Frontend Logs (last 50 lines):${NC}"
    ssh $SERVER "docker logs parenting_frontend --tail 50 -f"
  else
    echo -e "${BLUE}📋 All Logs (last 30 lines each):${NC}"
    echo ""
    echo -e "${YELLOW}━━━ Backend ━━━${NC}"
    ssh $SERVER "docker logs parenting_backend --tail 30"
    echo ""
    echo -e "${YELLOW}━━━ Frontend ━━━${NC}"
    ssh $SERVER "docker logs parenting_frontend --tail 30"
  fi
}

# Command: Deploy
cmd_deploy() {
  echo -e "${YELLOW}🚀 Triggering manual deployment...${NC}"
  ssh $SERVER "bash -s" < scripts/auto-deploy.sh
}

# Command: Restart
cmd_restart() {
  local service=$1

  if [ "$service" = "backend" ]; then
    echo -e "${YELLOW}🔄 Restarting backend...${NC}"
    ssh $SERVER "docker restart parenting_backend"
    echo -e "${GREEN}✅ Backend restarted${NC}"
  elif [ "$service" = "frontend" ]; then
    echo -e "${YELLOW}🔄 Restarting frontend...${NC}"
    ssh $SERVER "docker restart parenting_frontend"
    echo -e "${GREEN}✅ Frontend restarted${NC}"
  else
    echo -e "${YELLOW}🔄 Restarting all services...${NC}"
    ssh $SERVER "docker restart parenting_backend parenting_frontend"
    echo -e "${GREEN}✅ All services restarted${NC}"
  fi
}

# Command: DB Status
cmd_db_status() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Database Status${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  echo -e "${YELLOW}📊 Tables:${NC}"
  remote_exec "docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c '\\\dt'"
  echo ""

  echo -e "${YELLOW}🔄 Migration Status:${NC}"
  remote_exec "docker exec parenting_backend npx prisma migrate status"
}

# Command: DB Migrate
cmd_db_migrate() {
  echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
  remote_exec "docker exec parenting_backend npx prisma migrate deploy"
  echo -e "${GREEN}✅ Migrations complete${NC}"
}

# Command: DB Clean
cmd_db_clean() {
  echo -e "${RED}⚠️  WARNING: This will delete ALL data!${NC}"
  read -p "Are you sure? Type 'YES' to confirm: " confirm

  if [ "$confirm" = "YES" ]; then
    echo -e "${YELLOW}🗑️  Deleting all data...${NC}"
    ssh $SERVER << 'EOF'
      docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c "
        DELETE FROM \"FeedingLog\";
        DELETE FROM \"SleepLog\";
        DELETE FROM \"DiaperLog\";
        DELETE FROM \"HealthLog\";
        DELETE FROM \"Child\";
        DELETE FROM \"Account\";
        DELETE FROM \"User\";
      "
EOF
    echo -e "${GREEN}✅ All data deleted${NC}"
  else
    echo -e "${BLUE}ℹ️  Cancelled${NC}"
  fi
}

# Command: DB Backup
cmd_db_backup() {
  local backup_name="backup_$(date +%Y%m%d_%H%M%S).sql"
  echo -e "${YELLOW}💾 Creating database backup: $backup_name${NC}"

  ssh $SERVER "docker exec parenting_postgres pg_dump -U parenting_user parenting_assistant" > "$backup_name"

  echo -e "${GREEN}✅ Backup saved to: $backup_name${NC}"
  echo "   Size: $(du -h $backup_name | cut -f1)"
}

# Command: Delete Data
cmd_data_delete() {
  local type=$1

  echo -e "${RED}⚠️  WARNING: This will delete data!${NC}"
  read -p "Delete all $type data? Type 'YES' to confirm: " confirm

  if [ "$confirm" = "YES" ]; then
    case $type in
      all)
        ssh $SERVER "docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c 'DELETE FROM \"FeedingLog\"; DELETE FROM \"SleepLog\"; DELETE FROM \"DiaperLog\"; DELETE FROM \"HealthLog\"; DELETE FROM \"Child\";'"
        ;;
      feeding)
        ssh $SERVER "docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c 'DELETE FROM \"FeedingLog\";'"
        ;;
      sleep)
        ssh $SERVER "docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c 'DELETE FROM \"SleepLog\";'"
        ;;
      diapers)
        ssh $SERVER "docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c 'DELETE FROM \"DiaperLog\";'"
        ;;
    esac
    echo -e "${GREEN}✅ Data deleted${NC}"
  else
    echo -e "${BLUE}ℹ️  Cancelled${NC}"
  fi
}

# Main command router
case "$1" in
  status)
    cmd_status
    ;;
  logs)
    cmd_logs "$2"
    ;;
  deploy)
    cmd_deploy
    ;;
  restart)
    cmd_restart "$2"
    ;;
  db:status)
    cmd_db_status
    ;;
  db:migrate)
    cmd_db_migrate
    ;;
  db:clean)
    cmd_db_clean
    ;;
  db:backup)
    cmd_db_backup
    ;;
  data:delete-all)
    cmd_data_delete "all"
    ;;
  data:delete-feeding)
    cmd_data_delete "feeding"
    ;;
  data:delete-sleep)
    cmd_data_delete "sleep"
    ;;
  data:delete-diapers)
    cmd_data_delete "diapers"
    ;;
  ssh)
    ssh $SERVER "cd $APP_DIR && bash"
    ;;
  help|"")
    show_help
    ;;
  *)
    echo -e "${RED}❌ Unknown command: $1${NC}"
    echo ""
    show_help
    exit 1
    ;;
esac
