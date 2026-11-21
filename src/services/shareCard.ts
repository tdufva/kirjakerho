import type { Insight } from '../domain/insights'
/** A local, self-contained sharing image: no scores are sent to a rendering service. */
export async function insightPng(card: Insight, period: string): Promise<Blob> {
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 1500
  const c = canvas.getContext('2d')!
  const lineCount = (text: string, font: string, width: number) => {
    c.font = font
    let count = 1,
      row = ''
    for (const word of text.split(/\s+/)) {
      const next = row ? row + ' ' + word : word
      if (c.measureText(next).width > width && row) {
        count++
        row = word
      } else row = next
    }
    return count
  }
  const needed =
    325 +
    lineCount(card.title, '500 66px "Bodoni Moda",Georgia,serif', 1040) * 80 +
    210 +
    lineCount(card.unit, '400 31px "DM Sans",sans-serif', 1040) * 44 +
    35 +
    lineCount(card.body, '400 32px "DM Sans",sans-serif', 1040) * 48 +
    100 +
    lineCount(card.method, '400 23px "DM Sans",sans-serif', 1040) * 33 +
    180
  canvas.height = Math.max(1500, needed)
  const gradient = c.createLinearGradient(0, 0, 1200, canvas.height)
  gradient.addColorStop(0, '#1c201a')
  gradient.addColorStop(0.5, '#30231c')
  gradient.addColorStop(1, '#171a16')
  c.fillStyle = gradient
  c.fillRect(0, 0, 1200, canvas.height)
  // Broad irregular strokes echo the archive's painted surfaces.
  for (let i = 0; i < 70; i++) {
    c.strokeStyle = i % 2 ? '#a5ab8709' : '#bc643809'
    c.lineWidth = 30 + (i % 19)
    c.beginPath()
    c.moveTo(-80, (i * 137) % canvas.height)
    c.bezierCurveTo(
      250,
      ((i * 137) % canvas.height) - 90,
      820,
      ((i * 137) % canvas.height) + 120,
      1290,
      ((i * 137) % canvas.height) - 40
    )
    c.stroke()
  }
  c.fillStyle = '#d4a375'
  c.fillRect(80, 150, 180, 10)
  c.fillStyle = '#d7c8b5'
  c.font = '500 23px "DM Sans",sans-serif'
  c.fillText('KIRJAKERHON ATLAS', 80, 100)
  c.fillText(period, 80, canvas.height - 80)
  const wrap = (text: string, x: number, y: number, width: number, line: number) => {
    let row = ''
    for (const word of text.split(/\s+/)) {
      const next = row ? row + ' ' + word : word
      if (c.measureText(next).width > width && row) {
        c.fillText(row, x, y)
        y += line
        row = word
      } else row = next
    }
    if (row) c.fillText(row, x, y)
    return y + line
  }
  c.fillStyle = '#b9c09b'
  c.font = '500 24px "DM Sans",sans-serif'
  c.fillText(card.kicker, 80, 225)
  c.fillStyle = '#f3eadd'
  c.font = '500 66px "Bodoni Moda",Georgia,serif'
  let y = wrap(card.title, 80, 325, 1040, 80)
  c.fillStyle = '#d2aa79'
  c.font = '500 140px "Bodoni Moda",Georgia,serif'
  c.fillText(card.value, 80, y + 145)
  y += 210
  c.fillStyle = '#d7c8b5'
  c.font = '400 31px "DM Sans",sans-serif'
  y = wrap(card.unit, 80, y, 1040, 44) + 35
  c.fillStyle = '#f3eadd'
  c.font = '400 32px "DM Sans",sans-serif'
  y = wrap(card.body, 80, y, 1040, 48) + 45
  c.strokeStyle = '#a5ab87'
  c.lineWidth = 6
  c.beginPath()
  c.moveTo(80, y)
  c.quadraticCurveTo(650, y + 10, 1110, y - 4)
  c.stroke()
  c.fillStyle = '#bcaf9e'
  c.font = '400 23px "DM Sans",sans-serif'
  wrap(card.method, 80, y + 55, 1040, 33)
  c.fillStyle = '#d7c8b5'
  c.font = '400 22px "DM Sans",sans-serif'
  c.fillText('Lähde: Kulttuurikerho.numbers · asteikko 4–10', 80, canvas.height - 135)
  c.fillText('tdufva.github.io/kirjakerho', 80, canvas.height - 43)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Kuvan tallennus ei onnistunut.'))), 'image/png')
  )
}
