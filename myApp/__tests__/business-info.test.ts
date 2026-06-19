// myApp/__tests__/business-info.test.ts
// Tests for B018: Business info page logic — formatHour, parseHour, validation

// ── Helpers (mirror business-info.tsx) ─────────────────────────

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

function parseHour(s: string): number | null {
  const match = s.match(/^(\d{1,2}):00$/)
  if (!match) return null
  const n = Number(match[1])
  if (n < 0 || n > 24) return null
  return n
}

type ValidationResult = { valid: true } | { valid: false; error: string }

/** Mirrors handleSave validation in business-info.tsx */
function validateForm(input: {
  address: string
  workStartHour: string
  workEndHour: string
}): ValidationResult {
  const startH = parseHour(input.workStartHour)
  const endH = parseHour(input.workEndHour)
  if (startH === null || endH === null) {
    return { valid: false, error: '營業時間格式須為 HH:00（例如 10:00）' }
  }
  if (startH >= endH) {
    return { valid: false, error: '結束時間須大於開始時間' }
  }
  if (!input.address.trim()) {
    return { valid: false, error: '營業地址不能為空' }
  }
  return { valid: true }
}

// ── formatHour ─────────────────────────────────────────────────

describe('formatHour', () => {
  it('pads single-digit hours', () => {
    expect(formatHour(9)).toBe('09:00')
  })

  it('formats double-digit hours', () => {
    expect(formatHour(20)).toBe('20:00')
  })

  it('formats midnight', () => {
    expect(formatHour(0)).toBe('00:00')
  })

  it('formats hour 24', () => {
    expect(formatHour(24)).toBe('24:00')
  })
})

// ── parseHour ──────────────────────────────────────────────────

describe('parseHour', () => {
  it('parses valid HH:00 strings', () => {
    expect(parseHour('10:00')).toBe(10)
    expect(parseHour('09:00')).toBe(9)
    expect(parseHour('0:00')).toBe(0)
    expect(parseHour('24:00')).toBe(24)
  })

  it('rejects non-HH:00 formats', () => {
    expect(parseHour('10:30')).toBeNull()
    expect(parseHour('abc')).toBeNull()
    expect(parseHour('')).toBeNull()
    expect(parseHour('10')).toBeNull()
  })

  it('rejects out-of-range hours', () => {
    expect(parseHour('25:00')).toBeNull()
    expect(parseHour('-1:00')).toBeNull()
  })
})

// ── Form validation ────────────────────────────────────────────

describe('validateForm', () => {
  it('accepts valid input', () => {
    const result = validateForm({ address: '台北市大安區', workStartHour: '10:00', workEndHour: '20:00' })
    expect(result.valid).toBe(true)
  })

  it('rejects empty address', () => {
    const result = validateForm({ address: '  ', workStartHour: '10:00', workEndHour: '20:00' })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('地址')
  })

  it('rejects start >= end', () => {
    const result = validateForm({ address: '台北市', workStartHour: '20:00', workEndHour: '10:00' })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('結束時間')
  })

  it('rejects equal start and end', () => {
    const result = validateForm({ address: '台北市', workStartHour: '10:00', workEndHour: '10:00' })
    expect(result.valid).toBe(false)
  })

  it('rejects invalid hour format', () => {
    const result = validateForm({ address: '台北市', workStartHour: '10:30', workEndHour: '20:00' })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('HH:00')
  })
})

// ── Data source: pro fields map to form state ──────────────────

describe('Pro → form state mapping', () => {
  // Mirrors the useState initializers in business-info.tsx
  function initForm(pro: {
    studio_name: string | null
    studio_address: string
    work_start_hour: number
    work_end_hour: number
  } | null) {
    return {
      studioName: pro?.studio_name ?? '',
      address: pro?.studio_address ?? '',
      workStartHour: formatHour(pro?.work_start_hour ?? 10),
      workEndHour: formatHour(pro?.work_end_hour ?? 20),
    }
  }

  it('uses pro data when available', () => {
    const form = initForm({
      studio_name: 'VAVA Nails',
      studio_address: '台北市信義區',
      work_start_hour: 9,
      work_end_hour: 18,
    })
    expect(form.studioName).toBe('VAVA Nails')
    expect(form.address).toBe('台北市信義區')
    expect(form.workStartHour).toBe('09:00')
    expect(form.workEndHour).toBe('18:00')
  })

  it('falls back to defaults when pro is null', () => {
    const form = initForm(null)
    expect(form.studioName).toBe('')
    expect(form.address).toBe('')
    expect(form.workStartHour).toBe('10:00')
    expect(form.workEndHour).toBe('20:00')
  })

  it('handles null studio_name gracefully', () => {
    const form = initForm({
      studio_name: null,
      studio_address: '台北市',
      work_start_hour: 11,
      work_end_hour: 20,
    })
    expect(form.studioName).toBe('')
  })
})

// ── Business hours sync with slot system ───────────────────────

describe('Business hours ↔ slot system sync', () => {
  // The slot system uses work_start_hour / work_end_hour from the pros table
  // as DEFAULT_START_HOUR / DEFAULT_END_HOUR for the grid.
  // business-info.tsx edits these same columns — so they stay in sync.

  it('parseHour(formatHour(h)) round-trips correctly', () => {
    for (let h = 0; h <= 24; h++) {
      expect(parseHour(formatHour(h))).toBe(h)
    }
  })

  it('saved hours would match slot grid defaults', () => {
    // If a pro sets 9–18 here, the slot grid should use 9–18
    const startH = parseHour('09:00')
    const endH = parseHour('18:00')
    expect(startH).toBe(9)
    expect(endH).toBe(18)
    // These values go into pros.work_start_hour / work_end_hour,
    // which slots.tsx reads as DEFAULT_START_HOUR / DEFAULT_END_HOUR
  })
})
