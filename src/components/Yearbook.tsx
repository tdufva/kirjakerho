import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, ArrowUpRight } from 'lucide-react'
import { useArchive } from '../services/store'
import { readingViews, readingHref } from '../domain/readings'
import { yearbook } from '../domain/yearbook'
import { average, deviation, format } from '../domain/statistics'
import { ErrorText } from './UI'
export function YearbookPage() {
  const { archive } = useArchive(),
    years = [
      ...new Set(
        readingViews(archive.works)
          .map((w) => w.date?.slice(0, 4))
          .filter((y): y is string => !!y)
      )
    ]
      .sort()
      .reverse()
  const [params] = useSearchParams()
  const [year, setYear] = useState(
      years.includes(params.get('vuosi') ?? '') ? params.get('vuosi')! : (years[0] ?? '')
    ),
    [notes, setNotes] = useState(false),
    [working, setWorking] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false)
  const selected = years.includes(year) ? year : (years[0] ?? ''),
    data = yearbook(archive, selected)
  async function download() {
    setWorking(true)
    setError('')
    setDone(false)
    try {
      const { createYearbookPdf, browserYearbookAssets } = await import('../services/yearbookPdf')
      const bytes = await createYearbookPdf(archive, selected, await browserYearbookAssets(), notes),
        url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' })),
        a = document.createElement('a')
      a.href = url
      a.download = `Kirjakerhon-vuosikirja-${selected}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF:n luominen ei onnistunut.')
    } finally {
      setWorking(false)
    }
  }
  return (
    <div className="page yearbook-page">
      <h1>
        Tarinoita,
        <br />
        <em>jotka jäivät.</em>
      </h1>
      <p className="yearbook-lead">
        Vuoden kirjat, alkuperäiset arvosanat, yhteiset suosikit ja suurimmat piste-erot.
      </p>
      {!years.length ? (
        <p>Vuosikirjaan tarvitaan päivätty lukukerta. Arkistossa ei ole päivättyjä tapaamisia.</p>
      ) : (
        <>
          <div className="yearbook-layout">
            <section className="yearbook-cover" aria-label={`Vuosikirjan ${selected} esikatselu`}>
              <span>KIRJAKERHON ATLAS</span>
              <strong>{selected}</strong>
              <h2>Tarinoita hyvässä seurassa.</h2>
              <img
                src={`${import.meta.env.BASE_URL}images/salon-impressionist.webp`}
                alt="Tyhjä, savuinen jazzsalonki maalauksellisissa kuparin ja oliivin sävyissä"
              />
              <p>
                {data.workCount} teosta · {data.readings.length} lukukertaa
              </p>
            </section>
            <section className="yearbook-options">
              <h2>Sinun kirjakerhosi vuosi.</h2>
              <label>
                Vuosikirjan vuosi
                <select
                  value={selected}
                  onChange={(e) => {
                    setYear(e.target.value)
                    setDone(false)
                  }}
                >
                  {years.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </label>
              <p>
                {data.ratingCount} arvosanaa · {data.commentCount} lukijakommenttia. Jokainen lukukerta ja
                kaikki kirjoitetut arviot tulevat mukaan kokonaisina.
              </p>
              <label className="check-label">
                <input type="checkbox" checked={notes} onChange={(e) => setNotes(e.target.checked)} />
                Sisällytä myös alkuperäiset muistiinpanot
              </label>
              <button className="button button-burgundy" disabled={working} onClick={() => void download()}>
                <Download size={20} />
                {working ? 'Taitetaan vuosikirjaa…' : 'Lataa vuosikirja PDF:nä'}
              </button>
              <p className="small-note">
                PDF luodaan tällä laitteella. Suosikit perustuvat keskiarvoon ja erimielisyydet
                keskihajontaan; vertailussa on vähintään kaksi arvosanaa samalta lukukerralta.
              </p>
              {data.undated > 0 && (
                <p className="small-note">
                  {data.undated} lukukertaa on ilman päiväystä eikä sisälly vuosikirjaan. Täydennä päiväys
                  alkuperäiseen arkistoon.
                </p>
              )}
              {done && <p role="status">Vuosikirja on valmis. PDF-tiedosto ladattiin selaimen latauksiin.</p>}
              <ErrorText message={error} />
            </section>
          </div>
          <div className="yearbook-highlights">
            {[
              ['Vuoden suosikit', data.favourites, false],
              ['Ihanat erimielisyydet', data.disagreements, true]
            ].map(([label, works, spread]) => (
              <section key={String(label)}>
                <h2>{String(label)}</h2>
                {(works as typeof data.readings).length ? (
                  (works as typeof data.readings).map((w) => (
                    <Link className="settings-row" key={w.id} to={readingHref(w)}>
                      <span>
                        {w.title}
                        <small>
                          {w.date} · {w.creator}
                        </small>
                      </span>
                      <strong>
                        {format(spread ? deviation(w) : average(w))}
                        {spread ? ' hajonta' : ' / 10'}
                      </strong>
                      <ArrowUpRight size={18} />
                    </Link>
                  ))
                ) : (
                  <p>Arvioita ei vielä ole tarpeeksi tähän vertailuun.</p>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
