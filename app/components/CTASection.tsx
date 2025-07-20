"use client"

import { motion } from "framer-motion"
import { useTranslations } from 'next-intl';

export default function CTASection() {
  const t = useTranslations('CTA');

  return (
    <section className="py-20 bg-gray-900 dark:bg-gray-800 text-white px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-4xl md:text-5xl font-light text-center mb-8 text-white"
        >
          {t('title')}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="text-xl mb-12 text-gray-300 dark:text-gray-200"
        >
          {t('description')}
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-white text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-lg"
        >
          {t('button')}
        </motion.button>
      </div>
    </section>
  )
}
