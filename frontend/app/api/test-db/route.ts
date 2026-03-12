import { NextRequest, NextResponse } from 'next/server'

// Simple test API to check if database is working
export async function GET(request: NextRequest) {
  try {
    console.log('Database test - checking connection...');
    
    // Import and test database
    const { query } = await import('@/lib/db');
    
    // Simple query to test connection
    const result = await query('SELECT NOW() as current_time');
    
    console.log('Database connection successful:', result.rows[0]);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection working',
      time: result.rows[0].current_time,
      env: {
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        nodeEnv: process.env.NODE_ENV || 'Unknown'
      }
    });
    
  } catch (error: any) {
    console.error('Database connection failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      env: {
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        nodeEnv: process.env.NODE_ENV || 'Unknown'
      }
    }, { status: 500 });
  }
}
