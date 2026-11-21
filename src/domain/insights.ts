import type { Archive, Work } from './model'
import { readingViews } from './readings'
import { average, correlation, deviation, format, mean, score, sharedPairs } from './statistics'
export interface Insight {
  id: string
  kicker: string
  title: string
  value: string
  unit: string
  body: string
  method: string
  works?: Work[]
  bars?: { label: string; value: number }[]
}
export function clubInsights(archive: Archive, year = ''): Insight[] {
  const readings = readingViews(archive.works).filter((w) => !year || w.date?.startsWith(year))
  const books = readings.filter((w) => w.category === 'book'),
    scored = books.filter((w) => w.ratings.length === archive.members.length && w.ratings.length >= 2)
  const pages = books.filter((w) => !!w.pageCount),
    totalPages = pages.reduce((s, w) => s + w.pageCount!, 0)
  const cards: Insight[] = [
    {
      id: 'matka',
      kicker: 'YHTEINEN MATKA',
      title: 'Sivuja, joihin palata.',
      value: format(totalPages, 0),
      unit: 'kirjattua sivua',
      body: `${readings.length} tapaamista, ${books.length} kirjamerkintää ja ${readings.length - books.length} muuta kulttuurikohtaamista. ${readings.filter((w) => !w.ratings.length).length} tapaamista on ilman arvosanoja.`,
      method: `Sivusumma perustuu ${pages.length} kirjamerkinnän lähteeseen merkittyihin sivumääriin. Puuttuvaa sivumäärää ei arvioida. Tapaamisten kopiot parhaiden listoissa on poistettu.`
    }
  ]
  const top = [...scored].sort((a, b) => average(b)! - average(a)!)
  if (top.length) {
    const best = average(top[0])!,
      tied = top.filter((w) => Math.abs(average(w)! - best) < 1e-8)
    cards.push({
      id: 'suosikit',
      kicker: 'YHTEINEN SUOSIKKI',
      title: tied.length > 1 ? 'Jaettu kärkipaikka.' : `${top[0].title} nousi kärkeen.`,
      value: format(best, 2),
      unit: 'yhteinen keskiarvo / 10',
      body:
        tied.map((w) => `${w.title} (${w.date?.slice(0, 4)})`).join(', ') +
        `. Kaikki ${archive.members.length} arvioijaa mukana.`,
      method: `Vertailussa ${scored.length} kaikkien arvioimaa kirjamerkintää. Keskiarvo lasketaan alkuperäisistä pisteistä asteikolla 4–10. Tasapisteet näytetään.`,
      works: tied
    })
  }
  const divided = [...scored].sort((a, b) => deviation(b)! - deviation(a)!),
    debate = divided[0]
  if (debate)
    cards.push({
      id: 'eri-mielta',
      kicker: 'KESKUSTELUN PAIKKA',
      title: debate.title,
      value: format(deviation(debate), 2),
      unit: 'pistettä keskihajontaa',
      body: `${archive.members.map((m) => `${m.name} ${format(score(debate.ratings.find((r) => r.memberId === m.id)!), 2)}`).join(', ')}. Suurimman ja pienimmän arvion ero on ${format(Math.max(...debate.ratings.map(score)) - Math.min(...debate.ratings.map(score)), 2)} pistettä.`,
      method: `Suurin arvioiden perusjoukon keskihajonta ${scored.length} kaikkien arvioiman kirjamerkinnän joukossa. Hajonta kuvaa piste-eroja; se ei kerro keskustelun sisällöstä.`,
      works: divided.slice(0, 3)
    })
  const pairs = archive.members
    .flatMap((a, i) =>
      archive.members.slice(i + 1).map((b) => ({ a, b, ...correlation(sharedPairs(books, a.id, b.id)) }))
    )
    .filter((p) => p.n >= 3 && p.difference !== null)
    .sort((a, b) => a.difference! - b.difference!)
  if (pairs.length) {
    const closest = pairs[0]
    cards.push({
      id: 'yhteinen-savel',
      kicker: 'LÄHIMMÄT PISTEET',
      title: `${closest.a.name} & ${closest.b.name}`,
      value: format(closest.difference, 2),
      unit: 'pistettä eroa keskimäärin',
      body: `Tämän parin arvosanat ovat keskimäärin lähimpänä toisiaan. Pearsonin korrelaatio on ${format(closest.r, 2)} ja yhteisiä kirjamerkintöjä ${closest.n}.`,
      method: `Parit järjestetään yhteisten arvioiden absoluuttisen piste-eron keskiarvolla. Korrelaatio mittaa samaan suuntaan vaihtelua, ei samojen numeroiden antamista. Puuttuvat arviot jäävät pois.`
    })
  }
  const memberMeans = archive.members
    .map((m) => ({
      label: m.name,
      value: mean(books.flatMap((w) => w.ratings.filter((r) => r.memberId === m.id).map(score)))
    }))
    .filter((m): m is { label: string; value: number } => m.value !== null)
  if (memberMeans.length)
    cards.push({
      id: 'nelja-aania',
      kicker: 'NELJÄ ÄÄNTÄ',
      title: 'Neljä tapaa arvioida.',
      value: format(mean(books.flatMap((w) => w.ratings.map(score))), 2),
      unit: 'kirja-arvioiden keskiarvo / 10',
      body: memberMeans.map((m) => `${m.label} ${format(m.value, 2)}`).join(' · '),
      bars: memberMeans,
      method: `Lukijakohtaiset keskiarvot ${books.reduce((s, w) => s + w.ratings.length, 0)} kirja-arvosanasta asteikolla 4–10. Erot kertovat annetusta pisteytyksestä, eivät lukijan luonteesta.`
    })
  const lengthPairs = pages
      .filter((w) => w.ratings.length >= 2)
      .map((w) => [w.pageCount!, average(w)!] as [number, number]),
    length = correlation(lengthPairs)
  if (length.r !== null)
    cards.push({
      id: 'pituus',
      kicker: 'PITUUS JA PISTEET',
      title: 'Saako pitkä kirja paremman arvion?',
      value: format(length.r, 2),
      unit: 'Pearsonin korrelaatio',
      body: `${Math.abs(length.r) < 0.3 ? `Pituuden ja yhteisarvion lineaarinen yhteys on tässä aineistossa heikko${Math.abs(length.r) >= 0.1 ? (length.r > 0 ? ' ja positiivinen' : ' ja negatiivinen') : ''}.` : length.r > 0 ? 'Pidemmät kirjat ovat tässä aineistossa saaneet keskimäärin korkeampia pisteitä.' : 'Pidemmät kirjat ovat tässä aineistossa saaneet keskimäärin matalampia pisteitä.'} Mukana ${length.n} kirjamerkintää.`,
      method:
        'Pearsonin korrelaatio lähteen sivumäärän ja lukukerran pistekeskiarvon välillä. Mukaan tarvitaan sivumäärä ja vähintään kaksi arvosanaa. Yhteys ei osoita syytä.'
    })
  const authors = [...new Set(scored.map((w) => w.creator))]
    .map((name) => {
      const works = scored.filter((w) => w.creator === name)
      return { name, works, avg: mean(works.map((w) => average(w)!))! }
    })
    .filter((a) => a.works.length >= 3)
    .sort((a, b) => b.avg - a.avg)
  if (authors.length)
    cards.push({
      id: 'tutut-tekijat',
      kicker: 'TUTUT TEKIJÄT',
      title: authors[0].name,
      value: format(authors[0].avg, 2),
      unit: `keskiarvo · ${authors[0].works.length} kirjamerkintää`,
      body: 'Korkein keskiarvo tekijöistä, joilta on vähintään kolme kaikkien arvioimaa kirjamerkintää.',
      method: `Kunkin lukukerran yhteisarvolla sama paino. Vertailussa ${authors.length} tekijää. Vähintään kolme kirjaa rajaa yhden teoksen sattumaa, mutta valikoima ei edusta tekijän koko tuotantoa.`,
      works: authors[0].works
    })
  const themes = [...new Set(scored.flatMap((w) => w.themes))]
    .filter(
      (t) => !/^(romaanit|kertomakirjallisuus|kaunokirjallisuus|suomenkielinen|suomenruotsalainen)/i.test(t)
    )
    .map((name) => {
      const works = scored.filter((w) => w.themes.includes(name))
      return { name, works, avg: mean(works.map((w) => average(w)!))! }
    })
    .filter((t) => t.works.length >= 5)
    .sort((a, b) => b.avg - a.avg)
  if (themes.length)
    cards.push({
      id: 'teeman-lanka',
      kicker: 'TEEMAN LANKA',
      title: themes[0].name,
      value: format(themes[0].avg, 2),
      unit: `keskiarvo · ${themes[0].works.length} kirjamerkintää`,
      body: 'Korkein pistekeskiarvo vähintään viidessä kirjassa esiintyvistä lähteiden asiasanoista.',
      method: `Vertailussa ${themes.length} asiasanaa. Sama kirja voi kuulua moneen teemaan. Kirjaston kuvailun kattavuus vaihtelee; tulos ei ole teosten laadun tai koko kirjallisuuden paremmuusjärjestys.`,
      works: themes[0].works
    })
  return cards
}
