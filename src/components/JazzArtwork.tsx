const artworks = {
 hero: {
  file: 'salon-impressionist',
  description: 'Impressionistinen maalaus tyhjästä, savuisesta salongista lämpimässä iltavalossa. Pöydällä on Sinuhe egyptiläinen ja muita vanhoja kirjoja.',
  number: '01'
 },
 welcome: {
  file: 'reading-room-impressionist',
  description: 'Impressionistinen maalaus vanhan kirjaston tyhjästä lukusopista, varjoisia kirjahyllyjä ja pöydällä Mika Waltarin Sinuhe egyptiläinen.',
  number: '02'
 }
} as const

export function JazzArtwork({variant='hero'}:{variant?:'hero'|'welcome'}) {
 const base=import.meta.env.BASE_URL,artwork=artworks[variant]
 return <figure className={`jazz-artwork jazz-artwork-${variant}`}>
  <div className="jazz-artwork-frame"><picture>
   <source media="(max-width: 680px)" srcSet={`${base}images/${artwork.file}-small.webp`}/>
   <img src={`${base}images/${artwork.file}.webp`} width="1120" height="1400" alt={artwork.description} fetchPriority="high"/>
  </picture></div>
  <figcaption><span>KIRJOJA, KULTTUURIA & KESKUSTELUJA</span><span>Nº {artwork.number}</span></figcaption>
 </figure>
}
