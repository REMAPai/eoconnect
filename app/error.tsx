'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            {error.digest && (
              <p className="text-xs text-muted-foreground font-mono">ID: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
