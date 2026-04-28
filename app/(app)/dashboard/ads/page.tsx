import { Megaphone } from 'lucide-react'

export default function AdsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
          <Megaphone className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Ad Campaigns</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Promote your listing to the top of search results and category pages. Pay per click or per impression — fully transparent reporting.
          </p>
        </div>
        <div className="inline-block bg-primary/10 border border-primary/30 px-4 py-1.5 rounded-full">
          <p className="text-sm font-medium text-primary">Launching soon</p>
        </div>
        <p className="text-xs text-muted-foreground pt-2">
          We&apos;ll notify all members when this is live. In the meantime, complete your business profile to be ready.
        </p>
      </div>
    </div>
  )
}
