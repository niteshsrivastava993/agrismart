import AuditLog from '../models/AuditLog.js';

export const audit = (userId, action, meta = {}) =>
  AuditLog.create({ user: userId, action, meta }).catch((e) => console.error('audit failed:', e.message));
