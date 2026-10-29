import type { Archive, Category, Work } from '../domain/model'
import { stableId, memberColors } from '../domain/model'
const names = ['Aino', 'Matti', 'Leena', 'Pekka']
const members = names.map((name, i) => ({ id: stableId(name), name, color: memberColors[i] }))
type Entry = [string, string, number, string, string[], string, number, number, number[], Category?]
const entries: Entry[] = [
 ['Muumipappa ja meri','Tove Jansson',1965,'2017-03-12',['Yksinäisyys','Perhe'],'Suomi',60.1,24.9,[9,9,10,9]],
 ['Tuntematon sotilas','Väinö Linna',1954,'2017-09-17',['Sota','Yhteiskunta'],'Suomi',61.5,27.3,[8,10,8,9]],
 ['Sivullinen','Albert Camus',1942,'2017-11-19',['Identiteetti','Yksinäisyys'],'Algeria',36.7,3.1,[9,6,8,5]],
 ['Puhdistus','Sofi Oksanen',2008,'2018-02-11',['Muisti','Historia'],'Viro',58.4,26.7,[9,8,9,7]],
 ['Ylpeys ja ennakkoluulo','Jane Austen',1813,'2018-05-20',['Rakkaus','Yhteiskunta'],'Englanti',51.8,-1.2,[10,6,9,7]],
 ['Sadan vuoden yksinäisyys','Gabriel García Márquez',1967,'2018-10-14',['Perhe','Muisti'],'Kolumbia',10.4,-74.4,[9,5,10,6]],
 ['Stoner','John Williams',1965,'2019-02-10',['Elämä','Yksinäisyys'],'Yhdysvallat',38.9,-92.3,[10,9,9,9]],
 ['Kainin perilliset','John Steinbeck',1952,'2019-05-19',['Perhe','Identiteetti'],'Yhdysvallat',36.7,-121.7,[9,9,9,10]],
 ['Kafkan rannalla','Haruki Murakami',2002,'2019-09-15',['Identiteetti','Muisti'],'Japani',34.3,134.0,[9,5,8,4]],
 ['Taikavuori','Thomas Mann',1924,'2019-12-08',['Aika','Yhteiskunta'],'Sveitsi',46.8,9.8,[8,7,9,6]],
 ['Täällä Pohjantähden alla','Väinö Linna',1959,'2020-03-08',['Historia','Yhteiskunta'],'Suomi',61.1,23.8,[9,10,9,10]],
 ['Näkymätön lapsi','Tove Jansson',1962,'2020-06-14',['Identiteetti','Perhe'],'Suomi',60.2,25.0,[9,8,10,8]],
 ['Elämä edessäpäin','Romain Gary',1975,'2020-10-18',['Rakkaus','Yhteiskunta'],'Ranska',48.9,2.4,[10,8,10,9]],
 ['Mestari ja Margarita','Mihail Bulgakov',1967,'2020-12-13',['Rakkaus','Politiikka'],'Venäjä',55.8,37.6,[8,9,9,6]],
 ['Missä kuljimme kerran','Kjell Westö',2006,'2021-02-21',['Historia','Muisti'],'Suomi',60.2,24.9,[9,9,9,8]],
 ['Normaaleja ihmisiä','Sally Rooney',2018,'2021-05-16',['Rakkaus','Identiteetti'],'Irlanti',53.3,-6.3,[9,5,8,4]],
 ['Orlando','Virginia Woolf',1928,'2021-09-12',['Identiteetti','Aika'],'Englanti',51.5,-0.1,[9,6,9,6]],
 ['Isä','Florian Zeller',2012,'2021-11-07',['Perhe','Muisti'],'Ranska',48.8,2.3,[9,8,10,8],'theatre'],
 ['Jäniksen vuosi','Arto Paasilinna',1975,'2022-01-23',['Matka','Vapaus'],'Suomi',66.5,25.7,[8,9,8,9]],
 ['Minun Afrikkani','Karen Blixen',1937,'2022-04-10',['Muisti','Matka'],'Kenia',-1.3,36.8,[9,7,9,7]],
 ['Tyttö, nainen, toinen','Bernardine Evaristo',2019,'2022-09-18',['Identiteetti','Yhteiskunta'],'Englanti',51.5,-0.1,[10,7,9,6]],
 ['Ateneumin kokoelmat','Ateneum',2022,'2022-11-20',['Taide','Historia'],'Suomi',60.2,24.9,[9,8,9,8],'exhibition'],
 ['Isäni ja meri','Patrik Svensson',2019,'2023-02-12',['Perhe','Luonto'],'Ruotsi',55.6,13.0,[9,8,9,8]],
 ['Pieni elämä','Hanya Yanagihara',2015,'2023-05-21',['Ystävyys','Muisti'],'Yhdysvallat',40.7,-74.0,[9,4,8,3]],
 ['Kesäkirja','Tove Jansson',1972,'2023-08-13',['Perhe','Luonto'],'Suomi',60.1,25.8,[10,9,10,9]],
 ['Vanhus ja meri','Ernest Hemingway',1952,'2023-11-19',['Luonto','Yksinäisyys'],'Kuuba',23.1,-82.4,[8,10,7,9]],
 ['Vuosisadan rakkaustarina','Märta Tikkanen',1978,'2024-02-11',['Rakkaus','Perhe'],'Suomi',60.2,24.9,[10,7,9,7]],
 ['Hamlet','William Shakespeare',1603,'2024-04-14',['Perhe','Valta'],'Tanska',56.0,12.6,[8,9,8,9],'theatre'],
 ['Klara ja aurinko','Kazuo Ishiguro',2021,'2024-06-09',['Identiteetti','Rakkaus'],'Yhdysvallat',40.7,-74.0,[9,8,9,7]],
 ['Veden aika','Emmi Itäranta',2022,'2024-09-15',['Luonto','Muisti'],'Suomi',60.2,24.9,[9,6,8,6]],
 ['Yö on hellä','F. Scott Fitzgerald',1934,'2024-12-08',['Rakkaus','Yhteiskunta'],'Ranska',43.6,7.1,[9,7,9,8]],
 ['Myrskyluodon Maija','Anni Blomqvist',1968,'2025-02-16',['Luonto','Perhe'],'Suomi',60.3,20.0,[9,8,9,8]],
 ['Hiljaisuuden historia','Peter Englund',2003,'2025-05-18',['Historia','Yhteiskunta'],'Ruotsi',59.3,18.1,[8,10,8,9]],
 ['Taiteen ja elämän äärellä','HAM',2025,'2025-08-24',['Taide','Muisti'],'Suomi',60.2,24.9,[8,7,9,8],'exhibition'],
 ['Lumi','Orhan Pamuk',2002,'2025-10-19',['Politiikka','Identiteetti'],'Turkki',40.6,43.1,[9,8,9,7]],
 ['Pikku naisia','Louisa May Alcott',1868,'2026-01-18',['Perhe','Ystävyys'],'Yhdysvallat',42.5,-71.3,[9,7,9,7]],
 ['Ystävä','Sigrid Nunez',2018,'2026-04-12',['Ystävyys','Muisti'],'Yhdysvallat',40.7,-74.0,[9,8,10,8]],
 ['Meren äärellä','Abdulrazak Gurnah',2001,'2026-09-20',['Muisti','Matka'],'Tansania',-6.2,39.2,[10,9,9,9]]
]
const colors = ['#752F38','#467773','#C5A04A','#D3B59B','#4B5761','#A46247']
export function demoArchive(): Archive {
 const works: Work[] = entries.map(([title,creator,publicationYear,date,themes,country,lat,lon,ratings,category = 'book'],i) => ({
  id: stableId(`demo:${title}`), title, creator, publicationYear, date, themes, category,
  locations: [{name: country, country,lat,lon,kind:'setting'}],
  period: ({'Tuntematon sotilas':'1939–1945','Ylpeys ja ennakkoluulo':'1800-luvun alku','Täällä Pohjantähden alla':'1880–1950','Stoner':'1900–1950','Puhdistus':'1900-luvun Viro','Missä kuljimme kerran':'1900–1940','Pikku naisia':'1860-luku'} as Record<string,string>)[title],
  description: i === 24 ? 'Kesäinen saari, isoäiti ja lapsi. Pienistä havainnoista kasvaa kokonainen maailma, jossa elämän suuret kysymykset kulkevat kevyesti mukana.' : undefined,
  color: colors[i % colors.length], motif: i % 6,
  ratings: ratings.map((value,j) => ({memberId: members[j].id, value,min:1,max:10, review: i === 24 ? ['Kirja, johon palaan joka kesä. Hiljainen ja täynnä elämää.','Kaikkein pienimmissä hetkissä on suurin viisaus.','Lämmin, tarkka ja valloittava. Täydellinen yhteinen lukukokemus.','Pidin erityisesti sukupolvien välisestä ystävyydestä.'][j] : undefined}))
 }))
 return {version:1,mode:'demo', members, works, imports:[]}
}
