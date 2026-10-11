<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { quiMotionKey } from './motion-context'
import { useOverlayStack } from './lifecycle'

const props = withDefaults(defineProps<{
  show?: boolean
  modelValue?: boolean
  placement?: 'center' | 'bottom' | 'top'
  mask?: boolean
  maskClosable?: boolean
  zIndex?: number
}>(), { placement: 'center', mask: true, maskClosable: true, zIndex: 1000 })
const emit = defineEmits<{ 'update:show': [value: boolean]; 'update:modelValue': [value: boolean]; close: [] }>()
const open = computed(() => props.show ?? props.modelValue ?? false)
const providedMotion = inject(quiMotionKey, undefined)
const motion = computed(() => providedMotion ?? (props.placement === 'center' ? 'zoom' : props.placement === 'bottom' ? 'slide-bottom' : 'slide-top'))
const transitionDuration = computed(() => motion.value === 'zoom' ? 350 : 300)
const panel = ref<HTMLElement>()
const close = () => {
  emit('update:show', false)
  emit('update:modelValue', false)
  emit('close')
}
useOverlayStack(open, panel, close, () => props.mask, () => props.zIndex)
</script>

<template>
  <Teleport to="body">
    <Transition name="qui-motion-fade" :duration="transitionDuration">
      <div v-if="open" class="qui-overlay" :class="[`is-${placement}`, { 'has-mask': mask }]" :style="{ zIndex }" @click.self="maskClosable && close()">
        <span v-if="mask" class="qui-overlay__mask" aria-hidden="true" @click="maskClosable && close()" />
        <Transition :name="`qui-motion-${motion}`" appear>
          <section ref="panel" class="qui-overlay__panel" role="dialog" :aria-modal="mask || undefined" tabindex="-1"><slot :close="close" /></section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
