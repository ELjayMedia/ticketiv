"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/quiet/ui/icon";

/* ── Modal / Dialog ──────────────────────────────────────────────
 * Thin Quiet-UI wrapper around Radix Dialog.
 *
 * Usage:
 *   <Modal open={open} onOpenChange={setOpen}>
 *     <ModalContent title="Confirm transfer">...</ModalContent>
 *   </Modal>
 *
 * Or with a trigger:
 *   <Modal>
 *     <ModalTrigger asChild><Button>Open</Button></ModalTrigger>
 *     <ModalContent title="Title">...</ModalContent>
 *   </Modal>
 * ────────────────────────────────────────────────────────────── */

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;

interface ModalContentProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** "sm" | "md" | "lg" — max-width of the panel. Default "md". */
  size?: "sm" | "md" | "lg" | "full";
  /** Hide the close × button */
  hideClose?: boolean;
  className?: string;
  children: React.ReactNode;
}

const sizeMap: Record<NonNullable<ModalContentProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  full: "max-w-[calc(100vw-2rem)] h-[calc(100dvh-4rem)]",
};

export function ModalContent({
  title,
  description,
  size = "md",
  hideClose = false,
  className,
  children,
}: ModalContentProps) {
  return (
    <Dialog.Portal>
      {/* Overlay */}
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-[fadeIn_120ms_ease] data-[state=closed]:animate-[fadeOut_100ms_ease]" />

      {/* Panel */}
      <Dialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
          "rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-card)] border border-line",
          "flex flex-col",
          "focus:outline-none",
          "data-[state=open]:animate-[modalIn_180ms_cubic-bezier(0.175,0.885,0.32,1.275)]",
          "data-[state=closed]:animate-[fadeOut_100ms_ease]",
          sizeMap[size],
          className
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            {title && (
              <Dialog.Title className="text-h3 text-ink">{title}</Dialog.Title>
            )}
            {description && (
              <Dialog.Description className="sr-only">
                {description}
              </Dialog.Description>
            )}
            {!hideClose && (
              <Dialog.Close className="ml-auto rounded-md p-1 text-ink-3 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30">
                <Icon name="close" size={18} />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

/* ── ModalFooter — sticky action row at the bottom ────────────── */
export function ModalFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-line px-5 py-4",
        className
      )}
    >
      {children}
    </div>
  );
}
