# Price Drop Image Renderer

A standalone Playwright-based service for generating price drop images for the SilberArrows CRM system.

## Deployment on Railway

> **Note:** This service is configured on Railway with a `renderer/**` watch pattern, so any updates that should trigger a rebuild must touch files within this directory (like this README).

### Quick Deploy
1. Create new project on Railway
2. Connect this GitHub repository
3. Set root directory to `renderer`
4. Railway will auto-detect the Dockerfile
5. Deploy

### Environment Variables
- `PORT` - Automatically set by Railway (default: 3000)

### API Endpoints

#### Health Check
```
GET /health
Response: { "ok": true }
```

#### Generate Images
```
POST /render
Content-Type: application/json

Body:
{
  "carDetails": {
    "year": 2021,
    "model": "MERCEDES BENZ E 300 AMG SALOON",
    "mileage": "45,000 KM",
    "stockNumber": "879054",
    "horsepower": 245
  },
  "pricing": {
    "wasPrice": 190950,
    "nowPrice": 189000,
    "savings": 1950,
    "monthlyPayment": 2990
  },
  "firstImageUrl": "https://example.com/car-image.jpg",
  "secondImageUrl": "https://example.com/car-image.jpg"
}

Response:
{
  "success": true,
  "image45": "base64-encoded-4:5-image",
  "imageStory": "base64-encoded-9:16-image"
}
```

## Local Development

```bash
npm install
npm start
```

The service will be available at `http://localhost:3000` 