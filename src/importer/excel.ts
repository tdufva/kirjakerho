import * as XLSX from 'xlsx'
import { normalize, stableId, workKey, memberColors } from '../domain/model'
import type { Archive, Category, Member, Work, ImportRecord } from '../domain/model'
export type Cell = string | number | boolean | Date | null
export type Role = 'title' | 'creator' | 'date' | 'publicationYear' | 'category' | 'reviewer' | 'rating' | 'review' | 'memberRating' | 'memberReview' | 'location' | 'notes' | 'ignore'
export interface Column { index: number; header: string; role: Role; member?: string; confidence: number }
export interface Sheet { name: string; rows: Cell[][]; headerRow: number; columns: Column[]; enabled: boolean }
export interface Workbook { filename: string; fingerprint: string; sheets: Sheet[] }
export interface Preview { works: Work[]; members: Member[]; issues: string[]; skipped: number; rows: number }
export const roleLabels: Record<Role, string> = { title:'Teoksen nimi', creator:'Tekijä', date:'Luku- tai tapahtumapäivä', publicationYear:'Julkaisuvuosi', category:'Kulttuurilaji', reviewer:'Arvioijan nimi', rating:'Arvosana', review:'Kirjoitettu arvio', memberRating:'Jäsenen arvosana', memberReview:'Jäsenen kirjoitettu arvio', location:'Paikka (alkuperäinen)', notes:'Muistiinpano', ignore:'Säilytä muistiinpanona' }
const patterns: [Role, RegExp][] = [
 ['title', /^(kirja|kirjan nimi|teos|teoksen nimi|nimi|title|book|bok|titel|esitys|näyttely)$/],
 ['creator', /^(kirjailija|tekijä|author|writer|författare|upphov|taiteilija|ohjaaja)$/],
 ['publicationYear', /^(julkaisuvuosi|ilmestymisvuosi|publication year|published|utgivningsår)$/],
 ['date', /^(päivämäärä|pvm|päivä|luettu|vuosi|year|date|datum|läst|luku.*päivä|keskustelu.*)$/],
 ['category', /^(laji|kulttuurilaji|kategoria|category|type|typ|luokka)$/],
 ['reviewer', /^(arvioija|jäsen|henkilö|reviewer|member|person|namn|recensent)$/],
 ['rating', /^(arvosana|arvosanat|pisteet|piste|rating|score|betyg|poäng|arvio\s*\(numero\))$/],
 ['review', /^(arvio|kommentti|kommentit|arvostelu|review|comment|recension|omdöme)$/],
 ['location', /^(paikka|kaupunki|maa|location|country|stad|land)$/],
 ['notes', /^(muistiinpanot|huomiot|notes|anteckningar|lisätiedot)$/]
]
const numeric = (v: Cell): number | null => {
 if (typeof v === 'number') return Number.isFinite(v) ? v : null
 if (typeof v !== 'string' || !/^-?\d+(?:[.,]\d+)?$/.test(v.trim())) return null
 return Number(v.trim().replace(',', '.'))
}
const str = (v: Cell | undefined): string => v == null ? '' : v instanceof Date ? v.toISOString().slice(0,10) : String(v).trim()
function headerScore(row: Cell[]): number {
 const labels = row.map(v => normalize(str(v)))
 return labels.reduce((sum, h) => sum + (patterns.some(([, p]) => p.test(h)) ? 2 : 0), 0) + (labels.some(h=>patterns[0][1].test(h)) ? 5 : 0)
}
export function detectSheet(name: string, rows: Cell[][], forcedHeader?: number): Sheet {
 let headerRow = 0, best = -1
 rows.slice(0,40).forEach((row,i) => {const score = headerScore(row);if(score > best) {best=score;headerRow=i}})
 if(forcedHeader!==undefined)headerRow=forcedHeader
 const headers = rows[headerRow] ?? [], data = rows.slice(headerRow+1).filter(r=>r.some(v=>str(v)))
 const width = Math.max(headers.length, ...data.slice(0,20).map(r=>r.length), 0)
 const columns: Column[] = Array.from({length:width},(_,index)=>{
  const header = str(headers[index]) || `Sarake ${XLSX.utils.encode_col(index)}`, h=normalize(header)
  const recognized = patterns.find(([,p])=>p.test(h))
  if (recognized) return {index,header,role:recognized[0],confidence:.98}
  const values = data.map(r=>r[index] ?? null).filter(v=>str(v) && !patterns.some(([,p])=>p.test(normalize(str(v)))))
  const nums = values.map(numeric).filter((n):n is number=>n!==null)
  const excludes = /keskiarvo|average|medel|yhteensä|summa|sivu|pages|antal|numero|isbn|id|vuosi|year/.test(h)
  if (!excludes && nums.length && nums.length/values.length>=.6 && nums.every(n=>n>=0&&n<=100)) {
   return {index,header,role:'memberRating',member:header.replace(/\s*(arvosana|rating|betyg|pisteet)\s*/gi,'').trim(),confidence:.78}
  }
  if (/kommentti|arvio|review|recension/.test(h)) return {index,header,role:'memberReview',member:header.replace(/kommentti|arvostelu|arvio|review|recension/gi,'').trim(),confidence:.7}
  if (!excludes && values.length>=3 && values.every(v=>typeof v==='string' && str(v).length<40) && new Set(values.map(str)).size<=8 && new Set(values.map(str)).size<values.length*.6) {
   return {index,header,role:'reviewer',confidence:.5}
  }
  return {index,header,role:'ignore',confidence:.25}
 })
 return {name,rows,headerRow,columns,enabled:columns.some(c=>c.role==='title')}
}
export async function readWorkbook(file: File): Promise<Workbook> {
 if (file.size > 20*1024*1024) throw new Error('Valitse alle 20 megatavun tiedosto.')
 const bytes = await file.arrayBuffer()
 const digest = await crypto.subtle.digest('SHA-256',bytes)
 const fingerprint=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('')
 const wb=XLSX.read(bytes,{type:'array',cellDates:true})
 const sheets=wb.SheetNames.map(name=>{
  const ws=wb.Sheets[name]
  // Only propagate cells that Excel explicitly marks as merged.
  for(const merge of ws['!merges']??[]) {
   const first=ws[XLSX.utils.encode_cell(merge.s)]
   if(first) for(let r=merge.s.r;r<=merge.e.r;r++) for(let c=merge.s.c;c<=merge.e.c;c++) {
    const key=XLSX.utils.encode_cell({r,c});if(!ws[key]) ws[key]={...first}
   }
  }
  return detectSheet(name,XLSX.utils.sheet_to_json<Cell[]>(ws,{header:1,defval:null,raw:true}))
 })
 if (!sheets.some(s=>s.rows.length)) throw new Error('Tiedostossa ei ole luettavia rivejä.')
 return {filename:file.name,fingerprint,sheets}
}
export function dateValue(v: Cell): string | undefined {
 if(v instanceof Date && !Number.isNaN(v.getTime())) return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`
 const s=str(v)
 if(/^\d{4}$/.test(s) && +s>=1400 && +s<=2200) return s
 const fi=s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
 const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/)
 const parts=fi ? [+fi[3],+fi[2],+fi[1]] : iso ? [+iso[1],+iso[2],+iso[3]] : null
 if(parts) {
  const [y,m,d]=parts,test=new Date(Date.UTC(y,m-1,d))
  if(test.getUTCFullYear()===y&&test.getUTCMonth()===m-1&&test.getUTCDate()===d) return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
 }
 if(typeof v==='number' && v>10000 && v<100000) {const d=XLSX.SSF.parse_date_code(v);return d?`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`:undefined}
 return undefined
}
function categoryOf(value: string): Category {
 const s=normalize(value)
 if(/teatter|theat|pjäs|esitys/.test(s)) return 'theatre'
 if(/näyttely|exhibit|utställ|museo|konst/.test(s)) return 'exhibition'
 if(/muu|other|övrig|konsertti|concert/.test(s)) return 'other'
 return 'book'
}
export function interpret(wb: Workbook, min: number, max: number): Preview {
 const works=new Map<string,Work>(), members=new Map<string,Member>(), issues:string[]=[]
 let skipped=0, rows=0
 if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min) return {works:[],members:[],issues:['Asteikon ylärajan täytyy olla alarajaa suurempi.'],skipped:0,rows:0}
 function member(name:string):Member {
  const key=normalize(name), existing=members.get(key)
  if(existing) return existing
  const m={id:stableId(`member:${key}`),name:name.trim(),color:memberColors[members.size%4]};members.set(key,m);return m
 }
 for(const sheet of wb.sheets.filter(s=>s.enabled)) {
  const col=(role:Role)=>sheet.columns.find(c=>c.role===role)?.index
  const titleCol=col('title')
  if(titleCol===undefined) {issues.push(`${sheet.name}: valitse teoksen nimen sarake.`);continue}
  for(let ri=sheet.headerRow+1;ri<sheet.rows.length;ri++) {
   const row=sheet.rows[ri];if(!row.some(v=>str(v))) continue
   // Repeated table headings are recognized, rather than imported as works.
   if(normalize(str(row[titleCol]))===normalize(sheet.columns[titleCol].header)) continue
   rows++
   const source=`${sheet.name}, rivi ${ri+1}`
   const get=(role:Role):Cell=>{const c=col(role);return c===undefined?null:(row[c]??null)}
   const title=str(row[titleCol]);if(!title) {issues.push(`${source}: teoksen nimi puuttuu. Rivi säilyy tuontihistoriassa.`);skipped++;continue}
   const creator=str(get('creator')), rawDate=get('date')
   const date=dateValue(rawDate)??(sheet.name.match(/(?:19|20)\d{2}/)?.[0])
   if(str(rawDate)&&!dateValue(rawDate)) issues.push(`${source}: päivämäärää ”${str(rawDate)}” ei tunnistettu.`)
   const category=categoryOf(str(get('category'))||sheet.name)
   const key=workKey({title,creator,category,date}), previous=works.get(key)
   if(previous && previous.date && date && previous.date!==date) issues.push(`${source}: teoksella ”${title}” on eri päiväys (${previous.date} / ${date}). Ensimmäinen säilytetään.`)
   const publicationYear=numeric(get('publicationYear'))??undefined
   const w:Work=previous??{id:stableId(`work:${key}`),title,creator,category,date,publicationYear,themes:[],locations:[],ratings:[],color:memberColors[works.size%4],motif:works.size%6,source}
   const noteCols=sheet.columns.filter(c=>['notes','ignore','location'].includes(c.role))
   const notes=noteCols.filter(c=>str(row[c.index])).map(c=>`${c.header}: ${str(row[c.index])}`).join('\n')
   if(notes) w.notes=[w.notes,notes].filter(Boolean).join('\n')
   const addRating=(name:string,value:Cell,review:string)=>{
    if(!str(value)&&!review) return
    if(!name.trim()) {issues.push(`${source}: arvioijan nimi puuttuu.`);return}
    const m=member(name), n=numeric(value)
    if(n===null && !str(value) && review) {w.reviews=[...(w.reviews??[]),{memberId:m.id,text:review,source}];return}
    if(n===null) {if(str(value)||review) issues.push(`${source}: ${name}, arvosanaa ”${str(value)}” ei voitu lukea. Teksti säilyy muistiinpanoissa.`);w.notes=[w.notes,`${name}: ${str(value)} ${review}`].filter(Boolean).join('\n');return}
    if(n<min||n>max) {issues.push(`${source}: ${name}, arvosana ${n} on asteikon ${min}–${max} ulkopuolella.`);w.notes=[w.notes,`${name}: ${n} (${review})`].filter(Boolean).join('\n');return}
    const existing=w.ratings.find(r=>r.memberId===m.id)
    if(existing) {
     if(existing.value!==n) issues.push(`${source}: ${name} on arvioinut teoksen ”${title}” kahdesti (${existing.value} / ${n}). Ensimmäinen säilytetään.`)
     if(review&&!existing.review) existing.review=review
    } else w.ratings.push({memberId:m.id,value:n,min,max,review:review||undefined,source})
   }
   if(col('reviewer')!==undefined) addRating(str(get('reviewer')),get('rating'),str(get('review')))
   for(const c of sheet.columns.filter(c=>c.role==='memberRating')) {
    const name=c.member??c.header, reviewCol=sheet.columns.find(rc=>rc.role==='memberReview'&&normalize(rc.member??rc.header)===normalize(name))
    addRating(name,row[c.index]??null,reviewCol?str(row[reviewCol.index]):'')
   }
   if(previous&&!sheet.columns.some(c=>c.role==='reviewer')) issues.push(`${source}: teos ”${title}” esiintyy usealla rivillä. Tiedot yhdistettiin.`)
   works.set(key,w)
  }
 }
 return {works:[...works.values()],members:[...members.values()],issues:[...new Set(issues)],skipped,rows}
}
export function mergeArchive(current: Archive, preview: Preview, record: ImportRecord): { archive: Archive; added: number; updated: number; conflicts: string[] } {
 const base=current.mode==='demo'?{...current,works:[],members:[],imports:[]}:current
 const members=[...base.members], ids=new Map<string,string>()
 for(const m of preview.members) {const old=members.find(x=>normalize(x.name)===normalize(m.name));if(old) ids.set(m.id,old.id);else {members.push(m);ids.set(m.id,m.id)}}
 const works=[...base.works], conflicts:string[]=[];let added=0,updated=0
 for(const incoming of preview.works) {
  const candidate={...incoming,ratings:incoming.ratings.map(r=>({...r,memberId:ids.get(r.memberId)??r.memberId}))}
  const index=works.findIndex(w=>workKey(w)===workKey(candidate))
  if(index<0) {works.push(candidate);added++;continue}
  const old=works[index],ratings=[...old.ratings]
  for(const r of candidate.ratings) {const i=ratings.findIndex(x=>x.memberId===r.memberId);if(i<0) ratings.push(r);else {if(ratings[i].value!==r.value||ratings[i].min!==r.min||ratings[i].max!==r.max) conflicts.push(`${old.title}: ${members.find(m=>m.id===r.memberId)?.name}, ${ratings[i].value} → ${r.value}`);ratings[i]={...ratings[i],...r,review:r.review??ratings[i].review}}}
  if(old.date&&candidate.date&&old.date!==candidate.date) conflicts.push(`${old.title}: päiväys ${old.date} → ${candidate.date}`)
  works[index]={...old,...candidate,id:old.id,date:candidate.date??old.date,publicationYear:candidate.publicationYear??old.publicationYear,description:old.description,themes:old.themes,locations:old.locations,period:old.period,annotationSource:old.annotationSource,reviews:[...(old.reviews??[]),...(candidate.reviews??[])].filter((r,i,all)=>all.findIndex(x=>x.memberId===r.memberId&&x.text===r.text)===i),metadata:old.metadata,color:old.color,motif:old.motif,ratings}
  updated++
 }
 return {archive:{version:1,mode:current.mode==='cloud'?'cloud':'local',members,works,imports:[{...record,added,updated},...base.imports]},added,updated,conflicts}
}
