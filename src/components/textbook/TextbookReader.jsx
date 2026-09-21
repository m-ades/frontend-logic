import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import parse from 'html-react-parser'
import { Alert, Box, Button } from '@mui/material'
import DOMPurify from 'dompurify'
import { useNavigate } from 'react-router-dom'
import { isPlainLinkClick } from '@/utils/linkNavigation.js'
import LoadingSpinner from '@/components/ui/LoadingSpinner.jsx'
import TextbookLinkedPractices from '@/components/textbook/TextbookLinkedPractices.jsx'
import { prepareTextbookHtml } from '@/components/textbook/prepareTextbookHtml.js'
import { ensureTextbookStyles } from '@/components/textbook/textbookAssets.js'
import { ensureMathJax, typesetMath } from '@/lib/mathJax.js'
import {
  normalizeTextbookSlug,
  resolveTextbookAssetUrl,
} from '@/components/textbook/textbookCatalog.js'

const PURIFY_CONFIG = {
  USE_PROFILES: { html: true, mathMl: true, svg: true },
  ADD_TAGS: [
    'section', 'figure', 'figcaption', 'header', 'nav', 'aside', 'main',
    'dfn', 'abbr', 'cite', 'q', 'mark', 'ruby', 'rt', 'rp',
  ],
  ADD_ATTR: [
    'data-practice-widget-id', 'data-chapter', 'data-level', 'data-path',
    'colspan', 'rowspan', 'scope', 'headers', 'abbr',
    'mathvariant', 'displaystyle', 'columnspacing', 'rowspacing',
    'columnlines', 'rowlines', 'frame', 'framespacing', 'columnalign',
    'rowalign', 'columnwidth', 'width', 'height', 'viewBox', 'xmlns',
    'aria-label', 'aria-hidden', 'aria-current', 'role', 'tabindex',
    'lang', 'title', 'alt', 'loading',
  ],
  ALLOW_DATA_ATTR: true,
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$)|\/)/i,
}

function sanitizeTextbookHtml(html) {
  if (typeof html !== 'string') return ''
  return DOMPurify.sanitize(html, PURIFY_CONFIG)
}

