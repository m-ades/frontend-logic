import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react'
import { Annotation, Compartment, EditorSelection, EditorState, Prec, Transaction } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, WidgetType, keymap, placeholder as placeholderText } from '@codemirror/view'
import { deleteCharBackward, history, historyKeymap, standardKeymap } from '@codemirror/commands'
import { alpha, useTheme } from '@mui/material/styles'
import { diffChange, formatIndices, operatorEdit, scanBrackets, typedEdit } from './formulaEditing.js'

// value updates coming from react, which skip onChange and the typing tidy up
const fromProps = Annotation.define()

const edit = (view, changes, caret, userEvent) => view.dispatch({
  changes,
  selection: { anchor: caret },
  scrollIntoView: true,
  userEvent,
})

// makes the first count greyed closers real at the end of the text
const commitClosers = (view, count) => {
  const { length } = view.state.doc
  const added = scanBrackets(view.state.doc.toString()).pending.slice(0, count)
  if (added) edit(view, { from: length, insert: added }, length + added.length, 'input.close')
  return Boolean(added)
}

const strayMark = Decoration.mark({ class: 'cm-fe-stray' })
const matchMark = Decoration.mark({ class: 'cm-fe-match' })
const scopeMark = Decoration.mark({ class: 'cm-fe-scope' })

class ClosersWidget extends WidgetType {
  constructor(closers, matched, inScope) {
    super()
    this.closers = closers
    this.matched = matched
    this.inScope = inScope
  }

  eq(other) {
    return other.closers === this.closers && other.matched === this.matched && other.inScope === this.inScope
  }

  toDOM(view) {
    const wrap = document.createElement('span')
    wrap.className = 'cm-fe-closers'
    wrap.setAttribute('aria-hidden', 'true')
    for (let i = 0; i < this.closers.length; i++) {
      const glyph = wrap.appendChild(document.createElement('span'))
      glyph.textContent = this.closers[i]
      glyph.dataset.closerIndex = String(i)
      glyph.className = [i < this.inScope && 'cm-fe-scope', i === this.matched && 'cm-fe-match'].filter(Boolean).join(' ')
    }
    // tapping a greyed closer makes it and every inner one real
    wrap.addEventListener('pointerdown', (event) => {
      const index = event.target.dataset?.closerIndex
      if (index === undefined) return
      event.preventDefault()
      commitClosers(view, Number(index) + 1)
      view.focus()
    })
    return wrap
  }

  ignoreEvent() {
    return true
  }
}

/*
while the field has focus, tints the bracket beside the caret with its partner and washes the scope the caret is in
greys out the closers still owed after the text and quietly underlines strays
*/
const bracketHints = ViewPlugin.fromClass(class {
  constructor(view) {
    this.build(view)
  }

  update(update) {
    if (update.docChanged || update.selectionSet || update.focusChanged) this.build(update.view)
  }

  build(view) {
    const text = view.state.doc.toString()
    const caret = view.state.selection.main
    const active = view.hasFocus && caret.empty
    const { strays, pending, pair, scope } = scanBrackets(text, active ? caret.head : -1)
    this.pending = pending
    const ranges = strays.map((at) => strayMark.range(at, at + 1))
    for (const at of pair) if (at < text.length) ranges.push(matchMark.range(at, at + 1))
    if (scope && scope.to > scope.from) ranges.push(scopeMark.range(scope.from, scope.to))
    if (pending) {
      const matched = pair.find((at) => at >= text.length)
      const widget = new ClosersWidget(pending, matched === undefined ? -1 : matched - text.length, scope?.greyed ?? 0)
      ranges.push(Decoration.widget({ widget, side: 1 }).range(text.length))
    }
    this.decorations = Decoration.set(ranges, true)
  }
}, {
  decorations: (plugin) => plugin.decorations,
  // keeps the greyed closers in view when a long formula scrolls to its caret
  provide: (plugin) => EditorView.scrollMargins.of((view) => ({
    right: (view.plugin(plugin)?.pending.length ?? 0) * view.defaultCharacterWidth + 2,
  })),
})

const themes = new WeakMap()

// one style module per mui theme since codemirror never removes them
const editorTheme = (theme) => {
  if (!themes.has(theme)) themes.set(theme, buildEditorTheme(theme))
  return themes.get(theme)
}

