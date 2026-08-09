'use client'

import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Heart, MessageCircle, Instagram } from 'lucide-react'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'

const INSTA_POSTS = [
  { id: 1, image: FOOD_IMAGES['margherita-pizza'], likes: 142, comments: 12 },
  { id: 2, image: FOOD_IMAGES['paneer-tikka-pizza'], likes: 215, comments: 24 },
  { id: 3, image: FOOD_IMAGES['veg-crispy-burger'], likes: 98, comments: 5 },
  { id: 4, image: FOOD_IMAGES['penne-arrabiata'], likes: 176, comments: 18 },
]

export default function InstagramCarousel() {
  const [mounted, setMounted] = useState(false)
  const enableInstagramCarousel = useSettingsStore((state) => state.enableInstagramCarousel)
  const instagramUrl = useSettingsStore((state) => state.instagramUrl)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !enableInstagramCarousel) return null

  return (
    <section className="py-16 bg-[#FBF9F5] overflow-hidden border-t border-[#E7E0D8]">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] rounded-full p-[2px]">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <Instagram size={24} className="text-[#DD2A7B]" />
              </div>
            </div>
            <div>
              <h2 className="font-sans font-bold text-[#1C1917] text-xl">Follow Us on Instagram</h2>
              <p className="text-[#57534E] text-sm">@pizzaexpertprayagraj</p>
            </div>
          </div>
          
          {instagramUrl && (
            <a 
              href={instagramUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-outline border-[#E7E0D8] hover:border-[#1C1917] hover:bg-transparent text-[#1C1917]"
            >
              Follow
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {INSTA_POSTS.map((post) => (
            <div key={post.id} className="relative aspect-square group rounded-xl overflow-hidden cursor-pointer">
              <Image 
                src={post.image} 
                alt="Instagram post" 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-110" 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6 text-white">
                <div className="flex items-center gap-2 font-bold">
                  <Heart fill="white" size={20} />
                  <span>{post.likes}</span>
                </div>
                <div className="flex items-center gap-2 font-bold">
                  <MessageCircle fill="white" size={20} />
                  <span>{post.comments}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
