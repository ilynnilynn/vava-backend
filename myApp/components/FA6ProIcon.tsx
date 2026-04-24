import { Text } from 'react-native'

const GLYPHS: Record<string, string> = {
  // Avatar icons
  'flower-daffodil': '\uF800',
  'flower-tulip':    '\uF801',
  'olive':           '\uE316',
  'wheat':           '\uF72D',
  'pretzel':         '\uE441',
  // Pro-only icons
  'image-polaroid':  '\uF8C4',
  'heart':           '\uF004',
  'face-shush':      '\uE38C',
  'comment-slash':   '\uF4B3',
  'hand-heart':      '\uF4BC',
  'hand':            '\uF256',
  'gingerbread-man': '\uF79D',
  'eye-closed':      '\uE06D',
  'hand-sparkles':   '\uE05D',
  // Navigation / UI
  'house':           '\uF015',
  'user':            '\uF007',
  'chevron-left':    '\uF053',
  'chevron-right':   '\uF054',
  'plus':            '\uF067',
  'calendar-days':   '\uF073',
  'calendar-xmark':  '\uF273',
  'calendar-check':  '\uF274',
  'umbrella-beach':  '\uF5CA',
  // Shared codepoints (same between FA6 Free and Pro)
  'flower':              '\uF7FF',
  'scissors':            '\uF0C4',
  'location-dot':        '\uF3C5',
  'calendar':            '\uF133',
  'clock':               '\uF017',
  'eye':                 '\uF06E',
  'list':                '\uF03A',
  'palette':             '\uF53F',
  'star':                '\uF005',
  'layer-group':         '\uF5FD',
  'feather':             '\uF52D',
  'rotate':              '\uF2F1',
  'tags':                '\uF02C',
  'circle-plus':         '\uF055',
  'pen':                 '\uF304',
  'image':               '\uF03E',
  'bell':                '\uF0F3',
  'circle-check':        '\uF058',
  'dollar-sign':         '\uF155',
  'envelope':            '\uF0E0',
  'globe':               '\uF0AC',
  'location-arrow':      '\uF124',
  'magnifying-glass':    '\uF002',
  'minus':               '\uF068',
  'phone':               '\uF095',
  'shield-halved':       '\uE23B',
  'sliders':             '\uF1DE',
  'xmark':               '\uF00D',
  'wand-magic-sparkles': '\uE2CA',
  'at':                  '\uF1FA',
  'arrow-right-from-bracket': '\uF08B',
  'circle-question':     '\uF059',
  'comment':             '\uF075',
  'message':             '\uF27A',
  'headset':             '\uF590',
  'life-ring':           '\uF1CD',
}

type Props = {
  name: string
  size?: number
  color?: string
  weight?: 'solid' | 'regular'
}

export function FA6ProIcon({ name, size = 16, color = '#000', weight = 'solid' }: Props) {
  return (
    <Text
      style={{
        fontFamily: weight === 'regular' ? 'FA6Pro-Regular' : 'FA6Pro-Solid',
        fontSize: size,
        lineHeight: size,
        color,
        includeFontPadding: false,
      }}
    >
      {GLYPHS[name] ?? '?'}
    </Text>
  )
}
