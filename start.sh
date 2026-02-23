#!/bin/bash

DOCKER="/Applications/Docker.app/Contents/Resources/bin/docker"
SERVER_DIR="$(dirname "$0")/server"
URL="http://localhost:3001"

# Start Docker Desktop if not running
if ! $DOCKER info &>/dev/null; then
  echo "Starting Docker Desktop..."
  open /Applications/Docker.app
  echo "Waiting for Docker to be ready..."
  until $DOCKER info &>/dev/null; do
    sleep 2
  done
fi

# Start Postgres
echo "Starting Postgres..."
$DOCKER start budgetplanner-db-1

# Wait until Postgres is ready
echo "Waiting for Postgres to be ready..."
for i in {1..20}; do
  if $DOCKER exec budgetplanner-db-1 pg_isready -U budget_user -d budget_planner -q 2>/dev/null; then
    break
  fi
  sleep 1
done

# Start server
echo "Starting server..."
cd "$SERVER_DIR" && node src/index.js &
SERVER_PID=$!

# Wait briefly then open browser
sleep 2
open "$URL"

echo ""
echo "Budget Planner is running at $URL"
echo "Press Ctrl+C to stop."

# Stop everything on Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $SERVER_PID 2>/dev/null; $DOCKER stop budgetplanner-db-1; exit 0" SIGINT SIGTERM

wait $SERVER_PID
