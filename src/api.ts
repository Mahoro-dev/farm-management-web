const base = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

export const TOKEN_KEY = 'farm.token'

export class ApiError extends Error {
  status: number
  violations: FieldViolation[]

  constructor(message: string, status: number, violations: FieldViolation[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.violations = violations
  }
}

export type FieldViolation = { field: string; message: string }

export type Page<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

type ErrorBody = {
  message?: string
  violations?: FieldViolation[] | null
}

export function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong'
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${base}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('Cannot reach the API. Start it on http://localhost:8080.', 0)
  }

  const isAuthPost = path.startsWith('/api/auth/login') || path.startsWith('/api/auth/bootstrap')
  if (response.status === 401 && !isAuthPost) {
    localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new Event('farm:unauthorized'))
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      throw new ApiError(text.slice(0, 180) || response.statusText, response.status)
    }
  }

  if (!response.ok) {
    const body = (data ?? {}) as ErrorBody
    const violations = body.violations ?? []
    const detail = violations.map((item) => `${item.field}: ${item.message}`).join(' ')
    throw new ApiError(detail || body.message || response.statusText, response.status, violations)
  }
  return data as T
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export async function allPages<T>(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
): Promise<T[]> {
  const rows: T[] = []
  for (let page = 0; page < 10; page += 1) {
    const result = await api<Page<T>>(`${path}${qs({ ...params, page, size: 100 })}`)
    rows.push(...result.content)
    if (page + 1 >= result.totalPages) break
  }
  return rows
}

export type Assignment = {
  id: string
  userId: string
  userName: string
  farmId: string
  farmName: string
  roleCode: string
  roleName: string
  assignedAt: string
  endedAt?: string | null
}

export type User = {
  id: string
  organizationId: string
  fullName: string
  email: string
  phone?: string | null
  active: boolean
  lastLoginAt?: string | null
  createdAt?: string | null
  assignments?: Assignment[] | null
}

export type AuthResponse = {
  token: string
  expiresAt: string
  user: User
}

export type Organization = {
  id: string
  name: string
  legalName?: string | null
  registrationNumber?: string | null
  timezone: string
  createdAt?: string
  updatedAt?: string
}

