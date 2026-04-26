import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';

const BUCKET = 'health-attachments';
const SIGNED_URL_TTL = 3600; // 1 hour

const COLS = 'id, entity_type, entity_id, storage_path, mime_type, size_bytes, uploaded_by, uploaded_at, profiles(full_name)';

export async function listAttachments(entityType, entityId) {
  const { data, error } = await supabaseAdmin
    .from('attachments')
    .select(COLS)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('uploaded_at', { ascending: false });
  if (error) throw new AppError('INTERNAL', error.message, 500);

  const withUrls = await Promise.all(
    data.map(async (a) => {
      const { data: urlData } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(a.storage_path, SIGNED_URL_TTL);
      return { ...a, url: urlData?.signedUrl ?? null };
    })
  );
  return withUrls;
}

export async function uploadAttachment(entityType, entityId, file, actorId) {
  const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
  const path = `${entityType}/${entityId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
  if (uploadErr) throw new AppError('INTERNAL', uploadErr.message, 500);

  const { data, error } = await supabaseAdmin
    .from('attachments')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      storage_path: path,
      mime_type: file.mimetype,
      size_bytes: file.size,
      uploaded_by: actorId,
    })
    .select(COLS)
    .single();
  if (error) {
    await supabaseAdmin.storage.from(BUCKET).remove([path]);
    throw new AppError('INTERNAL', error.message, 500);
  }

  const { data: urlData } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);

  return { ...data, url: urlData?.signedUrl ?? null };
}

export async function deleteAttachment(attachmentId) {
  const { data, error: fetchErr } = await supabaseAdmin
    .from('attachments')
    .select('storage_path')
    .eq('id', attachmentId)
    .single();
  if (fetchErr?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Attachment not found', 404);
  if (fetchErr) throw new AppError('INTERNAL', fetchErr.message, 500);

  await supabaseAdmin.storage.from(BUCKET).remove([data.storage_path]);

  const { error } = await supabaseAdmin
    .from('attachments')
    .delete()
    .eq('id', attachmentId);
  if (error) throw new AppError('INTERNAL', error.message, 500);
}
