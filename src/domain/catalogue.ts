import { normalize, type Work, type Location, type Metadata } from './model'
export interface Catalogue {
  source: 'Finna'
  url: string
  retrievedAt: string
  themes: string[]
  locations: Location[]
}
export interface CatalogueUpdate {
  id: string
  key: string
  catalogue: Catalogue
  metadata: Metadata
}
export function atlasWork(work: Work): Work {
  if (!work.catalogue) return work
  const themes = [...work.themes]
  for (const theme of work.catalogue.themes)
    if (!themes.some((t) => normalize(t) === normalize(theme))) themes.push(theme)
  const locations = [...work.locations]
  for (const storedLocation of work.catalogue.locations) {
    const location: Location =
      storedLocation.kind === 'setting' ? { ...storedLocation, kind: 'subject' } : storedLocation
    if (!locations.some((l) => l.kind === location.kind && l.country === location.country))
      locations.push(location)
  }
  return { ...work, themes, locations }
}
