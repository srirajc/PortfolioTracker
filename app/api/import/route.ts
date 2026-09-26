import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const records: Record<string, unknown>[] = Array.isArray(body) ? body : [body];

    const processed = records.map((record) => {
      const rowKeys = Object.keys(record);
      const findValue = (possibleKeys: string[]) => {
        const match = possibleKeys.find((k) =>
          rowKeys.map((rk) => rk.toLowerCase()).includes(k.toLowerCase())
        );
        return match ? record[match] : null;
      };

      return {
        ticker: findValue(['ticker', 'symbol', 'code']),
        units: findValue(['units', 'quantity', 'shares']),
        price: findValue(['price', 'cost', 'avgprice']),
      };
    });

    return NextResponse.json({ success: true, count: processed.length, data: processed });
  } catch {
    return NextResponse.json({ error: 'Failed to process import payload' }, { status: 400 });
  }
}
