import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth-server';

export const dynamic = 'force-dynamic';

/** Whether the caller's session belongs to an admin. Lets admin pages gate their UI without the whitelist reaching the browser. */
export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ admin: false }, { status: 403 });
  }
  return NextResponse.json({ admin: true });
}
