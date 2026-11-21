import data from './club.json'
import type { Archive } from '../domain/model'
/** The published Numbers edition is authoritative. Old browser imports are left untouched. */
export const clubArchive = (): Archive => structuredClone(data) as Archive
