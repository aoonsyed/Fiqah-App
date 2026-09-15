import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  );

  // Get the current session to sign out
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    await supabase.auth.signOut();
  }

  // Redirect to home
  return NextResponse.redirect(new URL('/', request.url));
}
