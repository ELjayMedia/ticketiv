// Stub for the "server-only" package so server modules can be unit-tested
// under vitest's node environment. In production the real package guards
// against importing server code into client bundles; tests don't need that.
export {}
