# Buyer Journey Builder - Setup Instructions

## Overview
The Buyer Journey Builder is a visual canvas tool in the Marketing module that allows you to create interactive journey maps for Used Car and Service departments. You can create draggable cards with captions, upload videos, and connect them with arrows to visualize the customer journey flow.

## Features
- ✨ Infinite canvas with pan and zoom functionality
- 🎯 Draggable journey stage cards
- 📹 Video upload and playback on each card
- 🔗 Drag-to-connect functionality with arrow indicators
- 🏢 Department filtering (Used Car / Service / All)
- 💾 Real-time sync across users
- ⬇️ Video download capability
- 📱 Responsive design

## Database Setup

### Step 1: Create Database Tables
Run the following SQL file in your Supabase SQL editor:

```bash
create_buyer_journey_tables.sql
```

This will create:
- `buyer_journey_nodes` table - stores journey stage cards
- `buyer_journey_connections` table - stores connections between cards
- RLS policies for security
- Realtime subscriptions
- Indexes for performance

### Step 2: Create Storage Bucket
Run the following SQL file in your Supabase SQL editor:

```bash
create_buyer_journey_storage.sql
```

This will create:
- `buyer-journey-videos` storage bucket (public)
- Storage policies for authenticated users

**Alternative:** You can also create the storage bucket manually in the Supabase dashboard:
1. Go to Storage in your Supabase dashboard
2. Click "Create Bucket"
3. Name: `buyer-journey-videos`
4. Set to Public
5. Create the bucket

## How to Use

### Accessing the Feature
1. Navigate to the Marketing module
2. Click on the "BUYER JOURNEY" tab in the navigation

### Creating Journey Stages
1. Click "Add Used Car Stage" or "Add Service Stage" button
2. A new card will appear on the canvas
3. Click on the title or description to edit them
4. Click "Save" to save your changes

### Uploading Videos
1. Click "Upload Video" button on any card
2. Select a video file (max 100MB recommended)
3. The video will be uploaded and displayed on the card
4. Use the "Download Video" button to download videos

### Connecting Stages
1. Click the "🔗" (Connect) button on a card
2. The card will highlight with a yellow ring
3. Click the "🔗" button on another card to create the connection
4. An arrow line will appear connecting the two cards
5. Click on any connection line to delete it

### Navigating the Canvas
- **Pan:** Click and drag on the empty canvas background
- **Zoom:** Hold Ctrl/Cmd and scroll with mouse wheel
- **Move Cards:** Click and drag any card
- **Reset View:** Click "Reset View" button to center the canvas

### Filtering by Department
Use the Department dropdown in the toolbar to filter:
- **All Departments** - Shows all journey stages
- **Used Car Department** - Shows only Used Car stages
- **Service Department** - Shows only Service stages

## Technical Details

### Components
- **BuyerJourneyCanvas.tsx** - Main canvas component with all functionality
- **JourneyNodeCard** - Individual journey stage card component

### Database Schema

#### buyer_journey_nodes
```sql
id              UUID (Primary Key)
department      TEXT ('used_car' | 'service')
title           TEXT
caption         TEXT
video_url       TEXT (nullable)
video_filename  TEXT (nullable)
position_x      NUMERIC
position_y      NUMERIC
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
created_by      UUID (Foreign Key to auth.users)
```

#### buyer_journey_connections
```sql
id            UUID (Primary Key)
from_node_id  UUID (Foreign Key to buyer_journey_nodes)
to_node_id    UUID (Foreign Key to buyer_journey_nodes)
created_at    TIMESTAMPTZ
```

### Storage
- **Bucket:** `buyer-journey-videos`
- **Path Format:** `buyer-journey/{nodeId}_{timestamp}.{ext}`
- **Access:** Public read, authenticated write/delete

## Troubleshooting

### Videos not uploading
- Ensure the `buyer-journey-videos` storage bucket exists
- Check that storage policies are properly configured
- Verify file size is under 100MB
- Check browser console for error messages

### Connections not appearing
- Make sure both nodes are in the same department filter view
- Try refreshing the page to reload data
- Check browser console for any errors

### Cards not moving
- Ensure you're clicking on the card body, not the control buttons
- Try refreshing the page
- Check that you have edit permissions

### Canvas not panning/zooming
- For zoom: Hold Ctrl (Windows) or Cmd (Mac) while scrolling
- For pan: Click and drag on empty canvas area
- Try clicking "Reset View" to recenter

## Best Practices

1. **Organize by Department:** Use clear department separation for better clarity
2. **Descriptive Titles:** Use clear, concise titles for each stage
3. **Video Quality:** Use compressed videos for faster loading
4. **Connection Logic:** Connect stages in logical sequence
5. **Regular Saves:** Changes are auto-saved, but refresh periodically to see others' updates

## UI Theme
The Buyer Journey Builder follows the glassy black UI theme with:
- Silver gradient buttons [[memory:4828596]]
- White highlights for selected items
- Smooth animations and transitions
- Professional, modern design

## Future Enhancements (Potential)
- Export journey as image/PDF
- Journey templates
- Multi-select and bulk operations
- Journey versioning
- Comments and collaboration features
- Analytics integration

## Support
For issues or questions, contact your development team or check the application logs for detailed error messages.

