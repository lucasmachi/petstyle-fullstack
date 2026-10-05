import { criarDadosDemo } from './data'

let dados = criarDadosDemo()

//senhas fictícias usadas apenas na demo local
let senhas = criarSenhasDemo()

function criarSenhasDemo() {
  return new Map([
    [1, 'PetStyle123!'],
    [2, 'PetStyle123!'],
  ])
}

function erro(mensagem, status = 400) {
  const e = new Error(mensagem)
  e.status = status
  throw e
}

function copiar(valor) {
  return JSON.parse(JSON.stringify(valor))
}

function usuarioAtual() {
  const usuario = dados.usuarios.find(
    (u) => u.id === dados.usuarioAtualId
  )

  if (!usuario) erro('Entre na demonstração para continuar.', 401)

  return usuario
}

function exigirEquipe() {
  const usuario = usuarioAtual()

  if (usuario.role !== 'staff') {
    erro('Esta área pertence ao perfil de equipe.', 403)
  }

  return usuario
}

function texto(valor, minimo, maximo, campo) {
  const resultado = String(valor ?? '').trim()

  if (resultado.length < minimo || resultado.length > maximo) {
    erro(`${campo}: use entre ${minimo} e ${maximo} caracteres.`)
  }

  return resultado
}

//pega data independente do fuso
function hoje() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const valor = (tipo) => partes.find((p) => p.type === tipo).value

  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

function validarData(dia) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia || '')) {
    erro('Escolha uma data válida.')
  }

  const data = new Date(`${dia}T12:00:00Z`)

  if (
    Number.isNaN(data.getTime()) ||
    data.toISOString().slice(0, 10) !== dia
  ) {
    erro('Escolha uma data válida.')
  }

  return data
}

function somarDias(dia, quantidade) {
  const data = validarData(dia)
  data.setUTCDate(data.getUTCDate() + quantidade)
  return data.toISOString().slice(0, 10)
}

function gerarHorarios(dia) {
  const data = validarData(dia)

  if (dia < hoje() || dia > somarDias(hoje(), 90)) return 0
  if (data.getUTCDay() === 0) return 0

  const horas = [8, 9, 10, 11, 13, 14, 15, 16, 17]
  let criados = 0

  for (const hora of horas) {
    const inicio = new Date(
      `${dia}T${String(hora).padStart(2, '0')}:00:00-03:00`
    ).toISOString()

    if (dados.horarios.some((h) => h.starts_at === inicio)) continue

    dados.horarios.push({
      id: dados.proximoHorarioId++,
      day: dia,
      starts_at: inicio,
      active: true,
      reserved: false,
    })

    criados += 1
  }

  return criados
}

function petDoUsuario(id) {
  const usuario = usuarioAtual()
  const pet = dados.pets.find(
    (p) =>
      p.id === Number(id) &&
      p.owner_id === usuario.id &&
      p.active
  )

  if (!pet) erro('Pet não encontrado.', 404)

  return pet
}

function validarPet(body) {
  if (!['dog', 'cat'].includes(body.species)) {
    erro('Selecione cachorro ou gato.')
  }

  if (!['small', 'medium', 'large'].includes(body.size)) {
    erro('Selecione um porte válido.')
  }

  return {
    name: texto(body.name, 1, 60, 'Nome do pet'),
    species: body.species,
    size: body.size,
    notes: texto(body.notes ?? '', 0, 500, 'Observações'),
  }
}

function validarServico(body, idAtual = null) {
  const name = texto(body.name, 3, 80, 'Nome do serviço')

  if (
    dados.servicos.some(
      (s) =>
        s.id !== idAtual &&
        s.name.toLowerCase() === name.toLowerCase()
    )
  ) {
    erro('Já existe um serviço com este nome.', 409)
  }

  if (
    !Number.isInteger(body.price_cents) ||
    body.price_cents <= 0 ||
    body.price_cents > 100000
  ) {
    erro('Informe um preço entre R$ 0,01 e R$ 1.000,00.')
  }

  return {
    name,
    description: texto(body.description, 10, 500, 'Descrição'),
    price_cents: body.price_cents,
    duration_minutes: 60,
    active: body.active !== false,
  }
}

