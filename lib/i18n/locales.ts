// Supported display locales for the profile language picker. Only English is
// fully translated today; the others persist a preference and are rolling out.

export interface LocaleOption {
  code: string
  label: string
  native: string
  available: boolean
}

export const LOCALES: LocaleOption[] = [
  { code: "en", label: "English", native: "English", available: true },
  { code: "ss", label: "siSwati", native: "siSwati", available: false },
  { code: "zu", label: "isiZulu", native: "isiZulu", available: false },
  { code: "pt", label: "Portuguese", native: "Português", available: false },
  { code: "fr", label: "French", native: "Français", available: false },
]

export const DEFAULT_LOCALE = "en"

export function localeLabel(code: string | null | undefined): string {
  return LOCALES.find((l) => l.code === code)?.label ?? "English"
}
