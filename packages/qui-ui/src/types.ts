export type QuiSize = 'mini' | 'small' | 'medium' | 'large'
export interface QuiDistrict { name: string; adcode: string; children?: QuiDistrict[] }
export interface ReplicaTarget { element: Element; buttonIndex: number; controlIndex: number; text: string }
export type QuiButtonType = 'primary' | 'secondary' | 'ghost' | 'danger' | 'default'
export type QuiOption = { label: string; value: string | number; disabled?: boolean; badge?: string | number }
export type QuiListItem = { title: string; description?: string; avatar?: string; badge?: string | number; arrow?: boolean }
export type QuiIconName =
  | 'Activity' | 'Add' | 'AddCircle' | 'ArrowheadDown' | 'ArrowheadLeft' | 'ArrowheadRight'
  | 'ArrowheadUp' | 'Close' | 'Search' | 'Success' | 'Warning' | 'Error'
  | (string & {})
