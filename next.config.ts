import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com https://*.razorpay.com https://us-assets.i.posthog.com https://eu-assets.i.posthog.com https://*.posthog.com https://unpkg.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https://*.supabase.co https://images.unsplash.com https://plus.unsplash.com https://cdn.pixabay.com https://*.razorpay.com https://cdn.razorpay.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://unpkg.com https://us-assets.i.posthog.com https://eu-assets.i.posthog.com https://api.qrserver.com https://*.qrserver.com;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://lumberjack.razorpay.com https://lumberjack-cx.razorpay.com https://*.razorpay.com https://us.i.posthog.com https://eu.i.posthog.com https://us-assets.i.posthog.com https://eu-assets.i.posthog.com https://*.posthog.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com;
  worker-src 'self' blob:;
  frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
