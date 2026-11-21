import type { Catalogue } from '../domain/catalogue'
import { findFinna } from './finna'
import type { Metadata, Work } from '../domain/model'
import { normalize } from '../domain/model'
export interface MetadataCandidate {title:string;creator:string;metadata:Metadata;catalogue?:Catalogue}
const similarity=(a:string,b:string):number=>{
 const aa=new Set(normalize(a).split(' ')),bb=new Set(normalize(b).split(' '))
 return [...aa].filter(x=>bb.has(x)).length/Math.max(aa.size,bb.size,1)
}
const confidence=(work:Work,title:string,creator:string)=>similarity(work.title,title)*.75+(work.creator?similarity(work.creator,creator)*.25:0)
export async function findMetadata(work:Work,source:'Finna'|'Open Library'|'Google Books'):Promise<MetadataCandidate[]> {
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000)
 try {
  const options={signal:controller.signal}
  const retrievedAt=new Date().toISOString()
  if(source==='Finna') return (await findFinna(work)).slice(0,5)
  if(source==='Open Library') {
   const q=new URLSearchParams({title:work.title,author:work.creator,limit:'5'})
   const res=await fetch(`https://openlibrary.org/search.json?${q}`,options);if(!res.ok) throw new Error('Open Library ei vastannut.')
   const json=await res.json()
   return (json.docs??[]).map((r:any)=>{const creator=r.author_name?.join(', ')??'';return {title:r.title,creator,metadata:{source,retrievedAt,confidence:confidence(work,r.title,creator),externalId:r.key,publicationYear:r.first_publish_year,subjects:r.subject?.slice(0,12),cover:r.cover_i?`https://covers.openlibrary.org/b/id/${r.cover_i}-M.jpg`:undefined,url:`https://openlibrary.org${r.key}`}}})
  }
  const q=new URLSearchParams({q:`intitle:${work.title} inauthor:${work.creator}`,maxResults:'5'})
  const res=await fetch(`https://www.googleapis.com/books/v1/volumes?${q}`,options);if(!res.ok) throw new Error('Google Books ei vastannut.')
  const json=await res.json()
  return (json.items??[]).map((r:any)=>{const v=r.volumeInfo,creator=v.authors?.join(', ')??'';return {title:v.title,creator,metadata:{source,retrievedAt,confidence:confidence(work,v.title,creator),externalId:r.id,publicationYear:Number(v.publishedDate?.slice(0,4))||undefined,description:v.description,cover:v.imageLinks?.thumbnail?.replace('http:','https:'),subjects:v.categories,url:v.infoLink?.replace('http:','https:')??`https://books.google.com/books?id=${r.id}`}}})
 } finally {clearTimeout(timeout)}
}
