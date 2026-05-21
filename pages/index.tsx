import Link from "next/link"

const nav = [
  ["Browse", "/browse"],
  ["Events", "/events"],
  ["Artists", "/artists"],
  ["Categories", "/categories"],
]

export default function PublicHomePage() {
  return (
    <main style={{ minHeight: "100vh", padding: "48px 20px", fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
      <section style={{ maxWidth: 1040, margin: "0 auto" }}>
        <nav style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 80 }}>
          <strong style={{ fontSize: 22 }}>Ticketiv</strong>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {nav.map(([label, href]) => (
              <Link key={href} href={href} style={{ color: "#334155", textDecoration: "none", fontSize: 14 }}>
                {label}
              </Link>
            ))}
          </div>
        </nav>

        <div style={{ maxWidth: 720 }}>
          <p style={{ color: "#4f46e5", fontWeight: 700, marginBottom: 12 }}>Ticketiv marketplace</p>
          <h1 style={{ fontSize: "clamp(40px, 7vw, 72px)", lineHeight: 1, margin: 0, letterSpacing: "-0.05em" }}>
            Discover and sell event tickets with confidence.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: "#475569", marginTop: 24 }}>
            Ticketiv is being hardened for production. Public discovery is online while dynamic event feeds recover gracefully.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 32 }}>
            <Link href="/browse" style={{ background: "#4f46e5", color: "white", padding: "12px 20px", borderRadius: 999, textDecoration: "none", fontWeight: 700 }}>Browse events</Link>
            <Link href="/events" style={{ border: "1px solid #cbd5e1", color: "#0f172a", padding: "12px 20px", borderRadius: 999, textDecoration: "none", fontWeight: 700 }}>View listings</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
