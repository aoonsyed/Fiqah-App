import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);

export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface ChatRequest {
  query: string;
  conversationId?: string;
}

export interface ChatResponse {
  answer: string;
  sources: any[];
  citations: any[];
  conversationId: string;
}

/**
 * Send a chat message to the RAG chatbot
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Chat request failed');
  }

  return response.json();
}

/**
 * Get Qibla direction for a location
 */
export async function getQiblaDirection(latitude: number, longitude: number): Promise<number> {
  const response = await fetch(`${BASE_URL}/api/qibla?lat=${latitude}&lng=${longitude}`);

  if (!response.ok) {
    throw new Error('Failed to get Qibla direction');
  }

  const data = await response.json();
  return data.bearing;
}

/**
 * Get prayer times for a location
 */
export async function getPrayerTimes(latitude: number, longitude: number): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/prayer-times?lat=${latitude}&lng=${longitude}`);

  if (!response.ok) {
    throw new Error('Failed to get prayer times');
  }

  return response.json();
}

/**
 * Get today's hadith
 */
export async function getDailyHadith(): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/hadith/daily`);

  if (!response.ok) {
    throw new Error('Failed to get daily hadith');
  }

  return response.json();
}

/**
 * Get Supabase client for client-side operations
 */
export function getSupabaseClient() {
  return supabase;
}
