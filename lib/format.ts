/**
 * Money + date formatting — implementation now lives in `@ticketiv/shared`
 * (packages/shared/src/format.ts) so the React Native apps can use the same
 * helpers (ADR 0001, TICK-328). This shim keeps every existing
 * `@/lib/format` import working; new code may import from either path.
 */
export * from "@ticketiv/shared";
