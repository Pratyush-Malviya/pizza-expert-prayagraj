import { Metadata } from 'next'
import POSScreen from './POSScreen'

export const metadata: Metadata = {
  title: 'POS Billing | Pizza Expert Admin',
  description: 'Point of Sale counter billing — Pizza Expert Prayagraj',
}

export default function POSPage() {
  return <POSScreen />
}
