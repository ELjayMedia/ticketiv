const requiredEnvVars = ["GOOGLE_MAPS_EMBED_KEY"]

if (process.env.NODE_ENV === "production") {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }
} else {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`[env] Missing ${envVar}. Google Maps embeds will be disabled.`)
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
