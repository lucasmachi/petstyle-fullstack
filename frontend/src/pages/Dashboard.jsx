import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Cat, Dog, Edit3, Plus, X } from 'lucide-react'
import { useAuth } from '../auth'
import { api, json } from '../api'
import { dateTime, money, sizeLabels, statusLabels } from '../format'
import { Empty, Loading, Notice, PageHeading, Submit } from '../components/UI'
const blank = { name: '', species: 'dog', size: 'small', notes: '' }
export default function Dashboard() {
  const { user } = useAuth()
  const [pets, setPets] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try { const [p, b] = await Promise.all([api('/pets'), api('/bookings')]); setPets(p); setBookings(b) }
    catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { await api(editing === 'new' ? '/pets' : `/pets/${editing}`, json(editing === 'new' ? 'POST' : 'PUT', form)); setEditing(null); setMessage('Pronto! O cadastro do seu pet foi salvo.'); await load() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function archive(id) {
    if (!window.confirm('Arquivar este pet? O histórico dos atendimentos será preservado.')) return
    setBusy(true); setError('')
    try { await api(`/pets/${id}`, { method: 'DELETE' }); setEditing(null); setMessage('Pet arquivado.'); await load() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function cancel(id) {
    if (!window.confirm('Quer cancelar este agendamento? O horário será liberado.')) return
    setBusy(true); setError('')
    try { await api(`/bookings/${id}`, json('PATCH', { status: 'cancelled' })); setMessage('Agendamento cancelado.'); await load() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <section className="section container app-page"><PageHeading eyebrow="SEU CANTINHO" title={`Olá, ${user.name.split(' ')[0]}.`} action={<Link className="btn primary" to="/agendar"><Plus size={18} /> Novo agendamento</Link>}>Seus companheiros e os próximos momentos de cuidado.</PageHeading><Notice>{error}</Notice><Notice success>{message}</Notice>
    <div className="block-heading"><h2>Meus pets <span>{pets.length}</span></h2><button className="text-link" onClick={() => { setEditing('new'); setForm(blank) }}><Plus size={17} /> Cadastrar pet</button></div>
    {editing !== null && <form className="panel pet-form" onSubmit={save}><div className="block-heading"><h3>{editing === 'new' ? 'Um novo amigo por aqui' : 'Editar meu pet'}</h3><button className="icon-btn" type="button" aria-label="Fechar formulário" onClick={() => setEditing(null)}><X size={20} /></button></div><div className="form-grid"><label>Nome do pet<input required maxLength={60} autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Espécie<select value={form.species} onChange={e => setForm({ ...form, species: e.target.value })}><option value="dog">Cachorro</option><option value="cat">Gato</option></select></label><label>Porte<select value={form.size} onChange={e => setForm({ ...form, size: e.target.value })}><option value="small">Pequeno</option><option value="medium">Médio</option><option value="large">Grande</option></select></label><label className="span-2">Como ele gosta de ser cuidado?<textarea maxLength={500} value={form.notes} placeholder="Ex.: fica mais tranquilo com carinho antes do banho." onChange={e => setForm({ ...form, notes: e.target.value })} /></label></div><div className="form-actions"><Submit busy={busy}>Salvar pet</Submit>{editing !== 'new' && <button type="button" className="btn danger" disabled={busy} onClick={() => archive(editing)}>Arquivar pet</button>}</div></form>}
    {loading ? <Loading /> : pets.length ? <div className="pets-grid">{pets.map(pet => { const Icon = pet.species === 'cat' ? Cat : Dog; return <article className="pet-card" key={pet.id}><span className={`pet-avatar ${pet.species}`}><Icon size={35} /></span><div><h3>{pet.name}</h3><p>{pet.species === 'cat' ? 'Gato' : 'Cachorro'} · {sizeLabels[pet.size]}</p></div><button className="icon-btn" aria-label={`Editar ${pet.name}`} onClick={() => { setEditing(pet.id); setForm({ name: pet.name, species: pet.species, size: pet.size, notes: pet.notes }) }}><Edit3 size={17} /></button></article> })}</div> : <Empty title="Seu melhor amigo merece um lugar aqui">Cadastre seu pet para começar a agendar.</Empty>}
    <div className="block-heading"><h2>Meus agendamentos</h2><span className="muted small-text">Horários de São Paulo</span></div><p className="muted small-text">Você pode cancelar com pelo menos 2 horas de antecedência. Para outros casos, fale com a equipe.</p>
    {!loading && !bookings.length && <Empty title="O próximo cuidado ainda está por vir" action={<Link to="/agendar" className="btn primary">Escolher um horário</Link>}>Sua agenda de carinho aparece aqui.</Empty>}
    <div className="bookings-list">{bookings.map(b => <article className="booking-card" key={b.id}><span className="booking-symbol"><CalendarDays size={25} /></span><div className="booking-info"><div className="booking-title"><h3>{b.service.name}</h3><span className={`status ${b.status}`}>{statusLabels[b.status]}</span></div><p>{b.pet.name} · {dateTime(b.slot.starts_at)}</p><small>Reserva #{b.id} · {money(b.price_cents)}</small></div>{b.status === 'confirmed' && <button className="btn ghost small" disabled={busy} onClick={() => cancel(b.id)}>Cancelar</button>}</article>)}</div>
  </section>
}
