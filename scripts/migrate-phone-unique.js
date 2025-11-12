const { supabase } = require('../lib/supabaseClient');

async function runMigration() {
  try {
    // Get all consignments with phone numbers
    const { data: consignments, error } = await supabase
      .from('consignments')
      .select('id, phone_number, created_at')
      .not('phone_number', 'is', null)
      .order('phone_number', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (error) {
      return;
    }
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
      for (const phone of duplicatePhones) {
        const duplicates = phoneGroups[phone];
        // Keep the first (oldest) entry, mark others for deletion
        const toDelete = duplicates.slice(1);
        for (const item of toDelete) {
          // Actually delete the duplicate
          const { error: deleteError } = await supabase
            .from('consignments')
            .delete()
            .eq('id', item.id);
          
          if (deleteError) {
          } else {
          }
        }
      }
    } else {
    }
  } catch (error) {
  }
}

runMigration(); 