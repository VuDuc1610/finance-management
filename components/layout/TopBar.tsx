import Link from "next/link";

export function TopBar() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-linen-300 px-8 py-6 md:px-14">
      <span className="font-display text-[1.5rem] text-ink-900">Finance Management</span>
      <div className="flex items-center gap-5">
        <Link
          href="/auth"
          className="font-sans text-[1rem] text-linen-700 hover:text-ink-900"
        >
          Log in
        </Link>
        <Link
          href="/auth"
          className="rounded-pill border border-dye-indigo px-6 py-2.5 font-sans text-[1rem] text-dye-indigo hover:bg-dye-indigo/10"
        >
          Sign up
        </Link>
      </div>
    </header>
  );
}
