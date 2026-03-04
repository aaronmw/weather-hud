import type { Metadata } from 'next'
import { Barlow_Condensed } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const barlowCondensed = Barlow_Condensed({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Weather HUD',
  description: 'Ambient weather display using Environment Canada data',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
    >
      <head>
        <Script
          crossOrigin="anonymous"
          src="https://kit.fontawesome.com/44d855bf5c.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${barlowCondensed.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
