import 'dotenv/config';
import net from 'node:net';
import mongoose from 'mongoose';

// Quick preflight: tells you what is wrong with the setup before you start the API.
const { MONGODB_URI, JWT_SECRET, PORT = 5000 } = process.env;
let failed = false;
const ok = (m) => console.log(`  ok    ${m}`);
const warn = (m) => console.log(`  warn  ${m}`);
const bad = (m) => { failed = true; console.log(`  FAIL  ${m}`); };

console.log('AgriSmart server check\n');
const major = Number(process.versions.node.split('.')[0]);
if (major >= 20) ok(`Node ${process.versions.node}`); else bad(`Node ${process.versions.node}: version 20 or newer is needed`);

if (MONGODB_URI) ok('MONGODB_URI is set'); else bad('MONGODB_URI is missing. Copy server/.env.example to server/.env');
if (!JWT_SECRET) bad('JWT_SECRET is missing in server/.env');
else if (JWT_SECRET.length < 16 || /change-me/i.test(JWT_SECRET)) warn('JWT_SECRET is short or still the example value. Use a long random string');
else ok('JWT_SECRET is set');

if (MONGODB_URI) {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.db.admin().ping();
    ok(`MongoDB reachable (database "${mongoose.connection.name}")`);
  } catch (e) {
    bad(`Cannot reach MongoDB: ${e.message}`);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

const portState = await new Promise((resolve) => {
  const s = net.createServer();
  s.once('error', (e) => resolve(e.code || 'ERROR'));
  s.once('listening', () => s.close(() => resolve('free')));
  s.listen(Number(PORT));
});
if (portState === 'free') {
  ok(`Port ${PORT} is free, so the API is not running right now`);
} else if (portState === 'EADDRINUSE') {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/health`, { signal: AbortSignal.timeout(3000) });
    const body = await res.json();
    if (body && 'database' in body) ok(`The AgriSmart API is already running on port ${PORT} (database: ${body.database})`);
    else bad(`Port ${PORT} is used by another program`);
  } catch {
    bad(`Port ${PORT} is used by another program. On macOS, AirPlay Receiver uses port 5000: turn it off, or set PORT in server/.env and VITE_API_TARGET for the client`);
  }
} else {
  bad(`Cannot use port ${PORT}: ${portState}`);
}

const optional = [
  ['DATA_GOV_API_KEY', process.env.DATA_GOV_API_KEY, 'market prices'],
  ['OPENWEATHER_API_KEY', process.env.OPENWEATHER_API_KEY, 'weather'],
  ['RESEND_API_KEY + EMAIL_FROM', process.env.RESEND_API_KEY && process.env.EMAIL_FROM, 'password-reset email'],
  ['AI_API_KEY', process.env.AI_API_KEY, 'AI assistant'],
  ['PYTHON_AI_SERVICE_URL', process.env.PYTHON_AI_SERVICE_URL, 'AI crop-photo analysis (see python-ai-service/README.md)'],
];
for (const [name, value, feature] of optional) {
  if (value) ok(`${name} set (${feature})`); else warn(`${name} not set: ${feature} will say "Connect API credentials"`);
}

if (process.env.PYTHON_AI_SERVICE_URL) {
  try {
    const res = await fetch(`${process.env.PYTHON_AI_SERVICE_URL.replace(/\/+$/, '')}/health`, { signal: AbortSignal.timeout(3000) });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.ai_configured) ok('python-ai-service is reachable and has its own AI_API_KEY set');
    else if (res.ok) warn('python-ai-service is reachable but has no AI_API_KEY set (photo analysis will say "not configured")');
    else warn('python-ai-service did not respond as expected');
  } catch {
    warn('PYTHON_AI_SERVICE_URL is set but not reachable right now (run: uvicorn main:app --port 8001 in python-ai-service/)');
  }
}

console.log(failed ? '\nFix the FAIL lines above, then start the API with: npm run dev:server' : '\nAll required checks passed.');
process.exit(failed ? 1 : 0);
