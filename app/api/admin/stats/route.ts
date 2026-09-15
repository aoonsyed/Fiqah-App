import { supabaseAdmin as supabase } from '@/lib/supabase-server';
import { errorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';


export async function GET() {
  try {
    // Get book count
    const { count: booksCount } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true });

    // Get hadith count
    const { count: hadithsCount } = await supabase
      .from('hadiths')
      .select('*', { count: 'exact', head: true });

    // Get chunk count
    const { count: chunksCount } = await supabase
      .from('hadith_chunks')
      .select('*', { count: 'exact', head: true });

    // Get user count (from auth)
    const { data: users } = await supabase.auth.admin.listUsers();

    // Get conversation count
    const { count: conversationsCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    // Get message count
    const { count: messagesCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeUsers = (users?.users ?? []).filter(
      (u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() > dayAgo,
    ).length;

    return NextResponse.json({
      totalBooks: booksCount || 0,
      totalHadiths: hadithsCount || 0,
      totalChunks: chunksCount || 0,
      totalUsers: users?.users.length || 0,
      activeUsers,
      totalConversations: conversationsCount || 0,
      totalMessages: messagesCount || 0,
    });
  } catch (error) {
    console.error('Stats error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch statistics',
        message: errorMessage(error),
      },
      { status: 500 },
    );
  }
}
