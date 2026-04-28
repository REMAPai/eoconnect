import { redirect } from 'next/navigation'

export default function AuthConfirmPage() {
  redirect('/login?error=auth_callback_failed')
}
