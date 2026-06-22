"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/quiet/ui/button";
import { Icon } from "@/components/quiet/ui/icon";

export default function ConsumerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ticketiv] consumer error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-5 py-16 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <Icon name="zap" size={22} />
      </span>
      <h2 className="mt-4 text-h2">Something went wrong</h2>
      <p className="mt-2 max-w-[320px] text-[14px] text-ink-3">
        We hit an unexpected error loading this page. Your tickets and account are safe.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-ink-4">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <Button variant="accent" onClick={reset}>
          Try again
        </Button>
        <Link href="/tickets">
          <Button variant="outline">
            <Icon name="ticket" size={15} />
            My tickets
          </Button>
        </Link>
      </div>
    </div>
  );
}
