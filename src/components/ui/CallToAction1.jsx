import { cn } from '@/lib/utils'
import { LANDING_CTA_LIFT_SOLID } from '@/landing/landing-cta-motion'

const GIVING_DAY_CTA_HREF =
  'https://giving.hunter.cuny.edu/schools/HunterCollegeFoundation/hunter-college-giving-day-2026/pages/arts-sciences/philosophy'

/**
 * Giving Day copy block — full-width purple gradient from the parent section.
 * Uses `font-sans` (Geist Sans on the landing route via `landing.css` @theme).
 */
export default function CallToActionGivingDay({ className }) {
  return (
    <div
      className={cn(
        'font-sans mx-auto flex w-full max-w-3xl flex-col items-center px-2 text-center text-white sm:max-w-4xl',
        className,
      )}
    >
      <h2
        id="landing-giving-heading"
        className="max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.5rem] md:leading-tight"
      >
        <span className="bg-gradient-to-r from-white via-white to-[#E4D4FA] bg-clip-text text-transparent">
          Support the Future of Free EdTech.
        </span>
      </h2>
      <p className="text-white/90 mt-5 max-w-2xl text-pretty text-base leading-relaxed sm:text-lg">
        HuLA is proudly built by students for students. We are currently participating in Hunter
        College&apos;s Giving Day campaign. Every dollar helps us scale the platform and keep it free for
        future logic students.
      </p>
      <a
        href={GIVING_DAY_CTA_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'mt-9 inline-flex items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold no-underline',
          LANDING_CTA_LIFT_SOLID,
          'bg-[#A855F7] text-white shadow-lg shadow-black/25 hover:bg-[#9333EA] hover:no-underline',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E1048]',
        )}
      >
        Donate to Our Campaign
      </a>
    </div>
  )
}
