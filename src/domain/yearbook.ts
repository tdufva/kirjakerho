import type { Archive } from './model'
import { readingViews, reviewText } from './readings'
import { average, deviation } from './statistics'
export function yearbook(archive: Archive, year: string) {
  const readings = readingViews(archive.works)
    .filter((w) => w.date?.slice(0, 4) === year)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.title.localeCompare(b.title, 'fi'))
  const rated = readings.filter((w) => w.ratings.length >= 2)
  return {
    year,
    readings,
    workCount: new Set(readings.map((w) => w.workId)).size,
    ratingCount: readings.reduce((n, w) => n + w.ratings.length, 0),
    commentCount: readings.reduce((n, w) => n + archive.members.filter((m) => reviewText(w, m.id)).length, 0),
    favourites: [...rated].sort((a, b) => (average(b) ?? 0) - (average(a) ?? 0)).slice(0, 3),
    disagreements: [...rated]
      .filter((w) => (deviation(w) ?? 0) > 0)
      .sort((a, b) => (deviation(b) ?? 0) - (deviation(a) ?? 0))
      .slice(0, 3),
    undated: readingViews(archive.works).filter((w) => !w.date).length
  }
}
