import type { Metadata } from 'next'
import { Barlow_Semi_Condensed } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const barlowSemiCondensed = Barlow_Semi_Condensed({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['700'],
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
      data-theme="dark"
    >
      <head>
        <Script
          crossOrigin="anonymous"
          src="https://kit.fontawesome.com/44d855bf5c.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${barlowSemiCondensed.variable} font-bold antialiased`}>
        {children}
      </body>
    </html>
  )
}
