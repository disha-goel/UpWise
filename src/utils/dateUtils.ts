import { DatePreset } from '../types/news'

/**
 * Standardize and format date strings into human-readable editorial date labels
 */
export function formatPublicationDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return 'Recent'

  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return String(dateInput)

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    })
  } catch {
    return 'Recent'
  }
}

/** Return an India calendar date, preserving explicit date-only values. */
function calendarDate(value: string | Date): string | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find((entry) => entry.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

/** Filter by India calendar days. Week and month mean the past 7 and 30 days. */
export function matchDatePreset(
  publishedDateInput: string | Date | undefined | null,
  preset: DatePreset,
  customStart?: string,
  customEnd?: string,
  referenceDate: Date = new Date()
): boolean {
  if (preset === 'all') return true
  if (!publishedDateInput) return false
  const article = calendarDate(publishedDateInput)
  const today = calendarDate(referenceDate)
  if (!article || !today) return false
  const day = (value: string) => Date.parse(`${value}T00:00:00Z`) / 86400000
  const age = day(today) - day(article)

  switch (preset) {
    case 'today': return age === 0
    case 'yesterday': return age === 1
    case 'week': return age >= 0 && age < 7
    case 'month': return age >= 0 && age < 30
    case 'custom': {
      const start = customStart ? calendarDate(customStart) : null
      const end = customEnd ? calendarDate(customEnd) : null
      if ((customStart && !start) || (customEnd && !end)) return false
      if (start && end && start > end) return false
      return (!start || article >= start) && (!end || article <= end)
    }
    default: return true
  }
}
