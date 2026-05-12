import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useOnClickOutside } from 'usehooks-ts'

import { cn } from '@/lib/utils'

/** Strip UA / Mui CssBaseline defaults that draw a filled circle on icon buttons. */
const modalCloseButtonClass = cn(
  'group shrink-0 cursor-pointer rounded-full !border-0 !bg-transparent p-1.5 text-foreground-body shadow-none outline-none',
  'appearance-none [-webkit-appearance:none]',
  'transition-colors hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black',
)

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
}

/**
 * Lightweight dialog — landing shell: true black + soft atmospheric wash; text via `foreground` tokens.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {import('react').ReactNode} props.children
 * @param {'sm' | 'md' | 'lg' | 'xl' | 'full'} [props.size]
 * @param {string} [props.className] merged onto the panel
 */
export default function BasicModal({ isOpen, onClose, title, subtitle, children, size = 'md', className }) {
  const modalRef = useRef(null)

  useOnClickOutside(modalRef, () => {
    if (isOpen) onClose()
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return undefined
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="basic-modal-root"
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />

          <div className="absolute inset-0 flex items-center justify-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-10">
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'basic-modal-title' : undefined}
              aria-describedby={subtitle ? 'basic-modal-subtitle' : undefined}
              className={cn(
                'relative mx-auto w-full overflow-hidden rounded-2xl border border-white/[0.1] bg-black text-foreground shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.05]',
                modalSizes[size],
                className,
              )}
              initial={{ scale: 0.96, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.98, y: 8, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            >
              {/* Same language as landing-main-flow: soft blue glows on true black */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.85]"
                style={{
                  background:
                    'radial-gradient(ellipse 85% 55% at 100% -5%, rgb(0 112 243 / 0.14), transparent 58%), radial-gradient(ellipse 70% 45% at -5% 105%, rgb(50 145 255 / 0.08), transparent 55%), radial-gradient(ellipse 60% 40% at 50% 120%, rgb(0 0 0 / 0.5), transparent 45%)',
                }}
              />

              <div className="relative z-10 p-5 sm:p-6">
                <div
                  className={cn(
                    'mb-5 flex items-start gap-3',
                    title || subtitle ? 'justify-between' : 'justify-end',
                  )}
                >
                  {title || subtitle ? (
                    <div className="min-w-0 flex-1 pr-2 text-left">
                      {title ? (
                        <h2 id="basic-modal-title" className="text-xl font-semibold tracking-tight text-foreground">
                          {title}
                        </h2>
                      ) : null}
                      {subtitle ? (
                        <p id="basic-modal-subtitle" className="text-foreground-body mt-1.5 text-sm leading-relaxed">
                          {subtitle}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className={modalCloseButtonClass}
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <X
                      className="size-5 transition-transform duration-200 ease-out group-hover:rotate-90"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </button>
                </div>

                <div className="relative text-left">{children}</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
