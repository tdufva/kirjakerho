import 'fake-indexeddb/auto'
import { it,expect } from 'vitest'
import { loadCache,saveCache,recovery,removeCache,saveClubIndex,loadClubIndex,clearUserCache } from './cache'
import { demoArchive } from '../data/demo'
it('persists offline snapshots, isolates users and retains one recovery point',async()=>{const a=demoArchive();await saveCache(a,'user-a');const b={...a,works:a.works.slice(0,2)};await saveCache(b,'user-a');expect((await loadCache('user-a'))?.works).toHaveLength(2);expect((await recovery('user-a'))?.works).toHaveLength(38);expect(await loadCache('user-b')).toBeUndefined();await removeCache('user-a');expect(await loadCache('user-a')).toBeUndefined();expect(await recovery('user-a')).toBeUndefined()})

it('removes every cached club and recovery point for a signed-out user only',async()=>{const a=demoArchive();await saveCache(a,'alpha:club1');await saveCache(a,'alpha:club2');await saveCache(a,'beta:club1');await saveClubIndex('alpha',[{id:'club1',name:'A',revision:1,role:'admin'}]);expect(await loadClubIndex('alpha')).toHaveLength(1);await clearUserCache('alpha');expect(await loadCache('alpha:club1')).toBeUndefined();expect(await loadCache('alpha:club2')).toBeUndefined();expect(await loadClubIndex('alpha')).toEqual([]);expect(await loadCache('beta:club1')).toBeDefined()})
