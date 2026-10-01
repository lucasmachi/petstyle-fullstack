# PetStyle — plataforma full stack de agendamento para pets

Aplicação web para gestão de serviços de banho e tosa, com autenticação, agendamento, gestão operacional e persistência de dados.

O projeto demonstra a construção de uma solução full stack completa, conectando uma interface React a uma API Python/FastAPI, com controle de acesso, validações, banco de dados, testes automatizados e integração contínua.

## Funcionalidades

### Tutor

- Login e logout.
- Consulta de serviços e horários disponíveis.
- Criação de agendamentos.
- Consulta do histórico e status dos agendamentos.
- Validação de formulários.
- Tratamento de erros na interface.

### Equipe

- Login com perfil administrativo.
- Visualização dos agendamentos recebidos.
- Atualização do status dos atendimentos.
- Exportação dos agendamentos em CSV.
- Separação de permissões entre tutor e equipe.

### Segurança e qualidade

- Sessão baseada em cookie HttpOnly.
- Proteção contra CSRF.
- Controle de acesso por perfil.
- Limitação de tentativas de autenticação.
- Validação de dados com schemas tipados.
- Testes automatizados de backend e frontend.
- Testes end-to-end com Playwright.
- Pipeline de CI com GitHub Actions.

## Arquitetura

```text
Navegador
   │
   ▼
React + Vite ── proxy /api ──► FastAPI + Uvicorn
                                  │
                                  ▼
                              SQLite
```

Durante o desenvolvimento, o Vite encaminha as requisições `/api` para a API em `127.0.0.1:8000`.

Essa separação entre frontend e backend facilita manutenção, testes e uma futura publicação dos serviços de forma independente.

## Tecnologias utilizadas

### Frontend

| Tecnologia | Utilização | Motivo da escolha |
|---|---|---|
| React | Construção das telas e componentes | Permite criar uma interface modular e reutilizável. |
| React Router | Navegação entre páginas | Organiza as rotas e permite proteger áreas autenticadas. |
| Vite | Servidor de desenvolvimento e build | Oferece inicialização rápida e configuração simples de proxy. |
| Tailwind CSS | Estilização da interface | Permite desenvolver layouts consistentes com classes utilitárias. |
| Lucide React | Ícones da aplicação | Fornece ícones SVG leves e consistentes. |
| JavaScript/JSX | Linguagem do frontend | Mantém a implementação direta e acessível. |

### Backend

| Tecnologia | Utilização | Motivo da escolha |
|---|---|---|
| Python | Linguagem principal da API | Possui ecossistema maduro para APIs, dados e testes. |
| FastAPI | Framework da API REST | Oferece tipagem, validação automática e documentação OpenAPI. |
| Uvicorn | Servidor ASGI | Executa a aplicação FastAPI localmente e em ambientes de produção. |
| Pydantic Settings | Configuração por ambiente | Centraliza e valida variáveis de ambiente. |
| SQLAlchemy | ORM e sessões do banco | Permite trabalhar com banco de forma organizada e desacoplada. |
| Alembic | Migrações do banco | Versiona a estrutura do banco e torna sua criação reproduzível. |
| SQLite | Banco de demonstração | Não exige serviço externo e facilita a avaliação local. |
| Argon2 | Hash de senhas | Utiliza um algoritmo moderno para armazenamento seguro de senhas. |
| email-validator | Validação de e-mails | Rejeita endereços inválidos nos contratos da API. |

### Infraestrutura opcional

| Tecnologia | Utilização | Motivo da escolha |
|---|---|---|
| Redis | Cache opcional | Reduz leituras repetidas em ambientes compartilhados. |
| Celery | Tarefas assíncronas | Permite processar notificações fora da requisição web. |
| psycopg | PostgreSQL | Mantém o projeto preparado para migrar do SQLite em produção. |
| Dockerfile | Empacotamento | Documenta como criar imagens isoladas da aplicação. |
| Shell scripts | Automação local | Reduz comandos repetitivos em ambientes Unix e Git Bash. |
| GitHub Actions | Integração contínua | Automatiza validações e testes a cada alteração. |

