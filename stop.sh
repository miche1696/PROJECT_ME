#!/bin/bash

# Stop all running servers for the Note-Taking App

echo "Stopping all servers..."

# Load the actual port from .env
if [ -f "backend/.env" ]; then
    export $(grep -v '^#' backend/.env | xargs 2>/dev/null)
fi
BACKEND_PORT=${FLASK_PORT:-5000}

# Kill backend by actual configured port
BACKEND_PIDS=$(lsof -ti :$BACKEND_PORT 2>/dev/null)
if [ -n "$BACKEND_PIDS" ]; then
    echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null
    echo "✓ Backend stopped (port $BACKEND_PORT)"
else
    echo "  Backend not running on port $BACKEND_PORT"
fi

# Kill frontend by port 5173 (Vite dev server)
FRONTEND_PIDS=$(lsof -ti :5173 2>/dev/null)
if [ -n "$FRONTEND_PIDS" ]; then
    echo "$FRONTEND_PIDS" | xargs kill -9 2>/dev/null
    echo "✓ Frontend stopped (port 5173)"
else
    echo "  Frontend not running"
fi

echo "Done!"
