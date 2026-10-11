import type { InjectionKey } from 'vue'

export type QuiMotionPreset = 'fade' | 'zoom' | 'slide-top' | 'slide-bottom' | 'slide-left' | 'slide-right'
export const quiMotionKey: InjectionKey<QuiMotionPreset> = Symbol('qui-motion')
