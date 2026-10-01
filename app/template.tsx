/** Re-mounted on every navigation, so each page fades in instead of snapping. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>;
}
