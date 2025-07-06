import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

import { Nunito_Sans } from 'next/font/google'
 
const nunito = Nunito_Sans({
  subsets: ['latin'],
})

// const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Microcement - Transform Spaces Sustainably",
  description: "Innovative micro-cement solutions for modern spaces. Sustainable, stylish, and fast installation.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={nunito.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
