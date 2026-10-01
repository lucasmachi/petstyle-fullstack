import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Download, LockKeyhole, Plus, UnlockKeyhole, Wallet, XCircle } from 'lucide-react'
import { api, json } from '../api'
import { dateTime, hour, money, priceToCents, statusLabels, today } from '../format'
import { Empty, Loading, Notice, PageHeading, Submit } from '../components/UI'
const blankService = { name: '', description: '', price: '', active: true }
export default function Admin() {
  const [tab, setTab] = useState('agenda')
  const [day, setDay] = useState(today())
  const [bookings, setBookings] = useState([])
  const [slots, setSlots] = useState([])
  const [services, setServices] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [form, setForm] = useState(blankService)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [b, s, se, m] = await Promise.all([api(`/admin/bookings?day=${day}`), api(`/admin/slots?day=${day}`), api('/admin/services'), api('/admin/metrics')])
      setBookings(b); setSlots(s); setServices(se); setMetrics(m)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [day])
  useEffect(() => { load() }, [load])
  async function action(fn, text) {
    setBusy(true); setError(''); setMessage('')
    try { await fn(); setMessage(text); await load() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  function changeStatus(b, status) {
    if (!window.confirm(status === 'cancelled' ? `Cancelar o atendimento de ${b.pet.name}?` : `Concluir o atendimento de ${b.pet.name}?`)) return
    action(() => api(`/admin/bookings/${b.id}`, json('PATCH', { status })), 'Agendamento atualizado.')
  }
  async function saveService(event) {
    event.preventDefault()
    let price
    try { price = priceToCents(form.price) } catch (e) { setError(e.message); return }
    await action(async () => { await api(editing ? `/admin/services/${editing}` : '/admin/services', json(editing ? 'PUT' : 'POST', { name: form.name, description: form.description, price_cents: price, active: form.active })); setForm(blankService); setEditing(null) }, 'Serviço salvo. Reservas anteriores mantêm o valor original.')
  }
  return <section className="section container app-page"><PageHeading eyebrow="BASTIDORES DO CARINHO" title="Painel da equipe" action={<a className="btn ghost" href="/api/admin/report.csv"><Download size={17} /> Exportar CSV</a>}>Organize os cuidados e acompanhe o dia a dia.</PageHeading><Notice>{error}</Notice><Notice success>{message}</Notice>
    {metrics && <div className="metrics-grid">{[[CalendarDays, metrics.confirmed, 'Confirmados'], [CheckCircle2, metrics.completed, 'Concluídos'], [XCircle, metrics.cancelled, 'Cancelados'], [Wallet, money(metrics.revenue_cents), 'Atendimentos concluídos']].map(([Icon, value, label]) => <div className="metric-card" key={label}><Icon size={23} /><strong>{value}</strong><span>{label}</span></div>)}</div>}
    <p className="muted small-text">Indicadores de todo o histórico. O valor concluído representa serviços realizados, não pagamentos conciliados.</p>
    <div className="admin-tabs" role="group" aria-label="Seções da equipe">{[['agenda', 'Agendamentos'], ['horarios', 'Disponibilidade'], ['servicos', 'Serviços']].map(([key, label]) => <button className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab !== 'servicos' && <div className="date-toolbar"><label>Consultar dia<input type="date" value={day} onChange={e => { if (e.target.value) setDay(e.target.value) }} /></label>{tab === 'horarios' && <button className="btn primary small" disabled={busy} onClick={() => action(async () => { await api('/admin/slots/generate', json('POST', { start_date: day, days: 7 })) }, 'Horários dos próximos 7 dias preparados.')}><Plus size={17} /> Abrir 7 dias de agenda</button>}</div>}
    {loading ? <Loading /> : <>
      {tab === 'agenda' && <div className="bookings-list">{bookings.length ? bookings.map(b => <article className="booking-card" key={b.id}><span className="booking-symbol">{hour(b.slot.starts_at)}</span><div className="booking-info"><div className="booking-title"><h3>{b.pet.name} · {b.service.name}</h3><span className={`status ${b.status}`}>{statusLabels[b.status]}</span></div><p>{b.owner.name} · {b.owner.email}</p>{b.pet.notes && <p className="pet-notes">Sobre o pet: {b.pet.notes}</p>}<small>Reserva #{b.id} · {dateTime(b.slot.starts_at)} · {money(b.price_cents)}</small></div>{b.status === 'confirmed' && <div className="inline-actions"><button className="btn ghost small" disabled={busy || new Date(b.slot.starts_at) > new Date()} onClick={() => changeStatus(b, 'completed')}>Concluir</button><button className="btn danger small" disabled={busy} onClick={() => changeStatus(b, 'cancelled')}>Cancelar</button></div>}</article>) : <Empty title="Um dia tranquilo por aqui">Nenhum agendamento para a data selecionada.</Empty>}</div>}
      {tab === 'horarios' && <div className="panel"><h2>Disponibilidade da estação</h2><p className="muted">Uma estação, um pet por horário. Bloqueie pausas ou libere horários que ainda não foram reservados.</p><div className="admin-slots">{slots.map(s => <div key={s.id} className={`admin-slot ${s.reserved ? 'reserved' : !s.active ? 'blocked' : ''}`}><strong>{hour(s.starts_at)}</strong><span>{s.reserved ? 'Reservado' : s.active ? 'Disponível' : 'Bloqueado'}</span><button className="icon-btn" disabled={busy || s.reserved || new Date(s.starts_at) <= new Date()} aria-label={`${s.active ? 'Bloquear' : 'Liberar'} ${hour(s.starts_at)}`} onClick={() => action(() => api(`/admin/slots/${s.id}`, json('PATCH', { active: !s.active })), 'Disponibilidade atualizada.')}>{s.active ? <LockKeyhole size={18} /> : <UnlockKeyhole size={18} />}</button></div>)}</div>{!slots.length && <Empty title="A agenda ainda não foi aberta">Use o botão acima para gerar os horários.</Empty>}</div>}
      {tab === 'servicos' && <div className="admin-service-grid"><div className="panel"><h2>{editing ? 'Editar serviço' : 'Novo serviço'}</h2><p className="muted small-text">Nesta versão, todos os atendimentos ocupam 60 minutos.</p><form onSubmit={saveService}><label>Nome<input required minLength={3} maxLength={80} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Descrição<textarea required minLength={10} maxLength={500} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label><label>Preço em reais<input required inputMode="decimal" placeholder="70,00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></label><label className="checkbox"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Disponível para novos agendamentos</label><div className="form-actions"><Submit busy={busy}>Salvar serviço</Submit>{editing && <button type="button" className="btn ghost" onClick={() => { setEditing(null); setForm(blankService) }}>Limpar</button>}</div></form></div><div className="services-admin-list">{services.map(s => <article className="panel" key={s.id}><span className={`status ${s.active ? 'confirmed' : 'cancelled'}`}>{s.active ? 'Ativo' : 'Inativo'}</span><h3>{s.name}</h3><p className="muted">{s.description}</p><div className="block-heading"><strong>{money(s.price_cents)}</strong><button className="text-link" onClick={() => { setEditing(s.id); setForm({ name: s.name, description: s.description, price: (s.price_cents / 100).toFixed(2), active: s.active }) }}>Editar</button></div></article>)}</div></div>}
    </>}
    {metrics && <p className="muted small-text notification-status">Notificações: {metrics.notifications.sent || 0} enviadas · {metrics.notifications.pending || 0} na fila · {metrics.notifications.failed || 0} com falha.</p>}
  </section>
}
