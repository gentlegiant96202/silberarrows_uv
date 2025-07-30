-- Add Individual Salespeople Tracking to Service Department System
-- This script adds individual salesperson total sales columns to the existing daily_service_metrics table

-- 1. Add individual salesperson total sales columns to daily_service_metrics table
ALTER TABLE daily_service_metrics 
ADD COLUMN IF NOT EXISTS daniel_total_sales DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS essrar_total_sales DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucy_total_sales DECIMAL(15,2) DEFAULT 0;

-- 2. Update RLS policies to include new columns (if needed)
-- The existing RLS policies should automatically cover these new columns

-- 3. Update the calculation trigger to handle individual salesperson data
-- The trigger will still calculate department-wide metrics, individual sales are input manually

RAISE NOTICE 'Individual salesperson tracking columns added successfully';
RAISE NOTICE 'Added columns: daniel_total_sales, essrar_total_sales, lucy_total_sales';
RAISE NOTICE 'These columns will store cumulative monthly sales figures for each salesperson'; 