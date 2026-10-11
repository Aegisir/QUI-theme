import { defineComponent, h, mergeProps, type PropType, type Slots } from 'vue'
import type { QuiButtonType, QuiListItem, QuiOption, QuiSize } from '../types'
import qqLogo from '../assets/qq-logo.png'
import upgrade from '../assets/upgrade.png'

const slot = (slots: Slots) => slots.default?.()

export const QuiButton = /* @__PURE__ */ defineComponent({
  name: 'QuiButton',
  props: {
    type: { type: String as PropType<QuiButtonType>, default: 'primary' },
    size: { type: String as PropType<QuiSize>, default: 'large' },
    nativeType: { type: String as PropType<'button' | 'submit' | 'reset'>, default: 'button' },
    disabled: Boolean,
    loading: Boolean,
    progress: { type: Number, default: -1 },
    block: { type: Boolean, default: true },
  },
  emits: { 'click': (_event: MouseEvent) => true },
  setup(props, { attrs, slots, emit }) {
    return () => h('button', mergeProps(attrs, {
      type: props.nativeType,
      class: ['qui-button', `is-${props.type}`, `is-${props.size}`, { 'is-block': props.block, 'is-disabled': props.disabled || props.loading }],
      disabled: props.disabled || props.loading,
      onClick: (event: MouseEvent) => emit('click', event),
    }), [props.progress >= 0 && props.progress < 100 ? h('span', { class: 'qui-button__progress', style: { width: `${props.progress}%` } }) : null, props.loading ? h('span', { class: 'qui-spinner' }) : null, h('span', { class: 'qui-button__content' }, slot(slots))])
  },
})

export const QuiSwitch = /* @__PURE__ */ defineComponent({
  name: 'QuiSwitch',
  props: { modelValue: Boolean, disabled: Boolean },
  emits: { 'update:modelValue': (_value: boolean) => true, 'change': (_value: boolean) => true },
  setup(props, { attrs, emit }) {
    return () => h('button', mergeProps(attrs, {
      type: 'button', role: 'switch', 'aria-checked': String(props.modelValue), disabled: props.disabled,
      class: ['qui-switch', { 'is-on': props.modelValue, 'is-disabled': props.disabled }],
      onClick: () => { if (!props.disabled) { emit('update:modelValue', !props.modelValue); emit('change', !props.modelValue) } },
    }), [h('span', { class: 'qui-switch__thumb' })])
  },
})

export const QuiCheckbox = /* @__PURE__ */ defineComponent({
  name: 'QuiCheckbox',
  props: { modelValue: Boolean, disabled: Boolean, count: [String, Number], image: Boolean },
  emits: { 'update:modelValue': (_value: boolean) => true, 'change': (_value: boolean) => true },
  setup(props, { attrs, slots, emit }) {
    return () => h('button', mergeProps(attrs, {
      type: 'button', role: 'checkbox', 'aria-checked': String(props.modelValue), disabled: props.disabled,
      class: ['qui-checkbox', { 'is-checked': props.modelValue, 'is-disabled': props.disabled, 'is-image': props.image }],
      onClick: () => { if (!props.disabled) { emit('update:modelValue', !props.modelValue); emit('change', !props.modelValue) } },
    }), [h('span', { class: 'qui-checkbox__mark' }, props.modelValue ? '✓' : ''), props.count != null ? h('span', { class: 'qui-checkbox__count' }, String(props.count)) : null, slot(slots)])
  },
})

export const QuiRadio = /* @__PURE__ */ defineComponent({
  name: 'QuiRadio',
  props: { modelValue: [String, Number], value: [String, Number], disabled: Boolean },
  emits: { 'update:modelValue': (_value: string | number | undefined) => true, 'change': (_value: string | number | undefined) => true },
  setup(props, { attrs, slots, emit }) {
    return () => h('button', mergeProps(attrs, {
      type: 'button', role: 'radio', 'aria-checked': String(props.modelValue === props.value), disabled: props.disabled,
      class: ['qui-radio', { 'is-checked': props.modelValue === props.value }],
      onClick: () => { if (!props.disabled) { emit('update:modelValue', props.value); emit('change', props.value) } },
    }), [h('span', { class: 'qui-radio__mark' }), slot(slots)])
  },
})

