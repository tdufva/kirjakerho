// Country-level centroids for manually selected places and sourced catalogue subjects.
export const places = [
 ['Suomi',64,26],['Ruotsi',62,15],['Norja',64,10],['Tanska',56,10],['Islanti',65,-19],
 ['Englanti',52,-1],['Irlanti',53,-8],['Ranska',47,2],['Saksa',51,10],['Espanja',40,-4],['Italia',43,12],
 ['Viro',59,26],['Venäjä',60,90],['Turkki',39,35],['Japani',36,138],['Kiina',35,105],['Intia',22,79],
 ['Yhdysvallat',39,-98],['Kanada',57,-106],['Meksiko',23,-102],['Kolumbia',4,-73],['Brasilia',-10,-52],
 ['Argentiina',-35,-65],['Australia',-25,134],['Etelä-Afrikka',-29,25],['Kenia',0,38],['Tansania',-6,35],
 ['Egypti',27,30],['Algeria',28,3],['Kuuba',22,-80],['Portugali',40,-8],['Kreikka',39,22],['Puola',52,20],
 ['Syyria',35,38],['Israel',31,35],['Palestiina',32,35],['Iran',32,54],['Irak',33,44],
 ['Yhdistynyt kuningaskunta',55,-3],['Uusi-Seelanti',-41,174],['Etelä-Korea',36,128],['Nigeria',9,8],
 ['Afganistan',34,66],['Pakistan',30,69],['Bangladesh',24,90],['Sri Lanka',8,81],['Chile',-33,-71],
 ['Peru',-10,-76],['Porto Rico',18,-66],['Vietnam',16,108],['Thaimaa',15,101],
 ['Sveitsi',47,8],['Alankomaat',52,5],['Belgia',51,4],['Ukraina',49,32],['Unkari',47,19],['Tšekki',50,15]
].map(([name,lat,lon])=>({name:String(name),country:String(name),lat:Number(lat),lon:Number(lon)})).sort((a,b)=>a.name.localeCompare(b.name,'fi'))
