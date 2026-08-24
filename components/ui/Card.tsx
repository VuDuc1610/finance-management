import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-card border border-linen-300 bg-linen-100 ${className}`}
    >
      {children}
    </div>
  );
}
