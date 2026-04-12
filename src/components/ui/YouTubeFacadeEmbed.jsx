import React from 'react'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Extract 11-char YouTube video id from id-only string or common URL shapes.
 */
export function parseYouTubeVideoId(input) {
  if (input == null || typeof input !== 'string') return null
  const s = input.trim()
  if (!s) return null
  if (/^[\w-]{11}$/.test(s)) return s
  try {
    const href = s.startsWith('http://') || s.startsWith('https://') ? s : `https://${s.replace(/^\/\//, '')}`
    const url = new URL(href)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id && id.length >= 11 ? id.slice(0, 11) : null
    }

    if (!host.includes('youtube.com') && !host.includes('youtube-nocookie.com')) return null

    const v = url.searchParams.get('v')
    if (v && /^[\w-]{11}$/.test(v)) return v

    const parts = url.pathname.split('/').filter(Boolean)
    const embedI = parts.indexOf('embed')
    if (embedI >= 0 && parts[embedI + 1] && /^[\w-]{11}$/.test(parts[embedI + 1])) return parts[embedI + 1]

    const shortsI = parts.indexOf('shorts')
    if (shortsI >= 0 && parts[shortsI + 1] && /^[\w-]{11}/.test(parts[shortsI + 1])) {
      return parts[shortsI + 1].slice(0, 11)
    }

    return null
  } catch {
    return null
  }
}

/**
 * Lazy YouTube: poster + play, iframe only after click.
 *
 * Stack (pre-play): `[img]` → frosted tint layer → full-area **transparent** hit `<button>` → play pill.
 * This is **not** ReactPlayer / react-youtube — only our DOM. If you ever see a “white sheet”
 * over the still, it was almost always the **full-bleed `<button>`** picking up UA / MUI
 * `CssBaseline` fill — we force `bg-transparent` + `appearance-none` on that layer.
 */
export function YouTubeFacadeEmbed({
  urlOrId,
  fallbackPosterSrc,
  fallbackAlt = 'HuLA app preview',
  title = 'Video demo',
  className,
}) {
  const videoId = React.useMemo(() => parseYouTubeVideoId(urlOrId), [urlOrId])
  const [playing, setPlaying] = React.useState(false)
  const [thumbSrc, setThumbSrc] = React.useState(
    () => (videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null),
  )

  React.useEffect(() => {
    if (videoId) {
      setThumbSrc(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)
      setPlaying(false)
    }
  }, [videoId])

  if (!videoId) {
    return (
      <img
        className={cn('absolute inset-0 size-full object-cover object-top', className)}
        src={fallbackPosterSrc}
        alt={fallbackAlt}
        width={2700}
        height={1440}
        decoding="async"
        fetchPriority="high"
      />
    )
  }

  const embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`

  return (
    <div className={cn('absolute inset-0 bg-black', className)}>
      {playing ? (
        <iframe
          title={title}
          src={embedSrc}
          className="absolute inset-0 size-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="group/thumb absolute inset-0">
          <img
            src={thumbSrc}
            alt=""
            className="pointer-events-none absolute inset-0 size-full object-cover object-center"
            width={1280}
            height={720}
            decoding="async"
            loading="lazy"
            onError={() => {
              setThumbSrc(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-black/38 backdrop-blur-md transition-[background-color] duration-300 ease-out group-hover/thumb:bg-black/50"
          />
          <button
            type="button"
            className={cn(
              'group/play absolute inset-0 z-[1] m-0 flex cursor-pointer items-center justify-center',
              /* Kill UA / Mui CssBaseline button fill so the thumbnail shows through */
              'appearance-none border-0 bg-transparent p-0 text-inherit shadow-none outline-none',
              'focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-0',
            )}
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${title}`}
          >
            <span className="flex size-[3.75rem] items-center justify-center rounded-full border border-white/12 bg-black text-white shadow-[0_16px_48px_rgba(0,0,0,0.55)] transition-all duration-200 ease-out group-hover/play:scale-[1.04] group-hover/play:border-white/20 sm:size-[4.25rem]">
              <Play className="ml-0.5 size-7 shrink-0 text-white sm:size-8" strokeWidth={2.25} aria-hidden />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
