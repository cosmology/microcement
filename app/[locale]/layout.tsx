import type { Metadata } from "next"
import "../globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Roboto } from 'next/font/google'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
})

export const metadata: Metadata = {
  title: "Microcement - Transform Spaces Sustainably",
  description: "Innovative micro-cement solutions for modern spaces. Sustainable, stylish, and fast installation.",
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  
  console.log('🏗️ [Layout] Locale:', locale);
  console.log('📦 [Layout] Messages keys:', Object.keys(messages));

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
} 