const buildEditorTheme = (theme) => EditorView.theme({
  '&': { height: '100%', color: 'inherit', backgroundColor: 'transparent', fontSize: 'inherit' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'inherit',
    lineHeight: 'inherit',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
  },
  '.cm-scroller::-webkit-scrollbar': { display: 'none' },
  '.cm-content': { padding: 0, minHeight: 0, caretColor: theme.palette.text.primary },
  '.cm-line': { padding: 0 },
  '.cm-placeholder': { color: 'inherit', opacity: theme.palette.mode === 'light' ? 0.42 : 0.5 },
  '.cm-fe-stray': {
    textDecoration: `underline wavy ${alpha(theme.palette.error.main, 0.7)}`,
    textDecorationThickness: '1px',
    textUnderlineOffset: '3px',
  },
  '.cm-fe-scope': { backgroundColor: alpha(theme.palette.primary.main, 0.07) },
  '.cm-fe-match': { backgroundColor: alpha(theme.palette.primary.main, 0.18), borderRadius: '2px' },
  '.cm-fe-closers': { color: theme.palette.text.disabled, cursor: 'pointer' },
}, { dark: theme.palette.mode === 'dark' })

const editHistory = history()

// enter is handled in the keydown handler since a formula is one line
const formulaKeymap = keymap.of([...historyKeymap, ...standardKeymap.filter((binding) => !binding.key?.includes('Enter'))])

// skips the no op reconfigure every slot would get right after the view is built
const reconfigure = (view, slot, extension) => {
  if (view && slot.get(view.state) !== extension) view.dispatch({ effects: slot.reconfigure(extension) })
}

