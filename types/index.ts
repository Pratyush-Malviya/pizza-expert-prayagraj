// ─── Database Types (matches Supabase schema) ────────────────────────────────

export type UserRole = 'super_admin' | 'manager' | 'staff' | 'viewer' | 'customer'

export interface Profile {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  loyalty_points: number
  tier_id?: string | null
  date_of_birth?: string | null
  created_at: string
  tier?: LoyaltyTier
}

export interface Category {
  id: string
  name: string
  slug: string
  image_url: string | null
  sort_order: number
  is_active: boolean
}

export interface ProductOption {
  id: string
  product_id?: string
  name: string           // e.g. "Size", "Crust"
  choices: OptionChoice[]
}

export interface OptionChoice {
  label: string          // e.g. "Regular", "Large"
  price_delta: number    // extra cost added to base price
}

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  sort_order: number
  is_primary?: boolean
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  cost_price?: number
  is_veg: boolean
  is_spicy: boolean
  is_available: boolean
  category_id: string
  nutrition: Record<string, string | number> | null
  sort_order: number
  created_at: string
  // Relations (joined)
  category?: Category
  images?: ProductImage[]
  options?: ProductOption[]
  reviews?: Review[]
  avg_rating?: number
  review_count?: number
}

export interface Address {
  id: string
  user_id: string
  label: string                                                    // e.g. "Home", "Office"
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  is_default: boolean
  // Geolocation fields (added in migration 017)
  latitude?: number | null
  longitude?: number | null
  address_type?: 'home' | 'work' | 'partner' | 'hotel' | 'other'
  phone?: string | null
  landmark?: string | null
  is_gps_captured?: boolean
  created_at?: string
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  selected_options: Record<string, string> | null
  product?: Product
}

export interface Order {
  id: string
  user_id: string | null
  status: OrderStatus
  total: number
  subtotal: number
  tax: number
  delivery_fee: number
  discount: number
  coupon_id: string | null
  address_json: Address | null
  notes: string | null
  created_at: string
  // Relations
  items?: OrderItem[]
  payment?: Payment
  profile?: Profile
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentGateway = 'razorpay' | 'cashfree' | 'cod'

export interface Payment {
  id: string
  order_id: string
  gateway: PaymentGateway
  gateway_order_id: string | null
  gateway_payment_id: string | null
  amount: number
  status: PaymentStatus
  created_at: string
}

export interface Coupon {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  min_order: number
  max_usage: number | null
  used_count: number
  expires_at: string | null
  active: boolean
}

export interface Review {
  id: string
  product_id: string
  user_id: string
  rating: number
  comment: string | null
  is_approved: boolean
  created_at: string
  profile?: Pick<Profile, 'name'>
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  cover_image: string | null
  author_id: string
  published_at: string | null
  is_published: boolean
}

export interface GalleryItem {
  id: string
  image_url: string
  caption: string | null
  sort_order: number
}

// ─── Cart Types (client-side only) ───────────────────────────────────────────

export interface CartItemOption {
  optionName: string    // e.g. "Size"
  choice: string        // e.g. "Large"
  priceDelta: number
}

export interface CartItem {
  id: string            // product id
  name: string
  slug: string
  price: number         // base price
  imageUrl: string
  isVeg: boolean
  quantity: number
  selectedOptions: CartItemOption[]
  totalPrice: number    // (base + options deltas) * quantity
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  status: OrderStatus
  changed_by: string | null
  notes: string | null
  created_at: string
}

export interface Driver {
  id: string
  name: string
  phone: string
  vehicle_type: string
  vehicle_number: string | null
  is_online: boolean
  is_busy: boolean
  current_lat: number | null
  current_lng: number | null
  last_location_update: string | null
  created_at: string
}

export type DeliveryStatus = 'unassigned' | 'assigned' | 'accepted' | 'picked_up' | 'arrived' | 'delivered' | 'failed'

export interface Delivery {
  id: string
  order_id: string
  driver_id: string | null
  status: DeliveryStatus
  pickup_time: string | null
  delivered_time: string | null
  otp_code: string | null
  proof_photo: string | null
  notes: string | null
  created_at: string
  driver?: Driver
  order?: Order
}

export interface ModifierGroup {
  id: string
  name: string
  min_selection: number
  max_selection: number
  is_required: boolean
  modifiers?: Modifier[]
}

export interface Modifier {
  id: string
  group_id: string
  name: string
  price: number
  is_available: boolean
  is_veg: boolean
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Inventory & Recipe Engine Types ──────────────────────────────────────────

export interface Ingredient {
  id: string
  name: string
  unit: string // 'kg' | 'g' | 'l' | 'ml' | 'pcs' | 'slices'
  current_stock: number
  reorder_threshold: number
  cost_per_unit: number
  expiry_date: string | null
  supplier_id: string | null
  created_at: string
  updated_at: string
}

export interface RecipeItem {
  id: string
  product_id: string
  ingredient_id: string
  quantity_required: number
  created_at: string
  ingredient?: Ingredient
  product?: Product
}

// ─── Financial Analytics Types ────────────────────────────────────────────────

export interface DailyRevenueSummary {
  date: string
  total_orders: number
  gross_revenue: number
  net_subtotal: number
  total_discounts: number
  total_tax: number
  average_order_value: number
}

export interface ProductPerformanceSummary {
  product_id: string
  product_name: string
  selling_price: number
  cost_price: number
  total_units_sold: number
  total_revenue: number
  total_estimated_profit: number
}

// ─── Phase 2 Retention & Loyalty Types ────────────────────────────────────────

export interface LoyaltyTierPerks {
  discount_percent: number
  free_delivery: boolean
  priority_support?: boolean
  badge: string
}

export interface LoyaltyTier {
  id: string
  name: string // 'Silver' | 'Gold' | 'VIP'
  min_points: number
  perks: LoyaltyTierPerks
  created_at: string
}

export interface CartSession {
  id: string
  user_id: string | null
  items: CartItem[]
  last_updated: string
  recovered: boolean
  created_at: string
}

export interface NotificationLog {
  id: string
  user_id: string | null
  channel: 'email' | 'sms' | 'push'
  template: 'abandoned_cart' | 'winback' | 'birthday'
  status: 'sent' | 'failed'
  sent_at: string
}

// ─── Phases 3, 4, 5 Types ─────────────────────────────────────────────────────

export interface TaxInvoice {
  id: string
  order_id: string
  invoice_number: string
  gstin: string
  cgst: number
  sgst: number
  igst: number
  total_tax: number
  generated_at: string
}

export interface Supplier {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  payment_terms: string
  created_at: string
}

export interface PurchaseOrder {
  id: string
  supplier_id: string
  status: 'draft' | 'ordered' | 'received' | 'paid'
  total_amount: number
  ordered_at: string | null
  received_at: string | null
  created_at: string
  supplier?: Supplier
}

export interface StaffShift {
  id: string
  profile_id: string
  role: string
  shift_start: string
  shift_end: string
  checked_in_at: string | null
  checked_out_at: string | null
  notes: string | null
  created_at: string
  profile?: Profile
}

export interface RestaurantTable {
  id: string
  table_number: string
  qr_code_url: string | null
  capacity: number
  is_active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  product_id: string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  next_delivery: string
  status: 'active' | 'paused' | 'cancelled'
  created_at: string
  product?: Product
}

export interface RefundRequest {
  id: string
  order_id: string
  payment_gateway: string
  gateway_refund_id: string | null
  amount: number
  status: 'pending' | 'processed' | 'failed'
  reason: string | null
  processed_at: string | null
  created_at: string
}



