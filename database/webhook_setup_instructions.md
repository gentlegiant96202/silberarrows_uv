# Webhook Queue System Setup Instructions

## 1. Run the Database Migration

Copy and paste the contents of `database/webhook_queue_system.sql` into your **Supabase SQL Editor** and run it.

This will create:
- `webhook_queue` table
- `queue_appointment_webhook()` trigger function  
- Database trigger that automatically queues webhooks
- Processing function (optional)

## 2. Configure External Webhook URL

Set your external webhook URL in your environment variables:

```bash
# Add to your .env.local file
EXTERNAL_WEBHOOK_URL=https://your-external-webhook-url.com/appointments
```

Or update the default URL in `app/api/process-webhooks/route.ts`.

## 3. Test the System

### Create a Test Appointment
1. Go to your app and create a new appointment
2. Check if webhook was queued: 
   ```sql
   SELECT * FROM webhook_queue ORDER BY created_at DESC LIMIT 5;
   ```

### Process Webhooks Manually
```bash
# Process queued webhooks
curl -X POST http://localhost:3000/api/process-webhooks

# Check queue status  
curl http://localhost:3000/api/process-webhooks
```

## 4. Webhook Payload Structure

### New Appointment with Vehicle:
```json
{
  "event_type": "appointment_created_with_vehicle",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "lead_id": "uuid-here",
    "customer_name": "JOHN DOE",
    "phone": "+971501234567",
    "appointment_date": "2024-01-20",
    "appointment_time": "14:00:00",
    "model_of_interest": "BMW X5",
    "car_pdf_url": "https://example.com/car.pdf"
  }
}
```

### New Appointment without Vehicle:
```json
{
  "event_type": "appointment_created_without_vehicle", 
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "lead_id": "uuid-here",
    "customer_name": "JANE SMITH",
    "phone": "+971507654321", 
    "appointment_date": "2024-01-22",
    "appointment_time": "10:30:00",
    "model_of_interest": "Mercedes C-Class",
    "car_pdf_url": null
  }
}
```

### Appointment Rescheduled:
```json
{
  "event_type": "appointment_created_with_vehicle", // Based on current car_pdf_url status
  "timestamp": "2024-01-15T11:00:00.000Z", 
  "data": {
    "lead_id": "uuid-here",
    "customer_name": "JOHN DOE",
    "phone": "+971501234567",
    "appointment_date": "2024-01-25", // New date
    "appointment_time": "16:00:00",    // New time
    "model_of_interest": "BMW X5",
    "car_pdf_url": "https://example.com/car.pdf",
    "previous_appointment_date": "2024-01-20", // Previous date
    "previous_appointment_time": "14:00:00"    // Previous time
  }
}
```

## 5. Monitoring

### Check Queue Status:
```sql
-- Recent webhooks
SELECT id, event_type, processed, error_message, created_at 
FROM webhook_queue 
ORDER BY created_at DESC 
LIMIT 10;

-- Queue statistics
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE processed = true) as processed,
  COUNT(*) FILTER (WHERE processed = false AND error_message IS NULL) as pending,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as errors
FROM webhook_queue;
```

### Clear Processed Webhooks (Optional):
```sql
-- Remove old processed webhooks (keep last 1000)
DELETE FROM webhook_queue 
WHERE processed = true 
AND id NOT IN (
  SELECT id FROM webhook_queue 
  WHERE processed = true 
  ORDER BY created_at DESC 
  LIMIT 1000
);
```

## 6. Disable Original Supabase Webhook

Once this system is working, disable your original Supabase webhook to avoid duplicates:

1. Go to **Supabase Dashboard → Database → Webhooks**
2. **Disable or delete** the existing leads webhook
3. The new trigger-based system will handle all webhook delivery

## 7. Real-time Processing

Webhooks are processed in real-time because:
- Database trigger queues webhook immediately when appointment is created/updated
- Original Supabase webhook calls `/api/process-webhooks` to process the queue
- External webhook is delivered within seconds

## Troubleshooting

### No webhooks in queue?
- Check if `car_pdf_url` column exists in leads table
- Verify trigger was created: `\df queue_appointment_webhook` in psql

### Webhooks not being sent?
- Check EXTERNAL_WEBHOOK_URL is correctly set
- Check webhook queue for error messages
- Test manually: `curl -X POST http://localhost:3000/api/process-webhooks`

### Moving cards still triggers webhooks?
- The new system only triggers on appointment date/time changes, not status changes
- Check the trigger logic in `queue_appointment_webhook()` function 