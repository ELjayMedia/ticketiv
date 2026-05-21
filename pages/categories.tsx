import Link from "next/link"

const categories = ["Music", "Festivals", "Sports", "Conferences", "Worship", "Comedy"]

export default function CategoriesPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "48px 20px", fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
      <section style={{ maxWidth: 960, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#4f46e5", textDecoration: "none", fontWeight: 700 }}>← Ticketiv</Link>
        <h1 style={{ fontSize: 48, marginTop: 48, marginBottom: 16 }}>Categories</h1>
        <p style={{ fontSize: 18, lineHeight: 1.7, color: "#475569", maxWidth: 680 }}>
          Explore common event categories while live category counts are temporarily unavailable.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginTop: 32 }}>
          {categories.map((category) => (
            <div key={category} style={{ padding: 20, border: "1px solid #cbd5e1", borderRadius: 18, background: "white" }}>
              <strong>{category}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
