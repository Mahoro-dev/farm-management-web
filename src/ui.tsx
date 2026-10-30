import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Animal } from './api'
import { animalLabel, labelEnum } from './format'

export function Button({
  tone = 'default',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'default' | 'danger' | 'ghost' }) {
  return (
    <button className={`btn ${tone}${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </button>
  )
}

export function Banner({ children, tone = 'danger' }: { children?: ReactNode; tone?: 'danger' | 'info' }) {
  if (!children) return null
  return <div className={`banner ${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>{children}</div>
}

export function PageHead({ title, lede, action }: { title: string; lede?: string; action?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {lede ? <p>{lede}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

export function FatherLabel({
  sireId,
  sireNumber,
  artificialCode,
}: {
  sireId?: string | null
  sireNumber?: string | null
  artificialCode?: string | null
}) {
  if (artificialCode) {
    return (
      <span className="father">
        <span>{artificialCode}</span>
        <span className="pill">Artificial</span>
      </span>
    )
  }
  if (sireId) return <Link to={`/animals/${sireId}`}>{sireNumber || 'Sire'}</Link>
  return <>—</>
}

export function Pill({ value }: { value?: string | null }) {
  if (!value) return <span className="muted">—</span>
  return <span className={`pill tone-${value.toLowerCase()}`}>{labelEnum(value)}</span>
}

export function Modal({ title, wide, children }: { title: string; wide?: boolean; children: ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])
  return (
    <div className="scrim">
      <div className={`dialog${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { id: T; label: string }[]
}) {
  return (
    <div className="tabs" role="tablist">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          className={value === option.id ? 'on' : ''}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="pager">
      <Button type="button" disabled={page <= 0} onClick={() => onPage(page - 1)}>Previous</Button>
      <span>Page {page + 1} of {totalPages}</span>
      <Button type="button" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  )
}

export function TextField({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  step,
  min,
  max,
  minLength,
  placeholder,
  className,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string | number | null
  step?: string
  min?: string | number
  max?: string | number
  minLength?: number
  placeholder?: string
  className?: string
}) {
  return (
    <label className={`field ${className ?? ''}`}>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ''}
        step={step}
        min={min}
        max={max}
        minLength={minLength}
        placeholder={placeholder}
      />
    </label>
  )
}

export function AreaField({
  label,
  name,
  defaultValue,
  className,
}: {
  label: string
  name: string
  defaultValue?: string | null
  className?: string
}) {
  return (
    <label className={`field ${className ?? ''}`}>
      <span>{label}</span>
      <textarea name={name} defaultValue={defaultValue ?? ''} />
    </label>
  )
}

export function SelectField({
  label,
  name,
  required,
  defaultValue,
  children,
  className,
  onChange,
}: {
  label: string
  name: string
  required?: boolean
  defaultValue?: string | number | null
  children: ReactNode
  className?: string
  onChange?: (value: string) => void
}) {
  return (
    <label className={`field ${className ?? ''}`}>
      <span>{label}</span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ''}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      >
        {children}
      </select>
    </label>
  )
}

export function CheckField({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="check span-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  )
}

export function EnumOptions({ values, blank }: { values: readonly string[]; blank?: string }) {
  return (
    <>
      {blank !== undefined ? <option value="">{blank}</option> : null}
      {values.map((value) => (
        <option key={value} value={value}>{labelEnum(value)}</option>
      ))}
    </>
  )
}

export function AnimalOptions({
  animals,
  blank = 'Select an animal',
  current,
}: {
  animals: Animal[]
  blank?: string
  current?: { id: string; label: string } | null
}) {
  const missing = current && !animals.some((animal) => animal.id === current.id)
  return (
    <>
      <option value="">{blank}</option>
      {missing ? <option value={current.id}>{current.label}</option> : null}
      {animals.map((animal) => (
        <option key={animal.id} value={animal.id}>{animalLabel(animal)}</option>
      ))}
    </>
  )
}

export function FormFooter({ pending, onCancel, label = 'Save' }: { pending: boolean; onCancel: () => void; label?: string }) {
  return (
    <div className="form-footer">
      <Button type="button" onClick={onCancel}>Cancel</Button>
      <Button type="submit" tone="primary" disabled={pending}>{pending ? 'Saving…' : label}</Button>
    </div>
  )
}
