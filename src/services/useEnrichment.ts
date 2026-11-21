import { createContext, useContext, useEffect, useRef, useState, createElement, type ReactNode } from 'react'
import type { Work } from '../domain/model'
import { emptyProgress, enrichWorks } from './enrichment'
import { useArchive } from './store'
function useEnrichmentTask() {
  const { applyCatalogues, club } = useArchive(),
    controller = useRef<AbortController | null>(null)
  const [progress, setProgress] = useState(emptyProgress),
    [running, setRunning] = useState(false),
    [error, setError] = useState(''),
    [completed, setCompleted] = useState(false)
  useEffect(() => () => controller.current?.abort(), [])
  async function run(works: Work[]) {
    if (controller.current) return
    const scope = club?.id ?? 'local',
      abort = new AbortController()
    controller.current = abort
    setError('')
    setCompleted(false)
    setRunning(true)
    setProgress({ ...emptyProgress(), total: works.length })
    try {
      if (!navigator.onLine) throw new Error('Maiden ja teemojen hakeminen tarvitsee verkkoyhteyden.')
      const updates = await enrichWorks(
        works.filter((w) => w.category === 'book' && w.creator.trim()),
        abort.signal,
        setProgress
      )
      if (updates.length) await applyCatalogues(updates, scope)
      setCompleted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Atlas-tietoja ei voitu tallentaa. Yritä hakua uudelleen.')
    } finally {
      controller.current = null
      setRunning(false)
    }
  }
  return { progress, running, error, completed, run, cancel: () => controller.current?.abort() }
}

const EnrichmentContext = createContext<ReturnType<typeof useEnrichmentTask> | null>(null)
export function EnrichmentProvider({ children }: { children: ReactNode }) {
  return createElement(EnrichmentContext.Provider, { value: useEnrichmentTask() }, children)
}
export function useEnrichment() {
  const state = useContext(EnrichmentContext)
  if (!state) throw new Error('Atlas-haku ei ole alustettu.')
  return state
}
