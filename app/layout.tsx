import type { Metadata } from "next"
import "./globals.css"
// import { ThemeProvider } from "@/components/theme-provider"
import { ThemeProvider } from "next-themes"
import { Roboto } from 'next/font/google'
import ContentProgress from './components/ContentProgress'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
})

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
      <body className={roboto.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ContentProgress />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
