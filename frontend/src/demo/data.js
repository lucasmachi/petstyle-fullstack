//dados fictícios usados somente na demonstração estática!!
//cada chamada cria uma cópia nova para reiniciar a experiência

export function criarDadosDemo() {
  return {
    //nenhum perfil começa conectado
    usuarioAtualId: null,

    usuarios: [
      {
        id: 1,
        name: 'Lucas Demo',
        email: 'tutor@petstyle.example.com',
        role: 'customer',
      },
      {
        id: 2,
        name: 'Equipe Pet Style',
        email: 'equipe@petstyle.example.com',
        role: 'staff',
      },
    ],

    servicos: [
      {
        id: 1,
        name: 'Banho & carinho',
        description:
          'Banho com produtos adequados, secagem cuidadosa e aquele cheirinho de abraço.',
        price_cents: 7000,
        duration_minutes: 60,
        active: true,
      },
      {
        id: 2,
        name: 'Banho + tosa',
        description:
          'Um cuidado completo: banho, secagem e tosa para deixar seu melhor amigo confortável.',
        price_cents: 11000,
        duration_minutes: 60,
        active: true,
      },
      {
        id: 3,
        name: 'Cuidado felino',
        description:
          'Um horário tranquilo e exclusivo para o seu gato, com manejo gentil e atenção individual.',
        price_cents: 9000,
        duration_minutes: 60,
        active: true,
      },
    ],

    pets: [
      {
        id: 1,
        owner_id: 1,
        name: 'Zeca',
        species: 'dog',
        size: 'small',
        notes: 'Adora carinho atrás da orelha.',
        active: true,
      },
      {
        id: 2,
        owner_id: 1,
        name: 'Breno',
        species: 'cat',
        size: 'small',
        notes: 'Prefere um ambiente tranquilo.',
        active: true,
      },
    ],

    //preenchidos pela lógica da demonstração.
    //Os horários são gerados conforme a data da visita
    horarios: [],
    agendamentos: [],

    //contadores para identificar novos registros
    proximoUsuarioId: 3,
    proximoPetId: 3,
    proximoServicoId: 4,
    proximoHorarioId: 1,
    proximoAgendamentoId: 1,
  }
}