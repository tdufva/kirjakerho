import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { demoArchive } from '../data/demo'
import type { Archive, Work } from '../domain/model'
import { loadCache, saveCache, recovery, saveClubIndex, loadClubIndex, clearUserCache } from './cache'
import { supabase, listClubs, fetchArchive, saveCloud, type Club } from './cloud'
interface State {archive:Archive;ready:boolean;busy:boolean;user:User|null;clubs:Club[];club:Club|null;online:boolean;notice:string;setNotice:(s:string)=>void;save:(a:Archive)=>Promise<void>;restore:()=>Promise<void>;selectClub:(c:Club)=>Promise<void>;refreshClubs:()=>Promise<void>;updateWork:(w:Work)=>Promise<void>;signOut:()=>Promise<void>;useLocal:()=>Promise<void>}
const Context=createContext<State>(null!)
export const useArchive=()=>useContext(Context)
export function ArchiveProvider({children}:{children:ReactNode}) {
 const [archive,setArchive]=useState<Archive>(demoArchive),[ready,setReady]=useState(false),[busy,setBusy]=useState(false)
 const [user,setUser]=useState<User|null>(null),[clubs,setClubs]=useState<Club[]>([]),[club,setClub]=useState<Club|null>(null),[online,setOnline]=useState(navigator.onLine),[notice,setNotice]=useState('')
 const current=useRef({archive,club,user});current.current={archive,club,user}
 const cacheKey=()=>current.current.club&&current.current.user?`${current.current.user.id}:${current.current.club.id}`:'local'
 const cloudEpoch=useRef(0)
 async function refreshClubs(){if(!supabase)return;const uid=current.current.user?.id;if(!uid)return;try{const rows=await listClubs();await saveClubIndex(uid,rows);setClubs(rows)}catch(e){const cached=await loadClubIndex(uid);if(cached.length)setClubs(cached);else throw e}}
 async function selectClub(c:Club) {
  const epoch=++cloudEpoch.current;setBusy(true)
  try {
   const key=`${current.current.user?.id}:${c.id}`
   const cached=await loadCache(key);if(cached&&epoch===cloudEpoch.current) {setArchive(cached);setClub(c)}
   if(!navigator.onLine&&cached)return
   const data=await fetchArchive(c.id)
   if(epoch!==cloudEpoch.current) return
   setArchive(data.archive);setClub({...c,revision:data.revision});await saveCache(data.archive,key,false)
  } catch {setNotice('Yhteistä arkistoa ei voitu päivittää. Voit lukea aiemmin tallennettua versiota.')} finally {if(epoch===cloudEpoch.current)setBusy(false)}
 }
 async function save(a:Archive) {
  if(busy) throw new Error('Odota edellisen tallennuksen valmistumista.')
  setBusy(true)
  try {
   const c=current.current.club
   if(c) {
    if(!navigator.onLine) throw new Error('Yhteisen arkiston tallentaminen tarvitsee verkkoyhteyden.')
    const revision=await saveCloud({...a,mode:'cloud'},c)
    a={...a,mode:'cloud'};setClub({...c,revision})
   }
   if(c){try{await saveCache(a,cacheKey())}catch{setNotice('Arkisto tallennettiin pilveen. Tämän laitteen offline-kopiota ei voitu tallentaa.')}}else await saveCache(a,cacheKey());setArchive(a)
  } finally {setBusy(false)}
 }
 async function restore() {const previous=await recovery(cacheKey());if(!previous)throw new Error('Palautettavaa versiota ei vielä ole.');await save(previous);setNotice('Edellinen paikallisesti tallennettu versio palautettiin.')}
 async function useLocal() {++cloudEpoch.current;setClub(null);setArchive(await loadCache()??demoArchive());setNotice('Paikallinen arkisto avattu.')}
 async function signOut() {const uid=current.current.user?.id;++cloudEpoch.current;await supabase?.auth.signOut();if(uid)await clearUserCache(uid);setClub(null);setClubs([]);setUser(null);setArchive(await loadCache()??demoArchive())}
 useEffect(()=>{
  loadCache().then(a=>{if(a)setArchive(a)}).catch(()=>setNotice('Selaimen tallennustila ei ole käytettävissä.')).finally(()=>setReady(true))
  const on=()=>setOnline(true),off=()=>setOnline(false);window.addEventListener('online',on);window.addEventListener('offline',off)
  const {data}=supabase?.auth.onAuthStateChange((_event,session)=>{setUser(session?.user??null);if(!session){++cloudEpoch.current;setClub(null);setClubs([]);loadCache().then(a=>setArchive(a??demoArchive()))}else {setTimeout(()=>refreshClubs().catch(()=>setNotice('Kirjakerhoja ei voitu hakea.')),0)}})??{data:null}
  return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off);data?.subscription.unsubscribe()}
 },[])
 useEffect(()=>{if(clubs.length&&!club)void selectClub(clubs[0])},[clubs])
 useEffect(()=>{
  if(!club||!supabase)return
  const id=club.id
  const refresh=()=>{if(!current.current.club||current.current.club.id!==id)return;void selectClub(current.current.club)}
  const channel=supabase.channel(`club:${id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'clubs',filter:`id=eq.${id}`},refresh).subscribe()
  const focus=()=>{if(navigator.onLine)refresh()}
  const timer=setInterval(focus,60000);window.addEventListener('focus',focus);window.addEventListener('online',focus)
  return()=>{void supabase!.removeChannel(channel);clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('online',focus)}
 },[club?.id])
 return <Context.Provider value={{archive,ready,busy,user,clubs,club,online,notice,setNotice,save,restore,selectClub,refreshClubs,updateWork:w=>save({...archive,works:archive.works.map(x=>x.id===w.id?w:x)}),signOut,useLocal}}>{children}</Context.Provider>
}