export const QuiTextField = /* @__PURE__ */ defineComponent({
  name: 'QuiTextField',
  props: {
    modelValue: { type: String, default: '' }, label: String, placeholder: String, hint: String,
    error: String, disabled: Boolean, maxlength: Number, type: { type: String, default: 'text' },
  },
  emits: { 'update:modelValue': (_value: string) => true, 'input': (_value: string) => true, 'focus': (_event: FocusEvent) => true, 'blur': (_event: FocusEvent) => true },
  setup(props, { attrs, emit }) {
    return () => h('label', { class: ['qui-field', { 'has-error': props.error }] }, [
      props.label ? h('span', { class: 'qui-field__label' }, props.label) : null,
      h('input', mergeProps(attrs, {
        class: 'qui-field__input', type: props.type, value: props.modelValue, placeholder: props.placeholder,
        disabled: props.disabled, maxlength: props.maxlength,
        onInput: (event: Event) => { const value = (event.target as HTMLInputElement).value; emit('update:modelValue', value); emit('input', value) },
        onFocus: (event: FocusEvent) => emit('focus', event), onBlur: (event: FocusEvent) => emit('blur', event),
      })),
      props.error ? h('span', { class: 'qui-field__error' }, props.error) : props.hint ? h('span', { class: 'qui-field__hint' }, props.hint) : null,
      props.maxlength ? h('span', { class: 'qui-field__count' }, `${props.modelValue.length}/${props.maxlength}`) : null,
    ])
  },
})

export const QuiSearchBar = /* @__PURE__ */ defineComponent({
  name: 'QuiSearchBar',
  props: { modelValue: { type: String, default: '' }, placeholder: { type: String, default: '搜索' }, cancelText: { type: String, default: '取消' }, white: Boolean },
  emits: { 'update:modelValue': (_value: string) => true, 'search': (_value: string) => true, 'cancel': () => true },
  setup(props, { emit }) {
    return () => h('form', { class: ['qui-search', { 'is-white': props.white }], onSubmit: (event: Event) => { event.preventDefault(); emit('search', props.modelValue) } }, [
      h('span', { class: 'qui-search__icon', 'aria-hidden': 'true' }, '⌕'),
      h('input', { value: props.modelValue, placeholder: props.placeholder, onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value) }),
      props.modelValue ? h('button', { type: 'button', class: 'qui-search__clear', onClick: () => emit('update:modelValue', '') }, '×') : null,
      h('button', { type: 'button', class: 'qui-search__cancel', onClick: () => emit('cancel') }, props.cancelText),
    ])
  },
})

export const QuiDivider = /* @__PURE__ */ defineComponent({
  name: 'QuiDivider',
  props: { text: String, inset: Boolean },
  setup(props) { return () => h('div', { class: ['qui-divider', { 'is-inset': props.inset }] }, props.text ? h('span', props.text) : undefined) },
})

export const QuiAvatar = /* @__PURE__ */ defineComponent({
  name: 'QuiAvatar',
  props: { src: String, name: String, size: { type: [String, Number], default: 52 }, count: Number, fallback: { type: String, default: qqLogo } },
  setup(props) {
    return () => h('span', { class: 'qui-avatar', style: { width: typeof props.size === 'number' ? `${props.size}px` : props.size, height: typeof props.size === 'number' ? `${props.size}px` : props.size }, title: props.name }, [
      h('img', { src: props.src || props.fallback, alt: props.name || '', loading: 'lazy' }),
      props.count ? h('span', { class: 'qui-avatar__count' }, String(props.count)) : null,
    ])
  },
})

export const QuiTag = /* @__PURE__ */ defineComponent({
  name: 'QuiTag',
  props: { type: { type: String, default: 'gray' }, outline: Boolean, small: Boolean, closable: Boolean },
  emits: { 'close': () => true },
  setup(props, { slots, emit }) {
    return () => h('span', { class: ['qui-tag', `is-${props.type}`, { 'is-outline': props.outline, 'is-small': props.small }] }, [slot(slots), props.closable ? h('button', { class: 'qui-tag__close', onClick: () => emit('close') }, '×') : null])
  },
})

