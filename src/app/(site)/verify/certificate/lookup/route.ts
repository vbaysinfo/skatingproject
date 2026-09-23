import { NextResponse, type NextRequest } from 'next/server';
export function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get('id') || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return NextResponse.redirect(new URL(id ? `/verify/certificate/${id}` : '/verify/certificate', req.url));
}
