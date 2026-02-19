import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import Script from 'next/script'
import { CanmoreThemeProvider } from '@/components/CanmoreThemeProvider'
import './globals.css'

const notoSansJP = Noto_Sans_JP({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
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
    <html lang="en" data-theme="light">
      <head>
        <Script
          crossOrigin="anonymous"
          src="https://kit.fontawesome.com/44d855bf5c.js"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${notoSansJP.variable} antialiased`}
      >
        <CanmoreThemeProvider>{children}</CanmoreThemeProvider>
      </body>
    </html>
  )
}
