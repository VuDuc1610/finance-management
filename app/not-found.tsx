import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <main className="flex w-full flex-1 items-center justify-center px-6 py-10 md:px-10 lg:px-16">
      <Card className="flex w-full max-w-md flex-col items-center gap-4 p-10 text-center">
        <span className="font-display text-[2.5rem] text-ink-900">404</span>
        <div>
          <h1 className="font-display text-[1.4rem] text-ink-900">
            Page not found
          </h1>
          <p className="mt-1 font-sans text-[0.875rem] text-linen-700">
            We couldn&apos;t find the page you were looking for.
          </p>
        </div>

        <Link
          href="/home"
          className="mt-2 rounded-pill bg-dye-indigo px-4 py-2.5 font-sans text-[0.9375rem] text-linen-100 transition hover:opacity-90"
        >
          Back to home
        </Link>
      </Card>
    </main>
  );
}
