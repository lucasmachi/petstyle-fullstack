import { afterEach, expect, it, vi } from 'vitest'
import { api, json, setCsrf } from './api'
afterEach(() => { vi.unstubAllGlobals(); setCsrf('') })
it('envia o token CSRF nas alterações autenticadas', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 201 }))
  vi.stubGlobal('fetch', fetch); setCsrf('token-de-teste')
  await api('/pets', json('POST', { name: 'Pipoca' }))
  const [url, options] = fetch.mock.calls[0]
  expect(url).toBe('/api/pets')
  expect(options.headers['X-CSRF-Token']).toBe('token-de-teste')
  expect(options.credentials).toBe('same-origin')
})
it('preserva o código de conflito para atualizar a agenda', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Horário ocupado' }), { status: 409 })))
  await expect(api('/bookings', json('POST', {}))).rejects.toMatchObject({ message: 'Horário ocupado', status: 409 })
})
