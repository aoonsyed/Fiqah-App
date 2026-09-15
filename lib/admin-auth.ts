/**
 * Admin authorization utility
 * Only specific emails can access admin panel
 */

const ADMIN_EMAILS = ['aoonsyed72@gmail.com', 'ahmadcs170@gmail.com'];

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function getAdminEmails(): string[] {
  return ADMIN_EMAILS;
}
