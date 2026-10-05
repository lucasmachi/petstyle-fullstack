[English](README.md) | [Português](leia-me.md)

# PetStyle — Full Stack Pet Care Booking Platform

A web application for managing pet grooming services, including authentication, appointments, staff operations, and data persistence.

PetStyle demonstrates a complete full stack solution connecting a React interface to a Python/FastAPI API, with access control, validation, database persistence, automated tests, and continuous integration.


## Static demonstration

This repository includes a static browser-based demonstration of PetStyle.

The static demo does not require the Python API, SQLite, Redis, or any other external service. It uses fictitious data stored temporarily in the browser, allowing visitors to explore the interface, sign in with demo profiles, manage pets, create and cancel appointments, view the staff panel, and generate a CSV report.

The data is reset when the page is refreshed. No information is sent to or stored on a server.

To run the static demonstration locally:

```bash
cd frontend
npm ci
npm run dev -- --mode demo
```

## Features

### Pet owners

- Sign in and sign out.
- Browse services and available appointment times.
- Create appointments.
- View appointment history and status.
- Form validation and user-friendly error handling.

### Staff

- Sign in with a staff account.
- View incoming appointments.
- Update appointment status.
- Export appointments as CSV.
- Role-based access control.

### Security and quality

- Session-based authentication using an HttpOnly cookie.
- CSRF protection.
- Role-based access control.
- Authentication attempt rate limiting.
- Data validation with typed schemas.
- Automated backend and frontend tests.
- End-to-end tests with Playwright.
- Continuous integration with GitHub Actions.

## Architecture

```text
Browser
   │
   ▼
React + Vite ── /api proxy ──► FastAPI + Uvicorn
                                  │
                                  ▼
                                SQLite
```

During development, Vite forwards `/api` requests to the API at `127.0.0.1:8000`.

Separating the frontend and backend makes the application easier to maintain and test, and allows the services to be deployed independently in the future.

## Technologies

### Frontend

| Technology | Purpose | Why it was chosen |
|---|---|---|
| React | User interface and components | Makes it possible to build a modular, reusable interface. |
| React Router | Page navigation | Organizes routes and supports protected areas for authenticated users. |
| Vite | Development server and build tool | Provides fast startup and straightforward proxy configuration. |
| Tailwind CSS | Interface styling | Helps create consistent layouts using utility classes. |
| Lucide React | Application icons | Provides lightweight, consistent SVG icons. |
| JavaScript/JSX | Frontend language | Keeps the implementation direct and approachable. |

### Backend

| Technology | Purpose | Why it was chosen |
|---|---|---|
| Python | API programming language | Has a mature ecosystem for APIs, data, and testing. |
| FastAPI | REST API framework | Provides type hints, automatic validation, and OpenAPI documentation. |
| Uvicorn | ASGI server | Runs the FastAPI application locally and in compatible production environments. |
| Pydantic Settings | Environment configuration | Centralizes and validates environment variables. |
| SQLAlchemy | ORM and database sessions | Provides an organized, database-independent persistence layer. |
| Alembic | Database migrations | Versions the database schema and makes setup reproducible. |
| SQLite | Demo database | Requires no external service and makes local evaluation easier. |
| Argon2 | Password hashing | Uses a modern algorithm for securely storing passwords. |
| email-validator | Email validation | Rejects invalid email addresses in API contracts. |

### Optional infrastructure

| Technology | Purpose | Why it was chosen |
|---|---|---|
| Redis | Optional cache | Reduces repeated reads in shared environments. |
| Celery | Background tasks | Processes notifications outside the web request cycle. |
| psycopg | PostgreSQL support | Keeps the project ready to migrate from SQLite for production. |
| Dockerfiles | Application packaging | Document how to build isolated application images. |
| Shell scripts | Local automation | Reduces repetitive commands in Unix and Git Bash environments. |
| GitHub Actions | Continuous integration | Automates checks and tests after changes. |

Redis, Celery, PostgreSQL, and Docker are optional extensions. The default demo runs with SQLite alone.

### Testing and code quality

| Technology | Purpose | Why it was chosen |
|---|---|---|
| Pytest | Backend tests | Supports API tests, fixtures, and isolated scenarios. |
| Vitest | Frontend tests | Integrates with Vite and runs quickly. |
| Testing Library | UI tests | Focuses on behavior users can observe. |
| jsdom | Frontend test environment | Simulates basic browser features during unit tests. |
| Playwright | End-to-end tests | Tests the application in a real browser. |
| ESLint | Static analysis | Detects common JavaScript issues. |

## Prerequisites

- Git.
- Python 3.12 or newer.
- Node.js and npm.

WSL is not required. You can run the project on Windows using Git Bash or PowerShell, as well as on Linux or macOS.

## Run on Windows with Git Bash

### 1. Clone the repository

```bash
git clone https://github.com/lucasmachi/petstyle-fullstack.git
cd petstyle-fullstack
```

### 2. Set up and start the backend

Open a Git Bash terminal in the project root:

```bash
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements-dev.txt
cp .env.example .env
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m app.seed --demo
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If the `python` command is unavailable, create the virtual environment with:

```bash
py -3.12 -m venv .venv
```

The API will be available at:

- API: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- OpenAPI schema: http://127.0.0.1:8000/openapi.json
- Health check: http://127.0.0.1:8000/api/health

### 3. Set up and start the frontend

Open a second Git Bash terminal in the project root:

```bash
cd frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

