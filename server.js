import express from 'express'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const app = express()
const rooms = new Map()
const port = process.env.PORT || 10000
const currentFile = fileURLToPath(import.meta.url)
const root = path.dirname(currentFile)

app.use(express.json())
app.use(express.static(path.join(root, 'dist')))

const cleanName = (value) => typeof value === 'string' ? value.trim().slice(0, 40) : ''
const getRoom = (code) => rooms.get(String(code).toUpperCase())
const getPlayer = (room, token) => room?.participants.find((participant) => participant.token === token)
const roomCode = () => {
  let code
  do code = Math.random().toString(36).slice(2, 6).toUpperCase()
  while (rooms.has(code))
  return code
}
const phaseFor = (room) => {
  if (room.participants.length < 3) return 'lobby'
  if (room.stories.length < room.participants.length) return 'stories'
  const possibleVotes = room.participants.length * (room.stories.length - 1)
  return room.votes.length < possibleVotes ? 'votes' : 'results'
}
const publicState = (room, player) => {
  const phase = phaseFor(room)
  const myVotes = room.votes.filter((vote) => vote.voterId === player.id).map((vote) => vote.storyId)
  const stories = room.stories.map(({ id, text }) => ({ id, text }))
  const scores = phase === 'results' ? room.participants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    score: room.votes.filter((vote) => vote.voterId === participant.id && room.stories.find((story) => story.id === vote.storyId)?.authorId === vote.authorId).length,
  })).sort((left, right) => right.score - left.score) : []

  return {
    code: room.code,
    phase,
    participants: room.participants.map(({ id, name, storySubmitted }) => ({ id, name, storySubmitted })),
    me: { id: player.id, name: player.name, storySubmitted: Boolean(player.story) },
    stories,
    pendingStoryIds: phase === 'votes' ? room.stories.filter((story) => story.authorId !== player.id && !myVotes.includes(story.id)).map((story) => story.id) : [],
    scores,
  }
}

app.post('/api/rooms', (request, response) => {
  const name = cleanName(request.body?.name)
  if (!name) return response.status(400).json({ error: 'Escribe tu nombre.' })
  const code = roomCode()
  const player = { id: randomUUID(), name, token: randomUUID(), story: '' }
  rooms.set(code, { code, participants: [player], stories: [], votes: [] })
  response.json({ code, token: player.token })
})

app.post('/api/rooms/:code/join', (request, response) => {
  const room = getRoom(request.params.code)
  const name = cleanName(request.body?.name)
  if (!room) return response.status(404).json({ error: 'No encontramos esa sala.' })
  if (!name) return response.status(400).json({ error: 'Escribe tu nombre.' })
  if (room.participants.length >= 20) return response.status(400).json({ error: 'La sala está llena.' })
  if (room.participants.some((participant) => participant.name.toLowerCase() === name.toLowerCase())) return response.status(400).json({ error: 'Ese nombre ya está en la sala.' })
  if (room.stories.length > 0) return response.status(400).json({ error: 'La partida ya comenzó.' })
  const player = { id: randomUUID(), name, token: randomUUID(), story: '' }
  room.participants.push(player)
  response.json({ code: room.code, token: player.token })
})

app.get('/api/rooms/:code/state', (request, response) => {
  const room = getRoom(request.params.code)
  const player = getPlayer(room, request.headers['x-player-token'])
  if (!room || !player) return response.status(401).json({ error: 'Sala o sesión no válida.' })
  response.json(publicState(room, player))
})

app.post('/api/rooms/:code/story', (request, response) => {
  const room = getRoom(request.params.code)
  const player = getPlayer(room, request.body?.token)
  const text = typeof request.body?.text === 'string' ? request.body.text.trim().slice(0, 240) : ''
  if (!room || !player) return response.status(401).json({ error: 'Sala o sesión no válida.' })
  if (room.stories.length > 0 && phaseFor(room) !== 'stories') return response.status(400).json({ error: 'La votación ya comenzó.' })
  if (!text) return response.status(400).json({ error: 'Escribe una historia.' })
  if (player.story) return response.status(400).json({ error: 'Ya enviaste tu historia.' })
  player.story = text
  room.stories.push({ id: randomUUID(), authorId: player.id, text })
  response.json(publicState(room, player))
})

app.post('/api/rooms/:code/vote', (request, response) => {
  const room = getRoom(request.params.code)
  const player = getPlayer(room, request.body?.token)
  const { storyId, authorId } = request.body || {}
  if (!room || !player) return response.status(401).json({ error: 'Sala o sesión no válida.' })
  if (phaseFor(room) !== 'votes') return response.status(400).json({ error: 'La votación aún no está disponible.' })
  const story = room.stories.find((item) => item.id === storyId)
  if (!story || story.authorId === player.id || !room.participants.some((participant) => participant.id === authorId)) return response.status(400).json({ error: 'Voto no válido.' })
  if (room.votes.some((vote) => vote.voterId === player.id && vote.storyId === storyId)) return response.status(400).json({ error: 'Ya votaste esta historia.' })
  room.votes.push({ voterId: player.id, storyId, authorId })
  response.json(publicState(room, player))
})

app.get('/{*splat}', (_request, response) => response.sendFile(path.join(root, 'dist', 'index.html')))
app.listen(port, () => console.log(`Historias sin firma escuchando en el puerto ${port}`))
