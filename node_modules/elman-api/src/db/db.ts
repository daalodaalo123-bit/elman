import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function loadEnv() {
  // Try common locations so running from repo root still picks up api/.env
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'api', '.env'),
    path.join(__dirname, '..', '..', '.env')
  ];

  const envPath = candidates.find((p) => fs.existsSync(p));
  if (envPath) {
    dotenv.config({ path: envPath });
  } else {
    dotenv.config();
  }
}

loadEnv();

let connecting: Promise<void> | null = null;

// Fail fast instead of buffering commands for 10s
mongoose.set('bufferCommands', false);

export async function connectDb(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Create api/.env with MONGODB_URI (MongoDB Atlas connection string).'
    );
  }

  if (mongoose.connection.readyState === 1) return;
  if (connecting) return connecting;

  connecting = (async () => {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    } as any);
  })();

  try {
    await connecting;
  } finally {
    connecting = null;
  }
}

export function dbStatus() {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  return {
    readyState: mongoose.connection.readyState,
    name: mongoose.connection.name,
    hasUri: Boolean(process.env.MONGODB_URI)
  };
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}