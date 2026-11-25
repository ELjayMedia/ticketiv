import { requireAdminRole } from "@/lib/super-admin/auth"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { ReviewForm } from "@/components/reviews/review-form"

export default async function ReportedReviewsPage() {
  await requireAdminRole(["super_admin"])
  const client = createServerSupabaseClient()
  if (!client) throw new Error("Review moderation is unavailable")
  const { data, error } = await client.from("event_reviews").select("id,body,rating,report_count,status")
    .gt("report_count", 0).neq("status","removed").order("report_count",{ascending:false}).order("created_at").limit(100)
  if (error) throw new Error("Unable to load reported reviews")
  const reports = data.length ? await client.from("user_reports")
    .select("review_id, reason").in("review_id", data.map(review => review.id))
    .is("resolved_at", null).order("created_at") : { data: [], error: null }
  if (reports.error) throw new Error("Unable to load report reasons")
  return <main className="grid gap-4"><h1 className="text-h1">Reported reviews</h1>
    {!data.length && <p>No reviews await moderation.</p>}
    {data.map(review => <article className="border-b py-4" key={review.id}>
      <strong>{review.report_count} reports · {review.status} · {review.rating} / 5 stars</strong>
      <p>{review.body}</p>
      <ul>{reports.data.filter(report => report.review_id === review.id).map((report, index) =>
        <li key={index}>{report.reason}</li>)}</ul>
      <ReviewForm action="moderate" target={review.id} label="Apply decision">
        <label>Decision <select name="decision" required defaultValue=""><option value="" disabled>Select decision</option>
          <option value="restore">Dismiss reports and publish</option><option value="remove">Remove review</option></select></label>
      </ReviewForm>
    </article>)}
  </main>
}
