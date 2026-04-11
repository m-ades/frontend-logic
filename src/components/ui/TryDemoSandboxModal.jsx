import { Link } from 'react-router-dom'
import { LayoutDashboard, Presentation } from 'lucide-react'

import BasicModal from '@/components/ui/BasicModal'
import { LANDING_CARD_SHEEN } from '@/landing/landing-card-sheen'
import {
  SANDBOX_INSTRUCTOR_DASHBOARD_PATH,
  SANDBOX_STUDENT_DASHBOARD_PATH,
} from '@/landing/sandbox-demo-paths'
import { cn } from '@/lib/utils'

const choiceLinkClass = cn(
  'group relative flex w-full cursor-pointer flex-row items-start gap-4 overflow-hidden rounded-xl border border-white/[0.1] px-4 py-4 text-left text-foreground no-underline outline-none transition-[border-color] duration-300',
  'hover:border-white/[0.18]',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black',
)

function ChoiceRow({ to, icon, label, description, onClose }) {
  return (
    <Link to={to} className={choiceLinkClass} onClick={onClose}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: LANDING_CARD_SHEEN }}
      />
      <span className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-foreground transition-colors duration-300 group-hover:border-white/[0.12] group-hover:bg-white/[0.06]">
        {icon}
      </span>
      <span className="relative z-10 flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-base font-semibold tracking-tight text-foreground">{label}</span>
        <span className="text-foreground-body text-sm font-normal leading-snug">{description}</span>
      </span>
    </Link>
  )
}

/**
 * Chooser for unauthenticated “Try demo” — routes are stubs until sandbox dashboards exist.
 */
export default function TryDemoSandboxModal({ isOpen, onClose }) {
  return (
    <BasicModal
      isOpen={isOpen}
      onClose={onClose}
      title="Explore HuLA"
      subtitle="Pick a demo workspace. These routes are under construction—you may see a blank page until dashboards ship."
      size="xl"
    >
      <div className="flex w-full flex-col gap-3">
        <ChoiceRow
          to={SANDBOX_STUDENT_DASHBOARD_PATH}
          icon={<LayoutDashboard className="size-5" aria-hidden />}
          label="Student Dashboard"
          description="Courses, practice, and grades as learners see them."
          onClose={onClose}
        />
        <ChoiceRow
          to={SANDBOX_INSTRUCTOR_DASHBOARD_PATH}
          icon={<Presentation className="size-5" aria-hidden />}
          label="Instructor Dashboard"
          description="Assignments, gradebook, and class tools preview."
          onClose={onClose}
        />
      </div>
    </BasicModal>
  )
}
