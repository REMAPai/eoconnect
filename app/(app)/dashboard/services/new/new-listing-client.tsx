'use client'

import { PostServiceWizard } from '@/components/forms/post-service-wizard'

interface NewListingClientProps {
  businessId: string
}

export function NewListingClient({ businessId }: NewListingClientProps) {
  return (
    <PostServiceWizard
      businessId={businessId}
      onSuccess={() => {
        window.location.href = '/dashboard/services'
      }}
    />
  )
}
