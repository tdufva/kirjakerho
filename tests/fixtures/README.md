# Excel-tuonnin vertailuaineisto

`kirjakerho-synthetic.xlsx` on tarkoituksella rakennettu, kuvitteellinen testiaineisto. Se ei ole anonymisoitu kopio käyttäjän oikeasta Excelistä. Odotukset tiedostossa `expected.json` on laskettu riveittäin käsin: 4 teosta, 5 lukukertaa, 6 kelvollista arvosanaa ja 6 kommenttia. Lukija B:llä on vain kommenttisarakkeita. Kirjan kaksi vuosikertaa säilyvät erillään. Arvosana 99 ei kelpaa 1–10-asteikolle; sen kommentti silti tuodaan. Rivi 8 on ilman nimeä ja päätyy tarkistettavaksi. Viimeinen tietorivi on toistettu otsikko. Toinen taulukko alkaa solusta B3, ja Ohjeet-välilehti ei ole mukana.

Testit tarkistavat lisäksi korjauksen, uudelleentuonnin, tyhjän solun molemmat toimintatavat, aiempien tunnisteiden säilymisen, IndexedDB:stä uudelleen avaamisen ja JSON-palautuksen.

Oikean Excelin varmennus tarvitsee erillisen anonymisoidun kopion sekä käsin vahvistetut odotukset. Lisää kopio vain paikalliseen `tmp/`-hakemistoon, älä julkaise yksityistä Exceliä GitHubiin. Sovelluksen tuontinäkymästä voi ladata solukohtaisen täsmäytysraportin vertailua varten.
