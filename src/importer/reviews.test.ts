import { it,expect } from 'vitest'
import { detectSheet,interpret } from './excel'
it('preserves written reviews without inventing a missing numerical rating',()=>{const p=interpret({filename:'reviews.xlsx',fingerprint:'a',sheets:[detectSheet('Kirjat',[['Kirja','Arvioija','Arvosana','Kommentti'],['Kesäkirja','Matti',null,'Kaunis kirja.']])]},1,10);expect(p.members).toHaveLength(1);expect(p.works[0].ratings).toHaveLength(0);expect(p.works[0].reviews?.[0].text).toBe('Kaunis kirja.')})
