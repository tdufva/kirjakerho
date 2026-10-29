import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
const token=new URLSearchParams(location.search).get('invitation')
if(token){sessionStorage.setItem('atlas-invitation',token);const url=new URL(location.href);url.searchParams.delete('invitation');url.hash='/asetukset';history.replaceState({},'',url)}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