export const QuiBadge = /* @__PURE__ */ defineComponent({
  name: 'QuiBadge',
  props: { value: [String, Number], type: { type: String, default: 'dot' }, max: { type: Number, default: 99 } },
  setup(props, { slots }) {
    const text = () => typeof props.value === 'number' && props.value > props.max ? `${props.max}+` : props.value
    return () => h('span', { class: 'qui-badge-wrap' }, [slot(slots), props.value !== undefined && props.value !== '' ? h('span', { class: ['qui-badge', `is-${props.type}`] }, String(text())) : h('i', { class: 'qui-badge-dot' })])
  },
})

export const QuiProgress = /* @__PURE__ */ defineComponent({
  name: 'QuiProgress',
  props: { value: { type: Number, default: 0 }, color: String, height: { type: Number, default: 8 }, label: String },
  setup(props) {
    return () => h('div', { class: 'qui-progress', role: 'progressbar', 'aria-valuenow': props.value, 'aria-valuemin': 0, 'aria-valuemax': 100 }, [
      h('span', { class: 'qui-progress__bar', style: { width: `${Math.max(0, Math.min(props.value, 100))}%`, height: `${props.height}px`, background: props.color } }),
      props.label ? h('span', { class: 'qui-progress__label' }, props.label) : null,
    ])
  },
})

export const QuiList = /* @__PURE__ */ defineComponent({
  name: 'QuiList',
  props: { items: { type: Array as PropType<QuiListItem[]>, default: () => [] }, card: { type: Boolean, default: true }, inset: Boolean },
  emits: { 'select': (_item: QuiListItem, _index: number) => true },
  setup(props, { slots, emit }) {
    return () => h('div', { class: ['qui-list', { 'is-card': props.card, 'is-inset': props.inset }] }, props.items.length ? props.items.map((item, index) => h('button', {
      class: 'qui-list__item', key: `${item.title}-${index}`, onClick: () => emit('select', item, index),
    }, [item.avatar ? h('img', { class: 'qui-list__avatar', src: item.avatar, alt: '', loading: 'lazy' }) : null,
      h('span', { class: 'qui-list__main' }, [h('span', { class: 'qui-list__title' }, item.title), item.description ? h('span', { class: 'qui-list__description' }, item.description) : null]),
      item.badge ? h('span', { class: 'qui-list__badge' }, String(item.badge)) : null,
      item.arrow ? h('span', { class: 'qui-list__arrow' }, '›') : null,
    ])) : slot(slots))
  },
})

export const QuiLoading = /* @__PURE__ */ defineComponent({
  name: 'QuiLoading',
  props: { text: { type: String, default: '加载中，请稍候...' }, color: String, size: { type: Number, default: 24 } },
  setup(props) { return () => h('span', { class: 'qui-loading', style: { color: props.color, fontSize: `${props.size}px` }, role: 'status' }, [h('i', { class: 'qui-spinner' }), h('span', props.text)]) },
})

export const QuiNoticeBar = /* @__PURE__ */ defineComponent({
  name: 'QuiNoticeBar',
  props: { text: String, action: String, closable: Boolean, type: { type: String, default: 'normal' } },
  emits: { 'action': () => true, 'close': () => true },
  setup(props, { slots, emit }) {
    return () => h('div', { class: ['qui-notice', `is-${props.type}`] }, [h('span', { class: 'qui-notice__text' }, props.text ?? slot(slots)), props.action ? h('button', { class: 'qui-notice__action', onClick: () => emit('action') }, props.action) : null, props.closable ? h('button', { class: 'qui-notice__close', onClick: () => emit('close') }, '×') : null])
  },
})

export const QuiEmptyState = /* @__PURE__ */ defineComponent({
  name: 'QuiEmptyState',
  props: { title: { type: String, default: '暂无内容' }, description: String, image: { type: String, default: upgrade }, action: String },
  emits: { 'action': () => true },
  setup(props, { slots, emit }) {
    return () => h('div', { class: 'qui-empty' }, [h('img', { src: props.image, alt: '', loading: 'lazy' }), h('strong', props.title), props.description ? h('p', props.description) : null, props.action ? h('button', { class: 'qui-link-button', onClick: () => emit('action') }, props.action) : slot(slots)])
  },
})

export const QuiLabel = /* @__PURE__ */ defineComponent({
  name: 'QuiLabel',
  props: { text: { type: String, default: '标签' }, type: { type: String, default: 'gray' } },
  setup(props, { slots }) { return () => h('span', { class: ['qui-label', `is-${props.type}`] }, slot(slots) ?? props.text) },
})

