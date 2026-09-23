export function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="text-center py-14 px-6">
      <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden className="mx-auto mb-4">
        <path d="M12 10h56a10 10 0 0 1 10 10v22a10 10 0 0 1-10 10H36l-14 14V52h-10A10 10 0 0 1 2 42V20a10 10 0 0 1 10-10z" fill="#fff" stroke="#d8e2ee" strokeWidth="3" strokeDasharray="6 6" />
        <circle cx="30" cy="31" r="3.5" fill="#c9dcec" /><circle cx="45" cy="31" r="3.5" fill="#c9dcec" /><circle cx="60" cy="31" r="3.5" fill="#c9dcec" />
      </svg>
      <h3 className="text-xl font-bold">{title}</h3>
      {hint && <p className="font-hand text-lg text-ink-soft mt-1">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
