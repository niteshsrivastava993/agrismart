import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';

const { MONGODB_URI, JWT_SECRET, PORT = 5000 } = process.env;
if (!MONGODB_URI || !JWT_SECRET) {
  console.error('MONGODB_URI and JWT_SECRET are required. Copy server/.env.example to server/.env and fill them in.');
  process.exit(1);
}

process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));

try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('MongoDB connected');
} catch (e) {
  console.error(`Could not connect to MongoDB: ${e.message}\nCheck that MongoDB is running and that MONGODB_URI in server/.env is correct.`);
  process.exit(1);
}

const server = createApp().listen(PORT, () => console.log(`AgriSmart API listening on http://localhost:${PORT}`));
server.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is already in use. Stop the other process or change PORT in server/.env.` : e.message);
  process.exit(1);
});
