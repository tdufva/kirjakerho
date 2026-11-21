import { readingViews, sessionsFor, reviewText } from '../domain/readings'
import { themeMembers } from '../data/jazzTheme'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, MapPin, ExternalLink } from 'lucide-react'
import { useArchive } from '../services/store'
import { categorySingular } from '../domain/model'
import { average, deviation, format } from '../domain/statistics'
import { Cover, WorkCard } from './UI'
export function WorkDetailPage() {
  const { id } = useParams(),
    { archive } = useArchive(),
    canonical = archive.works.find((w) => w.id === id),
    members = themeMembers(archive.members)
  const [params, setParams] = useSearchParams(),
    views = canonical ? readingViews([canonical]) : [],
    work = views.find((w) => w.readingId === params.get('lukukerta')) ?? views.at(-1)
  if (!work)
    return (
      <div className="page narrow">
        <h1>Teosta ei löytynyt.</h1>
        <Link className="button button-dark" to="/arkisto">
          Takaisin arkistoon
        </Link>
      </div>
    )
  const related = readingViews(archive.works)
    .filter(
      (w) => w.workId !== id && (w.creator === work.creator || w.themes.some((t) => work.themes.includes(t)))
    )
    .slice(0, 4)
  const date = work.date
    ? /^\d{4}$/.test(work.date)
      ? work.date
      : new Date(`${work.date}T12:00:00`).toLocaleDateString('fi-FI')
    : 'Ei merkitty'
  return (
    <div className="page detail-page">
      <Link className="back-link" to="/arkisto">
        <ArrowLeft size={20} />
        Takaisin arkistoon
      </Link>
      <div className="work-hero">
        <div className="detail-cover">
          <Cover work={work} />
        </div>
        <div className="detail-intro">
          <p className="eyebrow">
            {categorySingular[work.category]}
            <span>·</span>Tapaaminen {work.meetingNumber ?? '–'}
          </p>
          <p className="detail-author">{work.creator || 'Tekijä ei tiedossa'}</p>
          <h1>{work.title}</h1>
          <p className="detail-description">
            {work.description ?? 'Kulttuurikerhon yhteinen kohtaaminen. Arviot ja lähdetiedot alla.'}
          </p>
          <div className="detail-score">
            <strong>{format(average(work), 2)}</strong>
            <span>
              yhteinen keskiarvo / 10
              <small>
                {work.ratings.length} arviota · {date}
              </small>
            </span>
          </div>
          <div className="detail-tags">
            {work.themes.map((t) => (
              <Link to="/atlas" key={t}>
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <section className="section">
        {views.length > 1 && (
          <div className="reading-selector">
            <label>
              Lukukerta
              <select
                aria-label="Lukukerta"
                value={work.readingId}
                onChange={(e) => setParams({ lukukerta: e.target.value })}
              >
                {sessionsFor(canonical!).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.date ?? 'Ei päiväystä'}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="section-heading">
          <h2>Lukijoiden näkökulmat.</h2>
          <span>Keskihajonta {format(deviation(work), 2)}</span>
        </div>
        <div className="review-grid">
          {members.map((m) => {
            const r = work.ratings.find((x) => x.memberId === m.id),
              review = reviewText(work, m.id)
            return (
              <article
                className="review-block"
                key={m.id}
                style={{ '--member': m.color } as React.CSSProperties}
              >
                <div className="review-top">
                  <span className="avatar" style={{ background: m.avatarColor, color: m.textColor }}>
                    {m.name[0]}
                  </span>
                  <h3>{m.name}</h3>
                  <strong>
                    {r ? format(r.value, 2) : '—'}
                    <small>{r ? `/ ${r.max}` : ''}</small>
                  </strong>
                </div>
                {review ? (
                  <blockquote>”{review}”</blockquote>
                ) : (
                  <p className="muted">
                    {r ? 'Kirjoitettua arviota ei ole.' : 'Lähteessä ei ole arvosanaa.'}
                  </p>
                )}
                {r && (
                  <span className="review-scale">
                    Alkuperäinen asteikko {r.min}–{r.max}
                    <br />
                    {r.source}
                  </span>
                )}
              </article>
            )
          })}
        </div>
        <p className="small-note">
          Keskiarvo ja keskihajonta lasketaan annetuista arvosanoista asteikolla 4–10. Puuttuva arvosana ei
          ole nolla. Keskihajonta kuvaa mielipiteiden vaihtelua.
        </p>
      </section>
      <div className="work-info-columns">
        <section>
          <h2>Teoksen maailmassa.</h2>
          <dl>
            <div>
              <dt>Tarinan paikat</dt>
              <dd>
                {work.locations
                  .filter((l) => l.kind === 'setting')
                  .map((l) => l.name)
                  .join(', ') || 'Ei varmistettua tietoa'}
              </dd>
            </div>
            <div>
              <dt>Kirjaston aiheen maat</dt>
              <dd>
                {work.locations
                  .filter((l) => l.kind === 'subject')
                  .map((l) => l.name)
                  .join(', ') || 'Ei merkitty lähdetietueeseen'}
              </dd>
            </div>
            <div>
              <dt>Tapahtuma-aika</dt>
              <dd>{work.period ?? 'Ei varmistettua tietoa'}</dd>
            </div>
            <div>
              <dt>Kirjastopainoksen vuosi</dt>
              <dd>{work.publicationYear ?? work.metadata?.publicationYear ?? 'Ei tiedossa'}</dd>
            </div>
            <div>
              <dt>Sivuja Numbers-lähteessä</dt>
              <dd>{work.pageCount ?? 'Ei merkitty'}</dd>
            </div>
            <div>
              <dt>Yht. Numbers-lähteessä</dt>
              <dd>
                {format(work.sourceTotal, 2)}
                {!work.ratings.length && ' (ei arvioita)'}
              </dd>
            </div>
            <div>
              <dt>Kirjakerhon päiväys</dt>
              <dd>{date}</dd>
            </div>
          </dl>
          <Link className="text-link" to="/atlas">
            <MapPin size={18} />
            Tutki Atlasta
            <ArrowUpRight size={18} />
          </Link>
        </section>
        <section>
          <h2>Kirjan taustalla.</h2>
          {work.metadata ? (
            <>
              <p className="muted">
                Lähde: {work.metadata.source}. Kirjastopainoksen vuosi voi poiketa kirjakerhon lukeman
                painoksen vuodesta.
              </p>
              <p className="small-note">
                Tarkistettu {new Date(work.metadata.retrievedAt).toLocaleDateString('fi-FI')}
              </p>
              <a className="text-link" href={work.metadata.url} target="_blank" rel="noreferrer">
                Avaa kirjastotieto
                <ExternalLink size={17} />
              </a>
            </>
          ) : (
            <p className="muted">
              {work.category === 'book'
                ? 'Kirjastovastaavuutta ei ole saatu varmistettua.'
                : 'Alkuperäinen kulttuurikerhon tapahtumamerkintä.'}
            </p>
          )}
          {work.annotationSource && (
            <p>
              <a className="text-link" href={work.annotationSource} target="_blank" rel="noreferrer">
                Täydentävä lähde
                <ExternalLink size={17} />
              </a>
            </p>
          )}
          {work.source && <p className="small-note">Alkuperäinen lähde: {work.source}</p>}
          {work.sourceCells && (
            <details className="original-notes">
              <summary>Alkuperäiset nimisarakkeet</summary>
              <p>
                Kirjailija/tapahtuma: {work.sourceCells.creator || 'Tyhjä'}
                <br />
                Kirjan nimi: {work.sourceCells.title || 'Tyhjä'}
              </p>
            </details>
          )}
          {work.notes && <p className="small-note">{work.notes}</p>}
        </section>
      </div>
      {related.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <h2>Samaa tarinan lankaa.</h2>
          </div>
          <div className="book-grid">
            {related.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
