import React from 'react'
import { ChevronDown, Languages } from 'lucide-react'
import { SUPPORTED_LANGUAGES, LanguageCode } from '../../config/languages'

interface LanguageSelectorProps {
  language: LanguageCode
  onChange: (language: LanguageCode) => void
  label?: string
  compactOnMobile?: boolean
}

/** A native dropdown stays keyboard-accessible as the language catalogue grows. */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  language, onChange, label = 'Reading language', compactOnMobile = true,
}) => {
  const selected = SUPPORTED_LANGUAGES.find((option) => option.code === language) || SUPPORTED_LANGUAGES[0]
  return (
    <div className={`relative h-8 shrink-0 rounded-md border border-[#E8E2D8] bg-white text-[#55504A] transition-colors focus-within:ring-2 focus-within:ring-[#0F392B]/30 hover:border-[#D4CBBF] ${compactOnMobile ? 'w-9 sm:w-36' : 'w-36'}`}>
      <Languages className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#78716C]" aria-hidden="true" />
      <select
        aria-label={label}
        title={`${label}: ${selected.name}`}
        value={language}
        onChange={(event) => {
          const option = SUPPORTED_LANGUAGES.find((entry) => entry.code === event.target.value)
          if (option) onChange(option.code)
        }}
        className={`h-full w-full cursor-pointer appearance-none rounded-md bg-transparent pl-8 text-[11px] font-medium outline-none ${compactOnMobile ? 'pr-0 text-transparent sm:pr-6 sm:text-[#55504A]' : 'pr-6 text-[#55504A]'}`}
      >
        {SUPPORTED_LANGUAGES.map((option) => (
          <option key={option.code} value={option.code} lang={option.code} className="text-[#141412]">
            {option.nativeName === option.name ? option.name : `${option.nativeName} (${option.name})`}
          </option>
        ))}
      </select>
      <ChevronDown className={`pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#78716C] ${compactOnMobile ? 'hidden sm:block' : ''}`} aria-hidden="true" />
    </div>
  )
}
