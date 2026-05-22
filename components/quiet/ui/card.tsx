import * as React from "react";
import { cn } from "@/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  flat?: boolean;
}

export function Card({ className, flat, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-line rounded-[var(--radius-lg)] overflow-hidden",
        !flat && "shadow-[var(--shadow-card)]",
        className
      )}
      {...rest}
    />
  );
}

export function CardBody({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...rest} />;
}

export function CardDivider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-line w-full", className)} />;
}
