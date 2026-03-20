// src/app/page.tsx — redirect về /chat
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/chat')
}