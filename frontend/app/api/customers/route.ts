import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const loanTypeId = searchParams.get('loanTypeId');

    let sql = `
      SELECT c.*, lt.name as loan_type_name
      FROM customers c
      LEFT JOIN loan_types lt ON c.loan_type_id = lt.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ` AND c.status = $${params.length + 1}`;
      params.push(status);
    }

    if (loanTypeId) {
      sql += ` AND c.loan_type_id = $${params.length + 1}`;
      params.push(parseInt(loanTypeId));
    }

    sql += ' ORDER BY c.created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const {
      name,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      loanTypeId,
      principalAmount,
      interestRate,
      startDate,
      maturityDate,
      notes,
    } = await request.json();

    if (!name || !phone || !loanTypeId || !principalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO customers 
       (name, email, phone, address, city, state, zip_code, loan_type_id, principal_amount, interest_rate, start_date, maturity_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        name,
        email || null,
        phone,
        address || null,
        city || null,
        state || null,
        zipCode || null,
        loanTypeId,
        principalAmount,
        interestRate || null,
        startDate || null,
        maturityDate || null,
        notes || null,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
