import { appUrl } from './urls'
import { createClient } from '@supabase/supabase-js'
import type { Archive, Member, Work, Rating, ImportRecord, Metadata } from '../domain/model'
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}}):null
export interface Club {id:string;name:string;revision:number;role:'admin'|'member'|'reader'}
export function canManage(role:string|undefined):boolean {return role==='admin'}
export async function listClubs():Promise<Club[]> {
 if(!supabase) return []
 const {data,error}=await supabase.from('club_access').select('role, clubs(id,name,revision)')
 if(error) throw error
 return (data??[]).map(row=>({...row.clubs as unknown as Omit<Club,'role'>,role:row.role}))
}
export async function fetchArchive(clubId:string):Promise<{archive:Archive;revision:number}> {
 if(!supabase) throw new Error('Pilviyhteyttä ei ole määritetty.')
 const results=await Promise.all([
  supabase.from('clubs').select('revision').eq('id',clubId).single(),
  supabase.from('members').select('id,display_name,color').eq('club_id',clubId),
  supabase.from('works').select('id,data,ratings(member_id,value,rating_min,rating_max,review,source),book_metadata(data)').eq('club_id',clubId),
  supabase.from('imports').select('data').eq('club_id',clubId).order('created_at',{ascending:false})
 ])
 for(const r of results) if(r.error) throw r.error
 const members:Member[]=(results[1].data??[]).map((m:any)=>({id:m.id,name:m.display_name,color:m.color}))
 const works:Work[]=(results[2].data??[]).map((w:any)=>({...w.data,id:w.id,ratings:w.ratings.map((r:any):Rating=>({memberId:r.member_id,value:Number(r.value),min:Number(r.rating_min),max:Number(r.rating_max),review:r.review??undefined,source:r.source??undefined})),metadata:w.book_metadata?.[0]?.data as Metadata|undefined}))
 return {archive:{version:1,mode:'cloud',members,works,imports:(results[3].data??[]).map((x:any)=>x.data as ImportRecord)},revision:results[0].data!.revision}
}
export async function saveCloud(archive:Archive,club:Club):Promise<number> {
 if(!supabase||!canManage(club.role)) throw new Error('Vain ylläpitäjä voi päivittää yhteistä arkistoa.')
 const {data,error}=await supabase.rpc('save_archive',{p_club_id:club.id,p_expected_revision:club.revision,p_archive:archive})
 if(error) throw error
 return data as number
}
export async function createClub(name:string):Promise<string> {
 const {data,error}=await supabase!.rpc('create_club',{p_name:name});if(error) throw error;return data
}
export async function createInvitation(clubId:string,email:string,role:'member'|'reader'):Promise<string> {
 const {data,error}=await supabase!.rpc('create_invitation',{p_club_id:clubId,p_email:email,p_role:role});if(error) throw error
 const url=appUrl('/asetukset');url.searchParams.set('invitation',data);return url.toString()
}
export async function acceptInvitation(token:string) {
 const {data,error}=await supabase!.rpc('accept_invitation',{p_token:token});if(error) throw error;return data as string
}
