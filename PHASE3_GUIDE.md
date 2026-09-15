# Phase 3: Authentication & Conversation History

## Overview

Phase 3 adds user authentication and persistent conversation management:
- User signup/login with Supabase Auth
- Secure session management
- Save conversation history to database
- Resume previous chats
- Protected routes

**Estimated setup time: 15 minutes (after Phase 1 database)**

---

## What's New

### Authentication Pages
| Page | Path | Purpose |
|------|------|---------|
| Login | `/login` | Sign in with email/password |
| Signup | `/signup` | Create new account |

### Protected Chat
- **Path**: `/chat-protected` 
- Requires login
- Auto-saves messages
- Conversation sidebar
- New chat creation

### Auth Integration
- Supabase Auth (built-in JWT)
- Session persistence
- Auto-redirect to login if logged out

---

## Implementation

### 1. AuthProvider Component
Located: `app/components/AuthProvider.tsx`

**Features:**
- `useAuth()` hook for access anywhere
- Auto-detects session changes
- Sign up, sign in, sign out functions
- User state management

**Usage:**
```tsx
'use client';
import { useAuth } from '@/app/components/AuthProvider';

export default function MyPage() {
  const { user, loading, signIn, signOut } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;
  
  return <div>Welcome {user.email}</div>;
}
```

### 2. Login Page
Located: `app/login/page.tsx`

**Features:**
- Email/password form validation
- Error handling
- Redirects to `/chat` on success
- Link to signup
- Demo credentials

### 3. Signup Page
Located: `app/signup/page.tsx`

**Features:**
- Email validation
- Password confirmation
- Minimum 8 character requirement
- Error messages
- Link to login

### 4. Protected Chat
Located: `app/chat/page-protected.tsx`

**Features:**
- Requires authentication
- Conversation sidebar with history
- Creates new conversations
- Auto-saves all messages
- Conversation titles from first message
- New chat button

### 5. Auth Signout
Located: `app/api/auth/signout/route.ts`

Simple endpoint for logout:
```
GET /api/auth/signout → Signs out user → Redirects to home
```

---

## Supabase Setup

### 1. Enable Auth in Supabase
1. Go to your Supabase project dashboard
2. Click **Authentication** → **Providers**
3. Enable **Email** provider (should be default)
4. Go to **URL Configuration**
5. Add your site URL:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

### 2. Run Database Migrations
Database schema already includes `conversations` and `messages` tables.

