// ============================================================
// /pro/login — Redirects to unified /login
//
// Pro and customer login are now the same Google login.
// Pro/customer mode is determined inside the app, not by
// separate login pages.
// ============================================================

import { redirect } from 'next/navigation'

export default function ProLoginPage() {
  redirect('/login')
}
