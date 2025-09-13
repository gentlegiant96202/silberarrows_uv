#!/bin/bash

# Scraper runner script for background execution
# Usage: ./run-scraper.sh [max_leads] [log_file]

MAX_LEADS=${1:-20}
LOG_FILE=${2:-"scraper-$(date +%Y%m%d-%H%M%S).log"}

echo "🚀 Starting Dubizzle scraper in background mode..."
echo "📊 Max leads: $MAX_LEADS"
echo "📝 Log file: $LOG_FILE"

# Default Dubizzle URL for Mercedes-Benz cars
DUBIZZLE_URL="https://dubai.dubizzle.com/motors/used-cars/mercedes-benz/?seller_type=OW&regional_specs=824&regional_specs=827&fuel_type=380&fuel_type=383&kilometers__lte=100000&kilometers__gte=0&year__gte=2015&year__lte=2026"

# Run the scraper and log output
nohup npm run scrape:dubizzle -- "$DUBIZZLE_URL" $MAX_LEADS > "$LOG_FILE" 2>&1 &

SCRAPER_PID=$!
echo "✅ Scraper started with PID: $SCRAPER_PID"
echo "📋 Monitor progress: tail -f $LOG_FILE"
echo "🛑 Stop scraper: kill $SCRAPER_PID"

# Save PID for easy stopping
echo $SCRAPER_PID > scraper.pid
echo "💾 PID saved to scraper.pid"

echo ""
echo "🔍 To monitor in real-time:"
echo "   tail -f $LOG_FILE"
echo ""
echo "🛑 To stop the scraper:"
echo "   kill $SCRAPER_PID"
echo "   # or"
echo "   kill \$(cat scraper.pid)" 