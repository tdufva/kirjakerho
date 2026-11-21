import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { Archive } from '../domain/model'
import { yearbook } from '../domain/yearbook'
import { average, deviation, format } from '../domain/statistics'
import { reviewText } from '../domain/readings'
export interface YearbookAssets {
  body: Uint8Array
  heading: Uint8Array
  ground: Uint8Array
  salon: Uint8Array
}
const ink = rgb(0.94, 0.92, 0.86),
  sage = rgb(0.65, 0.67, 0.53),
  copper = rgb(0.737, 0.392, 0.22),
  gold = rgb(0.59, 0.52, 0.22),
  dark = rgb(0.105, 0.124, 0.104)
export async function createYearbookPdf(
  archive: Archive,
  year: string,
  assets: YearbookAssets,
  includeNotes = false
): Promise<Uint8Array> {
  const data = yearbook(archive, year)
  if (!data.readings.length) throw new Error('Valitulla vuodella ei ole päivättyjä lukukertoja.')
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const body = await pdf.embedFont(assets.body, { subset: true }),
    heading = await pdf.embedFont(assets.heading, { subset: true }),
    ground = await pdf.embedJpg(assets.ground),
    salon = await pdf.embedJpg(assets.salon)
  pdf.setTitle(`Kirjakerhon vuosikirja ${year}`)
  pdf.setAuthor('Kirjakerhon Atlas')
  pdf.setSubject('Vuoden lukukerrat, arviot ja kommentit')
  pdf.setLanguage('fi-FI')
  let page!: PDFPage,
    y = 0,
    missing = false
  function safe(value: string, font: PDFFont) {
    const supported = new Set(font.getCharacterSet())
    return Array.from(value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, '    '))
      .map((c) =>
        c === '\n' || supported.has(c.codePointAt(0)!)
          ? c
          : ((missing = true), `[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`)
      )
      .join('')
  }
  function paint(p: PDFPage, at: number, width: number) {
    p.drawLine({
      start: { x: 43, y: at },
      end: { x: 43 + width, y: at + 3 },
      thickness: 10,
      color: copper,
      opacity: 0.8
    })
    p.drawLine({
      start: { x: 39, y: at - 3 },
      end: { x: 39 + width * 0.92, y: at - 1 },
      thickness: 3,
      color: gold,
      opacity: 0.8
    })
    p.drawLine({
      start: { x: 49, y: at + 7 },
      end: { x: 43 + width * 0.98, y: at + 8 },
      thickness: 2,
      color: sage,
      opacity: 0.45
    })
  }
  function newPage(label: string) {
    page = pdf.addPage([595.28, 841.89])
    page.drawRectangle({ x: 0, y: 0, width: 596, height: 843, color: dark })
    page.drawImage(ground, { x: 0, y: 0, width: 842, height: 842, opacity: 0.18 })
    page.drawRectangle({ x: 0, y: 0, width: 596, height: 843, color: dark, opacity: 0.36 })
    page.drawText('KIRJAKERHON ATLAS', { x: 44, y: 800, size: 9, font: body, color: sage })
    page.drawText(year, { x: 514, y: 800, size: 11, font: body, color: ink })
    paint(page, 779, 507)
    y = 744
    if (label) text(label, 11, body, sage, 18)
    return page
  }
  function lines(value: string, size: number, font: PDFFont, width = 507): string[] {
    const result: string[] = []
    for (const para of safe(value, font).split(/\r?\n/)) {
      if (!para) {
        result.push('')
        continue
      }
      let line = ''
      for (const word of para.split(/\s+/)) {
        if (font.widthOfTextAtSize(line ? `${line} ${word}` : word, size) <= width) {
          line = line ? `${line} ${word}` : word
          continue
        }
        if (line) {
          result.push(line)
          line = ''
        }
        for (const char of Array.from(word)) {
          if (font.widthOfTextAtSize(line + char, size) > width && line) {
            result.push(line)
            line = ''
          }
          line += char
        }
      }
      result.push(line)
    }
    return result
  }
  function text(value: string, size = 11, font = body, color = ink, leading = size * 1.55, width = 507) {
    for (const line of lines(value, size, font, width)) {
      if (y - leading < 62) newPage('JATKUU')
      if (line) page.drawText(line, { x: 44, y: y - size, size, font, color })
      y -= leading
    }
  }
  function gap(n = 16) {
    y -= n
  }
  function section(title: string) {
    if (y < 140) newPage('VUODEN ÄÄNET')
    gap(12)
    text(title, 20, heading, ink, 28)
    gap(3)
  }
  newPage('VUOSIKIRJA')
  gap(12)
  text(year, 108, heading, ink, 114)
  text('Tarinoita hyvässä seurassa.', 30, heading, ink, 42)
  gap(10)
  page.drawImage(salon, { x: 0, y: 130, width: 595.28, height: 335 })
  paint(page, 466, 475)
  paint(page, 129, 508)
  y = 103
  text(
    `${data.workCount} teosta  /  ${data.readings.length} lukukertaa  /  ${data.ratingCount} arvosanaa`,
    11,
    body,
    ink,
    18
  )
  if (archive.mode === 'demo')
    text('ESIMERKKIVUOSIKIRJA · kuvitteellisen kirjakerhon aineisto', 9, body, sage, 15)
  newPage('VUOSI YHDESSÄ')
  text('Yhteiset sävelet.', 38, heading, ink, 49)
  gap(9)
  text(
    `${data.workCount} teosta, ${data.readings.length} lukukertaa ja ${data.commentCount} lukijakommenttia.`,
    13,
    body,
    ink,
    22
  )
  text(
    'Arvosanoja verrataan välillä 4–10: alkuperäisen asteikon pienin arvo vastaa nelosta ja suurin kymmentä. Kirjojen sivuilla säilyvät alkuperäiset pisteet ja asteikot.',
    10,
    body,
    sage,
    16
  )
  section('Vuoden suosikit')
  if (!data.favourites.length)
    text('Suosikkivertailuun tarvitaan vähintään kaksi arvosanaa samalta lukukerralta.')
  for (const w of data.favourites) {
    text(`${w.title} — ${format(average(w))} / 10`, 18, heading, ink, 27)
    text(`${w.creator} · ${w.date} · ${w.ratings.length} arvosanaa`, 10, body, sage, 17)
    gap(6)
  }
  section('Ihanat erimielisyydet')
  if (!data.disagreements.length)
    text('Tämän vuoden yhteisissä arvosanoissa ei ole mitattavaa eroa tai arvioita on liian vähän.')
  for (const w of data.disagreements) {
    text(w.title, 18, heading, ink, 27)
    text(
      `${w.date} · keskihajonta ${format(deviation(w), 2)} · ${w.ratings.length} arvosanaa`,
      10,
      body,
      sage,
      17
    )
    gap(6)
  }
  gap(8)
  text(
    'Suosikit järjestetään keskiarvon, erimielisyydet keskihajonnan mukaan. Molempiin tarvitaan vähintään kaksi arvosanaa. Tasatuloksissa säilyy lukukertojen aikajärjestys.',
    9,
    body,
    sage,
    15
  )
  newPage('VUODEN LUKUKERRAT')
  text('Vuoden varrelta.', 36, heading, ink, 49)
  gap(12)
  data.readings.forEach((w, i) => {
    if (y < 135) newPage('VUODEN LUKUKERRAT')
    text(`${String(i + 1).padStart(2, '0')}   ${w.title}`, 19, heading, ink, 28)
    text(`${w.creator || 'Tekijä ei tiedossa'} · ${w.date} · ${format(average(w))} / 10`, 10, body, sage, 18)
    gap(10)
  })
  for (const [index, w] of data.readings.entries()) {
    newPage(`${String(index + 1).padStart(2, '0')} / ${data.readings.length}  ·  ${w.date}`)
    gap(6)
    text(w.title, 36, heading, ink, 45)
    text(w.creator || 'Tekijä ei tiedossa', 15, body, sage, 25)
    gap(13)
    paint(page, y, 280)
    gap(23)
    text(`Yhteinen keskiarvo ${format(average(w))} / 10 · ${w.ratings.length} arvosanaa`, 12, body, ink, 20)
    gap(12)
    for (const m of archive.members) {
      const r = w.ratings.find((r) => r.memberId === m.id),
        review = reviewText(w, m.id)
      if (!r && !review) continue
      if (y < 155) newPage(`${w.title} · kommentit jatkuvat`)
      text(`${m.name}${r ? `   ${format(r.value,2)} / ${r.max}` : '   Ei arvosanaa'}`, 19, heading, ink, 29)
      if (r) text(`Alkuperäinen asteikko ${r.min}–${r.max}`, 9, body, sage, 16)
      if (review) text(review, 11, body, ink, 18)
      else text('Kirjoitettua arviota ei ole.', 10, body, sage, 17)
      gap(20)
    }
    if (includeNotes && w.notes) {
      section('Alkuperäiset muistiinpanot')
      text(w.notes, 10, body, sage, 17)
    }
  }
  if (missing) {
    newPage('MERKKIEN ESITYS')
    text('Harvinaiset merkit.', 30, heading, ink, 40)
    text(
      'Jos kirjasin ei sisällä alkuperäistä merkkiä, se on esitetty Unicode-tunnuksena [U+…]. Alkuperäinen teksti säilyy arkistossa ja JSON-varmuuskopiossa.'
    )
  }
  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    p.drawText('KIRJAKERHON VUOSIKIRJA', { x: 44, y: 29, size: 8, font: body, color: sage })
    p.drawText(`${year}   /   ${i + 1}`, { x: 482, y: 29, size: 9, font: body, color: ink })
  })
  return pdf.save()
}
async function bytes(url: string) {
  const response = await fetch(url)
  if (!response.ok)
    throw new Error('Vuosikirjan aineistoa ei voitu ladata. Avaa sivu verkossa ja yritä uudelleen.')
  return new Uint8Array(await response.arrayBuffer())
}
async function jpeg(url: string) {
  const blob = new Blob([(await bytes(url)) as BlobPart])
  const image = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Kuvan käsittely ei onnistu tässä selaimessa.')
    context.drawImage(image, 0, 0)
    const result = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Kuvan käsittely ei onnistunut.'))),
        'image/jpeg',
        0.9
      )
    )
    return new Uint8Array(await result.arrayBuffer())
  } finally {
    image.close()
  }
}
export async function browserYearbookAssets(): Promise<YearbookAssets> {
  const base = import.meta.env.BASE_URL
  const [body, heading, ground, salon] = await Promise.all([
    bytes(`${base}fonts/font-0.ttf`),
    bytes(`${base}fonts/bodoni-moda-4.ttf`),
    jpeg(new URL('../assets/pigment-ground.webp', import.meta.url).href),
    jpeg(`${base}images/salon-impressionist.webp`)
  ])
  return { body, heading, ground, salon }
}
