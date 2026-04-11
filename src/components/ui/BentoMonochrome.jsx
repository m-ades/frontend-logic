import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { IPhoneDemoFrame, MacWindowDemoFrame } from '@/components/ui/LandingDemoFrames'
import {
  landingChildHidden,
  landingChildVisible,
  landingRevealTransition,
  landingScrollViewport,
  landingStaggerChildren,
} from '@/landing/landing-motion'
import { LANDING_CARD_SHEEN } from '@/landing/landing-card-sheen'
import { resolveBentoLogicKeyboardImage, resolveBentoMacStill } from '@/landing/bento-screenshots'

const BENTO_STILL_IMG_CLASS = 'absolute inset-0 size-full object-cover object-top'

function BentoMacStillImage({ slot, alt }) {
  const { src, width, height } = resolveBentoMacStill(slot)
  return (
    <img
      src={src}
      alt={alt}
      className={BENTO_STILL_IMG_CLASS}
      width={width}
      height={height}
      decoding="async"
      loading="lazy"
    />
  )
}

function CardShell({ title, caption, children, span, variants }) {
  return (
    <motion.article
      variants={variants}
      className={cn(
        'group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-card text-card-foreground transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 hover:border-border/70 hover:bg-muted/45 hover:shadow-lg hover:shadow-black/35',
        span,
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 opacity-90" style={{ background: LANDING_CARD_SHEEN }} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center p-5 text-center sm:p-6">
        <h3 className="shrink-0 text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h3>
        <div className="mt-3 flex min-h-0 w-full flex-1 flex-col items-center justify-center">
          {children}
        </div>
        <p className="text-foreground-body mx-auto mt-4 max-w-prose shrink-0 text-pretty text-sm leading-relaxed sm:text-base">
          {caption}
        </p>
      </div>
    </motion.article>
  )
}

function LogicKeyboardScreenshot({ variant = 'phone' }) {
  const { src, width, height } = resolveBentoLogicKeyboardImage(variant)
  return (
    <img
      src={src}
      alt="HuLA custom logic keyboard"
      className={BENTO_STILL_IMG_CLASS}
      width={width}
      height={height}
      decoding="async"
      loading="lazy"
    />
  )
}

function PhoneKeyboardVisual({ className }) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[200px] w-full flex-col items-center justify-center md:min-h-0',
        className,
      )}
    >
      {/* Mobile: Mac window — same chrome as Analytics / Auto-Grading cards */}
      <div className="w-full shrink-0 md:hidden">
        <MacWindowDemoFrame title="Custom logic keyboard" className="w-full">
          <div className="relative aspect-video w-full">
            <LogicKeyboardScreenshot variant="mobile-mac" />
          </div>
        </MacWindowDemoFrame>
      </div>

      {/* md+: tall phone mockup in the 2×2 grid cell */}
      <div className="hidden h-full w-full items-center justify-center md:flex">
        <div className="h-full max-h-[min(72vh,640px)] w-auto max-w-full shrink-0 [aspect-ratio:9/19.5]">
          <IPhoneDemoFrame title="Custom logic keyboard" className="h-full min-h-0 w-full">
            <div className="relative h-full min-h-0 w-full">
              <LogicKeyboardScreenshot variant="phone" />
            </div>
          </IPhoneDemoFrame>
        </div>
      </div>
    </div>
  )
}

function AnalyticsMacVisual({ className }) {
  return (
    <div className={cn('w-full shrink-0', className)}>
      <MacWindowDemoFrame title="Instructor Dashboard" className="w-full">
        <div className="relative aspect-[2/1] w-full">
          <BentoMacStillImage slot="analytics" alt="HuLA analytics dashboard with performance trends" />
        </div>
      </MacWindowDemoFrame>
    </div>
  )
}

function AutoGradingMacVisual({ className }) {
  return (
    <div className={cn('w-full shrink-0', className)}>
      <MacWindowDemoFrame compact title="Conditional Proof" className="w-full">
        <div className="relative aspect-video w-full">
          <BentoMacStillImage slot="autoGrade" alt="HuLA derivation with instant validation" />
        </div>
      </MacWindowDemoFrame>
    </div>
  )
}

