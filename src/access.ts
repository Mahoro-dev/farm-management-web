import type { User } from './api'

export const ANIMAL_WRITE = ['FARM_MANAGER', 'VETERINARIAN'] as const
export const MILK_WRITE = ['FARM_MANAGER', 'FARM_WORKER'] as const
export const SHIFT_WRITE = ['FARM_MANAGER'] as const
export const CLINICAL_WRITE = ['FARM_MANAGER', 'VETERINARIAN'] as const
export const INVENTORY_WRITE = ['INVENTORY_MANAGER', 'FARM_MANAGER'] as const
export const BREEDING_WRITE = ['FARM_MANAGER', 'VETERINARIAN'] as const
export const WEIGHT_WRITE = ['FARM_MANAGER', 'FARM_WORKER', 'VETERINARIAN'] as const

export function isOrgAdmin(user: User | null | undefined): boolean {
  return (user?.assignments ?? []).some((item) => item.roleCode === 'ORG_ADMIN' && !item.endedAt)
}

export function canOnFarm(user: User | null | undefined, farmId: string | undefined | null, roles: readonly string[]): boolean {
  if (!user || !farmId) return false
  if (isOrgAdmin(user)) return true
  return (user.assignments ?? []).some((item) => !item.endedAt && item.farmId === farmId && roles.includes(item.roleCode))
}

export function canAny(user: User | null | undefined, roles: readonly string[]): boolean {
  if (!user) return false
  if (isOrgAdmin(user)) return true
  return (user.assignments ?? []).some((item) => !item.endedAt && roles.includes(item.roleCode))
}
