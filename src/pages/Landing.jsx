import { useEffect } from 'react'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '../landing/landing.css'
import { HeroSection } from '@/components/ui/HeroSection1'
import HowItWorksSection from './landing/HowItWorksSection'
import FeaturesSection from './landing/FeaturesSection'

const LANDING_HTML_CLASS = 'landing-full-rem'

export default function Landing() {
  useEffect(() => {
    document.documentElement.classList.add(LANDING_HTML_CLASS)
    return () => document.documentElement.classList.remove(LANDING_HTML_CLASS)
  }, [])

  return (
    <>
      <div className="landing-main-flow">
        <div className="landing-main-flow__bg" aria-hidden />
        <div className="relative z-[1] flex flex-col">
          <HeroSection />
          <HowItWorksSection />
          <FeaturesSection />
        </div>
      </div>
    </>
  )
}
