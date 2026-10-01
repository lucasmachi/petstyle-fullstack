import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarCheck2, Check, Clock3, PawPrint, ShieldCheck } from 'lucide-react'
import { api, json } from '../api'
import { dateTime, hour, money, today } from '../format'
import { Empty, Loading, Notice, PageHeading, Submit } from '../components/UI'
export default function Booking() {
  const [query] = useSearchParams()
  const [services, setServices] = useState([])
  const [pets, setPets] = useState([])
  const [serviceId, setServiceId] = useState(Number(query.get('servico')) || 0)
  const [petId, setPetId] = useState(0)
  const [day, setDay] = useState(today())
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  const requestKey = useRef(null)
  useEffect(() => { Promise.all([api('/services'), api('/pets')]).then(([s, p]) => { setServices(s); setPets(p); if (p.length) setPetId(p[0].id); if (!s.some(x => x.id === Number(query.get('servico')))) setServiceId(s[0]?.id || 0) }).catch(e => setError(e.message)).finally(() => setLoading(false)) }, [query])
  useEffect(() => {
    let alive = true; setSlot(null); setSlotsLoading(true); setError('')
    api(`/slots?day=${day}`).then(s => { if (alive) setSlots(s) }).catch(e => { if (alive) setError(e.message) }).finally(() => { if (alive) setSlotsLoading(false) })
    return () => { alive = false }
  }, [day])
  useEffect(() => { requestKey.current = null }, [serviceId, petId, slot?.id])
  const selectedService = services.find(s => s.id === serviceId)
  const selectedPet = pets.find(p => p.id === petId)
  async function confirm() {
    setBusy(true); setError('')
    try {
      requestKey.current ||= crypto.randomUUID()
      setDone(await api('/bookings', json('POST', { pet_id: petId, service_id: serviceId, slot_id: slot.id, request_id: requestKey.current })))
    } catch (e) {
      setError(e.message)
      if (e.status === 409) { setSlots(await api(`/slots?day=${day}`).catch(() => [])); setSlot(null); setStep(2) }
    } finally { setBusy(false) }
  }
  if (loading) return <div className="section container"><Loading /></div>
  if (done) return <section className="section container"><div className="confirmation panel"><span className="confirmation-icon"><CalendarCheck2 size={38} /></span><p className="eyebrow">PODE PREPARAR O CARINHO</p><h1>Está marcado!</h1><p>{done.pet.name} tem um encontro com o bem-estar.</p><div className="confirmation-details"><strong>{done.service.name}</strong><span>{dateTime(done.slot.starts_at)}</span><span>{money(done.price_cents)} · Reserva #{done.id}</span></div><Link className="btn primary" to="/minha-area">Ver meus agendamentos <ArrowRight size={18} /></Link><p className="muted small-text">O atendimento é demonstrativo. Horário de São Paulo.</p></div></section>
  return <section className="section container app-page"><PageHeading eyebrow="UM MOMENTO SÓ DELE" title="Vamos marcar um cuidado?">Escolha o serviço, o melhor horário e pronto.</PageHeading><div className="stepper" aria-label={`Etapa ${step} de 3`}>{['O cuidado', 'O horário', 'A confirmação'].map((label, i) => <span key={label} className={step >= i + 1 ? 'current' : ''}><b>{step > i + 1 ? <Check size={17} /> : i + 1}</b>{label}</span>)}</div><Notice>{error}</Notice>
    {!pets.length ? <Empty title="Vamos conhecer seu pet primeiro?" action={<Link className="btn primary" to="/minha-area">Cadastrar meu pet</Link>}>É rapidinho. Depois, você escolhe o melhor horário.</Empty> : <div className="booking-grid"><div className="panel booking-main">
      {step === 1 && <><h2>Quem vai receber o carinho?</h2><div className="choice-pets">{pets.map(p => <button key={p.id} className={`choice ${p.id === petId ? 'selected' : ''}`} onClick={() => setPetId(p.id)}><PawPrint size={20} />{p.name}{p.id === petId && <Check size={17} />}</button>)}</div><h2>Qual cuidado vamos escolher?</h2><div className="choice-services">{services.map(s => <button key={s.id} className={`choice service-choice ${s.id === serviceId ? 'selected' : ''}`} onClick={() => setServiceId(s.id)}><div><strong>{s.name}</strong><small>{s.description}</small><span><Clock3 size={14} /> {s.duration_minutes} min</span></div><b>{money(s.price_cents)}</b></button>)}</div><button className="btn primary" disabled={!serviceId || !petId} onClick={() => setStep(2)}>Escolher horário <ArrowRight size={18} /></button></>}
      {step === 2 && <><h2>Qual é o melhor dia?</h2><label>Data do atendimento<input type="date" min={today()} value={day} onChange={e => { if (e.target.value) setDay(e.target.value) }} /></label><p className="muted small-text">Segunda a sábado, com intervalo entre 12h e 13h. Horários de São Paulo.</p>{slotsLoading ? <Loading text="Consultando a agenda…" /> : slots.length ? <div className="slots-grid">{slots.map(s => <button className={`slot-btn ${slot?.id === s.id ? 'selected' : ''}`} key={s.id} onClick={() => setSlot(s)}>{hour(s.starts_at)}</button>)}</div> : <Empty title="Nenhum horário neste dia">Tente outra data. A agenda pode estar cheia ou ainda não ter sido aberta pela equipe.</Empty>}<div className="form-actions"><button className="btn ghost" onClick={() => setStep(1)}><ArrowLeft size={17} /> Voltar</button><button className="btn primary" disabled={!slot} onClick={() => setStep(3)}>Revisar reserva <ArrowRight size={17} /></button></div></>}
      {step === 3 && <><h2>Tudo certo para o encontro?</h2><p className="muted">Confira os detalhes ao lado antes de confirmar.</p><div className="policy-box"><ShieldCheck size={24} /><div><strong>Um horário reservado só para seu pet</strong><p>Cancelamento on-line até 2 horas antes. O valor é registrado no momento da reserva. Pagamento no local, sem cobrança on-line.</p></div></div><div className="form-actions"><button className="btn ghost" disabled={busy} onClick={() => setStep(2)}><ArrowLeft size={17} /> Voltar</button><Submit busy={busy} onClick={confirm}>Confirmar agendamento</Submit></div></>}
    </div><aside className="booking-summary"><p className="eyebrow">SEU MOMENTO DE CUIDADO</p><span className="summary-paw"><PawPrint size={31} /></span><h3>{selectedPet?.name}</h3><dl><div><dt>Serviço</dt><dd>{selectedService?.name || 'Selecione'}</dd></div><div><dt>Duração</dt><dd>60 minutos</dd></div><div><dt>Quando</dt><dd>{slot ? dateTime(slot.starts_at) : 'Vamos escolher'}</dd></div><div className="summary-total"><dt>Total</dt><dd>{selectedService ? money(selectedService.price_cents) : '—'}</dd></div></dl><small>Carinho incluído. Sempre.</small></aside></div>}
  </section>
}
