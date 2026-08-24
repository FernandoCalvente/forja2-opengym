// Gamification hub: missions, rank/leaderboard/friends, and events (retos) — the layer
// ported from Forja on top of openGym's tracker. Reachable from Settings and a Home card.
// Requires a real passkey profile (guest mode has no session cookie for gamer-api to check).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { gamerApi } from '../lib/gamerApi.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Segmented, TextField } from '../components/ui.jsx'

const TIER_COLOR = {
  Hierro: '#8a8a8e', Bronce: '#b08d57', Plata: '#c7c9cc', Oro: '#e0b400',
  Platino: '#6fc4c9', Diamante: '#4fa3f7', Maestro: '#c04fe0',
}
const roman = d => ({ 1: 'I', 2: 'II', 3: 'III', 4: 'IV' }[d] || '')
const rankLabel = u => u.rankTier === 'Maestro' ? u.rankTier : `${u.rankTier} ${roman(u.rankDivision)}`

function RankChip({ tier, division }) {
  return <span className="tag" style={{ color: TIER_COLOR[tier] || 'var(--label-2)', borderColor: TIER_COLOR[tier] || 'var(--sep)' }}>
    {tier === 'Maestro' ? tier : `${tier} ${roman(division)}`}
  </span>
}

function Header({ me }) {
  if (!me) return null
  const pct = me.xpToNextLevel ? Math.min(100, Math.round(100 * me.xp / me.xpToNextLevel)) : 0
  return <div className="card" style={{ marginBottom: 12 }}>
    <div className="row between" style={{ marginBottom: 6 }}>
      <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Nivel {me.level}</div>
      <RankChip tier={me.rankTier} division={me.rankDivision} />
    </div>
    <div style={{ height: 6, borderRadius: 4, background: 'var(--sep)', overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ height: '100%', width: pct + '%', background: 'var(--acc)' }} />
    </div>
    <div className="row between dim small">
      <span>{me.xp} / {me.xpToNextLevel} XP</span>
      {me.streakDays > 0 && <span><Icon name="flame" style={{ color: 'var(--orange)' }} /> {me.streakDays} días</span>}
    </div>
  </div>
}

function MissionsPanel({ me, reloadMe }) {
  const toast = useUI(s => s.toast)
  const [missions, setMissions] = useState(null)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  const load = () => gamerApi('/missions').then(setMissions).catch(e => toast(e.message))
  useEffect(() => { load() }, [])

  const toggle = m => {
    const path = `/missions/${m.id}/${m.status === 'done' ? 'uncomplete' : 'complete'}`
    gamerApi(path, { method: 'PATCH', body: '{}' }).then(() => { load(); reloadMe() }).catch(e => toast(e.message))
  }
  const remove = id => gamerApi(`/missions/${id}`, { method: 'DELETE' }).then(load).catch(e => toast(e.message))
  const add = () => {
    if (!title.trim()) return
    gamerApi('/missions', { method: 'POST', body: JSON.stringify({ title: title.trim(), xpReward: 50 }) })
      .then(() => { setTitle(''); setAdding(false); load() }).catch(e => toast(e.message))
  }

  if (!missions) return <div className="muted small">Cargando…</div>
  const pending = missions.filter(m => m.status !== 'done')
  const done = missions.filter(m => m.status === 'done')

  return <>
    <Header me={me} />
    <div className="list">
      {pending.map(m => <div key={m.id} className="item" onClick={() => toggle(m)}>
        <button className="iconbtn" style={{ width: 26, height: 26, border: '2px solid var(--sep)', borderRadius: '50%' }} onClick={e => { e.stopPropagation(); toggle(m) }} />
        <div className="grow">
          <div className="tt">{m.title}{m.recurring === 'daily' && <span className="tag" style={{ marginLeft: 6 }}>DIARIA</span>}</div>
          <div className="ss">+{m.xp_reward} XP{m.source === 'suggested' ? ' · sugerida' : m.source === 'event' ? ' · reto' : ''}</div>
        </div>
        {m.source === 'manual' && <button className="iconbtn" onClick={e => { e.stopPropagation(); remove(m.id) }} aria-label="borrar"><Icon name="trash" /></button>}
      </div>)}
      {!pending.length && <div className="empty small">Nada pendiente por hoy 🎉</div>}
    </div>

    {done.length > 0 && <>
      <h4 className="sec">Completadas</h4>
      <div className="list">
        {done.map(m => <div key={m.id} className="item dim" onClick={() => toggle(m)} style={{ opacity: .6 }}>
          <Icon name="checkCircle" style={{ color: 'var(--acc)' }} />
          <div className="grow"><div className="tt">{m.title}</div></div>
        </div>)}
      </div>
    </>}

    {adding ? <div className="card" style={{ marginTop: 10 }}>
      <TextField placeholder="Título de la misión" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <Button variant="primary" onClick={add}>Añadir</Button>
        <Button onClick={() => { setAdding(false); setTitle('') }}>Cancelar</Button>
      </div>
    </div> : <Button className="dim" style={{ marginTop: 10 }} icon="plus" onClick={() => setAdding(true)}>Nueva misión</Button>}
  </>
}