export const QuiFlex = /* @__PURE__ */ defineComponent({
  name: 'QuiFlex',
  props: { direction: { type: String, default: 'row' }, justify: { type: String, default: 'start' }, align: { type: String, default: 'center' }, gap: { type: Number, default: 8 }, wrap: Boolean },
  setup(props, { attrs, slots }) {
    return () => h('div', mergeProps(attrs, { class: ['qui-flex', { 'is-wrap': props.wrap }], style: { flexDirection: props.direction, justifyContent: props.justify, alignItems: props.align, gap: `${props.gap}px` } }), slot(slots))
  },
})

export const QuiNavigationBar = /* @__PURE__ */ defineComponent({
  name: 'QuiNavigationBar',
  props: { title: String, subtitle: String, left: String, right: String, primary: Boolean },
  emits: { 'left-click': () => true, 'right-click': () => true },
  setup(props, { slots, emit }) {
    return () => h('header', { class: ['qui-navbar', { 'is-primary': props.primary }] }, [
      h('button', { class: 'qui-navbar__left', onClick: () => emit('left-click') }, slot({ default: slots.left }) ?? props.left ?? '‹'),
      h('div', { class: 'qui-navbar__title' }, [h('strong', props.title), props.subtitle ? h('small', props.subtitle) : null]),
      h('button', { class: 'qui-navbar__right', onClick: () => emit('right-click') }, slot({ default: slots.right }) ?? props.right),
    ])
  },
})

export const QuiTabs = /* @__PURE__ */ defineComponent({
  name: 'QuiTabs',
  props: { modelValue: { type: [String, Number], default: 0 }, items: { type: Array as PropType<Array<string | QuiOption>>, default: () => [] }, pill: Boolean, scrollable: Boolean },
  emits: { 'update:modelValue': (_value: string | number) => true, 'change': (_value: string | number) => true },
  setup(props, { emit }) {
    const value = (item: string | QuiOption, index: number) => typeof item === 'string' ? index : item.value
    const label = (item: string | QuiOption) => typeof item === 'string' ? item : item.label
    return () => h('div', { class: ['qui-tabs', { 'is-pill': props.pill, 'is-scrollable': props.scrollable }] }, props.items.map((item, index) => h('button', {
      disabled: typeof item === 'object' && item.disabled,
      class: ['qui-tabs__item', { 'is-active': props.modelValue === value(item, index) }], key: index,
      onClick: () => { emit('update:modelValue', value(item, index)); emit('change', value(item, index)) },
    }, label(item))))
  },
})

export const QuiTabBar = /* @__PURE__ */ defineComponent({
  name: 'QuiTabBar',
  props: { modelValue: { type: [String, Number], default: 0 }, items: { type: Array as PropType<Array<string | QuiOption>>, default: () => [] } },
  emits: { 'update:modelValue': (_value: string | number) => true, 'change': (_value: string | number) => true },
  setup(props, { emit }) {
    return () => h('nav', { class: 'qui-tabbar' }, props.items.map((item, index) => {
      const value = typeof item === 'string' ? index : item.value
      const label = typeof item === 'string' ? item : item.label
      const disabled = typeof item === 'object' && item.disabled
      const badge = typeof item === 'object' ? item.badge : undefined
      return h('button', { class: ['qui-tabbar__item', { 'is-active': value === props.modelValue }], disabled, onClick: () => { if (!disabled) { emit('update:modelValue', value); emit('change', value) } } }, [
        h('span', { class: 'qui-tabbar__icon' }, ['●', '◈', '◎', '○', '◇'][index % 5]), h('span', label), badge != null ? h('i', { class: 'qui-tabbar__badge' }, String(badge)) : null,
      ])
    }))
  },
})

export const QuiAvatarGroup = /* @__PURE__ */ defineComponent({
  name: 'QuiAvatarGroup',
  props: { items: { type: Array as PropType<string[]>, default: () => [] }, size: { type: Number, default: 40 }, max: { type: Number, default: 4 } },
  setup(props) { return () => h('div', { class: 'qui-avatar-group' }, props.items.slice(0, props.max).map((src, index) => h('img', { key: index, src: src || qqLogo, width: props.size, height: props.size, alt: '', loading: 'lazy' }))) },
})
