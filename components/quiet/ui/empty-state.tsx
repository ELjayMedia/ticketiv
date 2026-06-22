import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { Button } from "@/components/quiet/ui/button";

/* ── EmptyState ───────────────────────────────────────────────────
 * Full-bleed centred placeholder for empty lists, search no-results,
 * permission gates, and network-error states.
 *
 * Usage:
 *   <EmptyState
 *     icon="ticket"
 *     title="No tickets yet"
 *     description="When you buy tickets they'll appear here."
 *     action={{ label: "Browse events", onClick: () => router.push("/") }}
 *   />
 * ────────────────────────────────────────────────────────────── */

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  icon?: IconName;
  /** Custom icon node; takes precedence over `icon` */
  iconNode?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  /** Compact variant — less vertical padding, smaller icon */
  compact?: boolean;
}

export function EmptyState({
  icon,
  iconNode,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4 gap-2" : "py-16 px-6 gap-4",
        className
      )}
    >
      {/* Icon */}
      {(iconNode || icon) && (
        <div
          className={cn(
            "rounded-full bg-surface-2 text-ink-3 flex items-center justify-center",
            compact ? "w-10 h-10" : "w-14 h-14"
          )}
        >
          {iconNode ?? (
            <Icon name={icon!} size={compact ? 20 : 28} strokeWidth={1.4} />
          )}
        </div>
      )}

      {/* Text */}
      <div className="flex flex-col gap-1">
        <p className={cn("font-semibold text-ink", compact ? "text-[14px]" : "text-h3")}>
          {title}
        </p>
        {description && (
          <p className={cn("text-ink-3", compact ? "text-[12px]" : "text-[14px] max-w-xs")}>
            {description}
          </p>
        )}
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action && (
            <ActionButton action={action} variant="primary" compact={compact} />
          )}
          {secondaryAction && (
            <ActionButton action={secondaryAction} variant="outline" compact={compact} />
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  action,
  variant,
  compact,
}: {
  action: EmptyStateAction;
  variant: "primary" | "outline";
  compact: boolean;
}) {
  if (action.href) {
    return (
      <a href={action.href}>
        <Button variant={variant} size={compact ? "sm" : "md"}>
          {action.label}
        </Button>
      </a>
    );
  }
  return (
    <Button
      variant={variant}
      size={compact ? "sm" : "md"}
      onClick={action.onClick}
    >
      {action.label}
    </Button>
  );
}
