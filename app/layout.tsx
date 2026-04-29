import type { Metadata, Viewport } from 'next'
import { Inter, Montserrat } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["300", "400", "500", "600", "700", "800"] })

export const viewport: Viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'Gamified Social Support Intervention | CVR Study',
  description: 'A gamified social support intervention for cardiovascular risk reduction. Track steps, earn badges, and support each other toward better heart health.',
  icons: {
  icon: [
    { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    { url: '/android-icon-192x192.png', sizes: '192x192', type: 'image/png' },
  ],
  apple: [
    { url: '/apple-icon-57x57.png', sizes: '57x57' },
    { url: '/apple-icon-60x60.png', sizes: '60x60' },
    { url: '/apple-icon-72x72.png', sizes: '72x72' },
    { url: '/apple-icon-76x76.png', sizes: '76x76' },
    { url: '/apple-icon-114x114.png', sizes: '114x114' },
    { url: '/apple-icon-120x120.png', sizes: '120x120' },
    { url: '/apple-icon-144x144.png', sizes: '144x144' },
    { url: '/apple-icon-152x152.png', sizes: '152x152' },
    { url: '/apple-icon-180x180.png', sizes: '180x180' },
  ],
  other: [
    {
      rel: 'manifest',
      url: '/manifest.json',
    },
  ],
},
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${_inter.variable} ${_montserrat.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
