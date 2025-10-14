-- Create buyer_journey_nodes table
CREATE TABLE IF NOT EXISTS buyer_journey_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department TEXT NOT NULL CHECK (department IN ('used_car', 'service')),
  title TEXT NOT NULL,
  caption TEXT,
  video_url TEXT,
  video_filename TEXT,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create buyer_journey_connections table
CREATE TABLE IF NOT EXISTS buyer_journey_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_node_id UUID NOT NULL REFERENCES buyer_journey_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES buyer_journey_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_node_id, to_node_id)
);

-- Enable RLS
ALTER TABLE buyer_journey_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_journey_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for buyer_journey_nodes
CREATE POLICY "Allow authenticated users to view buyer journey nodes"
ON buyer_journey_nodes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert buyer journey nodes"
ON buyer_journey_nodes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update buyer journey nodes"
ON buyer_journey_nodes FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete buyer journey nodes"
ON buyer_journey_nodes FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for buyer_journey_connections
CREATE POLICY "Allow authenticated users to view buyer journey connections"
ON buyer_journey_connections FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert buyer journey connections"
ON buyer_journey_connections FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update buyer journey connections"
ON buyer_journey_connections FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete buyer journey connections"
ON buyer_journey_connections FOR DELETE
TO authenticated
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_buyer_journey_nodes_department ON buyer_journey_nodes(department);
CREATE INDEX IF NOT EXISTS idx_buyer_journey_connections_from_node ON buyer_journey_connections(from_node_id);
CREATE INDEX IF NOT EXISTS idx_buyer_journey_connections_to_node ON buyer_journey_connections(to_node_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE buyer_journey_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE buyer_journey_connections;

