import type { Rating, Work } from './model'
export const mean = (values: number[]): number | null => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
export const score = (r: Rating): number => (r.value - r.min) / (r.max - r.min) * 10
export const average = (w: Work): number | null => mean(w.ratings.map(score))
export const deviation = (w: Work): number | null => {
  const xs = w.ratings.map(score), avg = mean(xs)
  return avg === null || xs.length < 2 ? null : Math.sqrt(xs.reduce((sum, n) => sum + (n - avg) ** 2, 0) / xs.length)
}
export function correlation(pairs: [number, number][]): { r: number | null; n: number; difference: number | null } {
  const n = pairs.length, difference = mean(pairs.map(([a, b]) => Math.abs(a - b)))
  if (n < 3) return { r: null, n, difference }
  const mx = mean(pairs.map(p => p[0]))!, my = mean(pairs.map(p => p[1]))!
  let covariance = 0, vx = 0, vy = 0
  for (const [x, y] of pairs) { covariance += (x - mx) * (y - my); vx += (x - mx) ** 2; vy += (y - my) ** 2 }
  return { r: vx === 0 || vy === 0 ? null : Math.max(-1, Math.min(1, covariance / Math.sqrt(vx * vy))), n, difference }
}
export function sharedPairs(works: Work[], a: string, b: string): [number, number][] {
  return works.flatMap(w => { const x = w.ratings.find(r => r.memberId === a), y = w.ratings.find(r => r.memberId === b); return x && y ? [[score(x), score(y)] as [number, number]] : [] })
}
export const format = (n: number | null | undefined, digits = 1): string => n == null ? '–' : n.toLocaleString('fi-FI', { minimumFractionDigits: digits, maximumFractionDigits: digits })
export const yearOf = (w: Work): string => w.date?.slice(0, 4) ?? 'Ei päiväystä'
export function annual(works: Work[]) {
  return [...new Set(works.map(yearOf))].filter(y => /^\d{4}$/.test(y)).sort().map(year => {
    const group = works.filter(w => yearOf(w) === year)
    return { year, count: group.length, books: group.filter(w => w.category === 'book').length, average: mean(group.flatMap(w => w.ratings.map(score))) }
  })
}