Redis, Celery, PostgreSQL e Docker são extensões opcionais. A demonstração padrão funciona somente com SQLite.

### Testes e qualidade

| Tecnologia | Utilização | Motivo da escolha |
|---|---|---|
| Pytest | Testes do backend | Facilita testes de API, fixtures e cenários isolados. |
| Vitest | Testes do frontend | Integra-se ao Vite e executa rapidamente. |
| Testing Library | Testes de interface | Valida o comportamento percebido pelo usuário. |
| jsdom | Ambiente dos testes frontend | Simula recursos básicos do navegador. |
| Playwright | Testes end-to-end | Valida a aplicação real pelo navegador. |
| ESLint | Análise estática | Detecta problemas comuns no código JavaScript. |

## Pré-requisitos

- Git.
- Python 3.12 ou superior.
- Node.js e npm.

O projeto não exige WSL. É possível executá-lo utilizando Windows com Git Bash, PowerShell, Linux ou macOS.

## Como executar no Windows com Git Bash

### 1. Clonar o projeto

```bash
git clone https://github.com/lucasmachi/petstyle-fullstack.git
cd petstyle-fullstack
```

### 2. Preparar o backend

Abra um terminal Git Bash na raiz do projeto:

```bash
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements-dev.txt
cp .env.example .env
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m app.seed --demo
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Se o comando `python` não existir, utilize:

```bash
py -3.12 -m venv .venv
```

A API ficará disponível em:

- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs
- OpenAPI: http://127.0.0.1:8000/openapi.json
- Health check: http://127.0.0.1:8000/api/health

### 3. Preparar o frontend

Abra um segundo terminal Git Bash na raiz do projeto:

```bash
cd frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

A aplicação ficará disponível em:

http://127.0.0.1:5173

O arquivo `vite.config.js` já está configurado para encaminhar `/api` para a API em `http://127.0.0.1:8000`.

### PowerShell

Backend:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed --demo
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend, em outro terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

No PowerShell, utilize `npm.cmd` caso a política de execução do Windows bloqueie o arquivo `npm.ps1`.

No Windows, utiliza-se `requirements-dev.txt` porque o arquivo de dependências travadas inclui `uvloop`, que não possui suporte nativo ao Windows.

## Linux, macOS ou WSL

Backend:

```bash
git clone https://github.com/lucasmachi/petstyle-fullstack.git
cd petstyle-fullstack/backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.lock.txt
cp .env.example .env
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m app.seed --demo
.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend, em outro terminal:

```bash
cd petstyle-fullstack/frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

O script `scripts/setup-local.sh` automatiza a preparação do ambiente Unix, incluindo instalação das dependências, migrações, seed e instalação do frontend.

## Contas de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Tutor | `tutor@petstyle.example.com` | `PetStyle123!` |
| Equipe | `equipe@petstyle.example.com` | `PetStyle123!` |

Essas contas existem somente para demonstração local.

## Roteiro de demonstração

1. Acesse http://127.0.0.1:5173.
2. Entre como tutor.
3. Consulte um serviço e um horário disponível.
4. Crie um agendamento.
5. Saia da conta.
6. Entre como equipe.
7. Localize o agendamento criado.
8. Atualize o status do atendimento.
9. Atualize a página e confirme a persistência.
10. Teste uma senha inválida.

## Testes automatizados

### Backend

Windows com PowerShell:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

Windows com Git Bash:

```bash
cd backend
.venv/Scripts/python.exe -m pytest -q
```

Linux, macOS ou WSL:

```bash
cd backend
.venv/bin/python -m pytest -q
```

O backend possui testes de autenticação, permissões, agendamentos, validações e notificações.

Resultado validado durante o desenvolvimento: **18 testes aprovados**.

