import { createContext, useContext, useReducer, type ReactNode } from 'react'

export type BookingRequestState = {
  category: 'nails' | 'lashes' | 'makeup' | null
  location: { lat: number; lng: number; label: string } | null
  date: string | null
  timeBand: 'morning' | 'afternoon' | 'evening' | 'any' | null
  services: {
    categoryIds: string[]
    styleId: string | null
    nailScope: string | null
    lashDensity: string | null
    treatmentTier: string | null
    fillInDays: number | null
    fiberTagId: string | null
    styleTags: string[]
  } | null
  addons: string[]
  preferences: string[]
  customerNote: string
  refPhotoUrl: string | null
  prefilledFields: string[]
  isEditing: boolean
}

export type BookingAction =
  | { type: 'SET_CATEGORY'; payload: BookingRequestState['category'] }
  | { type: 'SET_LOCATION'; payload: BookingRequestState['location'] }
  | { type: 'SET_WHEN'; payload: { date: string | null; timeBand: BookingRequestState['timeBand'] } }
  | { type: 'SET_SERVICES'; payload: BookingRequestState['services'] }
  | { type: 'SET_ADDONS'; payload: string[] }
  | { type: 'SET_EXTRAS'; payload: { preferences: string[]; customerNote: string; refPhotoUrl: string | null } }
  | { type: 'SET_PREFILLED'; payload: string[] }
  | { type: 'SET_EDITING'; payload: boolean }
  | { type: 'RESET' }

const initialState: BookingRequestState = {
  category: null,
  location: null,
  date: null,
  timeBand: null,
  services: null,
  addons: [],
  preferences: [],
  customerNote: '',
  refPhotoUrl: null,
  prefilledFields: [],
  isEditing: false,
}

function bookingReducer(state: BookingRequestState, action: BookingAction): BookingRequestState {
  switch (action.type) {
    case 'SET_CATEGORY':
      return { ...state, category: action.payload }
    case 'SET_LOCATION':
      return { ...state, location: action.payload }
    case 'SET_WHEN':
      return { ...state, date: action.payload.date, timeBand: action.payload.timeBand }
    case 'SET_SERVICES':
      return { ...state, services: action.payload }
    case 'SET_ADDONS':
      return { ...state, addons: action.payload }
    case 'SET_EXTRAS':
      return { ...state, preferences: action.payload.preferences, customerNote: action.payload.customerNote, refPhotoUrl: action.payload.refPhotoUrl }
    case 'SET_PREFILLED':
      return { ...state, prefilledFields: action.payload }
    case 'SET_EDITING':
      return { ...state, isEditing: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

type BookingContextType = {
  state: BookingRequestState
  dispatch: React.Dispatch<BookingAction>
}

const BookingContext = createContext<BookingContextType | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState)
  return (
    <BookingContext.Provider value={{ state, dispatch }}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBookingRequest() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBookingRequest must be used within BookingProvider')
  return ctx
}