/*
the one formula input every field uses, plugged into mui as a text field's input component
it hands its ref an input like handle so symbol buttons, the phone keypad and derivation focus code can drive it
mobile mode keeps the phone's own keyboard closed so the logic keypad does the typing
*/
const FormulaCodeInput = forwardRef(function FormulaCodeInput({
  className,
  value = '',
  onChange,
  onFocus,
  onBlur,
  placeholder = '',
  readOnly = false,
  disabled = false,
  id,
  notation,
  allowTherefore = false,
  mobile = false,
  onEnterKey,
  onFormulaKeyDown,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid = false,
}, ref) {
  const theme = useTheme()
  const hostRef = useRef(null)
  const viewRef = useRef(null)
  const handleRef = useRef(null)
  const compartments = useRef({ access: new Compartment(), theme: new Compartment(), placeholder: new Compartment() })
  const latest = useRef(null)
  latest.current = { notation, allowTherefore, readOnly: readOnly || disabled, onChange, onFocus, onBlur, onEnterKey, onFormulaKeyDown }
  const hint = useMemo(() => placeholderText(placeholder), [placeholder])

  const access = [
    EditorState.readOnly.of(readOnly || disabled),
    EditorView.editable.of(!readOnly && !disabled),
    EditorView.contentAttributes.of({
      'aria-multiline': 'false',
      'aria-invalid': String(ariaInvalid),
      ...(ariaLabel ? { 'aria-label': ariaLabel } : id && { 'aria-labelledby': `${id}-label` }),
      ...(ariaDescribedby && { 'aria-describedby': ariaDescribedby }),
      ...(mobile && { inputmode: 'none' }),
    }),
  ]

  useImperativeHandle(ref, () => {
    const view = () => viewRef.current
    const handle = {
      get value() { return view()?.state.doc.toString() ?? '' },
      get selectionStart() { return view()?.state.selection.main.from ?? 0 },
      get selectionEnd() { return view()?.state.selection.main.to ?? 0 },
      get hasFocus() { return view()?.hasFocus ?? false },
      focus() { view()?.focus() },
      setSelectionRange(start, end = start) {
        const length = handle.value.length
        const clamp = (at) => Math.max(0, Math.min(at, length))
        view()?.dispatch({ selection: EditorSelection.single(clamp(start), clamp(end)), scrollIntoView: true })
      },
      setRangeText(text, start = handle.selectionStart, end = handle.selectionEnd) {
        if (view()) edit(view(), { from: start, to: end, insert: text }, start + text.length, 'input.keypad')
      },
      insOp(op) {
        const current = handle.value
        const next = operatorEdit(current, handle.selectionStart, handle.selectionEnd, op, latest.current.notation)
        if (view()) edit(view(), diffChange(current, next.text), next.caret, 'input.keypad')
      },
      // a bracket key opens a bracket like typing it does, or wraps whatever is selected
      insertPair([open, close]) {
        const { selectionStart: start, selectionEnd: end } = handle
        handle.setRangeText(end > start ? open + handle.value.slice(start, end) + close : open)
      },
      // stepping right at the end makes the next greyed closer real, just like the arrow key
      moveCaret(step) {
        const { from, to } = view()?.state.selection.main ?? { from: 0, to: 0 }
        const length = handle.value.length
        if (step === 1 && to === length && from === to && commitClosers(view(), 1)) return
        const target = step === 'start' ? 0 : step === 'end' ? length : (step < 0 ? from : to) + step
        handle.setSelectionRange(target)
      },
      deleteBackward() {
        if (view()) deleteCharBackward(view())
      },
    }
    handleRef.current = handle
    return handle
  }, [])

  useLayoutEffect(() => {
    const { access: accessSlot, theme: themeSlot, placeholder: placeholderSlot } = compartments.current
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value ?? '',
        extensions: [
          accessSlot.of(access),
          themeSlot.of(editorTheme(theme)),
          placeholderSlot.of(hint),
          editHistory,
          Prec.highest(EditorView.domEventHandlers({
            keydown(event, view) {
              const caret = view.state.selection.main
              const plain = !event.ctrlKey && !event.metaKey && !event.altKey
              if (!latest.current.readOnly && plain && caret.empty) {
                // tab types the closer for the unclosed bracket the caret sits in
                const closer = event.key === 'Tab' && !event.shiftKey && scanBrackets(view.state.doc.toString(), caret.head).closer
                if (closer) {
                  event.preventDefault()
                  edit(view, { from: caret.head, insert: closer }, caret.head + 1, 'input.close')
                  return true
                }
                if (event.key === 'ArrowRight' && !event.shiftKey && caret.head === view.state.doc.length && commitClosers(view, 1)) {
                  event.preventDefault()
                  return true
                }
              }
              latest.current.onFormulaKeyDown?.(event, handleRef.current)
              if (event.defaultPrevented) return true
              if (event.key === 'Enter') {
                event.preventDefault()
                latest.current.onEnterKey?.(event)
                return true
              }
              return false
            },
            focus(event) { latest.current.onFocus?.(event) },
            blur(event) { latest.current.onBlur?.(event) },
          })),
          formulaKeymap,
          EditorView.inputHandler.of((view, from, to, typed) => {
            const { readOnly: locked, notation: activeNotation, allowTherefore: therefore } = latest.current
            if (locked || typed.length !== 1 || view.composing) return false
            const text = view.state.doc.toString()
            const next = typedEdit(text, from, to, typed, { notation: activeNotation, allowTherefore: therefore })
            if (!next) return false
            edit(view, diffChange(text, next.text), next.caret, 'input.type')
            return true
          }),
          // keeps one line and subscripts typed indices whatever made the change
          EditorState.transactionFilter.of((transaction) => {
            if (!transaction.docChanged || transaction.annotation(fromProps)) return transaction
            const text = transaction.newDoc.toString()
            const flatten = (part) => part.replace(/\s*\n\s*/g, ' ')
            const flat = flatten(text)
            const caret = flatten(text.slice(0, transaction.newSelection.main.head)).length
            const tidy = formatIndices(flat, caret, latest.current.notation) ?? { text: flat, caret }
            if (tidy.text === text) return transaction
            return [transaction, { changes: diffChange(text, tidy.text), selection: { anchor: tidy.caret }, sequential: true }]
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !update.transactions.some((transaction) => transaction.annotation(fromProps))) {
              latest.current.onChange?.({ target: handleRef.current })
            }
          }),
          bracketHints,
        ],
      }),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // the view is built once, later prop changes go through the compartments and the value sync
  }, [])

  useLayoutEffect(() => {
    const view = viewRef.current
    const current = view?.state.doc.toString()
    const next = value ?? ''
    if (view && next !== current) {
      view.dispatch({
        changes: diffChange(current, next),
        annotations: [fromProps.of(true), Transaction.addToHistory.of(false)],
      })
    }
  }, [value])

  useLayoutEffect(() => {
    reconfigure(viewRef.current, compartments.current.access, access)
    // access only changes with these props
  }, [readOnly, disabled, mobile, id, ariaLabel, ariaDescribedby, ariaInvalid])

  useLayoutEffect(() => {
    reconfigure(viewRef.current, compartments.current.theme, editorTheme(theme))
  }, [theme])

  useLayoutEffect(() => {
    reconfigure(viewRef.current, compartments.current.placeholder, hint)
  }, [hint])

  return <div ref={hostRef} className={className} />
})

export default FormulaCodeInput
