// Debug script to test the dashboard filtering logic
// Copy and paste this in your browser console on the dashboard page
// Test the date filtering logic used in the dashboard
const year = 2025;

// This is the same logic used in ConsignmentAcquisitionsChart
const startDate = new Date(year, 0, 1).toISOString();
const endDate = new Date(year, 11, 31).toISOString();
// Test month filtering logic
const testDates = [
    '2025-01-27T13:37:21.000Z',  // This should be January
    '2025-01-15T10:30:00.000Z',  // This should be January
    '2025-02-17T11:20:01.000Z'   // This should be February
];
testDates.forEach((dateStr, index) => {
    const carDate = new Date(dateStr);
    const month = carDate.getMonth() + 1;  // JavaScript months are 0-based
});

// Test the exact filtering used in the dashboard
async function testConsignmentQuery() {
    try {
        const { data: cars, error } = await supabase
            .from('cars')
            .select('id, stock_number, ownership_type, created_at, vehicle_model')
            .eq('ownership_type', 'consignment')
            .gte('created_at', new Date(2025, 0, 1).toISOString())
            .lte('created_at', new Date(2025, 11, 31).toISOString());
            
        if (error) {
            return;
        }
        // Filter for January specifically
        const januaryCars = cars.filter(car => {
            const carDate = new Date(car.created_at);
            return carDate.getMonth() + 1 === 1;  // January
        });
        if (januaryCars.length > 0) {
            januaryCars.forEach((car, index) => {
            });
        } else {
            // Let's check all cars in January 2025 regardless of ownership type
            const { data: allJanCars } = await supabase
                .from('cars')
                .select('id, stock_number, ownership_type, created_at, vehicle_model')
                .gte('created_at', '2025-01-01')
                .lt('created_at', '2025-02-01');
            allJanCars.forEach((car, index) => {
            });
        }
        
    } catch (error) {
    }
}

// Run the test if supabase is available
if (typeof supabase !== 'undefined') {
    testConsignmentQuery();
} else {
} 