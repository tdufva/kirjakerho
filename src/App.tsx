import { Component,useEffect,lazy,Suspense,type ReactNode } from 'react'
import { HashRouter,Routes,Route,useNavigate,useLocation,Link } from 'react-router-dom'
import { ArchiveProvider,useArchive } from './services/store'
import { Layout } from './components/Layout'
import { HomePage } from './components/Home'
const ArchivePage=lazy(()=>import('./components/Archive').then(m=>({default:m.ArchivePage})))
const TastePage=lazy(()=>import('./components/Taste').then(m=>({default:m.TastePage})))
const AtlasPage=lazy(()=>import('./components/Atlas').then(m=>({default:m.AtlasPage})))
const ImportPage=lazy(()=>import('./components/Import').then(m=>({default:m.ImportPage})))
const SettingsPage=lazy(()=>import('./components/Settings').then(m=>({default:m.SettingsPage})))
const WorkDetailPage=lazy(()=>import('./components/WorkDetail').then(m=>({default:m.WorkDetailPage})))
import { WelcomePage } from './components/Welcome'
class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?<div className="page narrow"><h1>Atlas tarvitsee pienen hengähdyksen.</h1><p>Jotakin odottamatonta tapahtui. Tallennetut tietosi säilyvät.</p><button className="button button-dark" onClick={()=>location.reload()}>Avaa uudelleen</button></div>:this.props.children}}
function Pages(){const {ready}=useArchive();const navigate=useNavigate(),currentLocation=useLocation();useEffect(()=>{if(currentLocation.pathname==='/'&&!localStorage.getItem('atlas-welcome'))navigate('/tervetuloa',{replace:true})},[]);if(!ready)return <div className="loading-screen"><span>✳</span><p>Avataan Atlasta…</p></div>;return <Routes><Route path="/tervetuloa" element={<WelcomePage/>}/><Route element={<Layout/>}><Route index element={<HomePage/>}/><Route path="/arkisto" element={<ArchivePage/>}/><Route path="/atlas" element={<AtlasPage/>}/><Route path="/maku" element={<TastePage/>}/><Route path="/tuonti" element={<ImportPage/>}/><Route path="/asetukset" element={<SettingsPage/>}/><Route path="/teos/:id" element={<WorkDetailPage/>}/><Route path="*" element={<div className="page narrow"><h1>Tätä sivua ei löytynyt.</h1><Link className="button button-dark" to="/">Takaisin etusivulle</Link></div>}/></Route></Routes>}
export default function App(){return <ErrorBoundary><ArchiveProvider><HashRouter><Suspense fallback={<div className="loading-screen" role="status"><span>✳</span><p>Avataan sivua…</p></div>}><Pages/></Suspense></HashRouter></ArchiveProvider></ErrorBoundary>}
