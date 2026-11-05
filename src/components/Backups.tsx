import { useEffect, useRef, useState } from 'react'
import { Download, History, Upload } from 'lucide-react'
import { useArchive } from '../services/store'
import { createBackup, readBackup } from '../services/backups'
import { recoveryPoints, type RecoveryPoint } from '../services/cache'
import { readingViews } from '../domain/readings'
import type { Archive } from '../domain/model'
import { Modal, ErrorText } from './UI'
export function Backups() {
  const { archive, club, user, save, restore, busy } = useArchive(),
    file = useRef<HTMLInputElement>(null)
  const [points, setPoints] = useState<RecoveryPoint[]>([]),
    [candidate, setCandidate] = useState<{
      archive: Archive
      id?: string
      verified?: boolean
      label: string
    } | null>(null),
    [error, setError] = useState(''),
    [checked, setChecked] = useState(false),
    [working, setWorking] = useState(false)
  useEffect(() => {
    let active = true
    recoveryPoints(club && user ? `${user.id}:${club.id}` : 'local')
      .then((p) => {
        if (active) setPoints(p)
      })
      .catch(() => {
        if (active) setError('Palautuspisteitä ei voitu lukea.')
      })
    return () => {
      active = false
    }
  }, [archive, club?.id, user?.id])
  function select(next: typeof candidate) {
    setCandidate(next)
    setChecked(false)
    setError('')
  }
  async function download() {
    setError('')
    try {
      const data = await createBackup(archive),
        url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
        a = document.createElement('a')
      a.href = url
      a.download = `Kirjakerhon-Atlas-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError('Varmuuskopion luominen ei onnistunut.')
    }
  }
  async function read(f?: File) {
    if (!f) return
    setWorking(true)
    setError('')
    try {
      const data = await readBackup(f)
      select({ ...data, label: f.name })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Varmuuskopiota ei voitu lukea.')
    } finally {
      setWorking(false)
      if (file.current) file.current.value = ''
    }
  }
  async function apply() {
    if (!candidate || !checked) return
    setWorking(true)
    setError('')
    try {
      if (candidate.id) await restore(candidate.id)
      else await save({ ...candidate.archive, mode: club ? 'cloud' : 'local' })
      setCandidate(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Palautus ei onnistunut.')
    } finally {
      setWorking(false)
    }
  }
  return (
    <section className="backup-panel">
      <div className="backup-actions">
        <button className="button button-outline" onClick={() => void download()}>
          <Download size={19} />
          Tallenna varmuuskopio
        </button>
        <button
          className="button button-outline"
          disabled={working || busy}
          onClick={() => file.current?.click()}
        >
          <Upload size={19} />
          Palauta JSON-tiedostosta
        </button>
        <input
          ref={file}
          className="sr-only"
          aria-label="JSON-varmuuskopio"
          type="file"
          accept=".json,application/json"
          onChange={(e) => void read(e.target.files?.[0])}
        />
      </div>
      <h3>
        <History size={20} />
        Palautuspisteet
      </h3>
      <p className="small-note">
        Kahdeksan edellistä arkistoversiota säilyy tässä selaimessa. Palautuksen alle jäävä nykyinen versio
        tallennetaan myös palautuspisteeksi. Lataa tiedostokopio laitteenvaihtoa varten.
      </p>
      {points.length ? (
        <div className="recovery-list">
          {points.map((p) => (
            <button
              className="settings-row"
              key={p.id}
              disabled={busy || working}
              onClick={() =>
                select({
                  archive: p.archive,
                  id: p.id,
                  label: p.at ? new Date(p.at).toLocaleString('fi-FI') : 'Aiempi palautuspiste'
                })
              }
            >
              <span>
                {p.at ? new Date(p.at).toLocaleString('fi-FI') : 'Aiempi palautuspiste'}
                <small>
                  {p.archive.works.length} teosta · {readingViews(p.archive.works).length} lukukertaa
                </small>
              </span>
              <History size={18} />
            </button>
          ))}
        </div>
      ) : (
        <p>Palautuspiste syntyy, kun tallennettua arkistoa muutetaan.</p>
      )}
      {!candidate && <ErrorText message={error} />}
      {candidate && (
        <Modal title="Tarkista palautettava arkisto" onClose={() => setCandidate(null)}>
          <p>{candidate.label}</p>
          <p>
            {candidate.archive.works.length} teosta · {readingViews(candidate.archive.works).length}{' '}
            lukukertaa · {candidate.archive.members.length} arvioijaa · {candidate.archive.imports.length}{' '}
            tuontia
          </p>
          <p>
            {candidate.verified
              ? 'Tiedoston tarkistussumma ja tietorakenne tarkistettu.'
              : candidate.id
                ? 'Paikallinen palautuspiste.'
                : 'Vanha JSON-varmuuskopio: tietorakenne tarkistettu, tiedostossa ei ole tarkistussummaa.'}
          </p>
          <p>
            Palautus korvaa {club ? 'kirjakerhon yhteisen pilviarkiston' : 'tämän laitteen arkiston'}.
            Nykyinen arkisto jää palautuspisteeksi.
          </p>
          <label className="check-label">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            Haluan vaihtaa nykyisen arkiston tähän versioon.
          </label>
          <div className="modal-actions">
            <button className="button button-outline" onClick={() => setCandidate(null)}>
              Peruuta
            </button>
            <button
              className="button button-burgundy"
              disabled={!checked || busy || working}
              onClick={() => void apply()}
            >
              {working ? 'Palautetaan…' : 'Palauta arkisto'}
            </button>
          </div>
          <ErrorText message={error} />
        </Modal>
      )}
    </section>
  )
}
