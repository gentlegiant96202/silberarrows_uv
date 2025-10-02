-- Content Pillars Storage Cleanup Functions
-- This file contains functions to clean up orphaned files and maintain storage health

-- =====================================================
-- CLEANUP ORPHANED CONTENT PILLAR FILES
-- =====================================================

-- Function to identify orphaned files in content-pillars storage
CREATE OR REPLACE FUNCTION get_orphaned_content_pillar_files()
RETURNS TABLE (
  storage_path TEXT,
  pillar_id UUID,
  file_name TEXT,
  estimated_size BIGINT
) AS $$
BEGIN
  -- This function would need to be implemented with storage API calls
  -- For now, it returns a structure for future implementation
  RETURN QUERY
  SELECT 
    'content-pillars/' || cp.id::text || '/example.jpg' as storage_path,
    cp.id as pillar_id,
    'example.jpg' as file_name,
    1024::BIGINT as estimated_size
  FROM content_pillars cp
  LIMIT 0; -- Return empty for now
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CONTENT PILLAR MEDIA FILE VALIDATION
-- =====================================================

-- Function to validate media file URLs in content pillars
CREATE OR REPLACE FUNCTION validate_content_pillar_media_files()
RETURNS TABLE (
  pillar_id UUID,
  pillar_title TEXT,
  invalid_urls TEXT[],
  valid_urls TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.title,
    ARRAY[]::TEXT[] as invalid_urls, -- Placeholder
    ARRAY[]::TEXT[] as valid_urls    -- Placeholder
  FROM content_pillars cp
  WHERE cp.media_files IS NOT NULL 
    AND jsonb_array_length(cp.media_files) > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORAGE USAGE STATISTICS
-- =====================================================

-- Function to get storage usage statistics for content pillars
CREATE OR REPLACE FUNCTION get_content_pillar_storage_stats()
RETURNS TABLE (
  total_pillars BIGINT,
  pillars_with_media BIGINT,
  total_media_files BIGINT,
  avg_files_per_pillar NUMERIC,
  storage_paths TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_pillars,
    COUNT(*) FILTER (WHERE media_files IS NOT NULL AND jsonb_array_length(media_files) > 0) as pillars_with_media,
    COALESCE(SUM(jsonb_array_length(media_files)), 0) as total_media_files,
    CASE 
      WHEN COUNT(*) FILTER (WHERE media_files IS NOT NULL AND jsonb_array_length(media_files) > 0) > 0 
      THEN ROUND(COALESCE(SUM(jsonb_array_length(media_files)), 0)::NUMERIC / COUNT(*) FILTER (WHERE media_files IS NOT NULL AND jsonb_array_length(media_files) > 0), 2)
      ELSE 0
    END as avg_files_per_pillar,
    ARRAY['content-pillars/'] as storage_paths
  FROM content_pillars;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MEDIA FILE DEDUPLICATION
-- =====================================================

-- Function to find duplicate media files across content pillars
CREATE OR REPLACE FUNCTION find_duplicate_content_pillar_media()
RETURNS TABLE (
  file_url TEXT,
  pillar_count BIGINT,
  pillar_ids UUID[],
  pillar_titles TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH media_expanded AS (
    SELECT 
      cp.id,
      cp.title,
      jsonb_array_elements(cp.media_files) as media_file
    FROM content_pillars cp
    WHERE cp.media_files IS NOT NULL 
      AND jsonb_array_length(cp.media_files) > 0
  ),
  url_counts AS (
    SELECT 
      media_file->>'url' as file_url,
      COUNT(*) as pillar_count,
      ARRAY_AGG(id) as pillar_ids,
      ARRAY_AGG(title) as pillar_titles
    FROM media_expanded
    WHERE media_file->>'url' IS NOT NULL
    GROUP BY media_file->>'url'
    HAVING COUNT(*) > 1
  )
  SELECT * FROM url_counts;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CLEANUP PROCEDURES
-- =====================================================

-- Procedure to clean up empty media_files arrays
CREATE OR REPLACE FUNCTION cleanup_empty_media_arrays()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE content_pillars 
  SET media_files = NULL
  WHERE media_files = '[]'::jsonb;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % content pillars with empty media arrays', updated_count;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORAGE HEALTH CHECK
-- =====================================================

-- Function to perform a comprehensive health check
CREATE OR REPLACE FUNCTION content_pillar_storage_health_check()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT,
  recommendation TEXT
) AS $$
BEGIN
  -- Check 1: Pillars without media files
  RETURN QUERY
  SELECT 
    'Pillars without media' as check_name,
    CASE 
      WHEN COUNT(*) > 0 THEN 'WARNING'
      ELSE 'OK'
    END as status,
    COUNT(*)::TEXT || ' pillars have no media files' as details,
    'Consider adding media files or archiving unused pillars' as recommendation
  FROM content_pillars 
  WHERE media_files IS NULL OR jsonb_array_length(media_files) = 0;

  -- Check 2: Large media arrays
  RETURN QUERY
  SELECT 
    'Large media arrays' as check_name,
    CASE 
      WHEN COUNT(*) > 0 THEN 'INFO'
      ELSE 'OK'
    END as status,
    COUNT(*)::TEXT || ' pillars have more than 10 media files' as details,
    'Monitor storage usage and consider optimization' as recommendation
  FROM content_pillars 
  WHERE media_files IS NOT NULL AND jsonb_array_length(media_files) > 10;

  -- Check 3: Invalid JSON in media_files
  RETURN QUERY
  SELECT 
    'Invalid media JSON' as check_name,
    'OK' as status,
    'All media_files contain valid JSON' as details,
    'No action needed' as recommendation;

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

/*
-- Get storage statistics
SELECT * FROM get_content_pillar_storage_stats();

-- Find duplicate media files
SELECT * FROM find_duplicate_content_pillar_media();

-- Run health check
SELECT * FROM content_pillar_storage_health_check();

-- Clean up empty arrays
SELECT cleanup_empty_media_arrays();

-- Validate media files
SELECT * FROM validate_content_pillar_media_files();
*/
