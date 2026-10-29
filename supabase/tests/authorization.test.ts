import { beforeAll,afterAll,it,expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { demoArchive } from '../../src/data/demo'
let db:PGlite,clubA:string,clubB:string
const owner='00000000-0000-4000-a000-000000000001',other='00000000-0000-4000-a000-000000000002',member='00000000-0000-4000-a000-000000000003'
const sample=demoArchive();sample.mode='cloud';sample.works=sample.works.slice(0,2)
async function login(id:string,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`)}
async function save(club:string,revision:number,archive:unknown=sample){return db.query('select public.save_archive($1,$2,$3::jsonb) as revision',[club,revision,JSON.stringify(archive)])}
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;create publication supabase_realtime;`)
 for(const [id,email] of [[owner,'owner@example.test'],[other,'other@example.test'],[member,'member@example.test']])await db.query('insert into auth.users values($1,$2,now())',[id,email])
 await db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'))
 await login(owner);clubA=(await db.query<{id:string}>("select public.create_club('A') as id")).rows[0].id
 await login(other);clubB=(await db.query<{id:string}>("select public.create_club('B') as id")).rows[0].id
})
afterAll(async()=>{await db.close()})
it('allows authenticated creation and scopes club reads to membership',async()=>{await login(owner);expect((await db.query('select * from public.clubs')).rows).toHaveLength(1);expect((await db.query('select * from public.club_access')).rows).toHaveLength(1)})
it('blocks self-granted memberships and direct archive writes',async()=>{await login(other);await expect(db.query("insert into public.club_access values($1,$2,'admin')",[clubA,other])).rejects.toThrow(/permission denied/);await expect(db.query('delete from public.works where club_id=$1',[clubA])).rejects.toThrow(/permission denied/)})
it('blocks nonmembers from administrative RPCs',async()=>{await login(other);await expect(save(clubA,0)).rejects.toThrow('admin_required');await expect(db.query("select public.create_invitation($1,'a@example.test','member')",[clubA])).rejects.toThrow('admin_required')})
it('saves relational works and ratings atomically, keeping stable IDs across clubs',async()=>{await login(owner);await save(clubA,0);expect((await db.query('select * from public.works')).rows).toHaveLength(2);expect((await db.query('select * from public.ratings')).rows).toHaveLength(8);await login(other);await save(clubB,0);expect((await db.query('select * from public.works')).rows).toHaveLength(2)})
it('rejects stale revisions without clobbering a newer archive',async()=>{await login(owner);await expect(save(clubA,0)).rejects.toThrow('revision_conflict');expect((await db.query<{revision:number}>('select revision from public.clubs')).rows[0].revision).toBe(1)})
it('rolls back every change if a rating is outside its original scale',async()=>{await login(owner);const invalid=structuredClone(sample);invalid.works[0].ratings[0].value=100;await expect(save(clubA,1,invalid)).rejects.toThrow(/check constraint/);expect((await db.query('select * from public.works')).rows).toHaveLength(2);expect((await db.query('select * from public.ratings')).rows).toHaveLength(8);expect((await db.query<{revision:number}>('select revision from public.clubs')).rows[0].revision).toBe(1)})
it('binds invitations to a verified email and consumes them only once',async()=>{await login(owner);const token=(await db.query<{token:string}>("select public.create_invitation($1,'member@example.test','reader') as token",[clubA])).rows[0].token;await login(other);await expect(db.query('select public.accept_invitation($1)',[token])).rejects.toThrow('invalid_invitation');await login(member);await db.query('select public.accept_invitation($1)',[token]);expect((await db.query('select * from public.works')).rows).toHaveLength(2);await expect(db.query('select public.accept_invitation($1)',[token])).rejects.toThrow('invalid_invitation');await expect(save(clubA,1)).rejects.toThrow('admin_required')})
it('blocks anonymous reads and function execution',async()=>{await login('','anon');await expect(db.query('select * from public.works')).rejects.toThrow(/permission denied/);await expect(db.query("select public.create_club('anonymous')")).rejects.toThrow(/permission denied/)})
