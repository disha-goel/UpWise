/** Build publication bounds using India calendar days, independent of server timezone. */
export function publicationDateRange(preset?: string, start?: string, end?: string, now = new Date()): { gte?: Date; lt?: Date } | undefined {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find((entry) => entry.type === type)!.value;
  const today = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00+05:30`);
  const day = 86400000;
  if (preset === 'today') return { gte: today, lt: new Date(+today + day) };
  if (preset === 'yesterday') return { gte: new Date(+today - day), lt: today };
  if (preset === '7d' || preset === 'week') return { gte: new Date(+today - 6 * day), lt: new Date(+today + day) };
  if (preset === '30d' || preset === 'month') return { gte: new Date(+today - 29 * day), lt: new Date(+today + day) };
  if (preset !== 'custom') return undefined;
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid date range: use YYYY-MM-DD');
    const utc = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(+utc) || utc.toISOString().slice(0, 10) !== value) throw new Error('Invalid date range: date does not exist');
    return new Date(+utc - 330 * 60000);
  };
  const range = { ...(start ? { gte: parse(start) } : {}), ...(end ? { lt: new Date(+parse(end) + day) } : {}) };
  if (range.gte && range.lt && +range.gte >= +range.lt) throw new Error('Invalid date range: start must be before end');
  return Object.keys(range).length ? range : undefined;
}
