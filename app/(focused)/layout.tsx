/**
 * Focused-flow layout.
 *
 * Used for checkout and confirmation — flows where the user has
 * committed and we don't want navigation chrome competing for
 * attention. No mobile tab bar, no desktop nav.
 *
 * Each screen ships its own internal header (close button, stepper,
 * etc.) so the layout itself just provides the page background and
 * full-height container.
 */
export default function FocusedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh bg-bg">{children}</div>;
}
