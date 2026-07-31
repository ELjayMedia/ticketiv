import { describe, expect, it } from "vitest"

import {
  normalizeOrganizerSignup,
  normalizePhone,
  validateOrganizerSignup,
  type OrganizerSignupPayload,
} from "./organizer-signup"

const validPayload: OrganizerSignupPayload = {
  firstName: "Lethu",
  surname: "Dlamini",
  phone: "+268 7600 0000",
  email: "organizer@example.com",
  idNumber: "",
}

describe("organizer signup validation", () => {
  it("requires first name, surname, phone and email", () => {
    expect(validateOrganizerSignup({ ...validPayload, firstName: "" })).toBe("Enter your first name.")
    expect(validateOrganizerSignup({ ...validPayload, surname: "" })).toBe("Enter your surname.")
    expect(validateOrganizerSignup({ ...validPayload, phone: "" })).toBe("Enter your phone number.")
    expect(validateOrganizerSignup({ ...validPayload, email: "bad-email" })).toContain("valid email")
  })

  it("keeps ID number optional but validates it when supplied", () => {
    expect(validateOrganizerSignup(validPayload)).toBeNull()
    expect(validateOrganizerSignup({ ...validPayload, idNumber: "123456789" })).toBeNull()
    expect(validateOrganizerSignup({ ...validPayload, idNumber: "12" })).toContain("leave the field blank")
    expect(validateOrganizerSignup({ ...validPayload, idNumber: "1".repeat(65) })).toContain("64 characters")
  })

  it("normalizes contact details before submission", () => {
    expect(normalizePhone("+268 (7600) 0000")).toBe("+26876000000")
    expect(
      normalizeOrganizerSignup({
        ...validPayload,
        firstName: "  Lethu ",
        surname: " Dlamini  ",
        email: " ORGANIZER@EXAMPLE.COM ",
      }),
    ).toEqual({
      firstName: "Lethu",
      surname: "Dlamini",
      phone: "+26876000000",
      email: "organizer@example.com",
      idNumber: "",
    })
  })
})
