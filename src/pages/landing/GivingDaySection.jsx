import { motion, useReducedMotion } from 'framer-motion'
import CallToActionGivingDay from '@/components/ui/CallToAction1'
import {
  landingChildHidden,
  landingChildVisible,
  landingScrollViewport,
} from '@/landing/landing-motion'

/**
 * Full-width Hunter-inspired gradient strip — reads as a distinct “footer” block without a floating card.
 * Copy stays in a comfortable measure via the inner max-width on `CallToActionGivingDay`.
 */
export default function GivingDaySection() {
  const reducedMotion = useReducedMotion()

  return (
    <section
      id="giving-day"
      className="scroll-mt-24 border-t border-white/10 bg-gradient-to-b from-[#6B3FA0] via-[#4A2872] to-[#241038] px-4 py-14 text-white sm:scroll-mt-28 sm:px-6 sm:py-16 md:scroll-mt-32 md:py-20"
      aria-labelledby="landing-giving-heading"
    >
      <motion.div
        className="w-full"
        initial="hidden"
        whileInView="visible"
        viewport={landingScrollViewport}
        variants={{
          hidden: landingChildHidden,
          visible: landingChildVisible(reducedMotion),
        }}
      >
        <CallToActionGivingDay />
      </motion.div>
    </section>
  )
}
