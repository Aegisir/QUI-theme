export interface CatalogEntry {
  label: string
  slug: string
  title?: string
  kind: 'page' | 'demo'
}

export const catalog: Array<{ title: string; entries: CatalogEntry[] }> = [
  { title: '通用', entries: [
    { label: '色彩 Color', slug: 'color', title: '色彩 Color', kind: 'page' },
    { label: '图标 Icon', slug: 'icon', title: '图标 Icon', kind: 'page' },
  ] },
  { title: '导航', entries: [
    { label: '顶部导航 Navigation Bar', slug: 'nav-bar', title: '顶部导航 Navigation Bar', kind: 'demo' },
    { label: '主导航 Tab Bars', slug: 'tabbar', title: '主导航 Tab Bars', kind: 'demo' },
    { label: '页签 Tabs', slug: 'tab', title: '页签 Tabs', kind: 'demo' },
  ] },
  { title: '内容', entries: [
    { label: '列表 Lists', slug: 'list', title: '列表 Lists', kind: 'demo' },
    { label: '分割 Divider', slug: 'divider', title: '分割 Divider', kind: 'demo' },
    { label: '头像 Avatar', slug: 'avatar', title: '头像 Avatar', kind: 'demo' },
    { label: '标签 Tag', slug: 'tag', title: '标签 Tag', kind: 'demo' },
  ] },
  { title: '操作', entries: [
    { label: '按钮 Button', slug: 'button', title: '按钮 Button', kind: 'demo' },
    { label: '开关 Switch', slug: 'switch', title: '开关 Switch', kind: 'demo' },
    { label: '复选框 Check Box', slug: 'checkbox', title: '复选框 Check Box', kind: 'demo' },
    { label: '搜索框 Search Bar', slug: 'search-bar', title: '搜索框 Search Bar', kind: 'demo' },
    { label: '选择器 Picker', slug: 'picker', title: '选择器 Picker', kind: 'demo' },
    { label: '输入框 Text Feild', slug: 'input', title: '输入框 Text Feild', kind: 'demo' },
    { label: '动作面板 Action Sheet', slug: 'action-sheet', title: '动作面板 Action Sheet', kind: 'demo' },
    { label: '分享面板 Share Sheet', slug: 'share-picture', title: '分享面板 Share Sheet', kind: 'demo' },
    { label: '浮层面板 Bottom Sheet', slug: 'bottom-sheet', title: '浮层面板 Bottom Sheet', kind: 'demo' },
  ] },
  { title: '反馈', entries: [
    { label: '提示 Toast', slug: 'toast', title: '提示 Toast', kind: 'demo' },
    { label: '音视频提示 VideoToast', slug: 'video-toast', title: '音视频提示 VideoToast', kind: 'demo' },
    { label: '通告栏 Notice Bar', slug: 'notice-bar', title: '通告栏 Notice Bar', kind: 'demo' },
    { label: '提示气泡 Tooltip', slug: 'tooltips', title: '提示气泡 Tooltip', kind: 'demo' },
    { label: '弹窗 Dialog', slug: 'dialog', title: '弹窗 Dialog', kind: 'demo' },
    { label: '加载 Loading', slug: 'loading', title: '加载 Loading', kind: 'demo' },
    { label: '富媒体控件 Label', slug: 'label', title: '富媒体控件 Label', kind: 'demo' },
    { label: '红点 Badge', slug: 'badge', title: '红点 Badge', kind: 'demo' },
    { label: '授权面板 Authorization', slug: 'authorization', title: '授权面板 Authorization', kind: 'demo' },
    { label: '通知提示 Notification', slug: 'notification', title: '通知提示 Notification', kind: 'demo' },
    { label: '空白页 Empty State', slug: 'blank-page', title: '空白页 Empty State', kind: 'demo' },
  ] },
  { title: '业务组件', entries: [
    { label: '地理选择 Area', slug: 'area', title: '地理选择 Area', kind: 'demo' },
    { label: '日期选择器 DatetimePicker', slug: 'datetime-picker', title: '日期选择器 DatetimePicker', kind: 'demo' },
    { label: '弹性布局 Flex', slug: 'row', title: '弹性布局 Flex', kind: 'demo' },
    { label: '弹出层 Popup', slug: 'popup', title: '弹出层 Popup', kind: 'demo' },
    { label: '进度条 Progress', slug: 'progress', title: '进度条 Progress', kind: 'demo' },
    { label: '滑动抽屉 SlipDrawer', slug: 'slip-drawer', title: '滑动抽屉 SlipDrawer', kind: 'demo' },
    { label: '轮播 Swiper', slug: 'swiper', title: '轮播 Swiper', kind: 'demo' },
    { label: '无限滚动 InfiniteLoading', slug: 'infinite-loading', title: '无限滚动 InfiniteLoading', kind: 'demo' },
    { label: '索引 Indexes', slug: 'indexes', title: '索引 Indexes', kind: 'demo' },
  ] },
]

export const entries = catalog.flatMap((group) => group.entries)
export const routeFor = (slug: string) => `#/${slug === 'index' ? 'index' : slug}?m`
