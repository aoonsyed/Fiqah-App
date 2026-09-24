export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="paper-wash absolute inset-0" />
      <div className="pattern-girih absolute inset-0 opacity-60" style={{ opacity: 'calc(0.5 * var(--aurora-opacity, 1))' }} />
    </div>
  );
}
