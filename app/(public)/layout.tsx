import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AnnouncementBanner from '@/components/layout/AnnouncementBanner'
import WhatsAppButton from '@/components/shared/WhatsAppButton'
import CartDrawer from '@/components/cart/CartDrawer'
import LocationPermissionBanner from '@/components/shared/LocationPermissionBanner'
import AIChatWidget from '@/components/ai/AIChatWidget'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AnnouncementBanner />
      <LocationPermissionBanner />
      <Header />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <WhatsAppButton />
      <CartDrawer />
      <AIChatWidget />
    </>
  )
}

