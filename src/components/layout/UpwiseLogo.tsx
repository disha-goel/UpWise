import React from 'react'
import { Sun } from 'lucide-react'

export interface UpwiseLogoProps {
  className?: string
  onClick?: () => void
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showMark?: boolean
  showWordmark?: boolean
}

export const UpwiseLogo: React.FC<UpwiseLogoProps> = ({
  className = '',
  onClick,
  variant = 'light',
  size = 'md',
  showMark = true,
}) => {
  const isDark = variant === 'dark'

  const sizeStyles = {
    sm: {
      text: 'text-base sm:text-lg',
      mark: 'h-3.5 w-3.5 sm:h-4 sm:w-4',
      hub: 'text-[10px] tracking-[0.22em] ml-1.5',
    },
    md: {
      text: 'text-base sm:text-xl',
      mark: 'h-3.5 w-3.5 sm:h-5 sm:w-5',
      hub: 'text-[10px] sm:text-[11px] tracking-[0.24em] ml-1 sm:ml-1.5',
    },
    lg: {
      text: 'text-2xl sm:text-3xl',
      mark: 'h-5 w-5 sm:h-6 sm:w-6',
      hub: 'text-xs tracking-[0.26em] ml-2',
    },
    xl: {
      text: 'text-3xl sm:text-4xl md:text-[40px]',
      mark: 'h-6 w-6 sm:h-7 sm:w-7',
      hub: 'text-xs sm:text-sm tracking-[0.26em] ml-2.5',
    },
  }[size]

  const content = (
    <div className={`inline-flex items-baseline select-none text-left group leading-none ${className}`}>
      <span
        className={`font-serif font-bold tracking-[-0.02em] ${sizeStyles.text} ${
          isDark ? 'text-white' : 'text-[#141412]'
        }`}
      >
        UPWISE
      </span>
      <span
        className={`font-sans font-semibold uppercase text-[#78716C] ${sizeStyles.hub}`}
      >
        HUB
      </span>
      {showMark && <Sun aria-hidden="true" className={`ml-1 self-center shrink-0 fill-[#F6D36B] text-[#D6A52F] stroke-[1.8] sm:ml-2 ${sizeStyles.mark}`} />}
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Upwise Hub Home"
        className="focus:outline-none focus-visible:ring-1 focus-visible:ring-[#141412] rounded text-left transition-opacity hover:opacity-90 inline-block"
      >
        {content}
      </button>
    )
  }

  return content
}
