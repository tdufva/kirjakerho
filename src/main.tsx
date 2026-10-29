import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './jazz.css'
// A deployed build may replace a lazy chunk while this tab is still open.
// Refresh the application shell once, keeping the user's IndexedDB archive intact.
window.addEventListener('vite:preloadError', event => {
 if(!navigator.onLine)return
 const key='atlas-asset-reload',now=Date.now()
 if(now-Number(sessionStorage.getItem(key)??0)<15000)return
 sessionStorage.setItem(key,String(now));event.preventDefault()
 void (async()=>{
  try{await (await navigator.serviceWorker?.getRegistration())?.unregister()}catch{}
  window.location.reload()
 })()
})
const token=new URLSearchParams(location.search).get('invitation')
if(token){sessionStorage.setItem('atlas-invitation',token);const url=new URL(location.href);url.searchParams.delete('invitation');url.hash='/asetukset';history.replaceState({},'',url)}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
