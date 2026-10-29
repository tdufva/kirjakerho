export type Category = 'book' | 'theatre' | 'exhibition' | 'other'
export interface Member { id: string; name: string; color: string }
export interface Rating { memberId: string; value: number; min: number; max: number; review?: string; source?: string }
export interface Location { name: string; country: string; lat: number; lon: number; kind: 'setting' | 'author' | 'publication' }
export interface Metadata { source: 'Finna' | 'Open Library' | 'Google Books'; retrievedAt: string; confidence: number; externalId: string; description?: string; cover?: string; publicationYear?: number; subjects?: string[]; url: string }
export interface Work {
  id: string; title: string; creator: string; category: Category; date?: string; publicationYear?: number;
  description?: string; themes: string[]; locations: Location[]; period?: string; ratings: Rating[];
  color: string; motif: number; reviews?: {memberId:string;text:string;source?:string}[]; metadata?: Metadata; source?: string; notes?: string; annotationSource?:string
}
export interface ImportRecord { id: string; filename: string; fingerprint: string; at: string; added: number; updated: number; warnings: string[]; mapping: unknown }
export interface Archive { version: 1; mode: 'demo' | 'local' | 'cloud'; members: Member[]; works: Work[]; imports: ImportRecord[] }
export const categories: Record<Category, string> = { book: 'Kirjat', theatre: 'Teatteri', exhibition: 'Näyttelyt', other: 'Muu kulttuuri' }
export const categorySingular: Record<Category, string> = { book: 'Kirja', theatre: 'Teatteri', exhibition: 'Näyttely', other: 'Muu kulttuuri' }
export const memberColors = ['#752F38', '#467773', '#9B7527', '#62567A']
export function normalize(value: string): string { return value.normalize('NFKC').toLocaleLowerCase('fi').replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/g, ' ').trim() }
export function workKey(w: Pick<Work, 'title' | 'creator' | 'category' | 'date'>): string { return [normalize(w.title), normalize(w.creator), w.category, w.category === 'book' ? '' : (w.date ?? '')].join('|') }
// Stable UUID-shaped identifier, independent of workbook sheet/row order. Not used as a secret.
export function stableId(s: string): string {
  const parts = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35].map(seed => {
    let h = seed; for (const char of s) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
    return (h >>> 0).toString(16).padStart(8, '0')
  }).join('')
  return `${parts.slice(0, 8)}-${parts.slice(8, 12)}-4${parts.slice(13, 16)}-a${parts.slice(17, 20)}-${parts.slice(20)}`
}
