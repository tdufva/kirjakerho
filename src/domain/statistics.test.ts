import { describe,it,expect } from 'vitest'
import { average,deviation,correlation,score,sharedPairs } from './statistics'
import { normalize,stableId,workKey,type Work } from './model'
const work=(values:number[]):Work=>({id:'a',title:'A',creator:'B',category:'book',themes:[],locations:[],color:'#fff',motif:0,ratings:values.map((value,i)=>({memberId:String(i),value,min:0,max:10}))})
describe('honest statistics',()=>{
 it('keeps missing ratings missing instead of treating them as zero',()=>{expect(average(work([]))).toBeNull();expect(average(work([8,10]))).toBe(9)})
 it('normalizes arbitrary original scales using both endpoints',()=>{expect(score({memberId:'a',value:3,min:1,max:5})).toBe(5);expect(score({memberId:'a',value:0,min:0,max:100})).toBe(0)})
 it('uses population standard deviation and rejects single ratings',()=>{expect(deviation(work([2,4]))).toBe(1);expect(deviation(work([8]))).toBeNull()})
 it('computes Pearson correlation and absolute mean difference',()=>{expect(correlation([[1,2],[2,4],[3,6]])).toEqual({r:1,n:3,difference:2});expect(correlation([[1,6],[2,4],[3,2]]).r).toBe(-1)})
 it('does not report a coefficient for too few samples or no variation',()=>{expect(correlation([[1,2],[2,3]]).r).toBeNull();expect(correlation([[1,2],[1,3],[1,4]]).r).toBeNull()})
 it('compares only paired observations',()=>{expect(sharedPairs([work([4,6]),work([8])],'0','1')).toEqual([[4,6]])})
})
describe('stable matching',()=>{
 it('normalizes Unicode, punctuation and whitespace',()=>expect(normalize('  KESÄKIRJA—  Tove! ')).toBe('kesäkirja tove'))
 it('keeps IDs stable and includes cultural category',()=>{expect(stableId('a')).toBe(stableId('a'));expect(stableId('a')).not.toBe(stableId('b'));expect(workKey(work([]))).not.toBe(workKey({...work([]),category:'theatre'}))})
 it('does not use changing discussion dates as a book identity',()=>expect(workKey({...work([]),date:'2020-01-01'})).toBe(workKey({...work([]),date:'2021-01-01'})))
})
