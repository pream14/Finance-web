import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Finance Collection Management System',
  description: 'Manage loans, collections, and expenses efficiently with role-based access for admins and collectors',
  generator: 'Finance Management System',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}

        <script dangerouslySetInnerHTML={{
          __html: `
          document.addEventListener('wheel', function(e) {
            if (document.activeElement && document.activeElement.type === 'number') {
              document.activeElement.blur();
            }
          }, { passive: true });
        ` }} />
      </body>
    </html>
  )
}
