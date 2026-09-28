import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env lebih awal karena ESM module init terjadi sebelum dotenv di index.ts
// Pakai path relatif dari file ini agar konsisten saat tsx watch mode
// src/db/ -> ../../ = server/ (lokasi .env)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });



if (!process.env.DATABASE_URL) {
  throw new Error('[DB] DATABASE_URL tidak ditemukan di environment variables. Pastikan file .env sudah ada.');
}

// HTTP client connection ke Neon Serverless Postgres
const sql = neon(process.env.DATABASE_URL);

// Instance Drizzle dengan schema untuk type inference
export const db = drizzle(sql, { schema });

