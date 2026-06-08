import type { Metadata } from 'next'
import { Atkinson_Hyperlegible_Next } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const atkinsonHyperlegible = Atkinson_Hyperlegible_Next({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '600'],
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
      <body
        className={`${atkinsonHyperlegible.variable} font-semibold antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
