import { useEffect } from 'react'
import { NavLink,Link,Outlet,useLocation } from 'react-router-dom'
import { BookOpen,Compass,Heart,Home,Settings,Upload,WifiOff,X,ArrowUpRight } from 'lucide-react'
import { useArchive } from '../services/store'
import { canManage } from '../services/cloud'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { fi } from '../locales/fi'
const links=[['/','home',Home],['/arkisto','archive',BookOpen],['/atlas','atlas',Compass],['/maku','taste',Heart]] as const
export function Layout() {
 const {archive,club,notice,setNotice,online}=useArchive(),location=useLocation()
 const {needRefresh:[needRefresh],updateServiceWorker}=useRegisterSW()
 useEffect(()=>{window.scrollTo(0,0);const titles:Record<string,string>={'/':'Etusivu','/arkisto':'Arkisto','/atlas':'Atlas','/maku':'Meidän makumme','/tuonti':'Tuo Excel','/asetukset':'Asetukset'};document.title=`${titles[location.pathname]??'Teos'} — Kirjakerhon Atlas`},[location.pathname])
 async function activateUpdate(){try{const registration=await navigator.serviceWorker.getRegistration();if(registration?.waiting){navigator.serviceWorker.addEventListener('controllerchange',()=>window.location.reload(),{once:true});registration.waiting.postMessage({type:'SKIP_WAITING'})}else{await updateServiceWorker(true);window.location.reload()}}catch{setNotice('Sovelluksen päivitys ei onnistunut. Sulje Atlas ja avaa se uudelleen.')}}
 return <div className="app-shell"><a className="skip-link" href="#content">Siirry sisältöön</a>
  <header className="site-header"><Link to="/" className="brand" aria-label="Kirjakerhon Atlas, etusivu"><span className="brand-symbol">a<span>✳</span></span><span>KIRJAKERHON<strong>ATLAS</strong></span></Link>
   <nav aria-label="Päävalikko" className="desktop-nav">{links.map(([to,key])=><NavLink key={to} to={to} end={to==='/'}>{fi.navigation[key]}</NavLink>)}</nav>
   <div className="header-actions"><Link className="icon-button" to="/asetukset" aria-label="Asetukset"><Settings size={22}/></Link>{(!club||canManage(club.role))&&<Link className="button button-dark header-import" to="/tuonti" aria-label="Tuo Excel-tiedosto"><Upload size={18}/><span>Tuo Excel</span></Link>}</div>
  </header>
  <div className="edition-bar"><span>{club?.name??'YHTEISTEN TARINOIDEN ARKISTO'}</span><span className="edition-status">{!online?<><WifiOff size={15}/> Luettavissa ilman verkkoa</>:archive.mode==='demo'?<><i className="status-dot"/>Esimerkkiarkisto</>:club?<><i className="status-dot teal"/>Yhteinen arkisto</>:<><i className="status-dot teal"/>Tallennettu tälle laitteelle</>}</span></div>
  {archive.mode==='demo'&&<div className="demo-note">Tutustu esimerkkiin. Arviot ja lukijat ovat kuvitteellisia.<Link to="/tuonti">Tuo oma historia <ArrowUpRight size={15}/></Link></div>}
  {notice&&<div className="notice" role="status"><span>{notice}</span><button onClick={()=>setNotice('')} className="icon-button" aria-label="Sulje ilmoitus"><X size={19}/></button></div>}
  {needRefresh&&<div className="notice"><span>Uusi Atlas on valmis.</span><button className="text-link" onClick={()=>void activateUpdate()}>Päivitä sovellus</button></div>}
  <main id="content" tabIndex={-1}><Outlet/></main>
  <footer className="site-footer"><Link className="footer-brand" to="/">Kirjakerhon Atlas<span>✳</span></Link><p>Hyvät tarinat jäävät elämään.</p><Link to="/asetukset">Tietoa & asennusohjeet <ArrowUpRight size={16}/></Link></footer>
  <nav className="mobile-nav" aria-label="Mobiilin päävalikko">{links.map(([to,key,Icon])=><NavLink key={to} to={to} end={to==='/'}><Icon size={22}/><span>{fi.navigation[key]}</span></NavLink>)}</nav>
 </div>
}
