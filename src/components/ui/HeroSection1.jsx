import React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AnimatedGroup } from '@/components/ui/AnimatedGroup'
import { MacWindowDemoFrame } from '@/components/ui/LandingDemoFrames'
import { YouTubeFacadeEmbed } from '@/components/ui/YouTubeFacadeEmbed'
import { HERO_DEMO_YOUTUBE_URL_OR_ID } from '@/landing/hero-demo.config'
import { LANDING_CTA_LIFT_OUTLINE, LANDING_CTA_LIFT_SOLID } from '@/landing/landing-cta-motion'
import { cn } from '@/lib/utils'

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 14,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
}

/** Hero Mac demo: no `filter` — blur + video thumbnails composites as a hazy “white” layer in some browsers */
const demoTransitionVariants = {
  item: {
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
}

const menuItems = [
  { name: 'Video Demo', href: '#video-demo' },
  { name: 'How It Works', href: '#how-it-works' },
  { name: 'Features', href: '#features' },
  { name: 'Giving Day', href: '#giving-day' },
]

/** Hollow outline vs solid Login: faint hover fill stays clearly “outline”, not a second solid pill */
const navTryDemoButtonClass = cn(
  LANDING_CTA_LIFT_OUTLINE,
  'border-2 border-input bg-transparent hover:border-foreground/30 hover:bg-white/[0.07] hover:text-foreground',
)

const navInverseCtaMotionClass = LANDING_CTA_LIFT_SOLID

/** Default a step brighter than `foreground-body` (#888); hover stays full `foreground`. */
const navLinkClass =
  'text-foreground/80 hover:text-foreground block no-underline transition-colors duration-200 ease-out'

const DEMO_POSTER_SRC =
  'https://tailark.com//_next/image?url=%2Fmail2.png&w=3840&q=75'

export function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="relative overflow-hidden border-0 bg-transparent pb-14 text-foreground shadow-none ring-0 outline-none md:pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2] hidden opacity-50 isolate contain-strict lg:block"
        >
          <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>

        <section
          id="video-demo"
          className="relative z-[3] scroll-mt-24 sm:scroll-mt-28 md:scroll-mt-32"
        >
          <div className="relative isolate pt-20 sm:pt-24 md:pt-32 lg:pt-36">
            {/* Feather into page wash: avoid solid --color-background here — it caused a hard line vs How It Works */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 size-full [background:radial-gradient(ellipse_145%_110%_at_50%_115%,transparent_0%,rgb(0_0_0_/_0.28)_45%,rgb(0_112_243_/_0.04)_62%,transparent_100%)]"
            />

            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl text-foreground sm:mt-8 sm:text-5xl md:mt-10 md:text-6xl lg:mt-14 lg:text-7xl xl:text-[5.25rem]">
                    <span className="block md:whitespace-nowrap">Master Symbolic Logic</span>
                    <span className="block md:whitespace-nowrap">Without the Paywall</span>
                  </h1>
                  <p className="text-foreground-body mx-auto mt-5 max-w-2xl text-balance text-base sm:mt-6 sm:text-lg md:mt-8">
                    A smarter way to learn, practice, and grade logic.
                  </p>
                </AnimatedGroup>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-8 flex flex-col items-center justify-center gap-2 sm:mt-10 md:mt-12 md:flex-row"
                >
                  <Button
                    key={1}
                    asChild
                    variant="inverse"
                    size="lg"
                    className={cn(navInverseCtaMotionClass, 'rounded-xl px-5 text-base')}
                  >
                    <RouterLink to="/login" className="no-underline">
                      <span className="text-nowrap">Login</span>
                    </RouterLink>
                  </Button>
                  <Button
                    key={2}
                    asChild
                    size="lg"
                    variant="outline"
                    className={cn(navTryDemoButtonClass, 'h-10.5 rounded-xl px-5')}
                  >
                    <RouterLink to="/sandbox" className="no-underline">
                      <span className="text-nowrap">Try Demo</span>
                    </RouterLink>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            {/* Mac window + poster: same blur + y + spring as headline (`transitionVariants`). */}
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...demoTransitionVariants,
              }}
            >
              <div className="relative mt-6 w-full max-w-[100vw] overflow-x-clip px-0 sm:mt-10 sm:px-2 md:mt-14 lg:mt-20">
                <div className="relative mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-0">
                  <MacWindowDemoFrame
                    opaqueShell
                    className="mx-auto w-full"
                    title="See HuLA in Action"
                  >
                    {/*
                      YouTube: set `HERO_DEMO_YOUTUBE_URL_OR_ID` in `src/landing/hero-demo.config.js`
                      (video ID or full URL). Empty = static poster below.
                    */}
                    <div className="relative aspect-video w-full bg-black sm:aspect-[15/8]">
                      <YouTubeFacadeEmbed
                        urlOrId={HERO_DEMO_YOUTUBE_URL_OR_ID}
                        fallbackPosterSrc={DEMO_POSTER_SRC}
                        title="HuLA product demo"
                      />
                    </div>
                  </MacWindowDemoFrame>
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>

      </main>
    </>
  )
}

function getAppScrollTop() {
  const root = document.getElementById('root')
  if (root) {
    return root.scrollTop
  }
  return window.scrollY || document.documentElement.scrollTop
}

