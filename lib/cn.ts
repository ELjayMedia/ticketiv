import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names with conflict resolution.
 * Identical signature to the one shadcn/ui ships, so existing code
 * that imports `cn` from `@/lib/utils` keeps working — re-export there.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
