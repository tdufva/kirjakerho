import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { themeMembers } from '../data/jazzTheme'
import type { Member, Work } from '../domain/model'
import { normalize } from '../domain/model'
import { average, format } from '../domain/statistics'
import { readingHref } from '../domain/readings'
import { briefDescription } from '../domain/atlas'
import { Cover } from './UI'
export interface AtlasPreview {
  title: string
  context: string
  works: Work[]
  anchor: { left: number; right: number; top: number; bottom: number }
}
export function AtlasPopover({
  preview,
  members,
  onClose
}: {
  preview: AtlasPreview
  members: Member[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId(),
    noteId = useId()
  const [query, setQuery] = useState('')
  const people = themeMembers(members)
  const shown = preview.works.filter(
    (w) => !query || normalize(`${w.title} ${w.creator} ${w.date ?? ''}`).includes(normalize(query))
  )
  useLayoutEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    const place = () => {
      const { width, height } = dialog.getBoundingClientRect(),
        margin = 18
      const left = Math.max(margin, Math.min(preview.anchor.left, window.innerWidth - width - margin))
      const below = preview.anchor.bottom + 12
      const top =
        below + height <= window.innerHeight - margin
          ? below
          : Math.max(margin, Math.min(preview.anchor.top - height - 12, window.innerHeight - height - margin))
      dialog.style.setProperty('--popover-left', `${left}px`)
      dialog.style.setProperty('--popover-top', `${top}px`)
    }
    place()
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('resize', place)
      dialog.close()
    }
  }, [preview])
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="atlas-popover"
      aria-labelledby={titleId}
      aria-describedby={noteId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        const r = e.currentTarget.getBoundingClientRect()
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose()
      }}
    >
      <header className="atlas-popover-heading">
        <div>
          <p className="eyebrow">{preview.context}</p>
          <h2 id={titleId}>{preview.title}</h2>
          <p id={noteId}>
            {preview.works.length === 1 ? '1 teos' : `${preview.works.length} teosta`} · arvosanat 4–10
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          autoFocus
          aria-label="Sulje kirjanäkymä"
          onClick={onClose}
        >
          <X size={24} />
        </button>
      </header>
      {preview.works.length > 6 && (
        <label className="atlas-popover-search">
          <Search size={19} />
          <span className="sr-only">Etsi tämän valinnan kirjoista</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Etsi näistä teoksista…"
          />
        </label>
      )}
      <div className="atlas-popover-books" role="list" aria-label={`${preview.title}: teokset ja arviot`}>
        {shown.map((work) => (
          <article role="listitem" className="atlas-preview-book" key={work.id}>
            <div className="atlas-preview-cover">
              <Cover work={work} small />
            </div>
            <div className="atlas-preview-content">
              <p className="work-creator">{work.creator || 'Tekijä ei tiedossa'}</p>
              <h3>{work.title}</h3>
              <p className="atlas-preview-meta">
                {work.meetingNumber ? `Tapaaminen ${work.meetingNumber} · ` : ''}
                {work.date && /^\d{4}$/.test(work.date)
                  ? work.date
                  : work.date
                    ? new Date(`${work.date}T12:00:00`).toLocaleDateString('fi-FI')
                    : 'Ei päiväystä'}
                {work.pageCount ? ` · ${work.pageCount} sivua` : ''}
              </p>
              <p className="atlas-preview-description">{briefDescription(work)}</p>
              <div className="atlas-preview-average">
                <strong>{format(average(work), 2)}</strong>
                <span>
                  yhteinen keskiarvo / 10<small>{work.ratings.length} arvosanaa</small>
                </span>
              </div>
              <dl className="atlas-preview-ratings" aria-label={`${work.title}: lukijoiden arvosanat`}>
                {people.map((member) => {
                  const rating = work.ratings.find((r) => r.memberId === member.id)
                  return (
                    <div key={member.id} style={{ '--reader-color': member.color } as CSSProperties}>
                      <dt>{member.name}</dt>
                      <dd>
                        {rating ? format(rating.value, 2) : '–'}
                        <small>{rating ? `/ ${rating.max}` : 'Ei arviota'}</small>
                      </dd>
                    </div>
                  )
                })}
              </dl>
              <Link className="text-link" to={readingHref(work)} onClick={onClose}>
                Avaa teossivu
              </Link>
            </div>
          </article>
        ))}
        {!shown.length && (
          <p className="atlas-preview-empty" role="status">
            Tästä valinnasta ei löytynyt hakua vastaavaa teosta.
          </p>
        )}
      </div>
    </dialog>
  )
}
