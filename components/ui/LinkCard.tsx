import Link from "next/link";
import type { DragEvent, ReactNode } from "react";

interface LinkCardProps {
  href: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (event: DragEvent<HTMLAnchorElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLAnchorElement>) => void;
}

function GripIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-linen-700"
    >
      <circle cx="7" cy="5" r="1.3" />
      <circle cx="13" cy="5" r="1.3" />
      <circle cx="7" cy="10" r="1.3" />
      <circle cx="13" cy="10" r="1.3" />
      <circle cx="7" cy="15" r="1.3" />
      <circle cx="13" cy="15" r="1.3" />
    </svg>
  );
}

export function LinkCard({
  href,
  title,
  subtitle,
  children,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: LinkCardProps) {
  return (
    <Link
      href={href}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative block rounded-card border border-linen-300 bg-linen-100 p-8 transition-colors hover:border-dye-indigo/40 ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "opacity-40" : ""}`}
    >
      {draggable && (
        <span
          className={`absolute top-8 left-2.5 transition-opacity ${
            isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          title="Drag to reorder"
        >
          <GripIcon />
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.6rem] text-ink-900">{title}</h2>
          {subtitle && (
            <p className="mt-1 font-sans text-[1rem] text-linen-700">{subtitle}</p>
          )}
        </div>
        <span
          aria-hidden="true"
          className="mt-1 shrink-0 font-sans text-[1.25rem] text-linen-700 transition-transform group-hover:translate-x-0.5 group-hover:text-dye-indigo"
        >
          →
        </span>
      </div>

      <div className="mt-6">{children}</div>
    </Link>
  );
}
