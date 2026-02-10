import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: any[] = [];

    if (startDate) {
      dateFilter += ` AND ce.collection_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      dateFilter += ` AND ce.collection_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    // Total collections by collector
    const collectorMetrics = await query(
      `SELECT 
        u.id, 
        u.full_name, 
        COUNT(ce.id) as total_collections,
        COALESCE(SUM(ce.amount_collected), 0) as total_amount,
        AVG(ce.amount_collected) as avg_amount
      FROM users u
      LEFT JOIN collection_entries ce ON u.id = ce.collector_id ${dateFilter}
      WHERE u.role = 'collector'
      GROUP BY u.id, u.full_name
      ORDER BY total_amount DESC`,
      params
    );

    // Total collections and revenue
    const totalMetrics = await query(
      `SELECT 
        COUNT(id) as total_entries,
        COALESCE(SUM(amount_collected), 0) as total_revenue
      FROM collection_entries
      WHERE 1=1 ${dateFilter}`,
      params
    );

    // Collections by loan type
    const loanTypeMetrics = await query(
      `SELECT 
        lt.name,
        COUNT(ce.id) as total_collections,
        COALESCE(SUM(ce.amount_collected), 0) as total_amount
      FROM collection_entries ce
      JOIN customers c ON ce.customer_id = c.id
      JOIN loan_types lt ON c.loan_type_id = lt.id
      WHERE 1=1 ${dateFilter}
      GROUP BY lt.name
      ORDER BY total_amount DESC`,
      params
    );

    // Customer status distribution
    const customerStatus = await query(
      `SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(principal_amount), 0) as total_amount
      FROM customers
      GROUP BY status
      ORDER BY count DESC`
    );

    // Daily collection trend
    const dailyTrend = await query(
      `SELECT 
        ce.collection_date,
        COUNT(*) as entries,
        COALESCE(SUM(ce.amount_collected), 0) as daily_total
      FROM collection_entries ce
      WHERE 1=1 ${dateFilter}
      GROUP BY ce.collection_date
      ORDER BY ce.collection_date DESC`,
      params
    );

    // Total expenses
    const expenses = await query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total_expenses,
        COUNT(*) as expense_count
      FROM expenses
      WHERE 1=1 ${dateFilter.replace('ce.collection_date', 'date')}`,
      params
    );

    return NextResponse.json({
      collectorMetrics: collectorMetrics.rows,
      totalMetrics: totalMetrics.rows[0],
      loanTypeMetrics: loanTypeMetrics.rows,
      customerStatus: customerStatus.rows,
      dailyTrend: dailyTrend.rows,
      expenses: expenses.rows[0],
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
