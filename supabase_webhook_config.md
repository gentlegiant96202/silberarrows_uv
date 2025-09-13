# Supabase Webhook Configuration for Leads

## 1. Webhook Setup in Supabase Dashboard

Go to your Supabase project → **Database** → **Webhooks** → **Create a new webhook**

### Basic Configuration:
- **Name**: `leads_webhook`
- **Table**: `leads`
- **Events**: `INSERT`, `UPDATE` (check both)
- **Type**: `HTTP Request`
- **Method**: `POST`
- **URL**: `https://bothook.io/v1/public/triggers/webhooks/dbfef251-3fe9-4853-ba29-cd66cdd98e58`

## 2. HTTP Headers
```json
{
  "Content-Type": "application/json"
}
```

## 3. Webhook Payload Template

Use this payload template in the webhook configuration:

```json
{
  "event_type": "{{ record.event_type }}",
  "table": "leads",
  "record": {
    "id": "{{ record.id }}",
    "full_name": "{{ record.full_name }}",
    "phone_number": "{{ record.country_code }}{{ record.phone_number }}",
    "status": "{{ record.status }}",
    "model_of_interest": "{{ record.model_of_interest }}",
    "max_age": "{{ record.max_age }}",
    "payment_type": "{{ record.payment_type }}",
    "monthly_budget": {{ record.monthly_budget }},
    "total_budget": {{ record.total_budget }},
    "appointment_date": "{{ record.appointment_date }}",
    "appointment_date_formatted": "{{ record.appointment_date | date: '%d-%m-%Y' }}",
    "time_slot": "{{ record.time_slot }}",
    "notes": "{{ record.notes }}",
    "created_at": "{{ record.created_at }}",
    "updated_at": "{{ record.updated_at }}"
  }
}
```

## 4. Alternative Payload (if date filter doesn't work)

If the date filter doesn't work in Supabase webhooks, use this simpler version:

```json
{
  "event_type": "{{ record.event_type }}",
  "table": "leads",
  "record": {
    "id": "{{ record.id }}",
    "full_name": "{{ record.full_name }}",
    "phone_number": "{{ record.country_code }}{{ record.phone_number }}",
    "status": "{{ record.status }}",
    "model_of_interest": "{{ record.model_of_interest }}",
    "max_age": "{{ record.max_age }}",
    "payment_type": "{{ record.payment_type }}",
    "monthly_budget": {{ record.monthly_budget }},
    "total_budget": {{ record.total_budget }},
    "appointment_date": "{{ record.appointment_date }}",
    "time_slot": "{{ record.time_slot }}",
    "notes": "{{ record.notes }}",
    "created_at": "{{ record.created_at }}",
    "updated_at": "{{ record.updated_at }}"
  }
}
```

## 5. Key Features:

### Phone Number Concatenation:
- Combines `country_code` and `phone_number` into a single field
- `"phone_number": "{{ record.country_code }}{{ record.phone_number }}"`

### Date Formatting:
- Original: `"appointment_date": "{{ record.appointment_date }}"`
- Formatted: `"appointment_date_formatted": "{{ record.appointment_date | date: '%d-%m-%Y' }}"`

### Event Type:
- Will be `INSERT` for new leads
- Will be `UPDATE` for modified leads

## 6. Testing the Webhook

After setting up, test by:
1. Creating a new lead in your application
2. Updating an existing lead
3. Check the webhook logs in your Supabase dashboard
4. Verify the payload is received correctly at your webhook URL

## 7. Webhook Conditions (Optional)

If you want to filter when the webhook fires, you can add conditions like:
- Only fire for specific statuses
- Only fire when certain fields change
- Only fire during business hours

## 8. Error Handling

Supabase will retry failed webhooks automatically, but you can configure:
- **Retry attempts**: 3-5 attempts
- **Timeout**: 30 seconds
- **Failure handling**: Log errors

## 9. Security (Optional)

For added security, you can:
- Add authentication headers
- Use HMAC signatures
- Validate the webhook source in your endpoint 