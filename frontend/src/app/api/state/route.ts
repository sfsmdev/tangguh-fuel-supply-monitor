import { NextRequest, NextResponse } from 'next/server';
import { StateController } from '@api/controllers/state.controller';

export async function GET() {
  try {
    const state = await StateController.getState();
    return NextResponse.json({ success: true, state });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch state' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const username = req.headers.get('x-user-role') || 'admin';
    const body = await req.json();
    const state = await StateController.updateState(username, body.state);
    return NextResponse.json({ success: true, state });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save state' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const username = req.headers.get('x-user-role') || 'admin';
    const state = await StateController.resetState(username);
    return NextResponse.json({ success: true, state });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to reset state' },
      { status: 400 }
    );
  }
}

