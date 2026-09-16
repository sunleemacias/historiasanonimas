import { useEffect, useState } from 'react'
import './App.css'

type Phase = 'lobby' | 'stories' | 'votes' | 'results'
type Participant = { id: string; name: string; storySubmitted: boolean }
type Story = { id: string; text: string }
type GameState = { code: string; phase: Phase; participants: Participant[]; me: Participant; stories: Story[]; pendingStoryIds: string[]; scores: { id: string; name: string; score: number }[] }
type Session = { code: string; token: string }

const SESSION_KEY = 'historias-anonimas-session'
const api = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'No se pudo conectar con la sala.')
  return data
}

function App() {
  const [session, setSession] = useState<Session | null>(() => JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'))
  const [game, setGame] = useState<GameState | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [story, setStory] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const loadState = async (currentSession: Session) => {
    try {
      const next = await api(`/api/rooms/${currentSession.code}/state`, { headers: { 'x-player-token': currentSession.token } })
      if (!next.code || !next.phase) throw new Error('El servidor de salas no está disponible. En Render usa un Web Service con `npm start`.')
      setGame(next)
      setError('')
    } catch (requestError) {
      if ((requestError as Error).message === 'Sala o sesión no válida.') { localStorage.removeItem(SESSION_KEY); setSession(null); setGame(null) }
      else setError((requestError as Error).message)
    }
  }

  useEffect(() => {
    if (!session) return
    loadState(session)
    const timer = window.setInterval(() => loadState(session), 2000)
    return () => window.clearInterval(timer)
  }, [session])

  const enterRoom = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const result = mode === 'create' ? await api('/api/rooms', { method: 'POST', body: JSON.stringify({ name }) }) : await api(`/api/rooms/${code.trim().toUpperCase()}/join`, { method: 'POST', body: JSON.stringify({ name }) })
      if (!result.code || !result.token) throw new Error('El servidor de salas no está disponible. En Render usa un Web Service con `npm start`.')
      const nextSession = { code: result.code, token: result.token }
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession)); setSession(nextSession); setName('')
    } catch (requestError) { setError((requestError as Error).message) } finally { setBusy(false) }
  }

  const leaveRoom = () => { localStorage.removeItem(SESSION_KEY); setSession(null); setGame(null); setCode(''); setStory('') }
  const submitStory = async (event: React.FormEvent) => { event.preventDefault(); if (!session || !story.trim()) return; setBusy(true); setError(''); try { const next = await api(`/api/rooms/${session.code}/story`, { method: 'POST', body: JSON.stringify({ token: session.token, text: story }) }); setGame(next); setStory('') } catch (requestError) { setError((requestError as Error).message) } finally { setBusy(false) } }
  const vote = async (authorId: string) => { if (!session || !game || !currentStory) return; setBusy(true); setError(''); try { const next = await api(`/api/rooms/${session.code}/vote`, { method: 'POST', body: JSON.stringify({ token: session.token, storyId: currentStory.id, authorId }) }); setGame(next) } catch (requestError) { setError((requestError as Error).message) } finally { setBusy(false) } }
  const currentStory = game?.stories.find((item) => item.id === game.pendingStoryIds[0])
  const copyCode = () => { if (game) navigator.clipboard?.writeText(game.code) }

  if (!game) return <main className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark">?</span><span>Historias sin firma</span></div></header><section className="intro"><p className="eyebrow">Juego grupal en tiempo real</p><h1>¿Reconoces a tus amigos<br /><em>por lo que cuentan?</em></h1><p className="intro-copy">Crea una sala, comparte el código y juega desde computadoras diferentes. Cada historia queda privada hasta la ronda anónima.</p></section><section className="game-panel entry-panel"><div className="phase-content narrow"><div className="mode-switch"><button className={mode === 'create' ? 'selected' : ''} onClick={() => setMode('create')}>Crear sala</button><button className={mode === 'join' ? 'selected' : ''} onClick={() => setMode('join')}>Unirme a una sala</button></div><form onSubmit={enterRoom}><label>Tu nombre<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Camila" required /></label>{mode === 'join' && <label>Código de sala<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABCD" maxLength={4} required /></label>}{error && <p className="error-message">{error}</p>}<button className="primary-button large full" disabled={busy}>{busy ? 'Conectando...' : mode === 'create' ? 'Crear mi sala →' : 'Entrar a la sala →'}</button></form></div></section><footer>Una partida para escuchar con atención <span>·</span> y desconfiar un poquito.</footer></main>

  const phaseLabels = ['Sala', 'Historias', 'Votación', 'Resultados']
  const phaseOrder: Phase[] = ['lobby', 'stories', 'votes', 'results']
  return <main className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark">?</span><span>Historias sin firma</span></div><button className="ghost-button" onClick={leaveRoom}>Salir de la sala</button></header><section className="room-banner"><div><p className="eyebrow">Código para compartir</p><button className="room-code" onClick={copyCode}>{game.code} <span>⧉</span></button></div><p className="room-help">Comparte este código con las demás personas.<br />Cada quien puede conectarse desde su computadora.</p></section><nav className="progress" aria-label="Progreso del juego">{phaseOrder.map((phase, index) => <div className={`progress-step ${game.phase === phase ? 'active' : ''} ${phaseOrder.indexOf(game.phase) > index ? 'done' : ''}`} key={phase}><span>{index + 1}</span><strong>{phaseLabels[index]}</strong></div>)}</nav><section className="game-panel">
    {game.phase === 'lobby' && <div className="phase-content"><div className="phase-heading"><span className="section-number">01</span><div><h2>Esperando al equipo</h2><p>Cuando haya al menos tres personas, comenzarán las historias.</p></div></div><div className="participant-list lobby-list">{game.participants.map((participant, index) => <div className="participant" key={participant.id}><span className="avatar">{participant.name.slice(0, 1).toUpperCase()}</span><span>{participant.name}{participant.id === game.me.id && ' (tú)'}</span><small>Jugador {String(index + 1).padStart(2, '0')}</small></div>)}</div><div className="waiting-note">{game.participants.length} de 3 participantes mínimos</div></div>}
    {game.phase === 'stories' && <div className="phase-content narrow"><div className="phase-heading"><span className="section-number">02</span><div><h2>Escribe tu historia</h2><p>Solo tú verás este formulario. Los demás recibirán el texto sin tu nombre.</p></div></div>{game.me.storySubmitted ? <div className="waiting-card"><span className="big-check">✓</span><strong>Tu historia ya está guardada.</strong><span>Esperando a que terminen las demás personas...</span></div> : <form onSubmit={submitStory}><textarea value={story} onChange={(event) => setStory(event.target.value)} maxLength={240} placeholder="Una vez..." aria-label="Escribe tu historia" required /><div className="textarea-meta"><span>Algo breve, verdadero y difícil de reconocer.</span><span>{story.length}/240</span></div>{error && <p className="error-message">{error}</p>}<button className="primary-button large full" disabled={busy}>{busy ? 'Guardando...' : 'Guardar historia →'}</button></form>}</div>}
    {game.phase === 'votes' && currentStory && <div className="phase-content"><div className="phase-heading"><span className="section-number">03</span><div><h2>¿De quién es esta historia?</h2><p>Tu voto es privado. Elige a quien creas que la escribió.</p></div></div><div className="vote-count">Te quedan {game.pendingStoryIds.length} historias por votar</div><blockquote>“{currentStory.text}”</blockquote><div className="author-grid">{game.participants.filter((participant) => participant.id !== game.me.id).map((participant) => <button className="author-option" disabled={busy} key={participant.id} onClick={() => vote(participant.id)}><span className="avatar">{participant.name.slice(0, 1).toUpperCase()}</span><span>{participant.name}</span><b>→</b></button>)}</div>{error && <p className="error-message">{error}</p>}</div>}
    {game.phase === 'results' && <div className="phase-content results"><div className="results-kicker">Partida terminada</div><h2>La intuición<br /><em>tiene ganador.</em></h2><p className="results-copy">Estos son los participantes que mejor leyeron entre líneas.</p><div className="score-list">{game.scores.map((participant, index) => <div className="score-row" key={participant.id}><span className="rank">{String(index + 1).padStart(2, '0')}</span><span className="avatar">{participant.name.slice(0, 1).toUpperCase()}</span><strong>{participant.name}</strong><span className="score"><b>{participant.score}</b> aciertos</span></div>)}</div><div className="privacy-note">◌ Los autores verdaderos permanecen en secreto.</div></div>}
  </section><footer>Una partida para escuchar con atención <span>·</span> y desconfiar un poquito.</footer></main>
}

export default App
