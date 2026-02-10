import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const collectorId = searchParams.get('collectorId');

    let sql = `
      SELECT ce.*, u.full_name as collector_name, c.name as customer_name
      FROM collection_entries ce
      LEFT JOIN users u ON ce.collector_id = u.id
      LEFT JOIN customers c ON ce.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // If not admin, only show their own collections
    if (user.role === 'collector') {
      sql += ` AND ce.collector_id = $${params.length + 1}`;
      params.push(user.id);
    } else if (collectorId) {
      sql += ` AND ce.collector_id = $${params.length + 1}`;
      params.push(parseInt(collectorId));
    }

    if (startDate) {
      sql += ` AND ce.collection_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND ce.collection_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    sql += ' ORDER BY ce.collection_date DESC, ce.created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const {
      customerId,
      collectionDate,
      amountCollected,
      paymentMethod,
      notes,
    } = await request.json();

    if (!customerId || !collectionDate || !amountCollected) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Collectors can only record their own collections
    const collectorId = user.role === 'collector' ? user.id : (await request.json()).collectorId || user.id;

    const result = await query(
      `INSERT INTO collection_entries 
       (collector_id, customer_id, collection_date, amount_collected, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        collectorId,
        customerId,
        collectionDate,
        amountCollected,
        paymentMethod || null,
        notes || null,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating collection entry:', error);
    return NextResponse.json(
      { error: 'Failed to create collection entry' },
      { status: 500 }
    );
  }
}
