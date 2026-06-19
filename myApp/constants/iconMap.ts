export const iconMap = {
  // Navigation
  back: 'chevron-left',
  forward: 'chevron-right',
  chevronDown: 'chevron-down',
  close: 'xmark',
  home: 'house',

  // Actions
  search: 'magnifying-glass',
  add: 'plus',
  remove: 'minus',
  edit: 'pen',
  editSquare: 'pen-to-square',
  ellipsis: 'ellipsis',
  filter: 'sliders',
  sort: 'angles-up-down',
  check: 'check',
  logout: 'arrow-right-from-bracket',
  externalLink: 'arrow-up-right-from-square',

  // Booking / Services
  serviceNails: 'hand-sparkles',
  serviceLashes: 'eye',
  serviceMakeup: 'wand-magic-sparkles',
  serviceGeneric: 'flower',
  calendar: 'calendar',
  alarmExclamation: 'alarm-exclamation',
  calendarDays: 'calendar-days',
  calendarCancel: 'calendar-xmark',
  calendarConfirm: 'calendar-check',
  time: 'clock',
  location: 'location-dot',
  locateMe: 'location-arrow',
  price: 'tag',
  receipt: 'receipt',
  dollarSign: 'dollar-sign',

  // Status
  success: 'circle-check',
  rating: 'star',
  favorite: 'heart',
  safety: 'shield-halved',
  shieldCheck: 'shield-check',

  // Profile / Account
  user: 'user',
  venusMars: 'venus-mars',
  notification: 'bell',

  // Communication
  info: 'circle-info',
  bug: 'bug',
  comment: 'comment',
  message: 'message',
  phone: 'phone',
  email: 'envelope',
  instagram: 'at',
  noComment: 'comment-slash',
  help: 'circle-question',
  support: 'headset',
  lifeRing: 'life-ring',

  // Content / Display
  image: 'image',
  imageRef: 'image-polaroid',
  language: 'earth-americas',
  website: 'globe',
  store: 'store',
  list: 'list',
  palette: 'palette',
  tags: 'tags',
  layers: 'layer-group',
  fiber: 'feather',
  refresh: 'rotate',
  addCircle: 'circle-plus',
  hand: 'hand',
  handHeart: 'hand-heart',
  scissors: 'scissors',
  vacation: 'umbrella-beach',

  // Avatar icons (profile decorations)
  avatarDaffodil: 'flower-daffodil',
  avatarTulip: 'flower-tulip',
  avatarOlive: 'olive',
  avatarWheat: 'wheat',
  avatarPretzel: 'pretzel',

  // Onboarding / Pro
  bookSparkles: 'book-sparkles',

  // Onboarding / special
  faceShush: 'face-shush',
  eyeClosed: 'eye-closed',
  gingerbreadMan: 'gingerbread-man',
} as const

export type AppIconName = keyof typeof iconMap
