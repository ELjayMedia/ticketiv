import { permanentRedirect } from "next/navigation"

export default function SignInPage() {
  permanentRedirect("/login")
}
