import { supabaseAdmin } from '../lib/supabaseAdmin.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Profile not found' } });
  }

  if (!profile.is_active) {
    return res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'Account deactivated' } });
  }

  req.user = user;
  req.profile = profile;
  next();
}
