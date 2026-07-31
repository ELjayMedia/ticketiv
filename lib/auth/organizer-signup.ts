export const ORGANIZER_SIGNUP_STORAGE_KEY = "ticketiv:organizer-signup"
export const ORGANIZER_WAS_AUTHENTICATED_STORAGE_KEY = "ticketiv:organizer-was-authenticated"

export interface OrganizerSignupPayload {
  firstName: string
  surname: string
  phone: string
  email: string
  idNumber: string
}

export function normalizePhone(input: string): string {
  const trimmed = input.trim()
  const digits = trimmed.replace(/\D/g, "")
  return trimmed.startsWith("+") ? `+${digits}` : digits
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())
}

export function validateOrganizerSignup(
  payload: OrganizerSignupPayload,
): string | null {
  if (!payload.firstName.trim()) return "Enter your first name."
  if (payload.firstName.trim().length > 100) return "First name must be 100 characters or fewer."

  if (!payload.surname.trim()) return "Enter your surname."
  if (payload.surname.trim().length > 100) return "Surname must be 100 characters or fewer."

  const phone = normalizePhone(payload.phone)
  const phoneDigits = phone.replace(/\D/g, "")
  if (!phoneDigits) return "Enter your phone number."
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    return "Enter a valid phone number, including the country code where possible."
  }

  if (!isValidEmail(payload.email)) {
    return "Enter a valid email address, for example name@example.com."
  }

  const idNumberLength = payload.idNumber.trim().length
  if (idNumberLength > 0 && idNumberLength < 4) {
    return "Enter a valid ID or passport number, or leave the field blank."
  }
  if (idNumberLength > 64) {
    return "ID number must be 64 characters or fewer."
  }

  return null
}

export function normalizeOrganizerSignup(
  payload: OrganizerSignupPayload,
): OrganizerSignupPayload {
  return {
    firstName: payload.firstName.trim(),
    surname: payload.surname.trim(),
    phone: normalizePhone(payload.phone),
    email: payload.email.trim().toLowerCase(),
    idNumber: payload.idNumber.trim(),
  }
}
