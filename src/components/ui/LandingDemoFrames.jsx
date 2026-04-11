import { cn } from '@/lib/utils'

/**
 * macOS-style window chrome (traffic lights + title bar).
 * Slot: `relative` + `aspect-*` + full-bleed `<img>` / `<video>` like the hero demo.
 *
 * `opaqueShell` — solid chrome (no translucent body / no title backdrop-blur). Use on the hero
 * video so thumbnails and motion never stack into a milky “white” wash.
 */
export function MacWindowDemoFrame({
  title = 'HuLA — Demo',
  children,
  className,
  compact = false,
  opaqueShell = false,
}) {
  return (
    <div
      role="region"
      aria-label={title ? `Product preview: ${title}` : 'Product demo'}
      className={cn(
        'overflow-hidden rounded-xl border border-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.06] sm:rounded-2xl',
        opaqueShell ? 'bg-zinc-950' : 'bg-zinc-900/50',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex shrink-0 items-center border-b border-white/[0.08]',
          opaqueShell ? 'bg-zinc-950' : 'bg-zinc-950/85 backdrop-blur-md',
          compact
            ? 'h-8 px-2'
            : 'h-9 px-2.5 sm:h-10 sm:px-3.5',
        )}
      >
        <div className="z-10 flex gap-1.5" aria-hidden>
          <span
            className={cn(
              'rounded-full bg-[#ff5f57] shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] ring-1 ring-black/10',
              compact ? 'size-2' : 'size-2.5 sm:size-3',
            )}
          />
          <span
            className={cn(
              'rounded-full bg-[#febc2e] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)] ring-1 ring-black/10',
              compact ? 'size-2' : 'size-2.5 sm:size-3',
            )}
          />
          <span
            className={cn(
              'rounded-full bg-[#28c840] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)] ring-1 ring-black/10',
              compact ? 'size-2' : 'size-2.5 sm:size-3',
            )}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-12 sm:px-14">
          <span
            className={cn(
              'truncate text-center font-medium tracking-wide text-zinc-500',
              compact ? 'text-[9px]' : 'text-[10px] sm:text-[11px]',
            )}
          >
            {title}
          </span>
        </div>
      </div>
      <div className={cn('relative w-full overflow-hidden', opaqueShell ? 'bg-black' : 'bg-zinc-950')}>
        {children}
      </div>
    </div>
  )
}

/**
 * Phone bezel + Dynamic Island strip; no outer “card” wrapper — screen slot fills with your screenshot.
 */
export function IPhoneDemoFrame({ title = 'Mobile preview', children, className }) {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn('flex h-full min-h-0 w-full flex-col', className)}
    >
      <div className="flex min-h-0 flex-1 flex-col rounded-[2.25rem] border border-white/12 bg-zinc-950 p-[9px] shadow-[0_22px_48px_-14px_rgba(0,0,0,0.72)] ring-1 ring-white/[0.06] sm:rounded-[2.4rem] sm:p-[10px]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] bg-black sm:rounded-[1.9rem]">
          <div className="relative flex h-7 shrink-0 items-end justify-center bg-zinc-950 pb-1.5 pt-0.5 sm:h-8">
            <span
              className="h-[22px] w-[min(32%,112px)] rounded-full bg-black ring-1 ring-white/[0.12]"
              aria-hidden
            />
          </div>
          <div className="relative min-h-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}
