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
    { url: '/favicon-32x32.png', sizes: '32x32' },
    { url: '/favicon-192x192.png', sizes: '192x192' },
  ],
  apple: '/apple-icon-180x180.png',
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
