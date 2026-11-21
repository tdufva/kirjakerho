import { Link } from 'react-router-dom'
import { Smartphone, Share, PlusSquare, ArrowUpRight, BookOpen } from 'lucide-react'
import { useArchive } from '../services/store'
import { readingViews } from '../domain/readings'
import { format } from '../domain/statistics'
export function SettingsPage() {
  const { archive } = useArchive(),
    info = archive.dataset!,
    books = readingViews(archive.works).filter((w) => w.category === 'book')
  const matched = books.filter((w) => w.metadata),
    themes = books.filter((w) => w.themes.length),
    countries = books.filter((w) => w.locations.some((l) => l.kind === 'subject'))
  return (
    <div className="page settings-page">
      <div className="page-top">
        <div>
          <p className="eyebrow">KULTTUURIKERHO 1994–2024</p>
          <h1>
            Yhteinen <em>muistimme.</em>
          </h1>
        </div>
      </div>
      <div className="settings-columns">
        <div>
          <section className="settings-section">
            <h2>
              <BookOpen size={25} />
              Arkiston lähde
            </h2>
            <p>
              Kulttuurikerhon alkuperäinen Numbers-taulukko avautuu tässä suoraan. Jokainen kokousnumero 1–252
              on mukana kerran. Parhaiden ja heikoimpien listojen 20 kopiota eivät kasvata tapaamisten määrää.
            </p>
            <dl>
              <div>
                <dt>Aineisto</dt>
                <dd>{info.filename}</dd>
              </div>
              <div>
                <dt>Ajanjakso</dt>
                <dd>7.10.1994–14.9.2024</dd>
              </div>
              <div>
                <dt>Tapaamiset</dt>
                <dd>{info.meetings}</dd>
              </div>
              <div>
                <dt>Kirjamerkinnät</dt>
                <dd>{books.length}</dd>
              </div>
              <div>
                <dt>Muut kulttuuritapaamiset</dt>
                <dd>{info.meetings - books.length}</dd>
              </div>
              <div>
                <dt>Arvosanat</dt>
                <dd>{info.ratings}</dd>
              </div>
              <div>
                <dt>Kirjatut sivut</dt>
                <dd>{format(info.recordedPages, 0)}</dd>
              </div>
            </dl>
            <p>
              Tiina (T), Hilkka (H), Erkki (E) ja Jouko (J) arvioivat asteikolla 4–10. Yhteinen arvosana on
              annettujen pisteiden keskiarvo samalla asteikolla. Yht.-sarakkeen summat säilyvät teosten
              lähdetiedoissa. Kolme arvioimatonta tapaamista eivät laske keskiarvoa.
            </p>
            <p className="small-note">
              Kahdessa lähdemerkinnässä (tapaamiset 91 ja 99) on vain vuosiluku. Päivää tai kuukautta ei ole
              keksitty. Sivusumma kattaa 206 merkintää; Sotakummilapsen sivumäärä puuttuu alkuperäisestä.
            </p>
            <Link className="settings-row" to="/oivallukset">
              <span>
                Oivallukset ja jakokuvat<small>Suosikit, piste-erot ja yhteiset sävelet.</small>
              </span>
              <ArrowUpRight size={20} />
            </Link>
            <Link className="settings-row" to="/vuosikirja">
              <span>
                Kirjakerhon vuosikirja<small>Valitse vuosi ja tallenna PDF.</small>
              </span>
              <ArrowUpRight size={20} />
            </Link>
          </section>
          <section className="settings-section">
            <h2>Kirjojen taustatiedot</h2>
            <p>
              {matched.length}/{books.length} kirjamerkintää on yhdistetty Finnan tai Open Libraryn
              kirjastotietueeseen. Teemoja on {themes.length} kirjassa ja kirjaston aiheen maita{' '}
              {countries.length} kirjassa.
            </p>
            <p>
              Jokaisen kirjan sivulla on linkki käytettyyn lähdetietueeseen. Julkaisuvuosi tarkoittaa valitun
              kirjastopainoksen vuotta. Se ei välttämättä ole teoksen alkuperäinen ilmestymisvuosi. Kuuden
              kirjan niukkoja asiasanoja on täydennetty teossivuilla mainituista lähteistä. Kirjaston
              asiasanat eivät aina kuvaa tarinan tapahtumapaikkaa; maat näytetään siksi kartalla omana
              lajinaan.
            </p>
            <p className="small-note">
              Tarkistettu {info.metadataCheckedAt}. Kirjailija- ja nimikirjoitusasuja on korjattu
              tunnistamista varten. Alkuperäiset nimisarakkeet näkyvät teossivulla.
            </p>
            {matched.length < books.length && (
              <details>
                <summary>Ilman varmistettua kirjastovastaavuutta ({books.length - matched.length})</summary>
                {books
                  .filter((w) => !w.metadata)
                  .map((w) => (
                    <p key={w.id}>
                      <Link to={`/teos/${w.workId}`}>
                        {w.title} · {w.creator}
                      </Link>
                    </p>
                  ))}
              </details>
            )}
            <details>
              <summary>Lähteen erityistapaukset</summary>
              {info.issues.map((x) => (
                <p key={x.meeting}>
                  Tapaaminen {x.meeting}: {x.message}
                </p>
              ))}
            </details>
          </section>
        </div>
        <section className="install-panel">
          <span className="install-symbol">
            <Smartphone size={42} strokeWidth={1.4} />
          </span>
          <p className="eyebrow">ATLAS KULKEE MUKANA</p>
          <h2>
            Oma paikka
            <br />
            <em>kotinäytöllä.</em>
          </h2>
          <p>
            Lisää Kirjakerhon Atlas puhelimeen. Arkisto on luettavissa ilman verkkoa, kun sovellus on ehtinyt
            tallentua ensimmäisellä avauskerralla.
          </p>
          <h3>iPhone ja iPad</h3>
          <ol>
            <li>
              <span>1</span>Avaa sovellus Safarissa.
            </li>
            <li>
              <span>2</span>Napauta Jaa-painiketta.
              <Share size={20} />
            </li>
            <li>
              <span>3</span>Valitse ”Lisää Koti-valikkoon”.
              <PlusSquare size={20} />
            </li>
            <li>
              <span>4</span>Vahvista valitsemalla ”Lisää”.
            </li>
          </ol>
          <details>
            <summary>Android ja tietokone</summary>
            <p>
              Chromessa ja Edgessä avaa selaimen valikko ja valitse sovelluksen asennus tai lisääminen
              aloitusnäyttöön. Voit käyttää myös osoiterivin asennuskuvaketta.
            </p>
          </details>
          <p className="small-note">
            Kirjaston ulkoiset linkit ja kansikuvat tarvitsevat verkkoyhteyden. Arkisto ja analyysit ovat
            mukana sovelluksessa.
          </p>
        </section>
      </div>
    </div>
  )
}
