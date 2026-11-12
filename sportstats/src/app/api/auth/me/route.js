import { NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';

export const GET = withUser(async (req, ctx, user) => NextResponse.json({ usuario: user }));
