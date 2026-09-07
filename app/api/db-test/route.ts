import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT current_database(), current_user;');
    return NextResponse.json({
      status: 'Connected successfully!',
      details: result.rows[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Database connection failed', message: error.message },
      { status: 500 }
    );
  }
}
