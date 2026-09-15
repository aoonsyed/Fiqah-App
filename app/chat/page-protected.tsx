'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatMessage } from '@/app/components/ChatMessage';
import { ChatInput } from '@/app/components/ChatInput';
import { useAuth } from '@/app/components/AuthProvider';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'السلام عليكم\n\nWelcome to Islamic Books RAG. Ask me anything about Islamic texts.',
      citations: [],
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations
  useEffect(() => {
    if (user) {
      loadConversations();
      createNewConversation();
    }
  }, [user]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setConversations(data || []);
  };

  const createNewConversation = async () => {
    const { data } = await supabase
      .from('conversations')
      .insert([{ user_id: user?.id, title: 'New Chat' }])
      .select('id')
      .single();

    if (data) {
      setConversationId(data.id);
      setMessages([
        {
          id: '0',
          role: 'assistant',
          content: 'السلام عليكم\n\nWelcome to Islamic Books RAG. Ask me anything about Islamic texts.',
          citations: [],
        },
      ]);
      loadConversations();
    }
  };

  const loadConversation = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(
        data.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.cited_hadith_ids || [],
        })),
      );
    }

    setConversationId(convId);
    setShowSidebar(false);
  };

  const handleSendMessage = async (text: string) => {
    if (!conversationId) return;

    // Save user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Save to DB
    await supabase
      .from('messages')
      .insert([{ conversation_id: conversationId, role: 'user', content: text }]);

    setIsLoading(true);

    try {
      // Call chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      // Save assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Save to DB
      await supabase.from('messages').insert([
        {
          conversation_id: conversationId,
          role: 'assistant',
          content: data.answer,
          cited_hadith_ids: data.citations,
        },
      ]);

      // Update conversation title if first message
      if (messages.length === 1) {
        const title = text.length > 50 ? text.substring(0, 50) + '...' : text;
        await supabase
          .from('conversations')
          .update({ title })
          .eq('id', conversationId);
        loadConversations();
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Sorry, there was an error. Please try again.',
        citations: [],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-white dark:bg-black">
      {/* Sidebar */}
      <div
        className={`fixed md:static w-64 h-screen bg-gray-50 dark:bg-gray-950 border-r border-gray-300 dark:border-gray-700 overflow-y-auto transition-transform ${
          showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-4">
          {/* User Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{user.email}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Logged in</p>
            </div>
          </div>

          {/* New Chat */}
          <button
            onClick={createNewConversation}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
          >
            ➕ New Chat
          </button>

          {/* Conversations */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">History</p>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  conversationId === conv.id
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                <p className="truncate font-medium">{conv.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(conv.created_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>

          {/* Sign Out */}
          <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
            <Link
              href="/api/auth/signout"
              className="w-full px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-sm font-semibold block text-center"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-300 dark:border-gray-700 p-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="md:hidden p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
            >
              ☰
            </button>
            <h1 className="text-2xl font-bold">Islamic Books RAG</h1>
            <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">
              Home
            </Link>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                citations={message.citations}
              />
            ))}
            {isLoading && (
              <div className="flex gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white">
                  🤖
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">Thinking</span>
                  <span className="animate-pulse">•••</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput onSubmit={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
