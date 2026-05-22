const optionalEnvVars = ["GOOGLE_MAPS_EMBED_KEY"]

// Warn about missing optional env vars but don't block the build
for (const envVar of optionalEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Missing optional env var: ${envVar}. Some features may be disabled.`)
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: "/hifi", destination: "/hifi/index.html" },
      { source: "/hifi/wireframes", destination: "/hifi/wireframes.html" },
    ]
  },
}

export default nextConfig
