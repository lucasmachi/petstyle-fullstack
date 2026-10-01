// Cookie HttpOnly mantém o identificador de sessão fora do JavaScript.
// O CSRF permanece apenas em memória e é recuperado por /auth/me.
let csrf = ''
export function setCsrf(value) { csrf = value || '' }
export async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  if (csrf && options.method && options.method !== 'GET') headers['X-CSRF-Token'] = csrf
  let response
  try { response = await fetch(`/api${path}`, { ...options, headers, credentials: 'same-origin' }) }
  catch { throw new Error('Não foi possível conectar. Verifique sua internet e tente novamente.') }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const detail = typeof payload.detail === 'string' ? payload.detail : payload.detail?.[0]?.msg
    const error = new Error(detail || 'Não foi possível concluir. Tente novamente.')
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : response.json()
}
export const json = (method, body) => ({ method, body: JSON.stringify(body) })
