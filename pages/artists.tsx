import Link from "next/link"

export default function ArtistsPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "48px 20px", fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
      <section style={{ maxWidth: 960, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#4f46e5", textDecoration: "none", fontWeight: 700 }}>← Ticketiv</Link>
        <h1 style={{ fontSize: 48, marginTop: 48, marginBottom: 16 }}>Artists</h1>
        <p style={{ fontSize: 18, lineHeight: 1.7, color: "#475569", maxWidth: 680 }}>
          Artist discovery is available in safe mode while the dynamic feed is restored.
        </p>
        <div style={{ marginTop: 32, padding: 24, border: "1px solid #cbd5e1", borderRadius: 18, background: "white" }}>
          <strong>No artists loaded yet.</strong>
          <p style={{ color: "#64748b", marginBottom: 0 }}>Featured artists will appear here once the public feed is restored.</p>
        </div>
      </section>
    </main>
  )
}