export type Farm = {
  id: string
  organizationId: string
  name: string
  farmCode: string
  locationText?: string | null
  district?: string | null
  province?: string | null
  countryCode?: string | null
  timezone?: string | null
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type Role = { code: string; name: string; description?: string | null }

export type Animal = {
  id: string
  organizationId: string
  speciesId: number
  speciesCode?: string | null
  breedId?: string | null
  breedName?: string | null
  animalNumber: string
  name?: string | null
  sex: string
  dateOfBirth?: string | null
  birthDateEstimated: boolean
  colorMarkings?: string | null
  acquisitionType: string
  acquiredOn?: string | null
  damId?: string | null
  damNumber?: string | null
  sireId?: string | null
  sireNumber?: string | null
  artificialSireCode?: string | null
  semenStrawId?: string | null
  status: string
  statusChangedOn?: string | null
  notes?: string | null
  currentFarmId?: string | null
  currentFarmName?: string | null
  primaryIdentifier?: string | null
  createdAt?: string
  updatedAt?: string
}

export type Identifier = {
  id: string
  animalId: string
  identifierType: string
  identifierValue: string
  issuingAuthority?: string | null
  issuedAt?: string | null
  retiredAt?: string | null
  primary: boolean
  notes?: string | null
  createdAt?: string
}

export type FarmHistory = {
  id: string
  animalId: string
  farmId: string
  farmName: string
  joinedOn: string
  leftOn?: string | null
  transferReason?: string | null
  notes?: string | null
  recordedAt?: string
}

export type Species = { id: number; code: string; name: string; active: boolean }
export type Breed = { id: string; name: string; description?: string | null; active: boolean }
export type SemenStraw = { id: string; code: string; description?: string | null; active: boolean }
export type Person = { id: string; fullName: string }

export type Shift = {
  id: string
  farmId: string
  name: string
  startTime?: string | null
  endTime?: string | null
  displayOrder: number
  active: boolean
}

export type LactationStage = {
  code: string
  name: string
  meaning: string
  displayOrder: number
}

export type MilkRecord = {
  id: string
  farmId: string
  animalId: string
  animalNumber: string
  shiftId: string
  shiftName: string
  milkingDate: string
  quantityLiters: number | string
  lactationStage?: string | null
  lactationStageName?: string | null
  fatPercent?: number | string | null
  proteinPercent?: number | string | null
  somaticCellCount?: number | null
  notes?: string | null
}

export type Visit = {
  id: string
  farmId: string
  animalId: string
  animalNumber: string
  visitAt: string
  visitType: string
  symptoms?: string | null
  diagnosis?: string | null
  temperatureC?: number | string | null
  weightKg?: number | string | null
  vetNotes?: string | null
  followUpAt?: string | null
}

export type Vaccination = {
  id: string
  veterinaryVisitId?: string | null
  farmId: string
  animalId: string
  animalNumber: string
  vaccineName: string
  administeredAt?: string | null
  dose?: string | null
  nextDueOn?: string | null
  batchNumber?: string | null
  notes?: string | null
  medicineProductId?: string | null
  medicineBatchId?: string | null
  quantityUsed?: number | string | null
  baseUnit?: string | null
}

export type Medication = {
  id: string
  treatmentId: string
  medicineProductId: string
  medicineName: string
  batchId?: string | null
  batchNumber?: string | null
  doseAmount: number | string
  doseUnit: string
  route: string
  administrationsCount: number
  quantityUsed: number | string
  frequency?: string | null
  durationText?: string | null
  milkWithdrawalHours?: number | null
  meatWithdrawalHours?: number | null
  notes?: string | null
}

export type Treatment = {
  id: string
  veterinaryVisitId?: string | null
  farmId: string
  animalId: string
  animalNumber: string
  treatmentDate: string
  diagnosis?: string | null
  treatmentPlan?: string | null
  outcome?: string | null
  milkWithdrawalUntil?: string | null
  meatWithdrawalUntil?: string | null
  medications?: Medication[] | null
}

export type Product = {
  id: string
  organizationId: string
  name: string
  activeIngredient?: string | null
  form: string
  formulation?: string | null
  baseUnit: string
  description?: string | null
  requiresPrescription: boolean
  active: boolean
}

export type Supplier = {
  id: string
  name: string
  kind: string
  phone?: string | null
  notes?: string | null
  active: boolean
}

export type Batch = {
  id: string
  farmId: string
  medicineProductId: string
  medicineName: string
  form?: string | null
  baseUnit?: string | null
  batchNumber: string
  expiryDate: string
  receivedOn?: string | null
  supplierId?: string | null
  supplierName?: string | null
  unitCost?: number | string | null
  quantityOnHand: number | string
}

export type Movement = {
  id: string
  batchId: string
  movementType: string
  quantityChange: number | string
  movementAt: string
  treatmentMedicationId?: string | null
  referenceText?: string | null
  notes?: string | null
  quantityOnHand: number | string
}

export type Breeding = {
  id: string
  farmId: string
  cowId: string
  cowNumber: string
  sireId?: string | null
  sireNumber?: string | null
  breedingAt: string
  breedingMethod: string
  outcome?: string | null
  technicianName?: string | null
  technicianId?: string | null
  semenBatchNumber?: string | null
  semenStrawId?: string | null
  ancestryOverrideReason?: string | null
  notes?: string | null
}

export type Pregnancy = {
  id: string
  breedingRecordId?: string | null
  farmId: string
  cowId: string
  cowNumber: string
  confirmedAt?: string | null
  confirmationMethod?: string | null
  expectedCalvingOn?: string | null
  status: string
  notes?: string | null
}

export type Calving = {
  id: string
  pregnancyRecordId?: string | null
  farmId: string
  damId: string
  damNumber: string
  sireId?: string | null
  sireNumber?: string | null
  artificialSireCode?: string | null
  semenStrawId?: string | null
  calfId?: string | null
  calfNumber?: string | null
  calvedAt: string
  outcome: string
  assistanceRequired: boolean
  numberOfCalves: number
  complications?: string | null
}

export type Weight = {
  id: string
  animalId: string
  farmId: string
  measuredAt: string
  weightKg: number | string
  measurementMethod?: string | null
  notes?: string | null
}

export type AnimalEvent = {
  id: string
  animalId: string
  farmId?: string | null
  eventType: string
  eventAt: string
  details?: string | null
}

export type DailyMilk = {
  farmId: string
  milkingDate: string
  totalLiters: number | string
  animalsMilked: number
}

export type ExpiryWatch = {
  batchId: string
  farmId: string
  medicineName: string
  batchNumber: string
  expiryDate: string
  quantityOnHand: number | string
  unitCost?: number | string | null
}

export type HerdAnimal = {
  animalId: string
  animalNumber: string
  name?: string | null
  sex: string
  status: string
  joinedOn?: string | null
  breedName?: string | null
}

export type Withdrawal = {
  treatmentId: string
  animalId: string
  animalNumber: string
  milkWithdrawalUntil?: string | null
  meatWithdrawalUntil?: string | null
  outcome?: string | null
}

export type AuditRow = {
  id: number
  tableName: string
  recordId?: string | null
  action: string
  changedAt: string
  changedBy?: string | null
  oldData?: string | null
  newData?: string | null
}
