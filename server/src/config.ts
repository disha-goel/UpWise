import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const DATA_DIR = process.env.UPWISE_DATA_DIR || path.resolve(__dirname, '../data');
export const demoUsersEnabled = process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_USERS !== 'false';
let localSecret: string | undefined;

export function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production');
  }
  if (!localSecret) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const secretFile = path.join(DATA_DIR, '.jwt-secret');
    try {
      fs.writeFileSync(secretFile, crypto.randomBytes(48).toString('hex'), { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    localSecret = fs.readFileSync(secretFile, 'utf8').trim();
    if (!localSecret) throw new Error('Local JWT secret is empty');
  }
  return localSecret;
}
