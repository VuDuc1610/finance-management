import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="w-full">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <header className="sticky top-4 z-50 flex justify-center py-3">
          <div className="flex w-full max-w-2xl items-center justify-between gap-6 rounded-pill bg-ink-900 py-2 pr-2 pl-5 shadow-lg shadow-ink-900/25">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linen-100 font-display text-[0.8125rem] text-ink-900">
                z
              </span>
              <span className="font-display text-[1rem] tracking-tight text-linen-100">
                zen linen
              </span>
            </div>
            <nav className="hidden items-center gap-8 sm:flex">
              <a
                href="#how"
                className="font-sans text-[0.875rem] text-linen-300 transition hover:text-linen-100"
              >
                How it works
              </a>
            </nav>
            <div className="flex items-center gap-0.5 rounded-pill bg-linen-100 p-1">
              <Link
                href="/auth"
                className="rounded-pill px-4 py-1.5 font-sans text-[0.875rem] text-ink-900 transition hover:bg-linen-300/60"
              >
                Log in
              </Link>
              <Link
                href="/auth"
                className="rounded-pill bg-ink-900 px-4 py-1.5 font-sans text-[0.875rem] text-linen-100 transition hover:opacity-90"
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 items-center gap-14 pt-8 pb-16 sm:pb-20 lg:grid-cols-[6fr_5fr] lg:gap-16 lg:pt-12 lg:pb-24">
          <div>
            <span className="mb-6 inline-block font-mono text-[0.8125rem] tracking-[0.14em] text-linen-700">
              PERSONAL FINANCE, QUIETLY
            </span>
            <h1 className="text-balance font-display text-[2.75rem] leading-[1.05] tracking-tight text-ink-900 sm:text-[3.5rem] lg:text-[4.5rem]">
              Every dollar you earn,{" "}
              <span className="bg-gradient-to-r from-dye-indigo to-dye-madder bg-clip-text text-transparent">
                dyed by where it went
              </span>
              .
            </h1>
            <p className="mt-7 max-w-[480px] text-pretty text-[1.1875rem] leading-relaxed text-linen-700">
              Connect your accounts once. Zen Linen colors each category,
              follows your income out the door, and tells you what stayed —
              without a single notification.
            </p>
            <div className="mt-10 flex items-center gap-5">
              <Link
                href="/auth"
                className="rounded-pill bg-gradient-to-r from-dye-indigo to-dye-madder px-8 py-4 font-sans text-[1rem] text-linen-100 transition hover:opacity-90"
              >
                Start free
              </Link>
              <a href="#how" className="font-sans text-[1rem] text-dye-indigo">
                See a real month →
              </a>
            </div>
            <p className="mt-7 font-mono text-[0.8125rem] text-linen-700">
              12,000 accounts linked · read-only · no ads
            </p>
          </div>

          <div className="chart-bloom is-bloomed">
            <svg viewBox="0 0 420 420" width="100%" style={{ display: "block" }}>
              <defs>
                <linearGradient id="hd1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#2F4858" />
                  <stop offset="1" stopColor="#4A6E7E" />
                </linearGradient>
                <linearGradient id="hd2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#A8493A" />
                  <stop offset="1" stopColor="#C2685A" />
                </linearGradient>
                <linearGradient id="hd3" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#D6A23C" />
                  <stop offset="1" stopColor="#E0B863" />
                </linearGradient>
                <linearGradient id="hd4" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#6C5B7B" />
                  <stop offset="1" stopColor="#8A7899" />
                </linearGradient>
                <linearGradient id="hd5" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#6B8A5A" />
                  <stop offset="1" stopColor="#89A876" />
                </linearGradient>
              </defs>
              <g transform="rotate(-90 210 210)" fill="none" strokeWidth="34">
                <circle cx="210" cy="210" r="160" stroke="#D8CFBE" strokeOpacity="0.5" />
                <circle cx="210" cy="210" r="160" stroke="url(#hd1)" strokeDasharray="368.4 636.8" strokeDashoffset="0" />
                <circle cx="210" cy="210" r="160" stroke="url(#hd2)" strokeDasharray="208.5 796.7" strokeDashoffset="-375" />
                <circle cx="210" cy="210" r="160" stroke="url(#hd3)" strokeDasharray="157.3 848" strokeDashoffset="-590.1" />
                <circle cx="210" cy="210" r="160" stroke="url(#hd4)" strokeDasharray="117 1088.2" strokeDashoffset="-754" />
                <circle cx="210" cy="210" r="160" stroke="url(#hd5)" strokeDasharray="121 1084.2" strokeDashoffset="-877.6" />
              </g>
              <text x="210" y="196" textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 12, fill: "#8C8375", letterSpacing: ".14em" }}>
                AUGUST 2026
              </text>
              <text x="210" y="234" textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontSize: 36, fill: "#2B2A28" }}>
                $1,244.65
              </text>
              <text x="210" y="256" textAnchor="middle" style={{ fontFamily: "var(--font-sans)", fontSize: 14, fill: "#8C8375" }}>
                across 5 categories
              </text>
            </svg>
          </div>
        </section>

        <section id="how" className="border-t border-linen-300 py-20">
          <h2 className="mb-2 font-display text-[2.25rem] tracking-tight text-ink-900">
            Income enters indigo and leaves in color
          </h2>
          <p className="mb-11 max-w-[560px] text-pretty text-[1.0625rem] text-linen-700">
            The whole product is one idea: your paycheck is a single hue until
            it&apos;s spent. Each band takes on its category&apos;s dye on the
            way out, and the part you never spent stays undyed.
          </p>
          <div className="chart-bloom is-bloomed">
            <svg viewBox="0 0 1100 570" width="100%" style={{ display: "block" }}>
              <defs>
                <linearGradient id="gf1" gradientUnits="userSpaceOnUse" x1="442" y1="0" x2="800" y2="0">
                  <stop offset="0" stopColor="#2F4858" stopOpacity=".34" />
                  <stop offset="1" stopColor="#2F4858" stopOpacity=".62" />
                </linearGradient>
                <linearGradient id="gf2" gradientUnits="userSpaceOnUse" x1="442" y1="0" x2="800" y2="0">
                  <stop offset="0" stopColor="#2F4858" stopOpacity=".34" />
                  <stop offset="1" stopColor="#A8493A" stopOpacity=".62" />
                </linearGradient>
                <linearGradient id="gf3" gradientUnits="userSpaceOnUse" x1="442" y1="0" x2="800" y2="0">
                  <stop offset="0" stopColor="#2F4858" stopOpacity=".34" />
                  <stop offset="1" stopColor="#D6A23C" stopOpacity=".62" />
                </linearGradient>
                <linearGradient id="gf4" gradientUnits="userSpaceOnUse" x1="442" y1="0" x2="800" y2="0">
                  <stop offset="0" stopColor="#2F4858" stopOpacity=".34" />
                  <stop offset="1" stopColor="#6C5B7B" stopOpacity=".62" />
                </linearGradient>
                <linearGradient id="gf5" gradientUnits="userSpaceOnUse" x1="442" y1="0" x2="800" y2="0">
                  <stop offset="0" stopColor="#2F4858" stopOpacity=".34" />
                  <stop offset="1" stopColor="#6B8A5A" stopOpacity=".62" />
                </linearGradient>
                <linearGradient id="gf6" gradientUnits="userSpaceOnUse" x1="442" y1="0" x2="800" y2="0">
                  <stop offset="0" stopColor="#2F4858" stopOpacity=".30" />
                  <stop offset="1" stopColor="#8C8375" stopOpacity=".42" />
                </linearGradient>
                <linearGradient id="gf0" gradientUnits="userSpaceOnUse" x1="52" y1="0" x2="430" y2="0">
                  <stop offset="0" stopColor="#2F4858" stopOpacity=".26" />
                  <stop offset="1" stopColor="#2F4858" stopOpacity=".34" />
                </linearGradient>
              </defs>
              <g>
                <path d="M52 60 C 241.0 60, 241.0 60, 430 60 L 430 417 C 241.0 417, 241.0 417, 52 417 Z" fill="url(#gf0)" />
                <path d="M52 425 C 241.0 425, 241.0 417, 430 417 L 430 460 C 241.0 460, 241.0 468, 52 468 Z" fill="url(#gf0)" />
              </g>
              <g>
                <path d="M442 60 C 621.0 60, 621.0 20, 800 20 L 800 316.7 C 621.0 316.7, 621.0 356.7, 442 356.7 Z" fill="url(#gf6)" />
                <path d="M442 356.7 C 621.0 356.7, 621.0 338.7, 800 338.7 L 800 377.2 C 621.0 377.2, 621.0 395.2, 442 395.2 Z" fill="url(#gf1)" />
                <path d="M442 395.2 C 621.0 395.2, 621.0 399.2, 800 399.2 L 800 421.3 C 621.0 421.3, 621.0 417.3, 442 417.3 Z" fill="url(#gf2)" />
                <path d="M442 417.3 C 621.0 417.3, 621.0 443.3, 800 443.3 L 800 460.1 C 621.0 460.1, 621.0 434.1, 442 434.1 Z" fill="url(#gf3)" />
                <path d="M442 434.1 C 621.0 434.1, 621.0 482.1, 800 482.1 L 800 495.2 C 621.0 495.2, 621.0 447.2, 442 447.2 Z" fill="url(#gf5)" />
                <path d="M442 447.2 C 621.0 447.2, 621.0 517.2, 800 517.2 L 800 529.9 C 621.0 529.9, 621.0 459.9, 442 459.9 Z" fill="url(#gf4)" />
              </g>
              <g>
                <rect x="40" y="60" width="12" height="357" fill="#2F4858" />
                <rect x="40" y="425" width="12" height="43" fill="#2F4858" />
                <rect x="430" y="60" width="12" height="400" fill="#2F4858" />
                <rect x="800" y="20" width="12" height="296.7" fill="#8C8375" />
                <rect x="800" y="338.7" width="12" height="38.5" fill="#2F4858" />
                <rect x="800" y="399.2" width="12" height="22.1" fill="#A8493A" />
                <rect x="800" y="443.3" width="12" height="16.8" fill="#D6A23C" />
                <rect x="800" y="482.1" width="12" height="13.1" fill="#6B8A5A" />
                <rect x="800" y="517.2" width="12" height="12.7" fill="#6C5B7B" />
              </g>
              <g textAnchor="end">
                <text x="28" y="243" style={{ fontFamily: "var(--font-sans)", fontSize: 16, fill: "#2B2A28" }}>Salary</text>
                <text x="28" y="451" style={{ fontFamily: "var(--font-sans)", fontSize: 16, fill: "#2B2A28" }}>Freelance</text>
              </g>
              <text x="430" y="46" style={{ fontFamily: "var(--font-mono)", fontSize: 12, fill: "#8C8375", letterSpacing: ".12em" }}>INCOME</text>
              <text x="830" y="173.3" style={{ fontFamily: "var(--font-sans)", fontSize: 16, fill: "#2B2A28" }}>Never spent</text>
              <text x="830" y="362.9" style={{ fontFamily: "var(--font-sans)", fontSize: 16, fill: "#2B2A28" }}>Housing</text>
              <text x="830" y="415.3" style={{ fontFamily: "var(--font-sans)", fontSize: 16, fill: "#2B2A28" }}>Food &amp; Dining</text>
              <text x="830" y="456.7" style={{ fontFamily: "var(--font-sans)", fontSize: 16, fill: "#2B2A28" }}>Bills &amp; Utilities</text>
              <text x="830" y="493.7" style={{ fontFamily: "var(--font-sans)", fontSize: 16, fill: "#2B2A28" }}>Other</text>
              <text x="830" y="528.6" style={{ fontFamily: "var(--font-sans)", fontSize: 16, fill: "#2B2A28" }}>Financial</text>
            </svg>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 border-t border-linen-300 py-20 sm:grid-cols-3">
          <article className="flex flex-col overflow-hidden rounded-card border border-linen-300">
            <div className="h-1 bg-gradient-to-r from-dye-indigo to-dye-madder" />
            <div className="flex flex-1 flex-col gap-3.5 p-7">
              <h3 className="font-display text-[1.375rem] text-ink-900">
                One color per category
              </h3>
              <p className="text-pretty text-[1rem] leading-relaxed text-linen-700">
                Five dyes, fixed for life. You learn the palette in a week and
                never read a legend again.
              </p>
            </div>
          </article>
          <article className="flex flex-col overflow-hidden rounded-card border border-linen-300">
            <div className="h-1 bg-gradient-to-r from-dye-indigo to-dye-saffron" />
            <div className="flex flex-1 flex-col gap-3.5 p-7">
              <h3 className="font-display text-[1.375rem] text-ink-900">
                Budgets that shift hue
              </h3>
              <p className="text-pretty text-[1rem] leading-relaxed text-linen-700">
                A bar warms from indigo toward madder as it fills. Over the
                cap, the overflow is solid madder.
              </p>
            </div>
          </article>
          <article className="flex flex-col overflow-hidden rounded-card border border-linen-300">
            <div className="h-1 bg-gradient-to-r from-dye-moss to-dye-indigo" />
            <div className="flex flex-1 flex-col gap-3.5 p-7">
              <h3 className="font-display text-[1.375rem] text-ink-900">
                What stayed, first
              </h3>
              <p className="text-pretty text-[1rem] leading-relaxed text-linen-700">
                Savings rate leads every screen. Spending is context for it,
                not the headline.
              </p>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 items-center gap-12 border-t border-linen-300 py-20 lg:grid-cols-[5fr_7fr] lg:gap-16">
          <div>
            <h2 className="mb-4 font-display text-[2.25rem] tracking-tight text-ink-900">
              Six months in one glance
            </h2>
            <p className="text-pretty text-[1.0625rem] leading-relaxed text-linen-700">
              Housing sits at the base of every column, so the color above it
              is the part you can actually move. Hover any month in the app
              for the exact split.
            </p>
          </div>
          <div className="chart-bloom is-bloomed">
            <svg viewBox="0 0 640 260" width="100%" style={{ display: "block" }}>
              <defs>
                <linearGradient id="lb1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#2F4858" />
                  <stop offset="1" stopColor="#4A6E7E" />
                </linearGradient>
                <linearGradient id="lb2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#A8493A" />
                  <stop offset="1" stopColor="#C2685A" />
                </linearGradient>
                <linearGradient id="lb3" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#D6A23C" />
                  <stop offset="1" stopColor="#E0B863" />
                </linearGradient>
                <linearGradient id="lb4" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#6C5B7B" />
                  <stop offset="1" stopColor="#8A7899" />
                </linearGradient>
                <linearGradient id="lb5" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#6B8A5A" />
                  <stop offset="1" stopColor="#89A876" />
                </linearGradient>
              </defs>
              <line x1="20" y1="220" x2="620" y2="220" stroke="#D8CFBE" strokeWidth="1" />
              <g>
                <rect x="34" y="150.4" width="64" height="69.6" fill="url(#lb1)" />
                <rect x="34" y="106.7" width="64" height="43.7" fill="url(#lb2)" />
                <rect x="34" y="71" width="64" height="35.7" fill="url(#lb3)" />
                <rect x="34" y="45.8" width="64" height="25.2" fill="url(#lb4)" />
                <rect x="34" y="23.6" width="64" height="22.2" fill="url(#lb5)" />
                <rect x="134" y="150.4" width="64" height="69.6" fill="url(#lb1)" />
                <rect x="134" y="112.5" width="64" height="37.9" fill="url(#lb2)" />
                <rect x="134" y="80.3" width="64" height="32.2" fill="url(#lb3)" />
                <rect x="134" y="56.5" width="64" height="23.8" fill="url(#lb4)" />
                <rect x="134" y="33.2" width="64" height="23.3" fill="url(#lb5)" />
                <rect x="234" y="150.4" width="64" height="69.6" fill="url(#lb1)" />
                <rect x="234" y="110.2" width="64" height="40.2" fill="url(#lb2)" />
                <rect x="234" y="80.7" width="64" height="29.5" fill="url(#lb3)" />
                <rect x="234" y="58.4" width="64" height="22.3" fill="url(#lb4)" />
                <rect x="234" y="36.8" width="64" height="21.6" fill="url(#lb5)" />
                <rect x="334" y="150.4" width="64" height="69.6" fill="url(#lb1)" />
                <rect x="334" y="114.4" width="64" height="36" fill="url(#lb2)" />
                <rect x="334" y="83.5" width="64" height="30.9" fill="url(#lb3)" />
                <rect x="334" y="62.3" width="64" height="21.2" fill="url(#lb4)" />
                <rect x="334" y="40.8" width="64" height="21.5" fill="url(#lb5)" />
                <rect x="434" y="150.4" width="64" height="69.6" fill="url(#lb1)" />
                <rect x="434" y="105.1" width="64" height="45.3" fill="url(#lb2)" />
                <rect x="434" y="71.1" width="64" height="34" fill="url(#lb3)" />
                <rect x="434" y="46.8" width="64" height="24.3" fill="url(#lb4)" />
                <rect x="434" y="25.3" width="64" height="21.5" fill="url(#lb5)" />
                <rect x="534" y="150.4" width="64" height="69.6" fill="url(#lb1)" />
                <rect x="534" y="110.4" width="64" height="40" fill="url(#lb2)" />
                <rect x="534" y="80" width="64" height="30.4" fill="url(#lb3)" />
                <rect x="534" y="57" width="64" height="23" fill="url(#lb4)" />
                <rect x="534" y="33.3" width="64" height="23.7" fill="url(#lb5)" />
              </g>
              <g textAnchor="middle" style={{ fontFamily: "var(--font-sans)", fontSize: 13, fill: "#8C8375" }}>
                <text x="66" y="242">Mar</text>
                <text x="166" y="242">Apr</text>
                <text x="266" y="242">May</text>
                <text x="366" y="242">Jun</text>
                <text x="466" y="242">Jul</text>
                <text x="566" y="242" style={{ fill: "#2B2A28" }}>Aug</text>
              </g>
            </svg>
          </div>
        </section>

        <section className="flex flex-col items-center gap-7 border-t border-linen-300 py-24 text-center">
          <h2 className="max-w-[640px] text-balance font-display text-[3rem] leading-[1.1] tracking-tight text-ink-900">
            See this month in{" "}
            <span className="bg-gradient-to-r from-dye-indigo to-dye-madder bg-clip-text text-transparent">
              color
            </span>
          </h2>
          <Link
            href="/auth"
            className="rounded-pill bg-gradient-to-r from-dye-indigo to-dye-madder px-8 py-4 font-sans text-[1rem] text-linen-100 transition hover:opacity-90"
          >
            Open the dashboard
          </Link>
        </section>

        <footer className="flex items-center justify-between border-t border-linen-300 py-8 pb-12 font-mono text-[0.8125rem] text-linen-700">
          <span>Zen Linen · Brooklyn, NY</span>
          <span className="flex gap-6">
            <a href="#" className="text-linen-700 hover:text-ink-900">Security</a>
            <a href="#" className="text-linen-700 hover:text-ink-900">Privacy</a>
            <a href="#" className="text-linen-700 hover:text-ink-900">Support</a>
          </span>
        </footer>
      </div>
    </main>
  );
}
