# Used Car Sales CRM

A comprehensive Customer Relationship Management system built specifically for used car sales businesses. This application features a modern dark theme interface with a full-page Kanban board for managing leads through your sales pipeline.

## Features

- **Kanban Board Interface**: Visual pipeline management with drag-and-drop functionality
- **Real-time Updates**: Live synchronization with Supabase for instant data updates
- **Lead Management**: Complete customer and appointment tracking
- **Dark Theme**: Modern, professional dark UI optimized for extended use
- **Mobile Responsive**: Works seamlessly across all device sizes
- **Pipeline Stages**: 
  - New Customer
  - Negotiation
  - Won
  - Delivered
  - Lost

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Real-time**: Supabase Realtime subscriptions
- **Date Management**: Day.js

## Prerequisites

Before running this application, make sure you have:

- Node.js 18+ installed
- A Supabase account and project set up
- npm or yarn package manager

## Quick Start

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Database Setup**
   Create the following tables in your Supabase project:

   **leads table:**
   ```sql
   CREATE TABLE leads (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     status TEXT DEFAULT 'new_appointment',
     customer_name TEXT NOT NULL,
     mobile_number TEXT NOT NULL,
     appointment_date DATE NOT NULL,
     appointment_time TIME,
     car_url TEXT,
     model_id INTEGER REFERENCES models(id),
     year_range INTEGER,
     budget_type TEXT DEFAULT 'total',
     budget_amount INTEGER DEFAULT 0,
     notes TEXT,
     country_code TEXT DEFAULT '+971',
     phone_number TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
   );
   ```

   **models table:**
   ```sql
   CREATE TABLE models (
     id SERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
   );
   ```

4. **Insert Sample Car Models**
   ```sql
   INSERT INTO models (name) VALUES
   ('Toyota Camry'),
   ('Honda Civic'),
   ('BMW 3 Series'),
   ('Mercedes C-Class'),
   ('Audi A4'),
   ('Nissan Altima'),
   ('Hyundai Sonata'),
   ('Chevrolet Malibu'),
   ('Ford Fusion'),
   ('Volkswagen Passat');
   ```

5. **Enable Realtime**
   In your Supabase dashboard, go to Database > Replication and enable realtime for the `leads` table.

6. **Run the Development Server**
   ```bash
   npm run dev
   ```

7. **Open Application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Adding New Leads
- Click the "+" button in the "NEW CUSTOMER" column
- Fill in customer details, appointment information, and preferences
- The lead will automatically appear in the kanban board

### Managing Leads
- **Drag & Drop**: Move leads between pipeline stages by dragging cards
- **View Details**: Click on any lead card to view full details
- **Edit Information**: Use the edit button in the lead details modal
- **Delete Leads**: Remove leads that are no longer relevant

### Pipeline Stages
- **NEW CUSTOMER**: Fresh leads requiring initial contact
- **NEGOTIATION**: Active discussions about pricing and terms
- **WON**: Successfully closed deals
- **DELIVERED**: Completed transactions with delivered vehicles
- **LOST**: Leads that didn't convert

## Customization

### Adding More Car Models
Insert additional models into the `models` table:
```sql
INSERT INTO models (name) VALUES ('Your Car Model');
```

### Modifying Pipeline Stages
Update the `columns` array in `components/KanbanBoard.tsx` to customize stages.

### Styling Changes
All styling is handled through Tailwind CSS classes. The color scheme can be modified in `tailwind.config.js`.

## Database Schema

The application uses two main tables:

- **leads**: Stores all customer and appointment information
- **models**: Contains available car models for selection

Real-time subscriptions ensure all users see updates instantly when leads are created, updated, or moved between stages.

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms
Ensure Node.js 18+ support and set the required environment variables.

## Support

For technical support or feature requests, please refer to the project documentation or contact your development team.

## License

This project is proprietary software developed for used car sales businesses. 