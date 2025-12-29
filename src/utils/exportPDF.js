// leftover from static derivation checking app
// TODO: PDF export needed for remaining problem types

async function loadJsPDF() {
  try {
    const { jsPDF } = await import('jspdf')
    return jsPDF
  } catch (error) {
    throw new Error("jsPDF not available from npm import")
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

let cachedFont = null

async function registerFont(doc) {
  if (!cachedFont) {
    try {
      const baseUrl = import.meta.env.BASE_URL || '/'
      let fontPath = `${baseUrl}fonts/NotoSansMono-Regular.ttf`
      if (baseUrl.endsWith('/')) {
        fontPath = `${baseUrl.slice(0, -1)}/fonts/NotoSansMono-Regular.ttf`
      } else {
        fontPath = `${baseUrl}fonts/NotoSansMono-Regular.ttf`
      }
      
      const res = await fetch(fontPath)
      if (!res.ok) {
        const res2 = await fetch('/fonts/NotoSansMono-Regular.ttf')
        if (!res2.ok) {
          console.warn(`Font not found at ${fontPath} or /fonts/, using default font`)
          return
        }
        const buf = await res2.arrayBuffer()
        cachedFont = arrayBufferToBase64(buf)
      } else {
        const buf = await res.arrayBuffer()
        cachedFont = arrayBufferToBase64(buf)
      }
    } catch (error) {
      console.warn('Failed to load custom font, using default:', error)
      return
    }
  }

  if (cachedFont) {
    try {
      doc.addFileToVFS("NotoSansMono.ttf", cachedFont)
      doc.addFont("NotoSansMono.ttf", "NotoMono", "normal")
      doc.setFont("NotoMono")
    } catch (error) {
      console.error("Font registration error:", error)
    }
  }
}

function extractLines(savedState, startIndex, premises) {
  const out = []
  let counter = startIndex
  const premisesSet = new Set(premises.map(p => p.trim()))

  const flatten = (parts = [], acc = []) => {
    parts.forEach(item => {
      if (item?.s !== undefined) {
        acc.push(item)
      } else if (item?.parts) {
        flatten(item.parts, acc)
      }
    })
    return acc
  }

  const getRule = (j = '') => {
    const up = j.toUpperCase()
    if (/\bACP\b/.test(up)) return 'ACP'
    if (/\bAIP\b/.test(up)) return 'AIP'
    if (/\bCP\b/.test(up)) return 'CP'
    if (/\bIP\b/.test(up)) return 'IP'
    return ''
  }

  const allLines = flatten(savedState?.ans?.parts || [])
  let indentLevel = 0

  for (const item of allLines) {
    const trimmed = (item?.s || '').trim()
    if (!trimmed || premisesSet.has(trimmed)) continue

    const rule = getRule(item?.j || '')
    if (rule === 'CP' || rule === 'IP') {
      indentLevel = Math.max(0, indentLevel - 1)
    }

    const lineIndent = (rule === 'ACP' || rule === 'AIP')
      ? indentLevel + 1
      : indentLevel
    const indent = '    '.repeat(Math.max(0, lineIndent))

    out.push({
      left: `${indent}${counter}. ${trimmed}`,
      right: item.j?.trim() || ""
    })

    if (rule === 'ACP' || rule === 'AIP') {
      indentLevel += 1
    }
    counter++
  }
  return out
}


export async function exportWorksheetPDF(worksheet) {
  try {
    const jsPDF = await loadJsPDF()
    const doc = new jsPDF({ unit: "pt", format: "letter" })
    await registerFont(doc)

    try {
      doc.setFont("NotoMono")
    } catch (e) {
      doc.setFont("helvetica")
    }
    doc.setFontSize(12)

    let y = 60
    const lh = 18
    const marginLeft = 40

    const write = (x, text) => {
      if (y > 760) {
        doc.addPage()
        y = 60
        try {
          doc.setFont("NotoMono")
        } catch (e) {
          doc.setFont("helvetica")
        }
        doc.setFontSize(12)
      }
      doc.text(text, x, y)
    }

  doc.setFontSize(16)
  write(marginLeft, `Worksheet ${worksheet.worksheetId}`)
  doc.setFontSize(12)
  y += lh * 2

  worksheet.proofs.forEach((proof, idx) => {
    if (!proof.savedState?.ans?.parts) return // skip untouched proofs

    let index = 1

    const lastPremiseIdx = proof.premises.length - 1 // get last premise index
    const lastPremise = proof.premises[lastPremiseIdx]
// font setup
    try {
      doc.setFont("NotoMono")
    } catch {
      doc.setFont("helvetica")
    }
    doc.setFontSize(12)
    doc.text("A", -9999, -9999)

    // align based on last premise
    const sampleLeft = `${index + lastPremiseIdx}. ${lastPremise}`
    let leftWidth = doc.getTextWidth(sampleLeft)

    // fallback if small width
    if (!leftWidth || !isFinite(leftWidth) || leftWidth < 20) {
      leftWidth = 20
    }
    const MIN_COLUMN = 260
    const columnX = marginLeft + Math.max(leftWidth + 12, MIN_COLUMN)

    write(marginLeft, `Problem ${proof.questionId || idx + 1}`)
    y += lh

    // print premises with conclusion aligned on last premise
    proof.premises.forEach((prem, i) => {
      const left = `${index}. ${prem}`
      if (i === lastPremiseIdx) {
        write(marginLeft, left)
        write(columnX, `// ${proof.conclusion}`)
      } else {
        write(marginLeft, left)
      }
      y += lh
      index++
    })

    // line inputs
    const studentLines = extractLines(proof.savedState, index, proof.premises)

    studentLines.forEach(line => {
      write(marginLeft, line.left)
      if (line.right) {
        write(columnX, line.right)
      }
      y += lh
    })

    y += lh 
  })

    doc.save(`worksheet_${worksheet.worksheetId}.pdf`)
  } catch (error) {
    console.error('PDF export error:', error)
    throw new Error(error?.message || error?.toString() || 'Failed to export PDF')
  }
}
