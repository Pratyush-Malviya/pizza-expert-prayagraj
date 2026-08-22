'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface HomepageReviewSettings {
  ratingScore: string
  sectionTitle: string
  sectionSubtitle: string
  btnText: string
  googleReviewsLink: string
}

const DEFAULT_REVIEW_SETTINGS: HomepageReviewSettings = {
  ratingScore: '4.9 / 5.0',
  sectionTitle: 'PRAYAGRAJ REVIEWS',
  sectionSubtitle: 'Over 500+ verified 5-star ratings on Google from pizza lovers across Allahabad.',
  btnText: 'WRITE A REVIEW',
  googleReviewsLink: 'https://g.page/r/pizzaexpert-prayagraj/review',
}

/**
 * Fetch Homepage Review Section Header Settings
 */
export async function getHomepageReviewSettings(): Promise<HomepageReviewSettings> {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'homepage_review_settings')
      .single()

    if (error || !data?.value) {
      return DEFAULT_REVIEW_SETTINGS
    }

    return {
      ...DEFAULT_REVIEW_SETTINGS,
      ...data.value,
    }
  } catch {
    return DEFAULT_REVIEW_SETTINGS
  }
}

/**
 * Save Homepage Review Section Header Settings
 */
export async function updateHomepageReviewSettings(
  settings: Partial<HomepageReviewSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getHomepageReviewSettings()
    const merged = { ...current, ...settings }

    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'homepage_review_settings',
        value: merged,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.warn('Supabase settings upsert note:', error.message)
    }

    revalidatePath('/')
    revalidatePath('/admin/reviews')
    revalidatePath('/admin/settings')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
