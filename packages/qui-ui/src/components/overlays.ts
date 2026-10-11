import { defineComponent, h, provide, Transition, type PropType } from 'vue'
import { useAutoDismiss } from './lifecycle'
import OverlayShell from './OverlayShell.vue'
import { quiMotionKey } from './motion-context'
import type { QuiOption } from '../types'

const update = (emit: (event: 'update:show', value: boolean) => void) => (value: boolean) => emit('update:show', value)

export const QuiActionSheet = /* @__PURE__ */ defineComponent({
  name: 'QuiActionSheet',
  props: { show: Boolean, title: String, description: String, actions: { type: Array as PropType<QuiOption[]>, default: () => [{ label: '选项一', value: 1 }, { label: '选项二', value: 2 }] }, cancelText: { type: String, default: '取消' }, danger: Boolean, selected: [String, Number] },
  emits: { 'update:show': (_value: boolean) => true, 'select': (_option: QuiOption) => true, 'cancel': () => true },
  setup(props, { emit, slots }) {
    provide(quiMotionKey, 'slide-bottom')
    return () => h(OverlayShell, { show: props.show, placement: 'bottom', 'onUpdate:show': update(emit) }, { default: ({ close }: { close: () => void }) => [
      props.title ? h('h3', { class: 'qui-sheet__title' }, props.title) : null,
      props.description ? h('p', { class: 'qui-sheet__description' }, props.description) : null,
      ...(slots.default?.() ?? props.actions.map((action) => h('button', { disabled: action.disabled, class: ['qui-sheet__action', { 'is-danger': props.danger && action === props.actions[0], 'is-selected': action.value === props.selected }], onClick: () => { emit('select', action); close() } }, [action.label, action.value === props.selected ? h('span', '✓') : null]))),
      h('button', { class: 'qui-sheet__cancel', onClick: () => { emit('cancel'); close() } }, props.cancelText),
    ] })
  },
})

export const QuiBottomSheet = /* @__PURE__ */ defineComponent({
  name: 'QuiBottomSheet',
  props: { show: Boolean, title: String, height: String, maxHeight: String, maskClosable: { type: Boolean, default: true } },
  emits: { 'update:show': (_value: boolean) => true, 'close': () => true },
  setup(props, { emit, slots }) {
    provide(quiMotionKey, 'slide-bottom')
    return () => h(OverlayShell, { show: props.show, placement: 'bottom', maskClosable: props.maskClosable, 'onUpdate:show': update(emit), onClose: () => emit('close') }, { default: () => [props.title ? h('header', { class: 'qui-sheet__header' }, props.title) : null, h('div', { class: 'qui-sheet__body', style: { height: props.height, maxHeight: props.maxHeight } }, slots.default?.())] })
  },
})

export const QuiDialog = /* @__PURE__ */ defineComponent({
  name: 'QuiDialog',
  props: { show: Boolean, title: String, message: String, confirmText: { type: String, default: '确定' }, cancelText: { type: String, default: '取消' }, showCancel: { type: Boolean, default: true } },
  emits: { 'update:show': (_value: boolean) => true, 'confirm': () => true, 'cancel': () => true },
  setup(props, { emit, slots }) {
    provide(quiMotionKey, 'zoom')
    const close = () => emit('update:show', false)
    return () => h(OverlayShell, { show: props.show, placement: 'center', 'onUpdate:show': update(emit) }, { default: () => [
      h('div', { class: 'qui-dialog' }, [props.title ? h('h3', props.title) : null, props.message ? h('p', props.message) : slots.default?.(), h('footer', [
        props.showCancel ? h('button', { class: 'qui-dialog__cancel', onClick: () => { emit('cancel'); close() } }, props.cancelText) : null,
        h('button', { class: 'qui-dialog__confirm', onClick: () => { emit('confirm'); close() } }, props.confirmText),
      ])]),
    ] })
  },
})

export const QuiPopup = /* @__PURE__ */ defineComponent({
  name: 'QuiPopup',
  props: { show: Boolean, placement: { type: String as PropType<'center' | 'bottom' | 'top'>, default: 'center' }, mask: { type: Boolean, default: true } },
  emits: { 'update:show': (_value: boolean) => true, 'close': () => true },
  setup(props, { emit, slots }) {
    provide(quiMotionKey, props.placement === 'center' ? 'zoom' : `slide-${props.placement}`)
    return () => h(OverlayShell, { show: props.show, placement: props.placement, mask: props.mask, 'onUpdate:show': update(emit), onClose: () => emit('close') }, { default: slots })
  },
})

export const QuiToast = /* @__PURE__ */ defineComponent({
  name: 'QuiToast',
  props: { show: Boolean, message: String, type: { type: String, default: 'normal' }, duration: { type: Number, default: 2200 }, action: String },
  emits: { 'update:show': (_value: boolean) => true, 'action': () => true },
  setup(props, { emit }) {
    provide(quiMotionKey, 'fade')
    useAutoDismiss(() => [props.show, props.duration], () => emit('update:show', false))
    return () => h(OverlayShell, { show: props.show, placement: 'center', mask: false, maskClosable: false, 'onUpdate:show': update(emit) }, { default: () => h('div', { class: ['qui-toast', `is-${props.type}`] }, [h('span', props.message), props.action ? h('button', { onClick: () => emit('action') }, props.action) : null]) })
  },
})

