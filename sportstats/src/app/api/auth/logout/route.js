import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, deleteSession, clearSessionCookie } from '@/lib/auth';

export async function POST() {
  try {
    const store = await cookies();
    await deleteSession(store.get(SESSION_COOKIE)?.value);
  } catch (error) {
    console.error('Logout error:', error);
  }
  return clearSessionCookie(NextResponse.json({ success: true }));
}
