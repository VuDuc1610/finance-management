export function TopBar() {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-linen-300 px-6 py-4 md:px-10">
      <span className="font-display text-[1.25rem] text-ink-900">Finance Management</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="font-sans text-[0.875rem] text-linen-700 hover:text-ink-900"
        >
          Log in
        </button>
        <button
          type="button"
          className="rounded-pill border border-dye-indigo px-4 py-1.5 font-sans text-[0.875rem] text-dye-indigo hover:bg-dye-indigo/10"
        >
          Sign up
        </button>
      </div>
    </header>
  );
}
