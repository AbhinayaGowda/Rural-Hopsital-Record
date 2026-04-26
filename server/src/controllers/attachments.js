import * as svc from '../services/attachments.js';

export async function listMemberAttachments(req, res) {
  const data = await svc.listAttachments('member', req.params.memberId);
  res.json({ data, error: null });
}

export async function uploadMemberAttachment(req, res) {
  if (!req.file) {
    return res.status(400).json({ data: null, error: { code: 'NO_FILE', message: 'No file provided' } });
  }
  const data = await svc.uploadAttachment('member', req.params.memberId, req.file, req.profile.id);
  res.status(201).json({ data, error: null });
}

export async function deleteAttachment(req, res) {
  await svc.deleteAttachment(req.params.attachmentId);
  res.json({ data: { success: true }, error: null });
}
