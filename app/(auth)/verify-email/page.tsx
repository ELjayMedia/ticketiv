import { permanentRedirect } from "next/navigation"

export default function VerifyEmailPage() {
  permanentRedirect("/verify")
}
