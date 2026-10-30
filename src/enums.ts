export const SEX = ['FEMALE', 'MALE', 'UNKNOWN'] as const
export const ACQUISITION = ['BORN_ON_FARM', 'PURCHASED', 'TRANSFERRED_IN', 'OTHER'] as const
export const ANIMAL_STATUS = ['ACTIVE', 'SOLD', 'DECEASED', 'LOST', 'CULLED', 'TRANSFERRED_OUT'] as const
export const IDENTIFIER_TYPES = ['VISUAL_EAR_TAG', 'RFID_EAR_TAG', 'INJECTABLE_RFID', 'TATTOO', 'OTHER'] as const
export const VISIT_TYPES = ['EXAMINATION', 'ILLNESS', 'INJURY', 'VACCINATION', 'FOLLOW_UP', 'OTHER'] as const
export const TREATMENT_OUTCOMES = ['IN_PROGRESS', 'RECOVERED', 'FOLLOW_UP_REQUIRED', 'REFERRED', 'OTHER'] as const
export const ADMIN_ROUTES = ['ORAL', 'INTRAMUSCULAR', 'SUBCUTANEOUS', 'INTRAVENOUS', 'TOPICAL', 'OTHER'] as const
export const MOVEMENT_TYPES = ['PURCHASE', 'EXPIRED', 'RETURN', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT'] as const
export const BREEDING_METHODS = ['NATURAL', 'ARTIFICIAL_INSEMINATION', 'EMBRYO_TRANSFER', 'OTHER'] as const
export const BREEDING_OUTCOMES = ['PENDING', 'PREGNANT', 'NOT_PREGNANT', 'CANCELLED', 'UNKNOWN'] as const
export const PREGNANCY_STATUSES = ['SUSPECTED', 'CONFIRMED', 'LOST', 'CALVED', 'FALSE_PREGNANCY', 'UNKNOWN'] as const
export const CALVING_OUTCOMES = ['LIVE', 'STILLBORN', 'ABORTION', 'DYSTOCIA', 'OTHER'] as const
export const EVENT_TYPES = ['PURCHASE', 'BIRTH', 'TRANSFER', 'SALE', 'DEATH', 'LOSS', 'CALVING', 'OTHER'] as const
export const MEDICINE_FORMS = ['LIQUID', 'TABLET', 'INJECTION', 'CAPSULE', 'BOLUS', 'POWDER', 'OINTMENT', 'SUSPENSION', 'POUR_ON', 'INTRAMAMMARY', 'SPRAY', 'OTHER'] as const
export const MEDICINE_UNITS = ['ML', 'LITER', 'TABLET', 'CAPSULE', 'BOLUS', 'DOSE', 'VIAL', 'PIECE', 'GRAM', 'SACHET', 'TUBE'] as const
export const SUPPLIER_KINDS = ['SUPPLIER', 'PHARMACY'] as const

const DEFAULT_UNIT: Record<string, string> = {
  LIQUID: 'ML',
  TABLET: 'TABLET',
  INJECTION: 'DOSE',
  CAPSULE: 'CAPSULE',
  BOLUS: 'BOLUS',
  POWDER: 'GRAM',
  OINTMENT: 'TUBE',
  SUSPENSION: 'ML',
  POUR_ON: 'ML',
  INTRAMAMMARY: 'DOSE',
  SPRAY: 'ML',
  OTHER: 'PIECE',
}

export function defaultUnit(form?: string | null): string {
  return (form && DEFAULT_UNIT[form]) || 'PIECE'
}

export function countableUnit(unit?: string | null): boolean {
  return unit === 'TABLET' || unit === 'CAPSULE' || unit === 'BOLUS' || unit === 'DOSE'
    || unit === 'VIAL' || unit === 'PIECE' || unit === 'SACHET' || unit === 'TUBE'
}

export function defaultRoute(form?: string | null): string {
  if (form === 'INJECTION') return 'INTRAMUSCULAR'
  if (form === 'OINTMENT' || form === 'POUR_ON' || form === 'SPRAY') return 'TOPICAL'
  if (form === 'INTRAMAMMARY') return 'OTHER'
  return 'ORAL'
}
