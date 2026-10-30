import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, errorText, type Farm, type Organization, type Page } from './api'

const FARM_KEY = 'farm.farmId'

type FarmValue = {
  farms: Farm[]
  farmId: string
  farm?: Farm
  organization: Organization | null
  ready: boolean
  error: string | null
  setFarmId: (id: string) => void
  reloadFarms: () => Promise<void>
}

const FarmContext = createContext<FarmValue | null>(null)

export function FarmProvider({ children }: { children: ReactNode }) {
  const [farms, setFarms] = useState<Farm[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [farmId, setFarmIdState] = useState(() => localStorage.getItem(FARM_KEY) ?? '')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reloadFarms = useCallback(async () => {
    const [page, org] = await Promise.all([
      api<Page<Farm>>('/api/farms?page=0&size=100'),
      api<Organization>('/api/organization'),
    ])
    setOrganization(org)
    setFarms(page.content)
    setError(null)
    setFarmIdState((current) => {
      const match = page.content.some((farm) => farm.id === current)
      const next = match
        ? current
        : page.content.find((farm) => farm.active)?.id ?? page.content[0]?.id ?? ''
      localStorage.setItem(FARM_KEY, next)
      return next
    })
  }, [])

  useEffect(() => {
    let live = true
    reloadFarms()
      .catch((reason: unknown) => {
        if (live) setError(errorText(reason))
      })
      .finally(() => {
        if (live) setReady(true)
      })
    return () => {
      live = false
    }
  }, [reloadFarms])

  const setFarmId = useCallback((id: string) => {
    localStorage.setItem(FARM_KEY, id)
    setFarmIdState(id)
  }, [])

  const farm = farms.find((item) => item.id === farmId)
  const value = useMemo(
    () => ({ farms, farmId, farm, organization, ready, error, setFarmId, reloadFarms }),
    [farms, farmId, farm, organization, ready, error, setFarmId, reloadFarms],
  )
  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>
}

export function useFarm(): FarmValue {
  const value = useContext(FarmContext)
  if (!value) throw new Error('FarmProvider is missing')
  return value
}
