# Backfill File Sizes Script

This script updates existing `car_media` records with file size information from Supabase Storage.

## Prerequisites

1. Make sure the database migration has been applied:
   ```sql
   ALTER TABLE car_media ADD COLUMN IF NOT EXISTS file_size BIGINT;
   ```

2. Set up environment variables in your `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## Usage

### Option 1: Using tsx (TypeScript)
```bash
npx tsx scripts/backfill-media-file-sizes.ts
```

### Option 2: Using bun (if available)
```bash
bun run scripts/backfill-media-file-sizes.ts
```

### Option 3: Using ts-node
```bash
npx ts-node scripts/backfill-media-file-sizes.ts
```

## What It Does

1. Fetches all `car_media` records where `file_size` is `NULL`
2. For each record:
   - Extracts the storage path from the URL
   - Fetches file metadata from Supabase Storage
   - Updates the database record with the file size
3. Shows progress and summary statistics

## Output Example

```
🚀 Starting file size backfill process...

📊 Found 150 media records without file_size
⏳ Fetching file sizes from storage...

[1/150] ✅ Updated: photo - 2.3 MB (ID: abc12345)
[2/150] ✅ Updated: photo - 1.8 MB (ID: def67890)
[3/150] ❌ Failed: Could not fetch file size (ID: ghi11223, photo)
[4/150] ✅ Updated: social_media - 450.2 KB (ID: jkl44556)
...

============================================================
📈 Backfill Summary:
   ✅ Successfully updated: 145
   ❌ Failed: 3
   ⚠️  Skipped: 2
   📊 Total processed: 150
============================================================

✅ File size backfill completed successfully!
```

## Troubleshooting

### "Missing required environment variables"
- Make sure `.env.local` has both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### "Failed: Could not fetch file size"
- The file might have been deleted from storage but still referenced in the database
- The URL format might not match expected patterns
- Check if the file actually exists in the storage bucket

### "Could not extract path from URL"
- The URL format might be different than expected
- Check the `extractStoragePath` function and update patterns if needed

## Safety

- This script only **adds** data (file_size) to existing records
- It does **not** delete or modify URLs, files, or other data
- Safe to run multiple times (only processes records where file_size is NULL)
- Includes rate limiting to avoid overwhelming the API

## After Running

Once completed, all existing media will display file size badges in the car details modal, just like newly uploaded media.

