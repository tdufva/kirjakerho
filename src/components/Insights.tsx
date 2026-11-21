import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Share2, ArrowUpRight, Check, Copy } from 'lucide-react'
import { useArchive } from '../services/store'
import { clubInsights, type Insight } from '../domain/insights'
import { format } from '../domain/statistics'
import { readingHref, readingViews } from '../domain/readings'
import { appUrl } from '../services/urls'
import { ErrorText, Modal } from './UI'
export function InsightsPage() {
  const { archive } = useArchive(),
    [params, setParams] = useSearchParams()
  const years = [
    ...new Set(
      readingViews(archive.works)
        .map((w) => w.date?.slice(0, 4))
        .filter(Boolean)
    )
  ]
    .sort()
    .reverse() as string[]
  const year = years.includes(params.get('vuosi') ?? '') ? params.get('vuosi')! : '',
    cards = clubInsights(archive, year)
  const [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(''),
    [fallback, setFallback] = useState(''),
    [preview, setPreview] = useState<{ url: string; title: string; filename: string } | null>(null)
  const period = year || `${archive.dataset?.firstDate.slice(0, 4)}–${archive.dataset?.lastDate.slice(0, 4)}`
  useEffect(() => {
    const id = params.get('kortti')
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [params])
  async function share(card: Insight, copyOnly = false) {
    setError('')
    setFallback('')
    setMessage('')
    const query = new URLSearchParams({ kortti: card.id })
    if (year) query.set('vuosi', year)
    const url = appUrl(`/oivallukset?${query}`).href
    try {
      if (navigator.share && !copyOnly)
        await navigator.share({
          title: `${card.title} — Kirjakerhon Atlas`,
          text: `${card.value} ${card.unit}. ${card.body}`,
          url
        })
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setMessage(`Linkki kopioitu: ${card.title}`)
      } else setFallback(url)
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) {
        setFallback(url)
        setError('Jakaminen ei onnistunut. Voit kopioida linkin alta.')
      }
    }
  }
  async function download(card: Insight) {
    setBusy(card.id)
    setError('')
    setMessage('')
    try {
      const { insightPng } = await import('../services/shareCard'),
        blob = await insightPng(card, period),
        url = URL.createObjectURL(blob)
      setPreview({ url, title: card.title, filename: `Kirjakerho-${card.id}-${period}.png` })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kuvan tallennus ei onnistunut.')
    } finally {
      setBusy('')
    }
  }
  return (
    <div className="page insights-page">
      <div className="page-top">
        <div>
          <p className="eyebrow">LUKUJEN TAKANA</p>
          <h1>
            Meistä jää
            <br />
            <em>jälkiä.</em>
          </h1>
        </div>
        <p className="page-aside">
          Oivalluksia yhteisestä lukuhistoriasta.
          <br />
          Tallenna kuva tai jaa löytösi linkkinä.
        </p>
      </div>
      <div className="insights-toolbar">
        <label>
          Tarkasteltava aika
          <select value={year} onChange={(e) => setParams(e.target.value ? { vuosi: e.target.value } : {})}>
            <option value="">Koko historia 1994–2024</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <Link className="text-link" to={year ? `/vuosikirja?vuosi=${year}` : '/vuosikirja'}>
          Tee vuosikirja PDF:nä
          <ArrowUpRight size={19} />
        </Link>
      </div>
      <p className="small-note">
        Arviot ovat Tiinan, Hilkan, Erkin ja Joukon alkuperäisiä numeroita asteikolla 4–10. Tulkinnat
        lasketaan näistä pisteistä; lähteessä ei ole kirjoitettuja kirja-arvosteluja.
      </p>
      <div aria-live="polite">
        {message && (
          <p className="success-text">
            <Check size={18} />
            {message}
          </p>
        )}
        <ErrorText message={error} />
      </div>
      {fallback && (
        <label>
          Jaettava linkki
          <input readOnly value={fallback} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <div className="insight-grid">
        {cards.map((card, i) => (
          <article
            id={card.id}
            className={`insight-card insight-tone-${i % 3} ${params.get('kortti') === card.id ? 'insight-selected' : ''}`}
            key={card.id}
          >
            <p className="eyebrow">
              {card.kicker}
              <span>{String(i + 1).padStart(2, '0')}</span>
            </p>
            <h2>{card.title}</h2>
            <div className="insight-value">
              {card.value}
              <small>{card.unit}</small>
            </div>
            <p className="insight-body">{card.body}</p>
            {card.bars && (
              <div className="insight-bars">
                {card.bars.map((bar) => (
                  <div key={bar.label}>
                    <span>{bar.label}</span>
                    <div>
                      <i style={{ width: `${((bar.value - 4) / 6) * 100}%` }} />
                    </div>
                    <strong>{format(bar.value, 2)}</strong>
                  </div>
                ))}
              </div>
            )}
            {card.works && (
              <details className="insight-works">
                <summary>Katso kirjat ({card.works.length})</summary>
                {card.works.map((w) => (
                  <Link key={w.id} to={readingHref(w)}>
                    {w.title}
                    <span>{w.date?.slice(0, 4)}</span>
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
              </details>
            )}
            <details className="insight-method">
              <summary>Miten tämä laskettiin?</summary>
              <p>{card.method}</p>
            </details>
            <div className="insight-actions">
              <button className="button button-outline" onClick={() => void share(card)}>
                <Share2 size={18} />
                Jaa
              </button>
              <button className="button button-outline" onClick={() => void share(card, true)}>
                <Copy size={18} />
                Kopioi linkki
              </button>
              <button className="button button-outline" disabled={!!busy} onClick={() => void download(card)}>
                <Download size={18} />
                {busy === card.id ? 'Valmistellaan…' : 'Tallenna kuva'}
              </button>
            </div>
          </article>
        ))}
      </div>
      {preview && (
        <Modal
          title="Jakokuva on valmis"
          onClose={() => {
            URL.revokeObjectURL(preview.url)
            setPreview(null)
          }}
        >
          <img className="share-image-preview" src={preview.url} alt={`Jakokuva: ${preview.title}`} />
          <a className="button button-burgundy" href={preview.url} download={preview.filename}>
            <Download size={18} />
            Lataa PNG-kuva
          </a>
          <p className="small-note">Voit lähettää kuvan esimerkiksi kirjakerhon viestiryhmään.</p>
        </Modal>
      )}
    </div>
  )
}
