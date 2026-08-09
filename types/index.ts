// ─── Database Types (matches Supabase schema) ────────────────────────────────

export type UserRole = 'super_admin' | 'manager' | 'staff' | 'viewer' | 'customer'

export interface Profile {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  loyalty_points: number
  created_at: string
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
  label: string          // e.g. "Home", "Office"
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  is_default: boolean
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
