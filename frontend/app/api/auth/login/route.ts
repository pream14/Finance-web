import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, createSession } from '@/lib/auth';
import { verifyCredentialsFallback } from '@/lib/auth-fallback';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log('Login attempt for email:', email);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    let user = null;
    let useFallback = false;

    // Try database authentication first
    try {
      user = await verifyCredentials(email, password);
      console.log('Database auth result:', !!user);
    } catch (dbError) {
      console.log('Database auth failed, trying fallback:', dbError);
      useFallback = true;
    }

    // If database auth failed, try fallback
    if (!user) {
      user = await verifyCredentialsFallback(email, password);
      console.log('Fallback auth result:', !!user);
      if (user) {
        useFallback = true;
      }
    }

    if (!user) {
      console.log('Invalid credentials for email:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('User verified:', { id: user.id, email: user.email, role: user.role, useFallback });

    const sessionToken = createSession(user.id, user.email, user.role);
    console.log('Session token created:', sessionToken.substring(0, 10) + '...');
    
    const cookieStore = await cookies();
    
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });
    
    console.log('Cookie set successfully');

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      useFallback, // Add this to help with debugging
    });
    
    console.log('Login successful, returning response');
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
