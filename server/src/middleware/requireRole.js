export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return res.status(403).json({
        data: null,
        error: { code: 'FORBIDDEN', message: `Requires role: ${roles.join(' or ')}` },
      });
    }
    next();
  };
}
