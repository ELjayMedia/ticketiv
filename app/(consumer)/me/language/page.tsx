import { redirect } from "next/navigation"

/** Language selection is retired until Ticketiv has a complete translated experience. */
export default function LanguagePage() {
  redirect("/me")
}
