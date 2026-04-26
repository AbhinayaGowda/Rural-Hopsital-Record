-- Create private Supabase Storage bucket for medical photo/document attachments.
-- Service-role access only (Express uploads on behalf of users — no direct client access).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'health-attachments',
  'health-attachments',
  false,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
ON CONFLICT (id) DO NOTHING;
