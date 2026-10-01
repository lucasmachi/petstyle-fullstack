import { describe, expect, it } from 'vitest'
import { hour, priceToCents, money } from './format'
describe('Valores monetários e horário brasileiro', () => {
  it('converte reais em centavos sem aceitar preços parciais ou ambíguos', () => {
    expect(priceToCents('70,90')).toBe(7090)
    expect(priceToCents('0.29')).toBe(29)
    expect(priceToCents('1000')).toBe(100000)
    for (const value of ['70abc', '', '-2', '0', '1.234', '1000.01', 'Infinity']) expect(() => priceToCents(value)).toThrow()
  })
  it('mostra o horário da loja independentemente do fuso do navegador', () => {
    expect(hour('2026-10-05T12:00:00Z')).toBe('09:00')
    expect(money(7090)).toContain('70,90')
  })
})
