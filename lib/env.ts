export function getRequiredServerEnvVar(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getOptionalServerEnvVar(name: string): string | undefined {
  return process.env[name]
}
