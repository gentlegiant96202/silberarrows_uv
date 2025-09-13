# Video Story Render Service

This is a separate Remotion-based video generation service for SilberArrows content pillars.

## Features

- **7-second Instagram Stories**: Optimized for social media
- **All 7 Days Supported**: Monday through Sunday templates
- **High Quality**: 1080x1920 MP4 output
- **Remotion-powered**: React-based video generation

## Templates

- **Monday**: Myth vs Fact layout with animations
- **Tuesday**: Tech Tips with Problem/Solution format
- **Wednesday**: Car Spotlight with specifications
- **Thursday-Sunday**: General content templates

## Deployment

### Railway Deployment

1. Create new Railway project: `video-story-render`
2. Connect this directory as the root
3. Set environment variables:
   - `PORT=3001` (optional, defaults to 3001)
4. Deploy using the included `Dockerfile`

### Environment Variables

```bash
# Optional - Railway will set this automatically
PORT=3001

# For the main Next.js app to connect
VIDEO_SERVICE_URL=https://your-video-service.railway.app
```

## API Endpoints

### `POST /render-video`

Generate a 7-second content pillar video.

**Request Body:**
```json
{
  "dayOfWeek": "monday",
  "templateType": "A",
  "formData": {
    "title": "Sample Title",
    "description": "Sample Description",
    "imageUrl": "https://example.com/image.jpg",
    "myth": "Sample myth text",
    "fact": "Sample fact text",
    "badgeText": "MONDAY"
  }
}
```

**Response:**
```json
{
  "success": true,
  "videoData": "base64-encoded-mp4-data",
  "stats": {
    "fileSizeMB": 15,
    "duration": "7 seconds",
    "format": "mp4",
    "resolution": "1080x1920"
  }
}
```

### `GET /health`

Health check endpoint.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Start production server
npm start
```

## Integration

The main Next.js app calls this service via `/api/generate-content-pillar-video` which forwards requests to this service.

## Video Generation Process

1. User clicks "Generate Video" in content pillar modal
2. Main app calls `/api/generate-content-pillar-video`
3. Main app forwards request to this service
4. Remotion renders the video with animations
5. Service returns base64-encoded MP4
6. User downloads the video file

## Performance

- **Generation Time**: ~30-60 seconds per video
- **File Size**: 10-20MB per 7-second video
- **Memory Usage**: ~1-2GB during rendering
- **CPU**: High during rendering, idle otherwise
