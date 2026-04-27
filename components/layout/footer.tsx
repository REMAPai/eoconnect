import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto py-6">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} TABFT · Exclusive to EO Members
        </p>
        <nav className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="#" className="hover:text-foreground">Terms of Service</Link>
          <Link href="#" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="#" className="hover:text-foreground">Contact Support</Link>
        </nav>
      </div>
    </footer>
  )
}