function HeroHeader() {
  const [menuState, setMenuState] = React.useState(false)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const closeMenu = () => setMenuState(false)
  const handleNavAnchorClick = (event, href) => {
    if (!href || !href.startsWith('#')) return
    event.preventDefault()
    closeMenu()
    const target = document.getElementById(href.slice(1))
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  React.useEffect(() => {
    const root = document.getElementById('root')
    const handleScroll = () => {
      setIsScrolled(getAppScrollTop() > 50)
    }
    handleScroll()
    const opts = { passive: true }
    root?.addEventListener('scroll', handleScroll, opts)
    window.addEventListener('scroll', handleScroll, opts)
    return () => {
      root?.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => {
      if (mq.matches) setMenuState(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <header>
      <nav
        data-state={menuState ? 'active' : undefined}
        className="group fixed z-20 w-full px-3 sm:px-4"
      >
        <div
          className={cn(
            'mx-auto mt-2 max-w-6xl px-3 max-lg:transition-none sm:px-5 md:px-6 lg:px-12 lg:transition-all lg:duration-300',
            isScrolled &&
              'max-w-4xl border-0 bg-transparent max-lg:rounded-none max-lg:backdrop-blur-none lg:rounded-2xl lg:border lg:border-border lg:bg-background/50 lg:backdrop-blur-lg lg:px-5',
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <RouterLink
                to="/"
                aria-label="home"
                className="text-foreground flex items-center space-x-2 no-underline transition-opacity duration-200 ease-out hover:opacity-85"
              >
                <span className="text-base font-semibold tracking-tight sm:text-lg">HuLA</span>
              </RouterLink>

              <button
                type="button"
                onClick={() => setMenuState(!menuState)}
                aria-expanded={menuState}
                aria-label={menuState === true ? 'Close Menu' : 'Open Menu'}
                className="text-foreground relative z-20 -m-2.5 -mr-4 block cursor-pointer appearance-none border-0 bg-transparent p-2.5 shadow-none outline-none ring-0 lg:hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Menu className="in-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex list-none gap-8 pl-0 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <a
                      href={item.href}
                      onClick={(event) => handleNavAnchorClick(event, item.href)}
                      className={navLinkClass}
                    >
                      <span>{item.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={cn(
                'w-full max-lg:grid max-lg:grid-rows-[0fr] max-lg:transition-[grid-template-rows,margin-bottom] max-lg:duration-300 max-lg:ease-[cubic-bezier(0.4,0,0.2,1)]',
                'max-lg:group-data-[state=active]:mb-6 max-lg:group-data-[state=active]:grid-rows-[1fr]',
                'lg:mb-0 lg:flex lg:w-fit lg:flex-wrap lg:items-center lg:justify-end lg:gap-6 lg:space-y-0',
              )}
            >
              <div className="min-h-0 overflow-hidden lg:contents">
                <div
                  className={cn(
                    'flex w-full flex-col flex-wrap items-center justify-end gap-8 overflow-y-auto rounded-3xl border border-border/50 bg-transparent p-5 text-center shadow-2xl shadow-black/45 ring-1 ring-white/5 backdrop-blur-md max-lg:max-h-[min(70vh,28rem)] max-lg:translate-y-1 max-lg:bg-background/35 max-lg:opacity-0 max-lg:transition-[opacity,transform] max-lg:duration-300 max-lg:ease-[cubic-bezier(0.4,0,0.2,1)] max-lg:group-data-[state=active]:translate-y-0 max-lg:group-data-[state=active]:opacity-100 sm:p-6 md:max-h-none md:flex-nowrap',
                    'lg:max-h-none lg:translate-y-0 lg:flex-row lg:items-center lg:gap-6 lg:space-y-0 lg:overflow-visible lg:rounded-none lg:border-transparent lg:bg-transparent lg:p-0 lg:text-left lg:opacity-100 lg:shadow-none lg:transition-none lg:backdrop-blur-none lg:ring-0 dark:shadow-none dark:lg:bg-transparent',
                  )}
                >
                  <div className="w-full lg:hidden">
                    <ul className="list-none space-y-6 pl-0 text-base">
                      {menuItems.map((item, index) => (
                        <li key={index}>
                          <a
                            href={item.href}
                            onClick={(event) => handleNavAnchorClick(event, item.href)}
                            className={cn(navLinkClass, 'text-center')}
                          >
                            <span>{item.name}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex w-full max-w-md flex-col space-y-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-3 sm:space-y-0 md:w-fit lg:max-w-none lg:justify-end">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className={cn(navTryDemoButtonClass, isScrolled && 'lg:hidden')}
                    >
                      <RouterLink to="/sandbox" className="no-underline" onClick={closeMenu}>
                        <span>Try Demo</span>
                      </RouterLink>
                    </Button>
                    <Button
                      asChild
                      variant="inverse"
                      size="sm"
                      className={cn(navInverseCtaMotionClass, isScrolled && 'lg:hidden')}
                    >
                      <RouterLink to="/login" className="no-underline" onClick={closeMenu}>
                        <span>Login</span>
                      </RouterLink>
                    </Button>
                    <Button
                      asChild
                      variant="inverse"
                      size="sm"
                      className={cn(
                        navInverseCtaMotionClass,
                        isScrolled ? 'hidden lg:inline-flex' : 'hidden',
                      )}
                    >
                      <RouterLink to="/login" className="no-underline" onClick={closeMenu}>
                        <span>Login</span>
                      </RouterLink>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}

