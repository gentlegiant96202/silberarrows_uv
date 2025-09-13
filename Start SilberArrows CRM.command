#!/bin/bash

# SilberArrows CRM - Double-Click Startup
# This file can be double-clicked on macOS to start the development server

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Change to the project directory
cd "$SCRIPT_DIR"

# Run the main startup script
./start-dev.sh

# Keep terminal open after script ends
echo ""
echo "🛑 Development server stopped."
echo "   Close this window or press Ctrl+C to exit."
read -p "Press Enter to exit..." 