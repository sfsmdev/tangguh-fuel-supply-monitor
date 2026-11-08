import { NextRequest, NextResponse } from 'next/server';
import { ClientsController } from '@api/controllers/clients.controller';

export async function GET() {
  try {
    const clients = await ClientsController.listClients();
    return NextResponse.json({ success: true, clients });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const username = req.headers.get('x-user-role') || 'admin';
    const body = await req.json();
    const result = await ClientsController.createClient(username, body);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create client' },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const username = req.headers.get('x-user-role') || 'admin';
    const body = await req.json();
    const result = await ClientsController.updateClient(username, body);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update client' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const username = req.headers.get('x-user-role') || 'admin';
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || '';
    const result = await ClientsController.deleteClient(username, id);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete client' },
      { status: 400 }
    );
  }
}

