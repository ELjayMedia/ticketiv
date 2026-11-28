import Link from "next/link"
import { notFound } from "next/navigation"
import { getPublicEventBySlug } from "@/lib/adapters/events"
import { getEventHighlights } from "@/lib/data/companion-memory"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { ReviewForm } from "@/components/reviews/review-form"

export default async function EventReviewsPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }>
}) {
  const { id: slug } = await params
  const event = await getPublicEventBySlug(slug)
  if (!event) notFound()
  const client = createServerSupabaseClient()
  if (!client) throw new Error("Reviews are unavailable")
  const page = Math.max(1, Math.min(100000, Math.trunc(Number((await searchParams).page) || 1)))
  const user = (await client.auth.getUser()).data.user
  const [reviews, photos, access, own] = await Promise.all([
    client.from("v_public_event_reviews").select("*").eq("event_id", event.id)
      .order("created_at", { ascending: false }).order("id").range((page - 1) * 20, page * 20),
    getEventHighlights(event.id),
    user && client.rpc("fn_event_review_access", { p_event_id: event.id }),
    user && client.from("event_reviews").select("id,rating,body,tags,status").eq("user_id", user.id).eq("event_id", event.id).maybeSingle(),
  ])
  if (reviews.error || access?.error || own?.error) throw new Error("Unable to load event reviews")
  const href = `/events/${encodeURIComponent(slug)}/reviews`
  return <main className="page-frame grid gap-6 py-8">
    <Link href={`/events/${encodeURIComponent(slug)}`}>← {event.title}</Link>
    <h1 className="text-h1">Reviews and photos</h1>
    {photos.length > 0 && <section id="gallery"><h2 className="text-h2">Event photos</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map(photo =>
        <figure key={photo.id} id={`photo-${photo.id}`}>
          <img loading="lazy" src={photo.imageUrl} alt={photo.caption || `Photo from ${event.title}`} />
          <figcaption>{photo.caption} <a href={`${href}#photo-${photo.id}`} className="underline">Photo link</a></figcaption>
        </figure>)}</div></section>}
    {access?.data?.can_review && own?.data?.status !== "removed" && <section><h2 className="text-h2">Your review</h2>
      <ReviewForm action="submit" target={event.id} slug={slug} label="Save review">
        <label>Rating <select name="rating" defaultValue={own?.data?.rating ?? ""} required><option value="" disabled>Select stars</option>
          {[1,2,3,4,5].map(n => <option value={n} key={n}>{n} / 5</option>)}</select></label>
        <label>Comment (optional)<textarea className="block w-full border p-2" name="body" maxLength={1000} defaultValue={own?.data?.body ?? ""}/></label>
        <fieldset><legend>Tags</legend>{["sound","venue","value","safety","organisation","atmosphere","lineup","food_drink"].map(tag =>
          <label className="mr-3 inline-block" key={tag}><input type="checkbox" name="tag" value={tag} defaultChecked={own?.data?.tags.includes(tag)} /> {tag.replace("_"," ")}</label>)}</fieldset>
      </ReviewForm></section>}
    {!user && <Link className="underline" href={`/login?next=${encodeURIComponent(href)}`}>Sign in to review an event you attended</Link>}
    <section><h2 className="text-h2">Verified attendee reviews</h2>
      {!reviews.data.length && <p>No reviews on this page.</p>}
      {reviews.data.slice(0,20).map(review => <article key={review.id} className="grid gap-2 border-b py-4">
        <strong>{review.rating} / 5 stars</strong><p>{review.body}</p><small>{review.tags.join(" · ")}</small>
        {review.org_reply && <blockquote>Organiser reply · {review.org_reply}</blockquote>}
        {access?.data?.can_reply && <details><summary>Reply as organiser</summary><ReviewForm action="reply" target={review.id} slug={slug} label="Save reply">
          <label>Public reply<textarea className="block border p-2" name="reply" maxLength={1000} defaultValue={review.org_reply ?? ""}/></label>
        </ReviewForm></details>}
        {user && review.id !== own?.data?.id && <details><summary>Report review</summary><ReviewForm action="report" target={review.id} slug={slug} label="Send report">
          <label>Reason<input className="block border p-2" name="reason" required minLength={3} maxLength={300}/></label>
        </ReviewForm></details>}
      </article>)}
      <nav className="flex gap-4">{page > 1 && <Link href={`${href}?page=${page-1}`}>Previous reviews</Link>}
        {reviews.data.length > 20 && <Link href={`${href}?page=${page+1}`}>More reviews</Link>}</nav>
    </section>
  </main>
}
