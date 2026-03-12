import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookies
    const sessionToken = request.cookies.get('session')?.value
    
    console.log('Session check - token found:', !!sessionToken);
    if (sessionToken) {
      console.log('Session token (first 10 chars):', sessionToken.substring(0, 10) + '...');
    }
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session token found' },
        { status: 401 }
      )
    }

    // Get session from token
    const session = getSession(sessionToken)
    console.log('Session retrieved:', !!session);
    if (session) {
      console.log('Session user:', { id: session.userId, email: session.email, role: session.role });
    }
    
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    // Return user info (without sensitive data)
    const response = NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        role: session.role
      }
    })
    
    console.log('Session check successful for user:', session.email);
    return response

  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
