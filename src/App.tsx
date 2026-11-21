import { Component, lazy, Suspense, type ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { ArchiveProvider, useArchive } from './services/store'
import { Layout } from './components/Layout'
import { HomePage } from './components/Home'
const ArchivePage = lazy(() => import('./components/Archive').then((m) => ({ default: m.ArchivePage })))
const TastePage = lazy(() => import('./components/Taste').then((m) => ({ default: m.TastePage })))
const AtlasPage = lazy(() => import('./components/Atlas').then((m) => ({ default: m.AtlasPage })))
const InsightsPage = lazy(() => import('./components/Insights').then((m) => ({ default: m.InsightsPage })))
const SettingsPage = lazy(() => import('./components/Settings').then((m) => ({ default: m.SettingsPage })))
const YearbookPage = lazy(() => import('./components/Yearbook').then((m) => ({ default: m.YearbookPage })))
const WorkDetailPage = lazy(() =>
  import('./components/WorkDetail').then((m) => ({ default: m.WorkDetailPage }))
)
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <div className="page narrow">
        <h1>Atlas tarvitsee pienen hengähdyksen.</h1>
        <p>Jotakin odottamatonta tapahtui. Tallennetut tietosi säilyvät.</p>
        <button className="button button-dark" onClick={() => location.reload()}>
          Avaa uudelleen
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}
function Pages() {
  const { ready } = useArchive()
  if (!ready)
    return (
      <div className="loading-screen">
        <span className="loading-wordmark" aria-hidden="true">
          ATLAS
        </span>
        <p>Avataan Atlasta…</p>
      </div>
    )
  return (
    <Routes>
      <Route path="/tervetuloa" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/arkisto" element={<ArchivePage />} />
        <Route path="/atlas" element={<AtlasPage />} />
        <Route path="/maku" element={<TastePage />} />
        <Route path="/oivallukset" element={<InsightsPage />} />
        <Route path="/tuonti" element={<Navigate to="/arkisto" replace />} />
        <Route path="/vuosikirja" element={<YearbookPage />} />
        <Route path="/asetukset" element={<SettingsPage />} />
        <Route path="/teos/:id" element={<WorkDetailPage />} />
        <Route
          path="*"
          element={
            <div className="page narrow">
              <h1>Tätä sivua ei löytynyt.</h1>
              <Link className="button button-dark" to="/">
                Takaisin etusivulle
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  )
}
export default function App() {
  return (
    <ErrorBoundary>
      <ArchiveProvider>
        <HashRouter>
          <Suspense
            fallback={
              <div className="loading-screen" role="status">
                <span className="loading-wordmark" aria-hidden="true">
                  ATLAS
                </span>
                <p>Avataan sivua…</p>
              </div>
            }
          >
            <Pages />
          </Suspense>
        </HashRouter>
      </ArchiveProvider>
    </ErrorBoundary>
  )
}
