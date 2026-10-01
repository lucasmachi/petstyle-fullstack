export const money = (cents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
export const dateTime = (value) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
export const hour = (value) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export const statusLabels = { confirmed: 'Confirmado', cancelled: 'Cancelado', completed: 'Concluído' }
export const speciesLabels = { dog: 'Cachorro', cat: 'Gato' }
export const sizeLabels = { small: 'Pequeno', medium: 'Médio', large: 'Grande' }
export function priceToCents(value) {
  const normalized = String(value).trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Informe um preço válido, como 70,00.')
  const result = Math.round(Number(normalized) * 100)
  if (result <= 0 || result > 100000) throw new Error('O valor deve estar entre R$ 0,01 e R$ 1.000,00.')
  return result
}
