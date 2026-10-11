import type { QuiDistrict } from './types'
import regionsURL from './data/districts.json?url&no-inline'
import { loadJSON } from './data-loader'
export type { QuiDistrict } from './types'

export const loadRegions = () => loadJSON<QuiDistrict[]>(regionsURL)
