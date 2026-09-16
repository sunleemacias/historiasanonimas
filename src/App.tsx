import { useEffect, useState } from 'react'
import './App.css'

type Phase = 'participants' | 'stories' | 'votes' | 'results'
type Participant = { id: string; name: string }
type Story = { id: string; authorId: string; text: string }
type GameState = { phase: Phase; participants: Participant[]; stories: Story[]; storyWriterIndex: number; voterIndex: number; votes: Record<string, string> }

const STORAGE_KEY = 'historias-anonimas-game'
const initialGame: GameState = { phase: 'participants', participants: [], stories: [], storyWriterIndex: 0, voterIndex: 0, votes: {} }

function App() {
  const [game, setGame] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : initialGame
  })
  const [nameInput, setNameInput] = useState('')
  const [storyInput, setStoryInput] = useState('')
  const [selectedAuthor, setSelectedAuthor] = useState('')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)) }, [game])

  const currentWriter = game.participants[game.storyWriterIndex]
  const currentVoter = game.participants[game.voterIndex]
  const currentVoteStory = game.stories.find((story) => !game.votes[`${currentVoter?.id}-${story.id}`])

  const addParticipant = () => {
    const cleanName = nameInput.trim()
    if (!cleanName || game.participants.some((participant) => participant.name.toLowerCase() === cleanName.toLowerCase())) return
    setGame((current) => ({ ...current, participants: [...current.participants, { id: crypto.randomUUID(), name: cleanName }] }))
    setNameInput('')
  }

  const removeParticipant = (id: string) => setGame((current) => ({ ...current, participants: current.participants.filter((participant) => participant.id !== id) }))
  const startStories = () => { if (game.participants.length >= 3) setGame((current) => ({ ...current, phase: 'stories' })) }

  const submitStory = () => {
    const text = storyInput.trim()
    if (!text || !currentWriter) return
    const nextStories = [...game.stories, { id: crypto.randomUUID(), authorId: currentWriter.id, text }]
    setStoryInput('')
    setGame((current) => ({ ...current, stories: nextStories, storyWriterIndex: current.storyWriterIndex + 1, phase: nextStories.length === current.participants.length ? 'votes' : 'stories', voterIndex: 0 }))
  }

  const submitVote = () => {
    if (!currentVoter || !currentVoteStory || !selectedAuthor) return
    const nextVotes = { ...game.votes, [`${currentVoter.id}-${currentVoteStory.id}`]: selectedAuthor }
    setSelectedAuthor('')
    setGame((current) => ({ ...current, votes: nextVotes, voterIndex: current.voterIndex + 1, phase: Object.keys(nextVotes).length === current.participants.length * current.stories.length ? 'results' : 'votes' }))
  }

  const resetGame = () => { localStorage.removeItem(STORAGE_KEY); setGame(initialGame); setNameInput(''); setStoryInput(''); setSelectedAuthor('') }
  const scores = game.participants.map((participant) => ({ ...participant, score: game.stories.reduce((total, story) => total + (game.participants.some((voter) => game.votes[`${voter.id}-${story.id}`] === participant.id && story.authorId === participant.id) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score)
  const phases: Phase[] = ['participants', 'stories', 'votes', 'results']
  const labels = ['Equipo', 'Historias', 'Votación', 'Resultados']

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand"><span className="brand-mark">?</span><span>Historias sin firma</span></div>{game.participants.length > 0 && <button className="ghost-button" onClick={resetGame}>Nueva partida</button>}</header>
      <section className="intro"><p className="eyebrow">Juego de intuición · {game.participants.length || 0} participantes</p><h1>¿Reconoces a tus amigos<br /><em>por lo que cuentan?</em></h1><p className="intro-copy">Cada persona deja una historia. Después, todos intentan descubrir quién escribió cada una.</p></section>
      <nav className="progress" aria-label="Progreso del juego">{phases.map((phase, index) => <div className={`progress-step ${game.phase === phase ? 'active' : ''} ${phases.indexOf(game.phase) > index ? 'done' : ''}`} key={phase}><span>{index + 1}</span><strong>{labels[index]}</strong></div>)}</nav>
      <section className="game-panel">
        {game.phase === 'participants' && <div className="phase-content"><div className="phase-heading"><span className="section-number">01</span><div><h2>Reúne al equipo</h2><p>Necesitamos al menos tres personas para que la intriga funcione.</p></div></div><div className="add-row"><input value={nameInput} onChange={(event) => setNameInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addParticipant()} placeholder="Escribe un nombre" aria-label="Nombre del participante" /><button className="primary-button" onClick={addParticipant}>Añadir <span>+</span></button></div><div className="participant-list">{game.participants.map((participant, index) => <div className="participant" key={participant.id}><span className="avatar">{participant.name.slice(0, 1).toUpperCase()}</span><span>{participant.name}</span><small>Jugador {String(index + 1).padStart(2, '0')}</small><button className="remove-button" onClick={() => removeParticipant(participant.id)} aria-label={`Eliminar a ${participant.name}`}>×</button></div>)}</div>{game.participants.length === 0 && <div className="empty-state"><span>✦</span><p>Aún no hay nombres en la mesa.</p></div>}<div className="panel-footer"><span>{game.participants.length} de 3 mínimo</span><button className="primary-button large" disabled={game.participants.length < 3} onClick={startStories}>Continuar <span>→</span></button></div></div>}
        {game.phase === 'stories' && currentWriter && <div className="phase-content narrow"><div className="phase-heading"><span className="section-number">02</span><div><h2>Turno de {currentWriter.name}</h2><p>Escribe algo breve y verdadero. El resto solo verá el texto, nunca tu nombre.</p></div></div><div className="writer-card"><span className="avatar big">{currentWriter.name.slice(0, 1).toUpperCase()}</span><div><strong>Solo tú ves esta pantalla</strong><span>Historia {game.stories.length + 1} de {game.participants.length}</span></div></div><textarea value={storyInput} onChange={(event) => setStoryInput(event.target.value)} maxLength={240} placeholder="Una vez..." aria-label="Escribe tu historia" /><div className="textarea-meta"><span>Puede ser divertida, inesperada o muy tuya.</span><span>{storyInput.length}/240</span></div><button className="primary-button large full" disabled={!storyInput.trim()} onClick={submitStory}>Guardar historia <span>→</span></button></div>}
        {game.phase === 'votes' && currentVoter && currentVoteStory && <div className="phase-content"><div className="phase-heading"><span className="section-number">03</span><div><h2>¿De quién es esta historia?</h2><p>Turno de <strong>{currentVoter.name}</strong>. Confía en tu intuición.</p></div></div><div className="vote-count">Historia {game.stories.findIndex((story) => story.id === currentVoteStory.id) + 1} de {game.stories.length}</div><blockquote>“{currentVoteStory.text}”</blockquote><div className="author-grid">{game.participants.filter((participant) => participant.id !== currentVoter.id).map((participant) => <button className={`author-option ${selectedAuthor === participant.id ? 'selected' : ''}`} key={participant.id} onClick={() => setSelectedAuthor(participant.id)}><span className="avatar">{participant.name.slice(0, 1).toUpperCase()}</span><span>{participant.name}</span>{selectedAuthor === participant.id && <b>✓</b>}</button>)}</div><button className="primary-button large full" disabled={!selectedAuthor} onClick={submitVote}>Confirmar voto <span>→</span></button></div>}
        {game.phase === 'results' && <div className="phase-content results"><div className="results-kicker">Partida terminada</div><h2>La intuición<br /><em>tiene ganador.</em></h2><p className="results-copy">Estos son los participantes que mejor leyeron entre líneas.</p><div className="score-list">{scores.map((participant, index) => <div className={`score-row rank-${index + 1}`} key={participant.id}><span className="rank">{String(index + 1).padStart(2, '0')}</span><span className="avatar">{participant.name.slice(0, 1).toUpperCase()}</span><strong>{participant.name}</strong><span className="score"><b>{participant.score}</b> aciertos</span></div>)}</div><div className="privacy-note"><span>◌</span> Los autores verdaderos permanecen en secreto.</div><br /><button className="primary-button large" onClick={resetGame}>Jugar otra vez <span>↗</span></button></div>}
      </section>
      <footer>Una partida para escuchar con atención <span>·</span> y desconfiar un poquito.</footer>
    </main>
  )
}

export default App
