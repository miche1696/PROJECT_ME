#!/bin/bash

# Stop all running servers for the Note-Taking App

echo "Stopping all servers..."

# Kill backend by port 5001 (more reliable than process name)
BACKEND_PIDS=$(lsof -ti :5001 2>/dev/null)
if [ -n "$BACKEND_PIDS" ]; then
    echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null
    echo "✓ Backend stopped (port 5001)"
else
    echo "  Backend not running"
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
