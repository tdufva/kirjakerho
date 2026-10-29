import { openDB } from 'idb'
import type { Archive } from '../domain/model'
const database = () => openDB('kirjakerhon-atlas', 1, { upgrade(db) { db.createObjectStore('archives'); db.createObjectStore('recovery') } })
export async function loadCache(key='local'):Promise<Archive|undefined> { return (await database()).get('archives',key) }
export async function saveCache(archive:Archive,key='local',backup=true) {
 const db=await database(),tx=db.transaction(['archives','recovery'],'readwrite')
 if(backup) {const previous=await tx.objectStore('archives').get(key);if(previous) await tx.objectStore('recovery').put(previous,key)}
 await tx.objectStore('archives').put(archive,key);await tx.done
}
export async function recovery(key='local'):Promise<Archive|undefined> {return (await database()).get('recovery',key)}
export async function removeCache(key:string) {const db=await database();const tx=db.transaction(['archives','recovery'],'readwrite');await tx.objectStore('archives').delete(key);await tx.objectStore('recovery').delete(key);await tx.done}
export interface CachedClub {id:string;name:string;revision:number;role:'admin'|'member'|'reader'}
export async function saveClubIndex(userId:string,clubs:CachedClub[]) {await (await database()).put('archives',clubs,`clubs:${userId}`)}
export async function loadClubIndex(userId:string):Promise<CachedClub[]> {return await (await database()).get('archives',`clubs:${userId}`)??[]}
export async function clearUserCache(userId:string) {const db=await database(),tx=db.transaction(['archives','recovery'],'readwrite');for(const store of ['archives','recovery'] as const){const os=tx.objectStore(store);for(const key of await os.getAllKeys())if(String(key).startsWith(`${userId}:`)||key===`clubs:${userId}`)await os.delete(key)}await tx.done}
