export function JazzArtwork({variant='hero'}:{variant?:'hero'|'welcome'}) {
 const base=import.meta.env.BASE_URL
 return <figure className={`jazz-artwork jazz-artwork-${variant}`}>
  <div className="jazz-artwork-frame"><picture>
   <source media="(max-width: 680px)" srcSet={`${base}images/jazz-club-1928-small.webp`}/>
   <img src={`${base}images/jazz-club-1928.webp`} width="1120" height="1400" alt="Litografiatyylinen kuvitus 1920-luvun jazzklubista: yhtye soittaa lämpimässä valossa, savu leijailee pöytien yllä." fetchPriority="high"/>
  </picture></div>
  <figcaption><span>KIRJOJA, KULTTUURIA & KESKUSTELUJA</span><span>Nº 01</span></figcaption>
 </figure>
}