If not yet created, run this in Supabase SQL Editor:
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  cited_hadith_ids JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
```

---

## Testing

### Setup
```bash
npm install
npm run dev
# Visit http://localhost:3000
```

### Test Flow

**1. Create an account**
- Click **Home** → **Chat** 
- Redirected to `/login`
- Click **Sign up**
- Enter: email, password (8+ chars), confirm
- Click **Sign Up**
- Redirected to login

**2. Sign in**
- Enter email & password
- Click **Sign In**
- Redirected to `/chat`

**3. Chat with history**
- Type a question
- Send message
- Message appears in chat + saved to DB
- Click **New Chat** → Creates new conversation
- Previous chat appears in sidebar
- Click previous chat → Loads history

**4. Sign out**
- Click your email in sidebar
- Click **Sign Out**
- Redirected to home
- Trying to access `/chat` → Redirected to login

---

## API Changes

### Chat Endpoint (Enhanced)
```
POST /api/chat
{
  "query": "What is knowledge?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Now saves to database via `page-protected.tsx`

### New Auth Endpoint
```
GET /api/auth/signout
→ Signs out user
→ Deletes session
→ Redirects to /
```

---

## File Structure (Phase 3)

```
app/
├── components/
│   ├── AuthProvider.tsx          # Auth context & hooks
│   ├── ChatMessage.tsx           # (unchanged)
│   └── ChatInput.tsx             # (unchanged)
├── api/
│   ├── auth/
│   │   └── signout/route.ts      # Logout endpoint
│   ├── chat/route.ts             # (unchanged)
│   └── ...                       # (unchanged)
├── login/page.tsx                # Login page
├── signup/page.tsx               # Signup page
├── chat/
│   ├── page.tsx                  # Public chat (Phase 2)
│   └── page-protected.tsx        # Auth-required chat (Phase 3)
├── layout.tsx                    # Updated with AuthProvider
└── ...

middleware.ts                     # Route protection (optional)
```

---

## How Conversation History Works

### Flow
```
User sends message
  ↓
ChatMessage component renders
  ↓
Message saved to DB (messages table)
  ↓
API call to /api/chat
  ↓
Response saved to DB
  ↓
Sidebar updated with conversation title
  ↓
History persists across sessions
```

### Conversation Title
- Auto-generated from first user message
- Truncated to 50 chars
- Updated in DB
- Shows in sidebar

### Message Storage
Each message includes:
- `id`: UUID
- `conversation_id`: FK to conversations
- `role`: 'user' | 'assistant'
- `content`: Full message text
- `cited_hadith_ids`: Array of citations
- `created_at`: Timestamp

---

## Security Considerations

### Supabase Auth
- JWT tokens managed by Supabase
- Session tokens auto-renewed
- Secrets never exposed to client

### Row-Level Security (RLS)
Optional: Enable RLS on conversations/messages tables:
```sql
-- Only users can see their own conversations
CREATE POLICY "Users can view own conversations" 
ON conversations FOR SELECT 
USING (auth.uid()::text = user_id);

-- Only users can view messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
ON messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM conversations 
  WHERE id = messages.conversation_id 
  AND user_id = auth.uid()::text
));
```

---

## Optional: Use Protected Chat as Default

To make `/chat` require login (instead of public):

**Option A: Rename pages**
```bash
mv app/chat/page.tsx app/chat/page-public.tsx
mv app/chat/page-protected.tsx app/chat/page.tsx
```

**Option B: Keep both, add selector**
Create `app/chat/page.tsx` that shows:
- Login prompt if not authenticated
- Protected chat if authenticated

---

## Troubleshooting

### "Cannot sign up - email already exists"
- Use a different email for testing
- Or delete user in Supabase Auth → Users

### "Session expired - please login again"
- Normal after 24 hours (configurable in Supabase)
- Click login again
- For dev, increase expiry in Supabase Settings

### "Messages not saving"
- Check Supabase is connected (`/api/health`)
- Check database tables exist (run schema.sql)
- Check user_id is being saved

### "Sidebar not loading conversations"
- Verify RLS is disabled or configured correctly
- Check browser console for errors
- Try reloading page

---

## Next: Phase 4 (Optional)

### Advanced Features
- [ ] Rate limiting (Upstash Redis)
- [ ] Message streaming for better UX
- [ ] Citation source viewer (modal with full hadith)
- [ ] Search by book/narrator
- [ ] Saved locations for prayer times
- [ ] Daily hadith notifications
- [ ] Admin panel with user management

### Production Checklist
- [ ] Add HTTPS (Vercel handles this)
- [ ] Enable RLS on Supabase tables
- [ ] Rotate database password
- [ ] Set up backups
- [ ] Add error tracking (Sentry)
- [ ] Add analytics

---

## Testing Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Check types
npm run type-check
```

---

## Deployment (Vercel)

Phase 3 is production-ready. Deploy:

```bash
npm run build
vercel deploy
```

Vercel will:
- Build app
- Deploy to CDN
- Set environment variables (from .env.local)
- Enable HTTPS
- Auto-scale

---

## Summary

Phase 3 adds:
✅ User authentication (Supabase Auth)
✅ Conversation persistence 
✅ Protected routes
✅ Session management
✅ Chat history with sidebar
✅ Auto-saving messages

**Ready for production after Phase 1 database setup.**

See QUICKSTART.md to get started.
