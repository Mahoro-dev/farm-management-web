import type { FormEvent } from 'react'
import { errorText } from './api'

export function labelEnum(value?: string | null): string {
  if (!value) return '—'
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function unitLabel(unit?: string | null): string {
  if (unit === 'ML') return 'ml'
  if (unit === 'LITER') return 'L'
  if (unit === 'GRAM') return 'g'
  if (!unit) return ''
  return labelEnum(unit).toLowerCase()
}

export function animalLabel(animal: { animalNumber: string; name?: string | null }): string {
  return animal.name ? `${animal.animalNumber} · ${animal.name}` : animal.animalNumber
}

export function amount(value?: number | string | null, digits = 2): string {
  if (value === null || value === undefined || value === '') return '—'
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return String(value)
  return number.toLocaleString(undefined, { maximumFractionDigits: digits })
}

export function signedAmount(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value)
  const text = amount(number, 3)
  return number > 0 ? `+${text}` : text
}

export function rwf(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value)
  return `RWF ${number.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function formatWhen(value?: string | null): string {
  if (!value) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function dateInput(offsetDays = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function localInput(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function timeInput(value?: string | null): string {
  if (!value) return ''
  return value.slice(0, 5)
}

export function field(data: FormData, name: string): string | undefined {
  const value = String(data.get(name) ?? '').trim()
  return value.length ? value : undefined
}

export function checked(data: FormData, name: string): boolean {
  return data.get(name) != null
}

export function asNumber(data: FormData, name: string): number | undefined {
  const value = field(data, name)
  if (value == null) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

export function asInstant(data: FormData, name: string): string | undefined {
  const value = field(data, name)
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

const savingForms = new WeakSet<HTMLFormElement>()

export async function saveForm(
  event: FormEvent<HTMLFormElement>,
  setError: (message: string | null) => void,
  setPending: (pending: boolean) => void,
  work: (data: FormData) => Promise<void>,
): Promise<boolean> {
  event.preventDefault()
  const form = event.currentTarget
  if (savingForms.has(form)) return false
  savingForms.add(form)
  setPending(true)
  setError(null)
  try {
    await work(new FormData(form))
    return true
  } catch (error) {
    setError(errorText(error))
    return false
  } finally {
    savingForms.delete(form)
    setPending(false)
  }
}

export function prettyJson(value?: string | null): string {
  if (!value) return ''
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}
