import { getRequiredServerEnvVar } from "@/lib/env"

const GOOGLE_MAPS_EMBED_BASE_URL = "https://www.google.com/maps/embed/v1/place"

function buildProxyResponse(body: ReadableStream<Uint8Array>, googleHeaders: Headers, status: number) {
  const headers = new Headers(googleHeaders)
  headers.set("content-type", googleHeaders.get("content-type") ?? "text/html; charset=UTF-8")
  headers.set("cache-control", "public, s-maxage=43200, stale-while-revalidate=86400")
  headers.set("x-proxied-by", "ticketiv-maps-proxy")

  return new Response(body, { status, headers })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query) {
    return Response.json({ error: "Missing 'q' query parameter" }, { status: 400 })
  }

  const mapsApiKey = getRequiredServerEnvVar("GOOGLE_MAPS_EMBED_KEY")
  const googleUrl = `${GOOGLE_MAPS_EMBED_BASE_URL}?${new URLSearchParams({
    key: mapsApiKey,
    q: query,
  }).toString()}`

  try {
    const googleResponse = await fetch(googleUrl)

    if (!googleResponse.ok || !googleResponse.body) {
      return Response.json({ error: "Unable to load Google Maps embed" }, { status: googleResponse.status || 502 })
    }

    return buildProxyResponse(googleResponse.body, googleResponse.headers, googleResponse.status)
  } catch (error) {
    console.error("Failed to fetch Google Maps embed:", error)
    return Response.json({ error: "Unable to load Google Maps embed" }, { status: 502 })
  }
}