/** Bold free / $0 tag */
function FreeTagVisual({ className }) {
  return (
    <div className={cn('flex w-full shrink-0 justify-center py-2', className)}>
      <div className="relative inline-block rotate-[-5deg]">
        <div className="rounded-xl border-2 border-primary/35 bg-primary/12 px-5 py-4 shadow-lg shadow-black/20 sm:px-6 sm:py-5">
          <span className="block text-center text-3xl font-black tracking-tight text-primary sm:text-4xl">$0.00</span>
        </div>
        <span className="absolute -right-2 -top-2 rounded-md bg-[#0070f3] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
          Free
        </span>
      </div>
    </div>
  )
}

/** Tall keyboard column (2×2 cells), wide analytics on top-right, grading + price on bottom row. */
const GRID_SPANS = {
  keyboard: 'md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-1',
  analytics: 'md:col-span-4 md:row-span-1 md:col-start-3 md:row-start-1',
  autoGrade: 'md:col-span-2 md:row-span-1 md:col-start-3 md:row-start-2',
  free: 'md:col-span-2 md:row-span-1 md:col-start-5 md:row-start-2',
}

export function FeaturesSectionMinimal() {
  const reducedMotion = useReducedMotion()

  const flowVariants = {
    hidden: {},
    visible: {
      transition: reducedMotion
        ? { duration: 0.01 }
        : { staggerChildren: landingStaggerChildren, delayChildren: 0.08 },
    },
  }

  const gridVariants = {
    hidden: {},
    visible: {
      transition: reducedMotion
        ? { duration: 0.01 }
        : { staggerChildren: landingStaggerChildren * 1.05, delayChildren: 0 },
    },
  }

  const headerVariants = {
    hidden: landingChildHidden,
    visible: landingChildVisible(reducedMotion),
  }

  const cardVariants = {
    hidden: {
      ...landingChildHidden,
      scale: reducedMotion ? 1 : 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: landingRevealTransition(reducedMotion),
    },
  }

  return (
    <section
      id="features"
      aria-labelledby="landing-features-heading"
      className={cn(
        'relative w-full overflow-hidden scroll-mt-24 bg-transparent px-4 py-12 sm:scroll-mt-28 sm:px-6 sm:py-16 md:scroll-mt-32 md:py-24',
      )}
    >
      <motion.div
        className="relative mx-auto max-w-5xl"
        variants={flowVariants}
        initial="hidden"
        whileInView="visible"
        viewport={landingScrollViewport}
      >
        <motion.div
          variants={headerVariants}
          className="mx-auto mb-10 max-w-3xl text-center sm:mb-14 md:mb-16"
        >
          <h2
            id="landing-features-heading"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-tight"
          >
            Features
          </h2>
          <p className="text-foreground-body mt-3 text-base sm:mt-4 sm:text-lg">
            Everything students need to practice logic—and everything instructors need to run the course.
          </p>
        </motion.div>

        <motion.div
          variants={gridVariants}
          className="grid grid-cols-1 gap-6 sm:gap-8 md:auto-rows-[minmax(0,auto)] md:grid-cols-6 md:items-stretch"
        >
          <CardShell
            title="Custom Logic Keyboard"
            caption="Ditch the clunky formatting. Our optimized mobile keyboard makes typing symbolic logic on your phone seamless."
            span={GRID_SPANS.keyboard}
            variants={cardVariants}
          >
            <PhoneKeyboardVisual />
          </CardShell>

          <CardShell
            title="Deep Analytics"
            caption="Stop guessing. Dashboards for both students and instructors provide actionable insights into completion rates and grade distributions."
            span={GRID_SPANS.analytics}
            variants={cardVariants}
          >
            <AnalyticsMacVisual />
          </CardShell>

          <CardShell
            title="Auto-Grading"
            caption="Instant validation for natural derivation and truth tables."
            span={GRID_SPANS.autoGrade}
            variants={cardVariants}
          >
            <AutoGradingMacVisual />
          </CardShell>

          <CardShell
            title="For Free. Forever."
            caption="Say goodbye to $100+ access codes."
            span={GRID_SPANS.free}
            variants={cardVariants}
          >
            <FreeTagVisual />
          </CardShell>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default FeaturesSectionMinimal
