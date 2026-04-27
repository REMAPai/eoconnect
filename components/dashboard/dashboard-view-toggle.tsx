'use client'

import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface DashboardViewToggleProps {
  providerContent: React.ReactNode
  customerContent: React.ReactNode
}

export function DashboardViewToggle({ providerContent, customerContent }: DashboardViewToggleProps) {
  return (
    <Tabs defaultValue="provider">
      <TabsList className="mb-6">
        <TabsTrigger value="provider">Provider</TabsTrigger>
        <TabsTrigger value="customer">Customer</TabsTrigger>
      </TabsList>
      <TabsContent value="provider">
        {providerContent}
      </TabsContent>
      <TabsContent value="customer">
        {customerContent}
      </TabsContent>
    </Tabs>
  )
}
