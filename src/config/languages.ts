/** Add selectable languages here once their article translations are available. */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

export function isSupportedLanguage(value: unknown): value is LanguageCode {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value)
}
