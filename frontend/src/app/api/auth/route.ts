import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '@api/controllers/auth.controller';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await AuthController.login(body);
    if (!result.success) {
      return NextResponse.json(result, { status: 401 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}

