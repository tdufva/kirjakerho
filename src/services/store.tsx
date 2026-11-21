import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { CatalogueUpdate } from '../domain/catalogue'
import type { Archive, Work } from '../domain/model'
import type { Club } from './cloud'
import { clubArchive } from '../data/club'
interface State {
  archive: Archive
  ready: boolean
  busy: boolean
  online: boolean
  notice: string
  user: User | null
  clubs: Club[]
  club: Club | null
  setNotice: (s: string) => void
  save: (a: Archive) => Promise<void>
  restore: (id?: string) => Promise<void>
  selectClub: (c: Club) => Promise<void>
  refreshClubs: () => Promise<void>
  updateWork: (w: Work) => Promise<void>
  signOut: () => Promise<void>
  useLocal: () => Promise<void>
  applyCatalogues: (updates: CatalogueUpdate[], scope: string) => Promise<void>
}
const Context = createContext<State>(null!)
export const useArchive = () => useContext(Context)
const publishedEdition = async () => {
  throw new Error('Tämä on Kulttuurikerhon julkaistu arkisto.')
}
export function ArchiveProvider({ children }: { children: ReactNode }) {
  const [archive] = useState(clubArchive)
  const [notice, setNotice] = useState(''),
    [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return (
    <Context.Provider
      value={{
        archive,
        ready: true,
        busy: false,
        online,
        notice,
        setNotice,
        user: null,
        clubs: [],
        club: null,
        save: publishedEdition,
        restore: publishedEdition,
        selectClub: publishedEdition,
        refreshClubs: publishedEdition,
        updateWork: publishedEdition,
        signOut: publishedEdition,
        useLocal: publishedEdition,
        applyCatalogues: publishedEdition
      }}
    >
      {children}
    </Context.Provider>
  )
}
