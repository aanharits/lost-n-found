import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const GROQ_MODEL = 'qwen/qwen3.8-27b';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function getGroqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY;
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

let warnedMissingKey = false;

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqChatOptions {
  messages: GroqMessage[];
  temperature?: number;
  timeoutMs?: number;
  json?: boolean;
}

export interface GroqChatResult {
  success: boolean;
  content: string | null;
  error: string | null;
}

// Membersihkan pembungkus markdown code fence dari respons JSON LLM
export function cleanJsonText(text: string): string {
  return text.replace(/```json/gi, '').replace(/```/g, '').trim();
}

// Memanggil Groq Chat Completions API secara terpusat dengan timeout & error handling seragam
export async function callGroq(options: GroqChatOptions): Promise<GroqChatResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    if (!warnedMissingKey) {
      console.warn('[Groq] GROQ_API_KEY belum disetel di .env');
      warnedMissingKey = true;
    }
    return { success: false, content: null, error: 'GROQ_API_KEY tidak tersedia' };
  }

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: options.messages,
        temperature: options.temperature ?? 0.6,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: options.timeoutMs ?? 10000,
      }
    );

    const result = response.data;
    if (result.choices && result.choices.length > 0) {
      return { success: true, content: result.choices[0].message.content, error: null };
    }
    return { success: false, content: null, error: 'Respons Groq kosong' };
  } catch (error: any) {
    return { success: false, content: null, error: error.message };
  }
}

// Memanggil Groq dan mem-parsing respons sebagai JSON object
export async function callGroqJson<T = any>(
  options: Omit<GroqChatOptions, 'json'>
): Promise<T | null> {
  const result = await callGroq({ ...options, json: true });
  if (!result.success || !result.content) {
    return null;
  }
  try {
    return JSON.parse(cleanJsonText(result.content)) as T;
  } catch {
    return null;
  }
}
