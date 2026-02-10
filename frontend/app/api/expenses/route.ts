import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');

    let sql = `
      SELECT e.*, u.full_name as created_by_name
      FROM expenses e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate) {
      sql += ` AND e.date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND e.date <= $${params.length + 1}`;
      params.push(endDate);
    }

    if (category) {
      sql += ` AND e.category = $${params.length + 1}`;
      params.push(category);
    }

    sql += ' ORDER BY e.date DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();

    const { description, amount, category, date } = await request.json();

    if (!description || !amount || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO expenses (description, amount, category, date, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [description, amount, category || null, date, user.id]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
