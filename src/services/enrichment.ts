import { workKey, type Work } from '../domain/model'
import type { CatalogueUpdate } from '../domain/catalogue'
import { findFinna } from './finna'
export interface EnrichmentProgress {
  processed: number
  total: number
  matched: number
  withCountries: number
  withThemes: number
  current: string
  failures: { title: string; reason: string }[]
}
export const emptyProgress = (): EnrichmentProgress => ({
  processed: 0,
  total: 0,
  matched: 0,
  withCountries: 0,
  withThemes: 0,
  current: '',
  failures: []
})
export async function enrichWorks(
  works: Work[],
  signal: AbortSignal,
  onProgress: (p: EnrichmentProgress) => void
): Promise<CatalogueUpdate[]> {
  const updates: CatalogueUpdate[] = [],
    progress = { ...emptyProgress(), total: works.length }
  let cursor = 0
  async function worker() {
    while (!signal.aborted && cursor < works.length) {
      const work = works[cursor++]
      progress.current = work.title
      onProgress({ ...progress, failures: [...progress.failures] })
      try {
        const candidates = await findFinna(work, signal),
          candidate = candidates
            .filter((c) => c.automatic)
            .sort(
              (a, b) =>
                b.catalogue.themes.length +
                b.catalogue.locations.length -
                (a.catalogue.themes.length + a.catalogue.locations.length)
            )[0]
        if (candidate && (candidate.catalogue.themes.length || candidate.catalogue.locations.length)) {
          updates.push({
            id: work.id,
            key: workKey(work),
            catalogue: candidate.catalogue,
            metadata: candidate.metadata
          })
          progress.matched++
          if (candidate.catalogue.locations.length) progress.withCountries++
          if (candidate.catalogue.themes.length) progress.withThemes++
        } else
          progress.failures.push({
            title: work.title,
            reason: candidate
              ? 'Vastaavasta teoksesta ei löytynyt maita tai asiasanoja.'
              : 'Riittävän varmaa teos- ja tekijävastaavuutta ei löytynyt.'
          })
      } catch (e) {
        if (!signal.aborted)
          progress.failures.push({
            title: work.title,
            reason: e instanceof Error ? e.message : 'Haku ei onnistunut.'
          })
      }
      if (signal.aborted) break
      progress.processed++
      onProgress({ ...progress, failures: [...progress.failures] })
    }
  }
  await Promise.all([worker(), worker()])
  return updates
}
