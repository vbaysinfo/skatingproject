import { NextResponse, type NextRequest } from 'next/server';
export function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get('id') || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return NextResponse.redirect(new URL(id ? `/verify/member/${id}` : '/verify/member', req.url));
}
