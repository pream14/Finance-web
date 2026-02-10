import { NextRequest, NextResponse } from 'next/server';
import { createUser, createSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, role, phone } = await request.json();

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Email, password, full name, and role are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'collector'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    try {
      const user = await createUser(email, password, fullName, role, phone);
      const sessionToken = createSession(user.id, user.email, user.role);
      const cookieStore = await cookies();
      
      cookieStore.set('session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/',
      });

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        },
      });
    } catch (dbError: any) {
      if (dbError.code === '23505') {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