function apresentarAgendamento(registro) {
  const pet = dados.pets.find((p) => p.id === registro.pet_id)
  const slot = dados.horarios.find((h) => h.id === registro.slot_id)
  const owner = dados.usuarios.find((u) => u.id === registro.owner_id)

  return {
    id: registro.id,
    pet,
    service: registro.service,
    slot,
    owner: {
      name: owner.name,
      email: owner.email,
    },
    status: registro.status,
    price_cents: registro.price_cents,
    created_at: registro.created_at,
  }
}

function alterarAgendamento(id, status, equipe = false) {
  const usuario = equipe ? exigirEquipe() : usuarioAtual()
  const registro = dados.agendamentos.find(
    (b) =>
      b.id === Number(id) &&
      (equipe || b.owner_id === usuario.id)
  )

  if (!registro) erro('Agendamento não encontrado.', 404)

  if (!['cancelled', 'completed'].includes(status)) {
    erro('Status inválido.')
  }

  if (!equipe && status !== 'cancelled') {
    erro('Somente a equipe pode concluir atendimentos.', 403)
  }

  if (registro.status !== 'confirmed') {
    erro('Este agendamento já foi encerrado.', 409)
  }

  const horario = dados.horarios.find(
    (h) => h.id === registro.slot_id
  )

  const inicio = new Date(horario.starts_at).getTime()

  if (!equipe && inicio - Date.now() < 2 * 60 * 60 * 1000) {
    erro('O cancelamento exige pelo menos 2 horas de antecedência.')
  }

  if (status === 'completed' && inicio > Date.now()) {
    erro('O atendimento ainda não começou.')
  }

  registro.status = status

  if (status === 'cancelled') {
    horario.reserved = false
  }

  return apresentarAgendamento(registro)
}

