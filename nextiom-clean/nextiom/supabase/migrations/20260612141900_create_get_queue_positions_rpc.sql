-- Create a secure RPC function to fetch basic queue data for customers
CREATE OR REPLACE FUNCTION public.get_queue_positions()
RETURNS TABLE (
  id UUID,
  status TEXT,
  created_date TIMESTAMPTZ,
  queue_position INTEGER
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT j.id, j.status, j.created_date, j.queue_position
  FROM public.jobs j;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_queue_positions() TO authenticated;