The application will be available at:

http://127.0.0.1:5173

The `vite.config.js` file is configured to forward `/api` requests to `http://127.0.0.1:8000`.

## Run on Windows with PowerShell

### Backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed --demo
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

Open a second PowerShell terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Use `npm.cmd` in PowerShell if the Windows execution policy blocks the `npm.ps1` script.

On Windows, use `requirements-dev.txt` because the locked dependency file includes `uvloop`, which does not support native Windows.

## Run on Linux, macOS, or WSL

### Backend

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

### Frontend

Open a second terminal:

```bash
cd petstyle-fullstack/frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

The `scripts/setup-local.sh` script automates Unix environment setup, including dependency installation, database migrations, demo data seeding, and frontend installation.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Pet owner | `tutor@petstyle.example.com` | `PetStyle123!` |
| Staff | `equipe@petstyle.example.com` | `PetStyle123!` |

These accounts are for local demonstrations only.

## Demo walkthrough

1. Open http://127.0.0.1:5173.
2. Sign in as a pet owner.
3. Browse a service and available appointment time.
4. Create an appointment.
5. Sign out.
6. Sign in as staff.
7. Find the appointment you created.
8. Update its status.
9. Refresh the page and confirm the change persisted.
10. Try an incorrect password and confirm access is denied.

## Automated tests

### Backend

Windows with PowerShell:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

Windows with Git Bash:

```bash
cd backend
.venv/Scripts/python.exe -m pytest -q
```

Linux, macOS, or WSL:

```bash
cd backend
.venv/bin/python -m pytest -q
```

Backend tests cover authentication, permissions, appointments, validation, and notifications.

Validated during development: **18 tests passed**.

### Frontend

Windows with PowerShell:

```powershell
cd frontend
npm.cmd test -- --run
npm.cmd run lint
npm.cmd run build
```

Windows with Git Bash, Linux, macOS, or WSL:

```bash
cd frontend
npm test -- --run
npm run lint
npm run build
```

Validated during development: **4 tests passed**.

### End-to-end

With the backend and frontend running:

PowerShell:

```powershell
cd frontend
npx.cmd playwright install
npm.cmd run test:e2e
```

Git Bash, Linux, macOS, or WSL:

```bash
cd frontend
npx playwright install
npm run test:e2e
```

The end-to-end flow is defined in `frontend/e2e/flows.spec.js`.

## Project structure

```text
petstyle-fullstack/
├── .github/
│   └── workflows/
│       └── ci.yml              # Continuous integration pipeline
├── backend/
│   ├── app/
│   │   ├── routes/             # Authentication, pet owner, and staff routes
│   │   ├── cache.py            # Optional cache
│   │   ├── config.py           # Environment configuration
│   │   ├── db.py               # SQLAlchemy engine and sessions
│   │   ├── domain.py           # Business rules
│   │   ├── models.py           # Persisted models
│   │   ├── schemas.py          # API contracts and validation
│   │   ├── security.py         # Sessions, CSRF, and rate limiting
│   │   ├── tasks.py            # Background tasks
│   │   └── main.py             # FastAPI application entry point
│   ├── migrations/             # Alembic migrations
│   ├── tests/                  # Backend tests
│   ├── requirements.txt        # Production dependencies
│   ├── requirements-dev.txt    # Development dependencies
│   ├── pyproject.toml          # Test and lint configuration
│   └── Dockerfile              # Backend image
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── pages/              # Application pages
│   │   ├── api.js              # HTTP client and CSRF handling
│   │   ├── auth.jsx            # Authentication context
│   │   └── App.jsx             # Main routes
│   ├── e2e/                    # End-to-end tests
│   ├── public/                 # Static assets
│   ├── package.json            # Scripts and dependencies
│   ├── vite.config.js          # Proxy and Vitest configuration
│   ├── playwright.config.js    # Playwright configuration
│   └── Dockerfile              # Frontend image
├── scripts/
│   ├── setup-local.sh          # Automated setup
│   ├── run-api.sh              # Start the API
│   └── run-web.sh              # Start the frontend
├── .env.example                # Environment variable examples
├── .gitignore                  # Ignored files
├── .nvmrc                      # Expected Node.js version
└── .python-version             # Expected Python version
```

## Security

- The session identifier is stored in an `HttpOnly` cookie.
- Mutating requests require a CSRF token.
- Routes check authentication and user role.
- Pet owners can access only their own appointments.
- Authentication attempts are rate-limited.
- Production configuration requires secure cookies and HTTPS origins.
- Passwords are not stored in plain text.

## CI/CD

The `.github/workflows/ci.yml` workflow automates:

- Python environment setup.
- Backend tests.
- Frontend dependency installation and tests.
- Build validation.
- Service startup.
- API health checks.
- Playwright end-to-end tests.

## Future improvements

- Automated deployment.
- PostgreSQL for production.
- Managed Redis.
- Real email notifications.
- Password recovery.
- Email verification.
- Observability with metrics and logs.
- Additional end-to-end tests.

## License

This project is available for educational and portfolio purposes.