function responder(path, options = {}) {
  const url = new URL(path, 'https://petstyle.example')
  const rota = url.pathname
  const metodo = (options.method || 'GET').toUpperCase()
  const body = options.body ? JSON.parse(options.body) : {}

  // Configuração pública da demonstração
  if (rota === '/config' && metodo === 'GET') {
    return {
      demo_mode: true,
      static_demo: true,
      timezone: 'America/Sao_Paulo',
      cancellation_hours: 2,
      slot_minutes: 60,
    }
  }

  // Perfis e sessão simulada
  if (rota === '/auth/me' && metodo === 'GET') {
    return {
      user: usuarioAtual(),
      csrf_token: '',
    }
  }

  if (rota === '/auth/login' && metodo === 'POST') {
    const email = String(body.email || '').trim().toLowerCase()
    const usuario = dados.usuarios.find((u) => u.email === email)

    if (!usuario || senhas.get(usuario.id) !== body.password) {
      erro('E-mail ou senha incorretos.', 401)
    }

    dados.usuarioAtualId = usuario.id

    return { user: usuario, csrf_token: '' }
  }

  if (rota === '/auth/register' && metodo === 'POST') {
    const name = texto(body.name, 2, 80, 'Nome')
    const email = texto(body.email, 3, 254, 'E-mail').toLowerCase()
    const password = String(body.password || '')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      erro('Informe um e-mail válido.')
    }

    if (password.length < 8 || password.length > 128) {
      erro('Use uma senha fictícia entre 8 e 128 caracteres.')
    }

    if (dados.usuarios.some((u) => u.email === email)) {
      erro('Este e-mail já está cadastrado nesta demonstração.', 409)
    }

    const usuario = {
      id: dados.proximoUsuarioId++,
      name,
      email,
      role: 'customer',
    }

    dados.usuarios.push(usuario)
    senhas.set(usuario.id, password)
    dados.usuarioAtualId = usuario.id

    return { user: usuario, csrf_token: '' }
  }

  if (rota === '/auth/logout' && metodo === 'POST') {
    dados.usuarioAtualId = null
    return null
  }

  //serviços
  if (rota === '/services' && metodo === 'GET') {
    return dados.servicos
      .filter((s) => s.active)
      .sort((a, b) => a.price_cents - b.price_cents)
  }

  if (rota === '/pets' && metodo === 'GET') {
    const usuario = usuarioAtual()

    return dados.pets.filter(
      (p) => p.owner_id === usuario.id && p.active
    )
  }

  if (rota === '/pets' && metodo === 'POST') {
    const usuario = usuarioAtual()
    const campos = validarPet(body)

    const pet = {
      id: dados.proximoPetId++,
      owner_id: usuario.id,
      ...campos,
      active: true,
    }

    dados.pets.push(pet)
    return pet
  }

  const petMatch = rota.match(/^\/pets\/(\d+)$/)

  if (petMatch && metodo === 'PUT') {
    const pet = petDoUsuario(petMatch[1])
    Object.assign(pet, validarPet(body))
    return pet
  }

  if (petMatch && metodo === 'DELETE') {
    const pet = petDoUsuario(petMatch[1])

    if (
      dados.agendamentos.some(
        (b) => b.pet_id === pet.id && b.status === 'confirmed'
      )
    ) {
      erro('Cancele ou conclua os agendamentos antes de arquivar o pet.', 409)
    }

    pet.active = false
    return null
  }

  // Horários disponíveis
  if (rota === '/slots' && metodo === 'GET') {
    const dia = url.searchParams.get('day')
    gerarHorarios(dia)

    return dados.horarios.filter(
      (h) =>
        h.day === dia &&
        h.active &&
        !h.reserved &&
        new Date(h.starts_at).getTime() > Date.now()
    )
  }

  //agendamentos
  if (rota === '/bookings' && metodo === 'GET') {
    const usuario = usuarioAtual()

    return dados.agendamentos
      .filter((b) => b.owner_id === usuario.id)
      .sort((a, b) => b.id - a.id)
      .map(apresentarAgendamento)
  }

  if (rota === '/bookings' && metodo === 'POST') {
    const usuario = usuarioAtual()

    //impede que repetir a solicitação crie duas reservas
    if (body.request_id) {
      const existente = dados.agendamentos.find(
        (b) =>
          b.owner_id === usuario.id &&
          b.request_id === body.request_id
      )

      if (existente) return apresentarAgendamento(existente)
    }

    const pet = petDoUsuario(body.pet_id)
    const servico = dados.servicos.find(
      (s) => s.id === Number(body.service_id) && s.active
    )
    const horario = dados.horarios.find(
      (h) => h.id === Number(body.slot_id)
    )

    if (!servico) erro('Serviço indisponível.', 404)

    if (
      !horario ||
      !horario.active ||
      horario.reserved ||
      new Date(horario.starts_at).getTime() <= Date.now()
    ) {
      erro('Este horário não está disponível. Escolha outro.', 409)
    }

    const registro = {
      id: dados.proximoAgendamentoId++,
      owner_id: usuario.id,
      pet_id: pet.id,
      slot_id: horario.id,
      service: copiar(servico),
      price_cents: servico.price_cents,
      status: 'confirmed',
      request_id: body.request_id || null,
      created_at: new Date().toISOString(),
    }

    horario.reserved = true
    dados.agendamentos.push(registro)

    return apresentarAgendamento(registro)
  }

  const bookingMatch = rota.match(/^\/bookings\/(\d+)$/)

  if (bookingMatch && metodo === 'PATCH') {
    return alterarAgendamento(bookingMatch[1], body.status)
  }

  //operações perfil equipe (admin)
  if (rota.startsWith('/admin/')) {
    exigirEquipe()
  }

  if (rota === '/admin/bookings' && metodo === 'GET') {
    const dia = url.searchParams.get('day')
    const status = url.searchParams.get('status')

    if (dia) validarData(dia)

    return dados.agendamentos
      .filter((b) => {
        const horario = dados.horarios.find(
          (h) => h.id === b.slot_id
        )

        return (!dia || horario.day === dia) &&
          (!status || b.status === status)
      })
      .sort((a, b) => b.id - a.id)
      .map(apresentarAgendamento)
  }

  const adminBookingMatch = rota.match(/^\/admin\/bookings\/(\d+)$/)

  if (adminBookingMatch && metodo === 'PATCH') {
    return alterarAgendamento(
      adminBookingMatch[1],
      body.status,
      true
    )
  }

  if (rota === '/admin/services' && metodo === 'GET') {
    return dados.servicos
  }

  if (rota === '/admin/services' && metodo === 'POST') {
    const campos = validarServico(body)
    const servico = {
      id: dados.proximoServicoId++,
      ...campos,
    }

    dados.servicos.push(servico)
    return servico
  }

  const serviceMatch = rota.match(/^\/admin\/services\/(\d+)$/)

  if (serviceMatch && metodo === 'PUT') {
    const servico = dados.servicos.find(
      (s) => s.id === Number(serviceMatch[1])
    )

    if (!servico) erro('Serviço não encontrado.', 404)

    Object.assign(servico, validarServico(body, servico.id))
    return servico
  }

  if (rota === '/admin/slots' && metodo === 'GET') {
    const dia = url.searchParams.get('day')
    gerarHorarios(dia)

    return dados.horarios.filter((h) => h.day === dia)
  }

  if (rota === '/admin/slots/generate' && metodo === 'POST') {
    const inicio = body.start_date
    const quantidade = Number(body.days)

    validarData(inicio)

    if (
      !Number.isInteger(quantidade) ||
      quantidade < 1 ||
      quantidade > 30
    ) {
      erro('Escolha entre 1 e 30 dias.')
    }

    if (
      inicio < hoje() ||
      somarDias(inicio, quantidade - 1) > somarDias(hoje(), 90)
    ) {
      erro('Escolha datas entre hoje e os próximos 90 dias.')
    }

    let created = 0

    for (let i = 0; i < quantidade; i += 1) {
      created += gerarHorarios(somarDias(inicio, i))
    }

    return { created }
  }

  const slotMatch = rota.match(/^\/admin\/slots\/(\d+)$/)

  if (slotMatch && metodo === 'PATCH') {
    const horario = dados.horarios.find(
      (h) => h.id === Number(slotMatch[1])
    )

    if (
      !horario ||
      horario.reserved ||
      new Date(horario.starts_at).getTime() <= Date.now()
    ) {
      erro('Horário ocupado, passado ou inexistente.', 409)
    }

    if (typeof body.active !== 'boolean') {
      erro('Informe se o horário deve ficar disponível.')
    }

    horario.active = body.active
    return horario
  }

  if (rota === '/admin/metrics' && metodo === 'GET') {
    const contar = (status) =>
      dados.agendamentos.filter((b) => b.status === status).length

    return {
      confirmed: contar('confirmed'),
      completed: contar('completed'),
      cancelled: contar('cancelled'),
      revenue_cents: dados.agendamentos
        .filter((b) => b.status === 'completed')
        .reduce((total, b) => total + b.price_cents, 0),

      //sem sistema de email na demo
      notifications: {
        sent: 0,
        pending: 0,
        failed: 0,
      },
    }
  }

  erro('Operação não disponível nesta demonstração.', 404)
}

//chamada da  API sem requisiçã ode rede
export async function demoApi(path, options = {}) {
  return copiar(responder(path, options))
}

//reiniciar a demonstração
export function reiniciarDemo() {
  dados = criarDadosDemo()
  senhas = criarSenhasDemo()
}

//gera o conteúdo do relatório sem precisar de servidor
export function gerarCsvDemo() {
  exigirEquipe()

  const linhas = [
    ['agendamento', 'pet', 'servico', 'inicio_utc', 'status', 'valor_reais'],
    ...dados.agendamentos.map((b) => {
      const registro = apresentarAgendamento(b)

      return [
        registro.id,
        registro.pet.name,
        registro.service.name,
        registro.slot.starts_at,
        registro.status,
        (registro.price_cents / 100).toFixed(2),
      ]
    }),
  ]

  const escapar = (valor) => {
    let texto = String(valor ?? '')

    if (/^[=+\-@\t\r\n]/.test(texto)) {
      texto = "'" + texto
    }

    return `"${texto.replace(/"/g, '""')}"`
  }

  return '\uFEFF' + linhas
    .map((linha) => linha.map(escapar).join(','))
    .join('\r\n')
}