import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GraduationCap, Sigma, TrendingUp } from 'lucide-react'
import {
  landingChildHidden,
  landingChildVisible,
  landingScrollViewport,
  landingStaggerChildren,
} from '@/landing/landing-motion'
import { LANDING_CARD_SHEEN } from '@/landing/landing-card-sheen'

function StepCard({ icon, title, description }) {
  return (
    <div
      className={cn(
        'group relative flex h-full min-h-0 flex-1 flex-col items-center overflow-hidden rounded-2xl border border-border-subtle bg-card p-5 text-center text-card-foreground transition-all duration-300 ease-out sm:p-6',
        'hover:-translate-y-0.5 hover:border-border/70 hover:bg-muted/45 hover:shadow-lg hover:shadow-black/35',
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 opacity-90" style={{ background: LANDING_CARD_SHEEN }} />
      </div>
      <div className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-muted text-foreground-body transition-colors duration-300 group-hover:border-border-subtle group-hover:text-foreground sm:h-12 sm:w-12">
        {icon}
      </div>
      <h3 className="mb-2 shrink-0 text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h3>
      <p className="text-foreground-body flex-1 text-pretty text-sm leading-relaxed sm:text-base">{description}</p>
    </div>
  )
}

const STEPS = [
  {
    icon: <Sigma className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} aria-hidden />,
    title: 'Solve & Prove',
    description:
      'Tackle everything from truth tables and predicate translations to multi-line CP/IP proofs.',
  },
  {
    icon: <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} aria-hidden />,
    title: 'Track Your Growth',
    description:
      'Get instant line-by-line feedback and check your student dashboard to compare your homework average and completion times against the class.',
  },
  {
    icon: <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} aria-hidden />,
    title: 'Instructor Control',
    description:
      'Empower professors with real-time performance trends, grade distributions, and easy CSV gradebook exports.',
  },
]

/** Landing “How it works” — three steps; pass `className` or other section props as needed. */
export function HowItWorks({ className, ...props }) {
  const reducedMotion = useReducedMotion()

  const childVariants = {
    hidden: landingChildHidden,
    visible: landingChildVisible(reducedMotion),
  }

  const containerVariants = {
    hidden: {},
    visible: {
      transition: reducedMotion
        ? { duration: 0.01 }
        : { staggerChildren: landingStaggerChildren, delayChildren: 0.06 },
    },
  }

  const stepsGridVariants = {
    hidden: {},
    visible: {
      transition: reducedMotion
        ? { duration: 0.01 }
        : { staggerChildren: landingStaggerChildren, delayChildren: 0 },
    },
  }

  return (
    <section
      id="how-it-works"
      aria-labelledby="landing-how-heading"
      className={cn(
        'relative w-full overflow-hidden scroll-mt-24 bg-transparent px-4 py-12 sm:scroll-mt-28 sm:px-6 sm:py-16 md:scroll-mt-32 md:py-24',
        className,
      )}
      {...props}
    >
      <motion.div
        className="relative mx-auto max-w-5xl"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={landingScrollViewport}
      >
        <motion.div
          variants={childVariants}
          className="mx-auto mb-10 max-w-3xl text-center sm:mb-14 md:mb-16"
        >
          <h2
            id="landing-how-heading"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-tight"
          >
            How It Works
          </h2>
          <p className="text-foreground-body mt-3 text-base sm:mt-4 sm:text-lg">
            Everything you need to master, track, and teach symbolic logic.
          </p>
        </motion.div>

        <motion.div
          variants={childVariants}
          className="relative mx-auto mb-8 hidden w-full max-w-4xl md:mb-10 md:block"
        >
          <div
            aria-hidden
            className="bg-border-subtle absolute left-[16.6667%] top-1/2 h-0.5 w-[66.6667%] -translate-y-1/2"
          />
          <div className="relative grid grid-cols-3">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className="border-border-subtle flex h-8 w-8 items-center justify-center justify-self-center rounded-full border bg-muted text-sm font-semibold text-foreground-body ring-4 ring-background"
              >
                {index + 1}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={stepsGridVariants}
          className="mx-auto grid max-w-4xl grid-cols-1 items-stretch gap-6 sm:gap-8 md:grid-cols-3"
        >
          {STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              variants={childVariants}
              className="relative flex min-h-0 flex-col md:h-full"
            >
              <div className="mb-4 flex shrink-0 flex-col items-center gap-1.5 text-center md:hidden">
                <div className="border-border-subtle flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-semibold text-foreground-body ring-2 ring-background">
                  {index + 1}
                </div>
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Step {index + 1}
                </span>
              </div>
              <StepCard icon={step.icon} title={step.title} description={step.description} />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
