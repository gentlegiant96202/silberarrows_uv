# Setup Guide - Used Car Sales CRM

This guide will walk you through setting up the Used Car Sales CRM from scratch.

## Prerequisites

- Node.js 18+ installed on your machine
- A Supabase account (free tier works fine)
- Git (optional, for version control)

## Step 1: Dependencies Installation

Dependencies are already installed from the previous setup. If you need to reinstall:

```bash
npm install
```

## Step 2: Supabase Project Setup

1. **Create a Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up or log in
   - Click "New Project"
   - Fill in project details and wait for setup to complete

2. **Get Your Project Credentials**
   - Go to Project Settings > API
   - Copy your Project URL and anon/public key

## Step 3: Environment Configuration

1. **Create Environment File**
   ```bash
   cp .env.example .env.local
   ```

2. **Update Environment Variables**
   Open `.env.local` and replace with your actual Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Database Setup

1. **Open Supabase SQL Editor**
   - In your Supabase dashboard, go to "SQL Editor"

2. **Run Database Schema**
   - Copy the contents of `database/schema.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

3. **Enable Realtime**
   - Go to Database > Replication
   - Enable realtime for the `leads` table
   - Click "Save"

## Step 5: Run the Application

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Open Application**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - You should see the CRM with sample data

## Step 6: Test the Application

1. **Add New Lead**
   - Click the "+" button in the "NEW CUSTOMER" column
   - Fill in customer details
   - Submit the form

2. **Drag and Drop**
   - Try dragging lead cards between columns
   - Changes should persist in the database

3. **Edit/Delete Leads**
   - Click on any lead card to view details
   - Test edit and delete functionality

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify environment variables are correct
   - Check Supabase project is active
   - Ensure API keys have proper permissions

2. **Realtime Not Working**
   - Verify realtime is enabled for `leads` table
   - Check browser console for errors
   - Refresh the page

3. **RLS (Row Level Security) Issues**
   - If you get permission errors, check the RLS policies
   - For development, the schema includes permissive policies
   - For production, implement proper authentication

### Production Deployment

1. **Environment Variables**
   - Set environment variables in your hosting platform
   - Never commit `.env.local` to version control

2. **Security Considerations**
   - Review and tighten RLS policies
   - Implement proper authentication
   - Consider API rate limiting

3. **Performance Optimization**
   - Enable database indexes (included in schema)
   - Consider connection pooling for high traffic
   - Implement proper caching strategies

## Database Schema Overview

### Tables

1. **leads**
   - Main table storing customer information
   - Includes contact details, appointment data, preferences
   - Status field for pipeline management

2. **models**
   - Car models available for selection
   - Referenced by leads table

### Key Features

- UUID primary keys for security
- Timestamps for audit trail
- Foreign key relationships
- Optimized indexes
- Row Level Security enabled

## Next Steps

1. **Customize Pipeline Stages**
   - Modify `columns` array in `KanbanBoard.tsx`
   - Add/remove stages as needed

2. **Add More Car Models**
   - Insert into `models` table via SQL Editor
   - Or build an admin interface

3. **Enhance Lead Information**
   - Add more fields to `leads` table
   - Update forms and display components

4. **Implement Authentication**
   - Add Supabase Auth
   - Restrict access with proper RLS policies

5. **Add Reporting**
   - Build dashboard with sales metrics
   - Export functionality for lead data

## Support

For technical issues or questions about customization, refer to the main README.md file or contact your development team. 