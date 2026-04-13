/**
 * Premium export utilities — Excel (ExcelJS) + PDF (jsPDF + autotable)
 */

// ── Excel Export ─────────────────────────────────────────────────────────────

export async function exportToExcel(
    filename: string,
    sheetName: string,
    headers: string[],
    rows: (string | number | null | undefined)[][]
) {
    const ExcelJS = (await import('exceljs')).default

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Kyrkoregistret'
    wb.created = new Date()

    const ws = wb.addWorksheet(sheetName)

    // Column widths
    ws.columns = headers.map((h, i) => ({
        header: h,
        key: `col${i}`,
        width: Math.max(h.length + 4, 14),
    }))

    // Premium header row style
    const headerRow = ws.getRow(1)
    headerRow.height = 28
    headerRow.eachCell((cell, colNumber) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1A1A1A' },
        }
        cell.font = {
            bold: true,
            color: { argb: 'FFC9A84C' },
            size: 11,
        }
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
        cell.border = {
            bottom: { style: 'medium', color: { argb: 'FFC9A84C' } },
        }
    })

    // Data rows
    rows.forEach((row, idx) => {
        const dataRow = ws.addRow(row.map(v => v ?? ''))
        dataRow.height = 22
        dataRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: idx % 2 === 0 ? 'FFFEFCF8' : 'FFEDE8DF' },
            }
            cell.font = { size: 10, color: { argb: 'FF1A1A1A' } }
            cell.alignment = { vertical: 'middle' }
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FFDDD8CE' } },
            }
        })
    })

    // Auto-fit columns
    ws.columns.forEach((col) => {
        if (!col) return
        let maxLen = (col.header as string)?.length ?? 10
        if (col.eachCell) {
            col.eachCell({ includeEmpty: false }, (cell) => {
                const len = cell.value?.toString().length ?? 0
                if (len > maxLen) maxLen = len
            })
        }
        col.width = Math.min(maxLen + 4, 50)
    })

    // Freeze header row
    ws.views = [{ state: 'frozen', ySplit: 1 }]

    // Add summary row at bottom
    ws.addRow([])
    const summaryRow = ws.addRow([`Exporterat: ${new Date().toLocaleString('sv-SE')}`, '', `Antal rader: ${rows.length}`])
    summaryRow.eachCell((cell) => {
        cell.font = { size: 9, italic: true, color: { argb: 'FF8A8178' } }
    })

    // Download
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
}

// ── PDF Export ────────────────────────────────────────────────────────────────

export async function exportToPDF(
    filename: string,
    title: string,
    headers: string[],
    rows: (string | number | null | undefined)[][]
) {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    // Header bar
    doc.setFillColor(26, 26, 26)
    doc.rect(0, 0, 297, 22, 'F')

    // Gold accent line
    doc.setFillColor(201, 168, 76)
    doc.rect(0, 22, 297, 1.5, 'F')

    // Title
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(201, 168, 76)
    doc.setFontSize(14)
    doc.text(title, 10, 14)

    // Subtitle
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 144, 128)
    doc.setFontSize(9)
    doc.text(`Exporterat: ${new Date().toLocaleString('sv-SE')}   |   Antal rader: ${rows.length}`, 10, 19)

    // Table
    autoTable(doc, {
        head: [headers],
        body: rows.map(row => row.map(v => v ?? '')),
        startY: 28,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [26, 26, 26],
            lineColor: [221, 216, 206],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [26, 26, 26],
            textColor: [201, 168, 76],
            fontStyle: 'bold',
            fontSize: 9,
        },
        alternateRowStyles: {
            fillColor: [247, 243, 236],
        },
        bodyStyles: {
            fillColor: [254, 252, 248],
        },
        margin: { top: 28, left: 10, right: 10 },
        tableWidth: 'auto',
    })

    // Page numbers
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(160, 144, 128)
        doc.text(
            `Sida ${i} av ${pageCount}`,
            doc.internal.pageSize.getWidth() - 30,
            doc.internal.pageSize.getHeight() - 8
        )
    }

    doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
