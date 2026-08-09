import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: {
    default: 'Pizza Expert Prayagraj – Best Pizza in Prayagraj | Online Ordering',
    template: '%s | Pizza Expert Prayagraj',
  },
  description:
    'Order fresh, hot pizza online from Pizza Expert Prayagraj. Rated 4.9★ on Google. Pizza, burgers, pasta, combos delivered fast. Free delivery above ₹499.',
  keywords: [
    'pizza prayagraj', 'pizza expert prayagraj', 'online pizza order prayagraj',
    'pizza delivery prayagraj', 'best pizza allahabad', 'pizza near me prayagraj',
  ],
  authors: [{ name: 'Pizza Expert Prayagraj' }],
  creator: 'Pizza Expert Prayagraj',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Pizza Expert Prayagraj',
    title: 'Pizza Expert Prayagraj – Best Pizza in Prayagraj',
    description: 'Order fresh, hot pizza online. Rated 4.9★ on Google. Free delivery above ₹499.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pizza Expert Prayagraj – Best Pizza in Prayagraj',
    description: 'Order fresh, hot pizza online. Rated 4.9★ on Google.',
  },
  robots: { index: true, follow: true },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[#B91C1C] focus:text-white focus:rounded-md focus:shadow-lg text-xs font-bold font-sans"
        >
          Skip to main content
        </a>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'Inter, sans-serif' },
            classNames: { toast: 'rounded-xl shadow-lg' },
          }}
        />
      </body>
    </html>
  )
}
