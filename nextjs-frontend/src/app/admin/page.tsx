import React from 'react'
import { AdminPageClient } from '@/app/admin/AdminPageClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Panel - ChainChaos',
  description: 'Admin control panel for ChainChaos prediction markets',
}

export default function AdminPage() {
  return <AdminPageClient />
}