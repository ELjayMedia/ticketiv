"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/quiet/ui/icon";

/* ── Toast system ─────────────────────────────────────────────────
 * Provider + imperative hook.
 *
 * Setup (root layout or shell):
 *   <ToastProvider>
 *     <YourApp />
 *   </ToastProvider>
 *
 * Usage anywhere:
 *   const toast = useToast();
 *   toast.show({ title: "Saved!", variant: "success" });
 *   toast.show({ title: "Failed to save", variant: "error" });
 *   toast.show({ title: "Processing…", variant: "loading" });
 * ────────────────────────────────────────────────────────────── */

type ToastVariant = "default" | "success" | "error" | "warning" | "loading";

interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  show: (opts: Omit<ToastData, "id">) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue & { toast: ToastContextValue["show"] } {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  // `toast` is an alias for `show` — matches the { toast } destructuring pattern
  return { ...ctx, toast: ctx.show };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const show = React.useCallback((opts: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...opts }]);
    return id;
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-sm" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

/* ── Individual toast item ──────────────────────────────────────── */
const variantStyles: Record<ToastVariant, string> = {
  default: "bg-surface border-line text-ink",
  success: "bg-surface border-line text-ink",
  error: "bg-danger-soft border-danger/30 text-danger",
  warning: "bg-surface border-warning/40 text-warning",
  loading: "bg-surface border-line text-ink",
};

const variantIconName: Partial<Record<ToastVariant, string>> = {
  success: "check",
  error: "close",
  warning: "zap",
};

const variantIconStyle: Partial<Record<ToastVariant, string>> = {
  success: "text-accent",
  error: "text-danger",
  warning: "text-warning",
};

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  return (
    <ToastPrimitive.Root
      duration={toast.duration ?? (toast.variant === "loading" ? Infinity : 4000)}
      onOpenChange={(open) => {
        if (!open) onDismiss(toast.id);
      }}
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 shadow-[var(--shadow-card)]",
        "data-[state=open]:animate-[slideInRight_200ms_ease]",
        "data-[state=closed]:animate-[fadeOut_150ms_ease]",
        "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
        variantStyles[toast.variant ?? "default"]
      )}
    >
      {/* Icon */}
      {toast.variant === "loading" ? (
        <span className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent" />
      ) : variantIconName[toast.variant ?? "default"] ? (
        <span
          className={cn(
            "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
            toast.variant === "success" && "bg-accent/10",
            toast.variant === "error" && "bg-danger/10",
          )}
        >
          <Icon
            name={variantIconName[toast.variant ?? "default"]!}
            size={12}
            strokeWidth={2.5}
            className={variantIconStyle[toast.variant ?? "default"]}
          />
        </span>
      ) : null}

      {/* Text */}
      <div className="flex flex-1 flex-col gap-0.5">
        <ToastPrimitive.Title className="text-[13px] font-semibold leading-snug">
          {toast.title}
        </ToastPrimitive.Title>
        {toast.description && (
          <ToastPrimitive.Description className="text-[12px] text-ink-3 leading-snug">
            {toast.description}
          </ToastPrimitive.Description>
        )}
      </div>

      {/* Close button (not shown for loading) */}
      {toast.variant !== "loading" && (
        <ToastPrimitive.Close
          className="ml-auto shrink-0 rounded p-0.5 text-ink-3 hover:text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/30"
          aria-label="Close"
        >
          <Icon name="close" size={14} />
        </ToastPrimitive.Close>
      )}
    </ToastPrimitive.Root>
  );
}
