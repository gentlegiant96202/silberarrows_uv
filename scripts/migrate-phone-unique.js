const { supabase } = require('../lib/supabaseClient');

async function runMigration() {
  console.log('🔄 Checking for duplicate phone numbers...');
  
  try {
    // Get all consignments with phone numbers
    const { data: consignments, error } = await supabase
      .from('consignments')
      .select('id, phone_number, created_at')
      .not('phone_number', 'is', null)
      .order('phone_number', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching consignments:', error);
      return;
    }
    
    console.log(`📊 Found ${consignments.length} consignments with phone numbers`);
    
    // Check for duplicates
    const phoneGroups = {};
    consignments.forEach(item => {
      if (!phoneGroups[item.phone_number]) {
        phoneGroups[item.phone_number] = [];
      }
      phoneGroups[item.phone_number].push(item);
    });
    
    const duplicatePhones = Object.keys(phoneGroups).filter(phone => phoneGroups[phone].length > 1);
    
    if (duplicatePhones.length > 0) {
      console.log(`❌ Found ${duplicatePhones.length} duplicate phone numbers:`);
      
      for (const phone of duplicatePhones) {
        const duplicates = phoneGroups[phone];
        console.log(`  📱 ${phone}: ${duplicates.length} entries`);
        
        // Keep the first (oldest) entry, mark others for deletion
        const toDelete = duplicates.slice(1);
        console.log(`    ✅ Keep: ${duplicates[0].id} (${duplicates[0].created_at})`);
        
        for (const item of toDelete) {
          console.log(`    ❌ Delete: ${item.id} (${item.created_at})`);
          
          // Actually delete the duplicate
          const { error: deleteError } = await supabase
            .from('consignments')
            .delete()
            .eq('id', item.id);
          
          if (deleteError) {
            console.error(`    ❌ Error deleting ${item.id}:`, deleteError);
          } else {
            console.log(`    ✅ Deleted ${item.id}`);
          }
        }
      }
      
      console.log('✅ Duplicate removal completed');
    } else {
      console.log('✅ No duplicate phone numbers found');
    }
    
    console.log('\n📝 Next steps:');
    console.log('1. Go to Supabase dashboard > Table Editor > consignments');
    console.log('2. Click on phone_number column');
    console.log('3. Enable "Is Unique" checkbox');
    console.log('4. Or run this SQL in the SQL Editor:');
    console.log('   ALTER TABLE consignments ADD CONSTRAINT consignments_phone_number_unique UNIQUE (phone_number);');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

runMigration(); 