function FriendsPanel({ me }) {
  const toast = useUI(s => s.toast)
  const [board, setBoard] = useState(null)
  const [requests, setRequests] = useState([])
  const [code, setCode] = useState('')

  const load = () => {
    gamerApi('/friends/leaderboard').then(setBoard).catch(e => toast(e.message))
    gamerApi('/friends/requests').then(setRequests).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const sendRequest = () => {
    if (!code.trim()) return
    gamerApi('/friends/request', { method: 'POST', body: JSON.stringify({ friendCode: code.trim() }) })
      .then(() => { toast('Solicitud enviada'); setCode('') }).catch(e => toast(e.message))
  }
  const accept = id => gamerApi(`/friends/requests/${id}/accept`, { method: 'PATCH', body: '{}' }).then(load).catch(e => toast(e.message))

  return <>
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="row between">
        <div><div className="small muted">Tu código de amigo</div>
          <div style={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '.08em' }}>{me?.friendCode || '····'}</div>
        </div>
        <Button size="sm" onClick={() => { navigator.clipboard?.writeText(me?.friendCode || '').catch(() => {}); toast('Código copiado') }}>Copiar</Button>
      </div>
    </div>

    <div className="row" style={{ gap: 8, marginBottom: 12 }}>
      <TextField placeholder="Código de un amigo" value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ flex: 1 }} />
      <Button variant="primary" onClick={sendRequest}>Añadir</Button>
    </div>

    {requests.length > 0 && <>
      <h4 className="sec">Solicitudes</h4>
      <div className="list" style={{ marginBottom: 12 }}>
        {requests.map(r => <div key={r.id} className="item">
          <div className="grow"><div className="tt">{r.displayName}</div></div>
          <Button size="sm" variant="primary" onClick={() => accept(r.id)}>Aceptar</Button>
        </div>)}
      </div>
    </>}

    <h4 className="sec">Clasificación</h4>
    <div className="list">
      {(board || []).map((u, i) => <div key={u.id} className="item" style={u.isMe ? { background: 'var(--fill-2)' } : null}>
        <div style={{ width: 22, textAlign: 'center', fontWeight: 700, color: 'var(--label-3)' }}>{i + 1}</div>
        <div className="grow">
          <div className="tt">{u.displayName}{u.isMe ? ' (tú)' : ''}</div>
          <div className="ss">Nivel {u.level}{u.streakDays > 0 ? ` · 🔥 ${u.streakDays}` : ''}</div>
        </div>
        <RankChip tier={u.tier} division={u.division} />
      </div>)}
      {board && !board.length && <div className="empty small">Añade amigos con su código para ver el ranking.</div>}
    </div>
  </>
}

// A 10-week half-marathon plan — 2 sessions/week (short + long run), progressing toward 21 km.
// One-tap template for admins instead of building the session list by hand.
const HALF_MARATHON_TEMPLATE = [
  [5, 8], [5, 9], [6, 10], [6, 12], [6, 13], [7, 14], [7, 16], [7, 17], [5, 10], [4, 21],
]
function buildHalfMarathonSessions() {
  const sessions = []
  HALF_MARATHON_TEMPLATE.forEach(([shortKm, longKm], i) => {
    const week = i + 1
    sessions.push({ weekNumber: week, dayRole: 'short', title: `Rodaje corto — ${shortKm} km`, xpReward: 40, category: 'CARRERA' })
    sessions.push({ weekNumber: week, dayRole: 'long', title: week === 10 ? `¡Media maratón! — ${longKm} km` : `Tirada larga — ${longKm} km`, xpReward: week === 10 ? 200 : 60, category: 'CARRERA' })
  })
  return sessions
}