export const QuiVideoToast = /* @__PURE__ */ defineComponent({
  name: 'QuiVideoToast',
  props: { show: Boolean, message: String, icon: String, action: String, duration: { type: Number, default: 2200 } },
  emits: { 'update:show': (_value: boolean) => true, 'action': () => true },
  setup(props, { emit }) {
    provide(quiMotionKey, 'fade')
    useAutoDismiss(() => [props.show, props.duration], () => emit('update:show', false))
    return () => h(OverlayShell, { show: props.show, placement: 'center', mask: false, maskClosable: false, 'onUpdate:show': update(emit) }, { default: () => h('div', { class: 'qui-video-toast' }, [props.icon ? h('i', props.icon) : null, h('span', props.message), props.action ? h('button', { onClick: () => emit('action') }, props.action) : null]) })
  },
})

export const QuiNotification = /* @__PURE__ */ defineComponent({
  name: 'QuiNotification',
  props: { show: Boolean, title: String, message: String, action: String, duration: { type: Number, default: 3000 } },
  emits: { 'update:show': (_value: boolean) => true, 'action': () => true, 'close': () => true },
  setup(props, { emit }) {
    useAutoDismiss(() => [props.show, props.duration], () => emit('update:show', false))
    return () => h(Transition, { name: 'qui-motion-pop' }, {
      default: () => props.show ? h('div', { class: 'qui-notification', role: 'status', 'aria-live': 'polite' }, [
        h('div', { class: 'qui-notification__copy' }, [props.title ? h('strong', props.title) : null, h('span', props.message)]),
        props.action ? h('button', { onClick: () => emit('action') }, props.action) : null,
        h('button', { class: 'qui-notification__close', 'aria-label': '关闭', onClick: () => { emit('close'); emit('update:show', false) } }, '×'),
      ]) : null,
    })
  },
})

export const QuiShareSheet = /* @__PURE__ */ defineComponent({
  name: 'QuiShareSheet',
  props: { show: Boolean, title: { type: String, default: '分享到' }, options: { type: Array as PropType<QuiOption[]>, default: () => ['好友', '群聊', '空间', '更多'].map((label, value) => ({ label, value })) } },
  emits: { 'update:show': (_value: boolean) => true, 'select': (_option: QuiOption) => true },
  setup(props, { emit }) {
    provide(quiMotionKey, 'slide-bottom')
    return () => h(OverlayShell, { show: props.show, placement: 'bottom', 'onUpdate:show': update(emit) }, { default: ({ close }: { close: () => void }) => [h('h3', { class: 'qui-sheet__header' }, props.title), h('div', { class: 'qui-share-grid' }, props.options.map((item, index) => h('button', { disabled: item.disabled, onClick: () => { emit('select', item); close() } }, [h('i', { class: `is-${index % 4}` }, ['●', '◉', '◎', '○'][index % 4]), h('span', item.label)]))), h('button', { class: 'qui-sheet__cancel', onClick: close }, '取消')] })
  },
})

export const QuiTooltip = /* @__PURE__ */ defineComponent({
  name: 'QuiTooltip',
  props: { text: String, placement: { type: String, default: 'top-center' }, theme: { type: String, default: 'brand' }, avatar: String, show: { type: Boolean, default: true } },
  setup(props, { slots }) {
    const motion = props.placement.startsWith('top') ? 'qui-motion-tooltips-top' : 'qui-motion-tooltips-bottom'
    return () => h('span', { class: 'qui-tooltip-anchor' }, [slots.default?.(), h(Transition, { name: motion }, {
      default: () => props.show ? h('span', { class: ['qui-tooltip', `is-${props.theme}`, `at-${props.placement}`] }, [props.avatar ? h('img', { src: props.avatar, alt: '', loading: 'lazy' }) : null, props.text]) : null,
    })])
  },
})

export const QuiAuthorization = /* @__PURE__ */ defineComponent({
  name: 'QuiAuthorization',
  props: { show: Boolean, title: { type: String, default: '授权申请' }, message: String, confirmText: { type: String, default: '同意' }, cancelText: { type: String, default: '拒绝' } },
  emits: { 'update:show': (_value: boolean) => true, 'confirm': () => true, 'cancel': () => true },
  setup(props, { emit }) {
    provide(quiMotionKey, 'zoom')
    return () => h(OverlayShell, { show: props.show, placement: 'center', 'onUpdate:show': update(emit) }, { default: () => h('div', { class: 'qui-dialog qui-authorization' }, [h('h3', props.title), h('p', props.message), h('footer', [h('button', { class: 'qui-dialog__cancel', onClick: () => { emit('cancel'); emit('update:show', false) } }, props.cancelText), h('button', { class: 'qui-dialog__confirm', onClick: () => { emit('confirm'); emit('update:show', false) } }, props.confirmText)])]) })
  },
})
