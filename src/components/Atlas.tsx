import { readingViews } from '../domain/readings'
import { jazzPlotColors } from '../data/jazzTheme'
import { useMemo, useState, useEffect, useRef } from 'react'
import { MapPin, Clock, Shapes, Network, ArrowUpRight, Minus, Plus } from 'lucide-react'
import { useArchive } from '../services/store'
import { format, mean, score } from '../domain/statistics'
import { Empty } from './UI'
import { AtlasPopover, type AtlasPreview } from './AtlasPopover'
import { atlasSelection, periodLabel, type AtlasTab, type PeriodMode } from '../domain/atlas'
import type { Work, Location } from '../domain/model'
const project = ([lon, lat]: number[]): [number, number] => [
  ((lon + 180) / 360) * 1000,
  ((85 - lat) / 170) * 480
]
function paths(geo: any): string[] {
  return (geo?.features ?? []).flatMap((f: any) => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    return polys.map((poly: number[][][]) =>
      poly
        .map(
          (ring) =>
            ring
              .map(
                (coord, i) =>
                  `${i ? 'L' : 'M'}${project(coord)
                    .map((n) => n.toFixed(1))
                    .join(',')}`
              )
              .join(' ') + 'Z'
        )
        .join(' ')
    )
  })
}
export function AtlasPage() {
  const { archive } = useArchive(),
    [tab, setTab] = useState<AtlasTab>('places'),
    [selected, setSelected] = useState(''),
    [kind, setKind] = useState<Location['kind']>('setting'),
    [member, setMember] = useState(''),
    [periodMode, setPeriodMode] = useState<PeriodMode>('read'),
    [zoom, setZoom] = useState(1),
    [land, setLand] = useState<string[]>([])
  const [preview, setPreview] = useState<AtlasPreview | null>(null)
  const placeChosen = useRef(false)
  useEffect(() => {
    if (
      !placeChosen.current &&
      archive.works.some((w) =>
        w.catalogue?.locations.some((l) => l.kind === 'subject' || l.kind === 'setting')
      )
    )
      setKind('subject')
  }, [archive.works])
  const works = readingViews(archive.works).filter(
    (w) => !member || w.ratings.some((r) => r.memberId === member)
  )
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}land.geojson`)
      .then((r) => r.json())
      .then((g) => setLand(paths(g)))
      .catch(() => {})
  }, [])
  const countries = useMemo(
    () =>
      [
        ...new Set(works.flatMap((w) => w.locations.filter((l) => l.kind === kind).map((l) => l.country)))
      ].sort((a, b) => a.localeCompare(b, 'fi')),
    [works, kind]
  )
  const themes = [...new Set(works.flatMap((w) => w.themes))]
    .map((theme) => ({ label: theme, works: works.filter((w) => w.themes.includes(theme)) }))
    .sort((a, b) => b.works.length - a.works.length)
  const periods = [...new Set(works.map((w) => periodLabel(w, periodMode)).filter(Boolean))]
    .sort()
    .map((label) => ({ label, works: atlasSelection(works, 'periods', label, kind, periodMode) }))
  const showSelection = (value: string, trigger: Element) => {
    setSelected(value)
    const found = atlasSelection(works, tab, value, kind, periodMode)
    if (!found.length) return
    const contexts = {
      places:
        kind === 'subject'
          ? 'KIRJASTON AIHEEN MAAT'
          : kind === 'publication'
            ? 'JULKAISUMAA'
            : kind === 'author'
              ? 'TEKIJÄN KOTIMAA'
              : 'TARINAN TAPAHTUMAPAIKKA',
      periods:
        periodMode === 'read'
          ? 'KIRJAKERHON VUOSI'
          : periodMode === 'published'
            ? 'KIRJASTOPAINOKSEN VUOSIKYMMEN'
            : 'TARINAN TAPAHTUMA-AIKA',
      themes: 'YHDISTÄVÄ TEEMA',
      network: 'YHDISTÄVÄ TEEMA'
    }
    const r = trigger.getBoundingClientRect()
    setPreview({
      title: value,
      context: contexts[tab],
      works: found,
      anchor: { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
    })
  }
  const showBook = (work: Work, trigger: Element) => {
    const r = trigger.getBoundingClientRect()
    setPreview({
      title: 'Teos ja arviot',
      context: 'KIRJAKERHON KOKOELMA',
      works: [work],
      anchor: { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
    })
  }
  const chooseTab = (value: AtlasTab) => {
    setTab(value)
    setSelected('')
    setPreview(null)
  }
  const selectedTheme = themes.find((t) => t.label === selected) ?? themes[0]
  const nodes = (selectedTheme?.works ?? []).slice(0, 12)
  return (
    <div className="page atlas-page">
      <div className="page-top">
        <div>
          <p className="eyebrow">TARINAT YLITTÄVÄT RAJOJA</p>
          <h1>
            Minne seuraava
            <br />
            <em>sivu vie?</em>
          </h1>
        </div>
        <p className="page-aside">
          Paikkoja, aikakausia, yhteyksiä. <br />
          Kirjallisuus avaa maailman.
        </p>
      </div>
      <p className="atlas-data-note">
        Teemat, kirjallisuuden lajit ja aiheen maat perustuvat kirjastojen ja kustantajien tietoihin. Lähteet
        näkyvät teossivuilla. Julkaisumaa on eri asia kuin tarinan tapahtumapaikka. Kartan pisteet ovat maiden
        keskipisteitä.
      </p>
      <div className="atlas-tabs" role="group" aria-label="Valitse Atlas-näkymä">
        {[
          ['places', 'Paikat', MapPin],
          ['periods', 'Aikakaudet', Clock],
          ['themes', 'Teemat', Shapes],
          ['network', 'Yhteydet', Network]
        ].map(([value, label, Icon]: any) => (
          <button key={value} className={tab === value ? 'active' : ''} onClick={() => chooseTab(value)}>
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>
      <div className="atlas-controls">
        <span className="eyebrow">
          {tab === 'places'
            ? 'KIRJALLINEN MAANTIEDE'
            : tab === 'periods'
              ? 'KIRJOJEN AJAT'
              : tab === 'themes'
                ? 'TARINOIDEN LANKOJA'
                : 'TEOSTEN VÄLISET YHTEYDET'}
        </span>
        <label>
          Arvioija
          <select value={member} onChange={(e) => setMember(e.target.value)}>
            <option value="">Kaikki lukijat</option>
            {archive.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {tab === 'places' && (
        <>
          <div className="map-kind">
            <label>
              Kartalla
              <select
                value={kind}
                onChange={(e) => {
                  placeChosen.current = true
                  setKind(e.target.value as Location['kind'])
                  setSelected('')
                }}
              >
                <option value="subject">Kirjaston aiheen maat</option>
                <option value="setting">Tarinan tapahtumapaikka</option>
                <option
                  value="author"
                  disabled={!works.some((w) => w.locations.some((l) => l.kind === 'author'))}
                >
                  Tekijän kotimaa (ei varmistettuja tietoja)
                </option>
                <option value="publication">Julkaisumaa</option>
              </select>
            </label>
            <span>
              {countries.length} maata ·{' '}
              {works.filter((w) => w.locations.some((l) => l.kind === kind)).length} teosta
            </span>
          </div>
          <div className="world-map">
            <svg
              viewBox={`${500 - 500 / zoom} ${240 - 240 / zoom} ${1000 / zoom} ${480 / zoom}`}
              aria-label="Kirjojen paikat maailmankartalla"
              role="group"
            >
              <defs>
                <pattern id="map-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r=".7" fill="#c4bdad" />
                </pattern>
              </defs>
              <rect width="1000" height="480" fill="url(#map-dots)" />
              {land.map((d, i) => (
                <path key={i} d={d} className="land" />
              ))}
              {countries.map((country) => {
                const loc = works
                    .flatMap((w) => w.locations)
                    .find((l) => l.country === country && l.kind === kind)!,
                  [x, y] = project([loc.lon, loc.lat]),
                  count = works.filter((w) =>
                    w.locations.some((l) => l.country === country && l.kind === kind)
                  ).length
                return (
                  <g
                    className={`map-marker ${selected === country ? 'selected' : ''}`}
                    role="button"
                    tabIndex={0}
                    key={country}
                    aria-haspopup="dialog"
                    onClick={(e) => showSelection(country, e.currentTarget)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        showSelection(country, e.currentTarget)
                      }
                    }}
                    aria-label={`${country}, ${count} teosta`}
                  >
                    <title>
                      {country}: {count} teosta
                    </title>
                    <circle className="marker-target" cx={x} cy={y} r={24 / zoom} />
                    <circle
                      className="marker-halo"
                      cx={x}
                      cy={y}
                      r={(count > 4 ? 15 : 10) / Math.sqrt(zoom)}
                    />
                    <circle cx={x} cy={y} r={5 / Math.sqrt(zoom)} />
                  </g>
                )
              })}
            </svg>
            <div className="map-zoom">
              <button
                className="icon-button"
                onClick={() => setZoom(Math.min(3, zoom + 0.5))}
                aria-label="Lähennä karttaa"
                disabled={zoom >= 3}
              >
                <Plus size={20} />
              </button>
              <button
                className="icon-button"
                onClick={() => setZoom(Math.max(1, zoom - 0.5))}
                aria-label="Loitonna karttaa"
                disabled={zoom <= 1}
              >
                <Minus size={20} />
              </button>
            </div>
            <span className="map-caption">KIRJAKERHON MAAILMA · NATURAL EARTH</span>
          </div>
          {!countries.length && (
            <Empty>
              <h2>Nämä paikat odottavat löytämistä.</h2>
              <p>Arkistossa ei ole vielä tämän lajin sijaintitietoja.</p>
            </Empty>
          )}
          <div className="country-chips">
            {countries.map((c) => (
              <button
                className={selected === c ? 'active' : ''}
                aria-haspopup="dialog"
                onClick={(e) => showSelection(c, e.currentTarget)}
                key={c}
              >
                <MapPin size={16} />
                {c}
                <span>
                  {works.filter((w) => w.locations.some((l) => l.kind === kind && l.country === c)).length}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {tab === 'periods' && (
        <>
          <div className="period-mode" role="group" aria-label="Ajan laji">
            {[
              ['setting', 'Tarinan tapahtuma-aika'],
              ['published', 'Julkaisuaika'],
              ['read', 'Lukuvuosi']
            ].map(([key, label]) => (
              <button
                className={periodMode === key ? 'active' : ''}
                onClick={() => {
                  setPeriodMode(key as PeriodMode)
                  setSelected('')
                }}
                key={key}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="muted">
            {periodMode === 'setting'
              ? 'Milloin tarina tapahtuu? Näytämme arkistoon tallennetut tapahtuma-ajat.'
              : periodMode === 'published'
                ? 'Milloin teos ilmestyi? Teokset on ryhmitelty vuosikymmenittäin.'
                : 'Milloin kirjakerho luki tai koki teoksen?'}
          </p>
          <div className="period-list">
            {periods.map((p, i) => (
              <button
                className={selected === p.label ? 'active' : ''}
                key={p.label}
                aria-haspopup="dialog"
                onClick={(e) => showSelection(p.label, e.currentTarget)}
              >
                <span className="period-index">{String(i + 1).padStart(2, '0')}</span>
                <h2>{p.label}</h2>
                <span>{p.works.length} teosta</span>
                <strong>
                  {format(mean(p.works.flatMap((w) => w.ratings.map(score))))}
                  <small> / 10</small>
                </strong>
                <ArrowUpRight size={20} />
              </button>
            ))}
          </div>
          {!periods.length && (
            <Empty>
              <h2>Aikakaudet odottavat täydennystä.</h2>
              <p>Tuodun arkiston tapahtuma-aikoja ei päätellä julkaisuvuosista.</p>
            </Empty>
          )}
        </>
      )}
      {tab === 'themes' && (
        <>
          <p className="muted">
            Mukana ovat sekä teemat että kirjallisuuden lajit. Sama teos voi kuulua moneen ryhmään. Valitse
            teema ja löydä sen tarinat.
          </p>
          <div className="theme-grid">
            {themes.map((t, i) => (
              <button
                className={`theme-tile ${selected === t.label ? 'active' : ''}`}
                key={t.label}
                aria-haspopup="dialog"
                onClick={(e) => showSelection(t.label, e.currentTarget)}
              >
                <span className="theme-symbol">{String(i + 1).padStart(2, '0')}</span>
                <span className="small-label">{t.works.length} TEOSTA</span>
                <h2>{t.label}</h2>
                <span className="theme-average">
                  {format(mean(t.works.flatMap((w) => w.ratings.map(score))))}
                  <small> / 10</small>
                </span>
                <ArrowUpRight size={21} />
              </button>
            ))}
          </div>
          {!themes.length && (
            <Empty>
              <h2>Teemat syntyvät teosten tiedoista.</h2>
              <p>Kirjaston lähdetiedot näkyvät kunkin kirjan sivulla.</p>
            </Empty>
          )}
        </>
      )}
      {tab === 'network' && (
        <>
          <label className="network-select">
            Yhdistävä teema
            <select
              value={selectedTheme?.label ?? ''}
              onChange={(e) => showSelection(e.target.value, e.currentTarget)}
            >
              {themes.map((t) => (
                <option key={t.label}>{t.label}</option>
              ))}
            </select>
          </label>
          <p className="muted">
            Viiva yhdistää teokset yhteiseen teemaan. Näytämme enintään 12 teosta kerrallaan.
          </p>
          {nodes.length ? (
            <div className="network-chart">
              <svg
                viewBox="0 0 800 520"
                role="group"
                aria-label={`${selectedTheme?.label}: ${nodes.map((w) => w.title).join(', ')}`}
              >
                {nodes.map((w, i) => {
                  const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2,
                    x = 400 + Math.cos(angle) * 265,
                    y = 260 + Math.sin(angle) * 195
                  return (
                    <path
                      className="network-thread"
                      key={w.id}
                      d={`M400 260Q${(400 + x) / 2 + (i % 2 ? 5 : -5)} ${(260 + y) / 2 + ((i % 3) - 1) * 4} ${x} ${y}`}
                    />
                  )
                })}
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`Näytä teeman ${selectedTheme?.label} kirjat`}
                  aria-haspopup="dialog"
                  onClick={(e) => showSelection(selectedTheme!.label, e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      showSelection(selectedTheme!.label, e.currentTarget)
                    }
                  }}
                >
                  <circle className="network-center" cx="400" cy="260" r="64" />
                  <text x="400" y="267" className="center-label">
                    {selectedTheme?.label}
                  </text>
                </g>
                {nodes.map((w, i) => {
                  const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2,
                    x = 400 + Math.cos(angle) * 265,
                    y = 260 + Math.sin(angle) * 195
                  return (
                    <g
                      role="button"
                      tabIndex={0}
                      aria-label={`Näytä ${w.title} ja arviot`}
                      aria-haspopup="dialog"
                      onClick={(e) => showBook(w, e.currentTarget)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          showBook(w, e.currentTarget)
                        }
                      }}
                      key={w.id}
                    >
                      <circle cx={x} cy={y} r="24" fill="transparent" className="network-hit-area" />
                      <circle cx={x} cy={y} r="12" fill={jazzPlotColors[w.motif % jazzPlotColors.length]} />
                      <text x={x} y={y + 30}>
                        {w.title.length > 24 ? w.title.slice(0, 22) + '…' : w.title}
                      </text>
                      <title>{w.title}</title>
                    </g>
                  )
                })}
              </svg>
            </div>
          ) : (
            <Empty>
              <h2>Yhteydet odottavat teemoja.</h2>
            </Empty>
          )}
          <div className="network-work-links">
            {nodes.map((w) => (
              <button
                type="button"
                key={w.id}
                aria-haspopup="dialog"
                onClick={(e) => showBook(w, e.currentTarget)}
              >
                {w.title}
              </button>
            ))}
          </div>
        </>
      )}
      {preview && (
        <AtlasPopover preview={preview} members={archive.members} onClose={() => setPreview(null)} />
      )}
    </div>
  )
}
