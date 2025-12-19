const optionalEnvVars = ["GOOGLE_MAPS_EMBED_KEY"]

// Warn about missing optional env vars but don't block the build
for (const envVar of optionalEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Missing optional env var: ${envVar}. Some features may be disabled.`)
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
