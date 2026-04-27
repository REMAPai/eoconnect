'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteService } from '@/actions/services'
import { Button } from '@/components/ui/button'

interface ServiceActionsProps {
  serviceId: string
}

export function ServiceActions({ serviceId }: ServiceActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm('Delete this service? This cannot be undone.')) return
    startTransition(async () => {
      await deleteService(serviceId)
      router.refresh()
    })
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={handleDelete}
    >
      {isPending ? 'Deleting…' : 'Delete'}
    </Button>
  )
}
