import { stableId, type Work, type Rating } from './model'
export interface Review {
  memberId: string
  text: string
  source?: string
}
export interface ReadingSession {
  id: string
  date?: string
  ratings: Rating[]
  reviews: Review[]
  notes?: string
  source?: string
}
export type ReadingView = Work & { workId: string; readingId: string }
export const readingId = (workId: string, date?: string) => stableId(`reading:${workId}:${date ?? 'undated'}`)
export function uniqueReviews(reviews: Review[]): Review[] {
  return reviews.filter(
    (r, i, all) => r.text.trim() && all.findIndex((x) => x.memberId === r.memberId && x.text === r.text) === i
  )
}
export function sessionsFor(w: Work): ReadingSession[] {
  const source = w.readingSessions?.length
    ? w.readingSessions
    : [
        {
          id: readingId(w.id, w.date),
          date: w.date,
          ratings: w.ratings,
          reviews: w.reviews ?? [],
          notes: w.notes,
          source: w.source
        }
      ]
  return source.map((s) => ({
    ...s,
    ratings: s.ratings.map((r) => ({ ...r })),
    reviews: uniqueReviews([
      ...(s.reviews ?? []),
      ...s.ratings.flatMap((r) =>
        r.review ? [{ memberId: r.memberId, text: r.review, source: r.source }] : []
      )
    ])
  }))
}
export function withSessions(w: Work, sessions: ReadingSession[]): Work {
  const sorted = sessions
    .map((s) => ({
      ...s,
      reviews: uniqueReviews(s.reviews),
      ratings: s.ratings.map((r) => ({ ...r, review: undefined }))
    }))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const latest = sorted.at(-1)!
  return {
    ...w,
    readingSessions: sorted,
    date: latest.date,
    ratings: latest.ratings.map((r) => ({
      ...r,
      review:
        latest.reviews
          .filter((x) => x.memberId === r.memberId)
          .map((x) => x.text)
          .join('\n\n') || undefined
    })),
    reviews: latest.reviews,
    notes: latest.notes,
    source: latest.source ?? w.source
  }
}
export function readingViews(works: Work[]): ReadingView[] {
  return works.flatMap((w) =>
    'readingId' in w
      ? [w as ReadingView]
      : sessionsFor(w).map((s) => ({
          ...w,
          id: s.id,
          workId: w.id,
          readingId: s.id,
          date: s.date,
          ratings: s.ratings,
          reviews: s.reviews,
          notes: s.notes,
          source: s.source,
          readingSessions: undefined
        }))
  )
}
export function reviewText(w: Work, memberId: string): string {
  return uniqueReviews([
    ...(w.reviews ?? []),
    ...w.ratings
      .filter((r) => r.memberId === memberId && r.review)
      .map((r) => ({ memberId, text: r.review! }))
  ])
    .filter((r) => r.memberId === memberId)
    .map((r) => r.text)
    .join('\n\n')
}
export function readingHref(w: Work): string {
  const view = w as Partial<ReadingView>
  return `/teos/${view.workId ?? w.id}${view.readingId ? `?lukukerta=${view.readingId}` : ''}`
}
