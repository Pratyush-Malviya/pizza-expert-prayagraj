export interface EmailTemplate {
  id: string
  name: string
  category: 'Orders' | 'Delivery' | 'Marketing' | 'Alerts'
  enabled: boolean
  subject: string
  heading: string
  subheading: string
  bodyText: string
  buttonText: string
  buttonUrl: string
  footerNote: string
  bannerColor: string
  variables: string[]
}
