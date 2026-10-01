# PetStyle — Plataforma de agendamento para cuidados com pets

Aplicação web full stack para gestão de serviços de banho e tosa, criada como projeto de portfólio com foco em uma experiência próxima de um produto real: autenticação, agendamento, gestão operacional e persistência de dados.

O projeto demonstra minha capacidade de transformar uma necessidade de negócio em uma solução web completa, conectando uma interface React a uma API Python/FastAPI, com controle de acesso, validações, banco de dados e testes automatizados.

## Visão geral

O PetStyle possui dois perfis de uso:

- **Tutor:** acessa sua conta, consulta serviços e horários, cria agendamentos e acompanha o status dos atendimentos.
- **Equipe:** visualiza os agendamentos e atualiza o andamento operacional dos serviços.

O sistema foi estruturado para ser simples de executar localmente e fácil de evoluir para uma arquitetura com banco, cache, notificações e deploy em ambiente de produção.

## Funcionalidades

### Experiência do tutor

- Login com sessão baseada em cookie HttpOnly.
- Proteção contra requisições não autorizadas.
- Consulta de serviços e horários disponíveis.
- Criação de agendamentos.
- Consulta do histórico e status dos agendamentos.
- Validação de dados e tratamento de erros na interface.

### Operação da equipe

- Login com perfil administrativo.
- Visualização dos agendamentos recebidos.
- Atualização do status do atendimento.
- Separação de permissões entre tutor e equipe.

### Qualidade e segurança

- API RESTful com FastAPI.
- Validação de dados com schemas tipados.
- Sessão com cookie HttpOnly e proteção CSRF.
- Controle de acesso por perfil.
- Persistência local com SQLite para demonstração.
- Testes automatizados de backend e frontend.

## Stack tecnológica

| Camada | Tecnologias |
|---|---|
| Frontend | React, Vite, JavaScript, Tailwind CSS |
| Backend | Python, FastAPI, Uvicorn |
| Banco de dados | SQLite, SQLAlchemy, Alembic |
| Testes | Pytest, Vitest, Testing Library |
| Infraestrutura | Scripts shell, Podman/Compose para ambientes auxiliares |
| API | REST, documentação automática com Swagger/OpenAPI |

## Arquitetura resumida

```text
Navegador
   │
   ▼
React + Vite ── proxy /api ──► FastAPI
                                  │
                                  ▼
                              SQLite
```

O frontend utiliza o proxy do Vite para encaminhar as requisições `/api` ao backend. A separação entre interface e API facilita testes, manutenção e uma futura publicação dos serviços de forma independente.

## Como executar localmente

### Pré-requisitos

- Python 3.11 ou superior
- Node.js e npm
- Git

### 1. Backend

Na raiz do projeto:

```bash
cd backend

# Caso o ambiente ainda não exista
python -m venv .venv
.venv/bin/pip install -r requirements.txt

# Iniciar a API
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

A API ficará disponível em:

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- OpenAPI: http://localhost:8000/openapi.json

### 2. Frontend

Em outro terminal, a partir da raiz do projeto:

```bash
cd frontend
npm install

API_PROXY_TARGET=http://127.0.0.1:8000 \
npm run dev -- --host 127.0.0.1 --port 5173
```

A aplicação ficará disponível em:

http://localhost:5173

## Contas de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Tutor | `tutor@petstyle.example.com` | `PetStyle123!` |
| Equipe | `equipe@petstyle.example.com` | `PetStyle123!` |

Essas credenciais existem apenas para demonstração local. Em um ambiente real, as senhas devem ser configuradas por variáveis de ambiente e nunca publicadas no repositório.

## Roteiro de demonstração

1. Entrar como tutor.
2. Consultar serviços e horários.
3. Criar um agendamento.
4. Sair da conta.
5. Entrar como equipe.
6. Localizar o agendamento criado.
7. Atualizar o status do atendimento.
8. Atualizar a página e confirmar a persistência da alteração.
9. Testar uma senha inválida e confirmar que o acesso é recusado.

## Testes automatizados

### Backend

```bash
cd backend
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest -q
```

Resultado validado neste projeto: **18 testes aprovados**.

### Frontend

```bash
cd frontend
npm test -- --run
```

Resultado validado neste projeto: **4 testes aprovados**.

## Endpoints e documentação

A documentação interativa está disponível no Swagger:

http://localhost:8000/docs

Ela permite explorar os endpoints, consultar schemas e testar os contratos da API durante o desenvolvimento.

## Estrutura principal

```text
petstyle/
├── backend/
│   ├── app/
│   │   ├── routes/       # Rotas de autenticação, cliente e administração
│   │   ├── models.py     # Modelos persistidos
│   │   ├── schemas.py    # Validação e contratos da API
│   │   ├── security.py   # Sessão, autenticação e proteção
│   │   └── main.py       # Entrada da aplicação FastAPI
│   ├── migrations/       # Evolução do schema do banco
│   └── tests/            # Testes de integração e regras da API
├── frontend/
│   └── src/
│       ├── components/   # Componentes reutilizáveis
│       ├── pages/        # Telas da aplicação
│       ├── api.js        # Cliente HTTP e sessão
│       └── App.jsx       # Composição principal
├── scripts/              # Scripts de execução e suporte
└── docs/                 # Documentação técnica e roteiro do projeto
```

## Decisões técnicas relevantes

- **FastAPI:** escolhido pela produtividade, tipagem, validação automática e documentação OpenAPI integrada.
- **React + Vite:** permite construir uma interface modular com ciclo de desenvolvimento rápido.
- **Sessão HttpOnly:** reduz a exposição do identificador de sessão ao JavaScript do navegador.
- **Proxy do Vite:** mantém as chamadas da aplicação em `/api` durante o desenvolvimento e evita acoplamento da interface a uma URL fixa.
- **SQLite no modo demo:** reduz a barreira de execução para recrutadores e avaliadores, mantendo a possibilidade de trocar o banco em outros ambientes.
- **Testes separados por camada:** facilitam identificar se uma regressão está na API ou na interface.

## Próximas evoluções

- Deploy automatizado com CI/CD.
- Uso de PostgreSQL em produção.
- Notificações por e-mail com fila de tarefas.
- Cache de serviços e horários.
- Recuperação de senha e verificação de e-mail.
- Observabilidade com logs estruturados, métricas e rastreamento de erros.
- Testes end-to-end cobrindo o fluxo completo no navegador.

## Sobre o projeto

O PetStyle foi desenvolvido como projeto de portfólio para demonstrar conhecimentos em desenvolvimento web full stack, especialmente na construção de APIs com Python/FastAPI, integração com frontend React, autenticação, persistência de dados, testes e organização de um produto digital orientado a uma necessidade de negócio.

## Licença

Este projeto é disponibilizado para fins educacionais e de portfólio.
