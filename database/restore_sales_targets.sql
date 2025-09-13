-- Check and restore sales targets data

-- First check if any targets exist
SELECT 
    'Current targets count' as check_type,
    COUNT(*) as count 
FROM sales_monthly_targets;

-- Show all existing targets
SELECT 
    id,
    year,
    month,
    gross_profit_year_target,
    gross_profit_month_target,
    number_of_working_days,
    created_at
FROM sales_monthly_targets
ORDER BY year DESC, month DESC;

-- If no targets exist, restore the sample January 2025 target
INSERT INTO sales_monthly_targets (year, month, gross_profit_year_target, gross_profit_month_target, number_of_working_days)
SELECT 2025, 1, 12000000.00, 1000000.00, 20
WHERE NOT EXISTS (
    SELECT 1 FROM sales_monthly_targets WHERE year = 2025 AND month = 1
);

-- Verify the restoration
SELECT 
    'After restoration' as check_type,
    COUNT(*) as count 
FROM sales_monthly_targets;

SELECT 'Sales targets checked and restored if needed!' as status; 