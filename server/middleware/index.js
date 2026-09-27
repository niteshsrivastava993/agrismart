import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// A token is stale if the password changed in a later second than the token was issued.
export const isTokenStale = (iat, passwordChangedAt) =>
  Boolean(passwordChangedAt) && Math.floor(new Date(passwordChangedAt).getTime() / 1000) > iat;

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Verifies the JWT, then re-reads the user so role and active status always come from MongoDB.
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: e.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token' });
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) return res.status(401).json({ error: 'Account unavailable' });
  if (isTokenStale(payload.iat, user.passwordChangedAt)) return res.status(401).json({ error: 'Session expired' });
  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'Forbidden' });

export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  req[source] = result.data;
  next();
};

// Express only treats a function with four arguments as an error handler.
export const errorHandler = (err, req, res, _next) => {
  // Outside production the response also carries the underlying message, to make setup problems easy to spot.
  const detail = process.env.NODE_ENV === 'production' ? {} : { detail: err.message };
  if (err.code === 11000) return res.status(409).json({ error: 'Already exists' });
  if (err.name === 'CastError' || err.name === 'ValidationError') {
    console.warn(`${req.method} ${req.originalUrl} rejected:`, err.message);
    return res.status(400).json({ error: 'Invalid data', ...detail });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(`${req.method} ${req.originalUrl} failed:`, err);
  res.status(500).json({ error: 'Internal server error', ...detail });
};
