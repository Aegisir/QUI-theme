export interface PageVariant { html: string; styles: string[]; states?: string; motion?: string }
export interface RouteVariants { mobile: PageVariant; desktop: PageVariant }
export interface ScrollState { path: number[]; top: number; left: number }
export interface InteractionState { markup?: string; portals: string[]; scrolls?: ScrollState[] }
export type InteractionMap = Partial<Record<'mobile' | 'desktop', Record<string, InteractionState>>>
export type MotionTiming = Omit<KeyframeAnimationOptions, 'iterations'> & { duration: number; delay: number; iterations: number | 'infinite' }
export interface MotionAnimation { id: string; selector: string; index: number; pseudoElement?: string | null; keyframes: Keyframe[]; timing: MotionTiming }
export interface AutoplayTrack { selector: string; index: number; rootIndex: number; childCount: number; initialIndex: number; initialDot: number; dotCount: number; delay: number; rest: number; timing: MotionTiming }
export interface MotionInteraction { enter?: MotionAnimation[]; leave?: MotionAnimation[]; autoCloseMs?: number; autoplay?: { tracks: AutoplayTrack[] } }
export type MotionPhaseMap = Record<string, MotionInteraction>
export interface MotionManifest { routes: Record<string, Partial<Record<'mobile' | 'desktop', MotionPhaseMap>>> }
export interface PickerGesture { column: HTMLUListElement; startY: number; startOffset: number }
export type SlipDrawerSide = 'left' | 'right'
export interface SlipDrawerGesture { drawer: HTMLElement; wrapper: HTMLElement; startX: number; startY: number; startOffset: number; leftWidth: number; rightWidth: number }
export type BlankPageSettings = [fullscreen: boolean, button: boolean, title: boolean, description: boolean]