### Frontend

Windows com PowerShell:

```powershell
cd frontend
npm.cmd test -- --run
npm.cmd run lint
npm.cmd run build
```

Windows com Git Bash, Linux, macOS ou WSL:

```bash
cd frontend
npm test -- --run
npm run lint
npm run build
```

Resultado validado durante o desenvolvimento: **4 testes aprovados**.

### End-to-end

PowerShell:

```powershell
cd frontend
npx.cmd playwright install
npm.cmd run test:e2e
```

Git Bash, Linux, macOS ou WSL:

```bash
cd frontend
npx playwright install
npm run test:e2e
```

O fluxo end-to-end está em `frontend/e2e/flows.spec.js`.

## Estrutura do projeto

```text
petstyle-fullstack/
├── .github/
│   └── workflows/
│       └── ci.yml              # Pipeline de integração contínua
├── backend/
│   ├── app/
│   │   ├── routes/             # Rotas de autenticação, tutor e equipe
│   │   ├── cache.py            # Cache opcional
│   │   ├── config.py           # Configurações por ambiente
│   │   ├── db.py               # Engine e sessões SQLAlchemy
│   │   ├── domain.py           # Regras de negócio
│   │   ├── models.py           # Modelos persistidos
│   │   ├── schemas.py          # Contratos e validações
│   │   ├── security.py         # Sessão, CSRF e rate limiting
│   │   ├── tasks.py            # Tarefas assíncronas
│   │   └── main.py             # Entrada da aplicação FastAPI
│   ├── migrations/             # Migrações Alembic
│   ├── tests/                  # Testes do backend
│   ├── requirements.txt        # Dependências de produção
│   ├── requirements-dev.txt    # Dependências de desenvolvimento
│   ├── pyproject.toml          # Configurações de testes e lint
│   └── Dockerfile              # Empacotamento do backend
├── frontend/
│   ├── src/
│   │   ├── components/          # Componentes reutilizáveis
│   │   ├── pages/               # Telas da aplicação
│   │   ├── api.js               # Cliente HTTP e CSRF
│   │   ├── auth.jsx             # Contexto de autenticação
│   │   └── App.jsx              # Rotas principais
│   ├── e2e/                     # Testes end-to-end
│   ├── public/                  # Arquivos estáticos
│   ├── package.json             # Scripts e dependências
│   ├── vite.config.js           # Proxy e configuração do Vitest
│   ├── playwright.config.js     # Configuração do Playwright
│   └── Dockerfile               # Empacotamento do frontend
├── scripts/
│   ├── setup-local.sh           # Preparação automática
│   ├── run-api.sh               # Inicialização da API
│   └── run-web.sh               # Inicialização do frontend
├── .env.example                 # Variáveis de ambiente
├── .gitignore                   # Arquivos ignorados
├── .nvmrc                       # Versão esperada do Node
└── .python-version              # Versão esperada do Python
```

## Segurança

- O identificador da sessão fica em cookie `HttpOnly`.
- Operações de alteração exigem token CSRF.
- As rotas verificam autenticação e perfil.
- O usuário só pode acessar seus próprios agendamentos.
- Existe limitação de tentativas de autenticação.
- A configuração de produção exige cookie seguro e origens HTTPS.
- As senhas não são armazenadas em texto puro.

## CI/CD

O arquivo `.github/workflows/ci.yml` automatiza:

- Preparação do ambiente Python.
- Testes do backend.
- Instalação e testes do frontend.
- Verificação do build.
- Inicialização dos serviços.
- Health check da API.
- Testes end-to-end com Playwright.

## Próximas evoluções

- Deploy automatizado.
- PostgreSQL em produção.
- Redis gerenciado.
- Notificações reais por e-mail.
- Recuperação de senha.
- Verificação de e-mail.
- Observabilidade com métricas e logs.
- Mais testes end-to-end.

## Licença

Projeto disponibilizado para fins educacionais e de portfólio.