export default function TextbookReader({
  slug: rawSlug,
  linkBase = '/textbook',
  linkedPractices = [],
  scrollToId = null,
  onMetaChange,
  onChapterNavigate = null,
  resolveInternalSlug = null,
}) {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const onMetaChangeRef = useRef(onMetaChange)
  const [content, setContent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  const slug = useMemo(() => normalizeTextbookSlug(rawSlug), [rawSlug])

  useEffect(() => {
    onMetaChangeRef.current = onMetaChange
  }, [onMetaChange])

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    ensureTextbookStyles()
    ensureMathJax().catch(() => {})
  }, [])

  useEffect(() => {
    if (!slug) {
      setContent(null)
      setError('No chapter specified.')
      setIsLoading(false)
      return undefined
    }

    const controller = new AbortController()
    let cancelled = false

    async function loadChapter() {
      setIsLoading(true)
      setError(null)
      setContent(null)

      try {
        await ensureTextbookStyles()

        const url = resolveTextbookAssetUrl(slug)
        if (!url) {
          throw new Error('Invalid textbook chapter.')
        }
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'text/html' },
        })

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? `Chapter “${slug}” was not found.`
              : `Failed to load chapter (HTTP ${response.status}).`,
          )
        }

        const rawHtml = await response.text()
        if (cancelled) return

        const prepared = prepareTextbookHtml(rawHtml, { linkBase, chapterSlug: slug })
        const safe = sanitizeTextbookHtml(prepared)
        setContent(safe)

        const titleMatch = rawHtml.match(/<title>([^<]+)<\/title>/i)
        onMetaChangeRef.current?.({
          slug,
          title: titleMatch?.[1]?.split('‣')[0]?.trim() || slug,
        })
      } catch (err) {
        if (cancelled || err?.name === 'AbortError') return
        setError(err?.message || 'Unable to load textbook chapter.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadChapter()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [slug, linkBase, reloadToken])

  useEffect(() => {
    if (!content || !containerRef.current) return undefined

    const element = containerRef.current
    const controller = new AbortController()

    async function runTypeset() {
      try {
        await typesetMath([element], { signal: controller.signal })
      } catch (typesetError) {
        console.warn('MathJax typeset failed', typesetError)
      }
      if (controller.signal.aborted || !element.isConnected) return

      const hash = scrollToId || window.location.hash?.replace(/^#/, '')
      if (!hash) return
      const target = element.querySelector(`#${CSS.escape(hash)}`)
      target?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }

    runTypeset()

    return () => controller.abort()
  }, [content, scrollToId])

  const handleClick = useCallback(
    (event) => {
      const anchor = event.target.closest?.('a')
      if (!anchor || !containerRef.current?.contains(anchor)) return
      if (!isPlainLinkClick(event, anchor)) return

      const href = anchor.getAttribute('href')
      if (!href) return

      const chapterPath = `${linkBase}/${slug}`
      if (href.startsWith('#') || href.startsWith(`${chapterPath}#`)) {
        event.preventDefault()
        const id = decodeURIComponent(href.slice(href.indexOf('#') + 1))
        if (!id) return
        const target = containerRef.current.querySelector(`#${CSS.escape(id)}`)
        target?.scrollIntoView({ block: 'start', behavior: 'smooth' })
        return
      }

      if (href.startsWith(`${linkBase}/`) || href === linkBase) {
        event.preventDefault()
        if (href === linkBase) {
          if (onChapterNavigate) {
            onChapterNavigate(null)
            return
          }
          navigate(href)
          return
        }
        const targetUrl = new URL(href, window.location.origin)
        const targetSlug = targetUrl.pathname.slice(linkBase.length + 1)
        const decodedTargetSlug = decodeURIComponent(targetSlug)
        const resolved = resolveInternalSlug
          ? resolveInternalSlug(decodedTargetSlug)
          : decodedTargetSlug
        if (!resolved) {
          if (onChapterNavigate) {
            onChapterNavigate(null)
            return
          }
          navigate(linkBase)
          return
        }
        if (onChapterNavigate) {
          onChapterNavigate(resolved)
          return
        }
        navigate(`${linkBase}/${resolved}${targetUrl.search}${targetUrl.hash}`)
      }
    },
    [linkBase, slug, navigate, onChapterNavigate, resolveInternalSlug],
  )

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '12rem',
          height: '100%',
          p: 2,
        }}
      >
        <LoadingSpinner label="Loading textbook…" />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={retry}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    )
  }

  return (
    <Box
      ref={containerRef}
      component="article"
      className="textbook-reader ltx_page_content"
      aria-label="Textbook chapter"
      onClick={handleClick}
      sx={{
        height: '100%',
        minHeight: 0,
        overflow: 'auto',
        px: { xs: '1rem', md: '1.5rem' },
        py: '1.25rem',
        bgcolor: 'background.paper',
        color: 'text.primary',
        fontSize: '1rem',
        lineHeight: 1.65,
        '& .ltx_title_chapter, & .ltx_title_part, & .ltx_title_appendix, & h1.title': {
          fontSize: '1.75rem',
          fontWeight: 600,
          lineHeight: 1.25,
          mt: 0,
          mb: '0.75em',
        },
        '& .ltx_title_section, & h2': {
          fontSize: '1.35rem',
          fontWeight: 600,
          lineHeight: 1.3,
          mt: '1.5em',
          mb: '0.5em',
        },
        '& .ltx_title_paragraph, & h3': {
          fontSize: '1.125rem',
          fontWeight: 600,
          lineHeight: 1.35,
          mt: '1.25em',
          mb: '0.5em',
        },
        '& .ltx_p, & p, & li': {
          fontSize: '1rem',
          lineHeight: 1.7,
        },
        '& img, & svg:not(mjx-container svg)': {
          maxWidth: '100%',
          height: 'auto',
        },
        '& .bml-overflow-wrapper': {
          overflowX: 'auto',
          maxWidth: '100%',
        },
        '& table': {
          maxWidth: '100%',
        },
        '& a.ltx_ref, & a': {
          color: 'primary.main',
        },
        '& .hula-practice-slot': {
          my: '1em',
        },
        '& table.ltx_tabular': {
          fontSize: '0.95rem',
        },
        // fitch geometry also depends on the original book table and paragraph styles
        '& table.fitch': {
          width: '100%',
          borderCollapse: 'collapse',
          borderSpacing: 0,
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          fontSize: '16px',
          lineHeight: 1.7,
        },
        '& table.fitch p': {
          m: 0,
          fontSize: 'inherit',
          lineHeight: 'inherit',
        },
        '& table.fitch td.fml-fmla': {
          whiteSpace: 'nowrap',
        },
      }}
    >
      {content ? parse(content) : null}
      <TextbookLinkedPractices links={linkedPractices} textbookSlug={slug} />
    </Box>
  )
}

export { sanitizeTextbookHtml }
