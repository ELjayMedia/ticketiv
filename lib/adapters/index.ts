/**
 * Data adapters for Supabase VIEWS
 * 
 * Each adapter:
 * - Queries only a specific Supabase view
 * - Validates response against Zod schemas
 * - Returns typed data or empty arrays on error
 * - Falls back to demo data when in demo mode
 * - Never crashes - returns empty/null for graceful error handling
 */

export * from "./events"
export * from "./organizers"
export * from "./artists"
export * from "./tickets"
export * from "./organizer-events"
export * from "./orders"
export * from "./settlement"
export * from "./kpis"
