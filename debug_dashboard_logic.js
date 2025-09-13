// Debug script to test the dashboard filtering logic
// Copy and paste this in your browser console on the dashboard page

console.log("🔍 Debugging Consignment Cars for January 2025...");

// Test the date filtering logic used in the dashboard
const year = 2025;

// This is the same logic used in ConsignmentAcquisitionsChart
const startDate = new Date(year, 0, 1).toISOString();
const endDate = new Date(year, 11, 31).toISOString();

console.log("📅 Date range being used:");
console.log("Start:", startDate);
console.log("End:", endDate);

// Test month filtering logic
const testDates = [
    '2025-01-27T13:37:21.000Z',  // This should be January
    '2025-01-15T10:30:00.000Z',  // This should be January
    '2025-02-17T11:20:01.000Z'   // This should be February
];

console.log("\n🧪 Testing month filtering logic:");
testDates.forEach((dateStr, index) => {
    const carDate = new Date(dateStr);
    const month = carDate.getMonth() + 1;  // JavaScript months are 0-based
    console.log(`Date ${index + 1}: ${dateStr}`);
    console.log(`  - JavaScript getMonth(): ${carDate.getMonth()}`);
    console.log(`  - Calculated month: ${month}`);
    console.log(`  - Should be January (1): ${month === 1}`);
    console.log("");
});

// Test the exact filtering used in the dashboard
async function testConsignmentQuery() {
    console.log("🔗 Testing actual Supabase query...");
    
    try {
        const { data: cars, error } = await supabase
            .from('cars')
            .select('id, stock_number, ownership_type, created_at, vehicle_model')
            .eq('ownership_type', 'consignment')
            .gte('created_at', new Date(2025, 0, 1).toISOString())
            .lte('created_at', new Date(2025, 11, 31).toISOString());
            
        if (error) {
            console.error("❌ Query error:", error);
            return;
        }
        
        console.log("✅ Query successful! Total consignment cars in 2025:", cars.length);
        
        // Filter for January specifically
        const januaryCars = cars.filter(car => {
            const carDate = new Date(car.created_at);
            return carDate.getMonth() + 1 === 1;  // January
        });
        
        console.log("📊 January 2025 consignment cars:", januaryCars.length);
        
        if (januaryCars.length > 0) {
            console.log("🚗 January consignment cars found:");
            januaryCars.forEach((car, index) => {
                console.log(`  ${index + 1}. ${car.stock_number} - ${car.vehicle_model} (${car.created_at})`);
            });
        } else {
            console.log("❌ No January consignment cars found!");
            
            // Let's check all cars in January 2025 regardless of ownership type
            const { data: allJanCars } = await supabase
                .from('cars')
                .select('id, stock_number, ownership_type, created_at, vehicle_model')
                .gte('created_at', '2025-01-01')
                .lt('created_at', '2025-02-01');
                
            console.log("🔍 All cars in January 2025:", allJanCars.length);
            allJanCars.forEach((car, index) => {
                console.log(`  ${index + 1}. ${car.stock_number} - ${car.ownership_type} (${car.created_at})`);
            });
        }
        
    } catch (error) {
        console.error("💥 Error testing query:", error);
    }
}

// Run the test if supabase is available
if (typeof supabase !== 'undefined') {
    testConsignmentQuery();
} else {
    console.log("⚠️ Supabase not available. Run this on the dashboard page.");
}

console.log("\n🛠️ Manual checks to run in Supabase SQL Editor:");
console.log("1. Check ownership_type values:");
console.log("   SELECT DISTINCT ownership_type, COUNT(*) FROM cars GROUP BY ownership_type;");
console.log("\n2. Check January 2025 cars:");
console.log("   SELECT * FROM cars WHERE created_at >= '2025-01-01' AND created_at < '2025-02-01' ORDER BY ownership_type;");
console.log("\n3. Check specific chassis from your list:");
console.log("   SELECT chassis_number, ownership_type, created_at FROM cars WHERE chassis_number = 'W1V44781513792418';"); 