function EventsPanel({ me }) {
  const toast = useUI(s => s.toast)
  const [events, setEvents] = useState(null)

  const load = () => gamerApi('/events').then(setEvents).catch(e => toast(e.message))
  useEffect(() => { load() }, [])

  const join = ev => confirmSheet({
    title: `Unirte a "${ev.name}"`,
    message: 'Los días de la semana para tus sesiones cortas y largas se reparten automáticamente (lunes/miércoles/sábado). Podrás cambiarlos luego.',
    confirmText: 'Unirme',
    onConfirm: () => gamerApi(`/events/${ev.id}/join`, { method: 'POST', body: JSON.stringify({ shortDay: 3, longDay: 6 }) }).then(load).catch(e => toast(e.message)),
  })
  const leave = ev => confirmSheet({
    title: `Salir de "${ev.name}"`, danger: true, confirmText: 'Salir',
    message: 'Se borrarán las misiones pendientes derivadas de este evento.',
    onConfirm: () => gamerApi(`/events/${ev.id}/join`, { method: 'DELETE' }).then(load).catch(e => toast(e.message)),
  })
  const createHalfMarathon = () => {
    const nextMonday = new Date()
    nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7))
    const startDate = nextMonday.toISOString().slice(0, 10)
    gamerApi('/events', {
      method: 'POST',
      body: JSON.stringify({ name: 'Media maratón — 10 semanas', description: 'Plan progresivo hasta los 21 km.', startDate, sessions: buildHalfMarathonSessions() }),
    }).then(() => { toast('Evento creado'); load() }).catch(e => toast(e.message))
  }

  if (!events) return <div className="muted small">Cargando…</div>

  return <>
    <div className="list">
      {events.map(ev => <div key={ev.id} className="item">
        <div className="grow">
          <div className="tt">{ev.name}</div>
          <div className="ss">{ev.description} · {ev.participant_count} participantes</div>
        </div>
        {ev.my_participation
          ? <Button size="sm" onClick={() => leave(ev)}>Salir</Button>
          : <Button size="sm" variant="primary" onClick={() => join(ev)}>Unirme</Button>}
      </div>)}
      {!events.length && <div className="empty small">No hay retos activos todavía.</div>}
    </div>
    {me?.isAdmin && <Button className="dim" style={{ marginTop: 10 }} icon="plus" onClick={createHalfMarathon}>Crear plantilla: media maratón (10 semanas)</Button>}
  </>
}

export default function Forja() {
  const nav = useNavigate()
  const toast = useUI(s => s.toast)
  const user = useStore(s => s.user)
  const [tab, setTab] = useState('missions')
  const [me, setMe] = useState(null)

  const loadMe = () => gamerApi('/me').then(setMe).catch(e => toast(e.message))
  useEffect(() => { loadMe() }, [])

  if (!user) return <div className="narrow">
    <div className="hdr"><button className="iconbtn" onClick={() => nav('/home')} aria-label="Volver"><Icon name="chevronLeft" /></button></div>
    <div className="empty" style={{ marginTop: '18vh' }}>La gamificación requiere un perfil con passkey — el modo invitado no la soporta.</div>
  </div>

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label="Volver"><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>Forja</h1></div>
    </div>
    <div style={{ marginBottom: 14 }}>
      <Segmented className="seg-inline"
        options={[{ value: 'missions', label: 'Misiones' }, { value: 'friends', label: 'Ranking' }, { value: 'events', label: 'Eventos' }]}
        value={tab} onChange={setTab} />
    </div>
    {tab === 'missions' && <MissionsPanel me={me} reloadMe={loadMe} />}
    {tab === 'friends' && <FriendsPanel me={me} />}
    {tab === 'events' && <EventsPanel me={me} />}
  </div>
}
