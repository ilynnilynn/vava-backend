// types/liked-pros.ts
export type LikedPro = {
  pro_id: string
  pro_display_name: string
  service_domain: 'nails' | 'lashes'
  profile_photo_url: string | null
}
