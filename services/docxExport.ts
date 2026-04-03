import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, PageOrientation, WidthType, BorderStyle, ShadingType, Header, Footer, PageNumber } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';
import { SchoolConfig, MonthlyReport, StudentRow } from '../types';

/**
 * Utility to calculate sum of array
 */
const sumArr = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

/**
 * Styles for the document
 */
const BORDER_SINGLE = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
const BORDERS = { top: BORDER_SINGLE, bottom: BORDER_SINGLE, left: BORDER_SINGLE, right: BORDER_SINGLE };

/**
 * Professional colors for shading
 */
const SHADING_HEADER = { fill: "E2F0D9", type: ShadingType.CLEAR };
const SHADING_SUBHEADER = { fill: "F8F9FA", type: ShadingType.CLEAR };
const SHADING_TOTAL = { fill: "FFFFCC", type: ShadingType.CLEAR };

/**
 * Export Monthly Report to Word (.docx)
 */
export const exportMonthlyReportToDocx = async (reportData: MonthlyReport, config: SchoolConfig | null) => {
    if (!config) return;

    const { month, year } = reportData;
    const monthName = format(new Date(year, month, 1), 'MMMM yyyy', { locale: id });

    // 1. Create Document
    const doc = new Document({
        styles: {
            default: { document: { run: { font: "Arial", size: 16 } } }, // 8pt for dense report
            paragraphStyles: [
                { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                  run: { size: 20, bold: true, font: "Arial" },
                  paragraph: { spacing: { before: 120, after: 120 }, alignment: AlignmentType.CENTER } },
            ]
        },
        sections: [{
            properties: {
                page: {
                    size: {
                        width: 12240,   // 8.5 inches
                        height: 18720,  // 13 inches (F4/Folio)
                        orientation: PageOrientation.LANDSCAPE
                    },
                    margin: { top: 720, right: 720, bottom: 720, left: 720 } // 0.5 inch margins
                }
            },
            headers: {
                default: new Header({
                    children: [
                        new Paragraph({
                            heading: "Heading1",
                            children: [new TextRun(`LAPORAN BULANAN SEKOLAH DASAR (${monthName})`)]
                        })
                    ]
                })
            },
            children: [
                // Identitas Sekolah Table
                createSchoolInfoTable(config),
                new Paragraph({ children: [new TextRun("")] }), // Spacer

                // Main Content: Tables
                new Paragraph({ children: [new TextRun("A. DATA PESERTA DIDIK")] }),
                createStudentDataTable(reportData),
                
                new Paragraph({ children: [new TextRun("")] }), // Spacer
                new Paragraph({ children: [new TextRun("B. DATA JABATAN & GOLONGAN")] }),
                createStaffDataTable(reportData),

                // Signature Section
                createSignatureSection(config, month, year)
            ]
        }]
    });

    // 2. Export and Download
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `LAPORAN_BULANAN_${config.name}_${month + 1}_${year}.docx`);
};

/**
 * Table: School Information
 */
function createSchoolInfoTable(config: SchoolConfig): Table {
    return new Table({
        width: { size: 17280, type: WidthType.DXA }, // Full width landscape F4 minus margins
        columnWidths: [3000, 5640, 3000, 5640],
        rows: [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NAMA SEKOLAH", bold: true })] })], borders: BORDERS }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun(config.name)] })], borders: BORDERS }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NSS / NPSNStatus", bold: true })] })], borders: BORDERS }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun(`${config.nss} / ${config.npsn}`)] })], borders: BORDERS }),
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ALAMAT", bold: true })] })], borders: BORDERS }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun(config.address)] })], borders: BORDERS }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "KECAMATAN / KOTA", bold: true })] })], borders: BORDERS }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun(`${config.district} / ${config.city}`)] })], borders: BORDERS }),
                ]
            })
        ]
    });
}

/**
 * Table: Student Matrix
 */
function createStudentDataTable(reportData: MonthlyReport): Table {
    const matrix = reportData.studentMatrix;
    
    // Header Logic
    const headerRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "KEWARGANEGARAAN", bold: true })] })], rowSpan: 2, borders: BORDERS, shading: SHADING_HEADER }),
            ...[1,2,3,4,5,6].map(k => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Kelas ${k}`, bold: true })] })], colSpan: 3, borders: BORDERS, shading: SHADING_HEADER })),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true })] })], colSpan: 3, borders: BORDERS, shading: SHADING_HEADER }),
        ]
    });

    const subHeaderRow = new TableRow({
        children: [
            // Dummy for the spanned cell
            ...[1,2,3,4,5,6, 7].flatMap(() => [
                new TableCell({ children: [new Paragraph({ children: [new TextRun("L")] })], borders: BORDERS, shading: SHADING_SUBHEADER }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun("P")] })], borders: BORDERS, shading: SHADING_SUBHEADER }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "J", bold: true })] })], borders: BORDERS, shading: SHADING_TOTAL }),
            ])
        ]
    });

    // Rows Mapping
    const nationalityKeys = ['wniAsli', 'wniTionghoa', 'wniArab', 'wniLain'];
    const dataRows = nationalityKeys.map(key => {
        const row = (matrix as any)[key] || { l: Array(6).fill(0), p: Array(6).fill(0) };
        return new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun(key.replace(/([A-Z])/g, ' $1').toUpperCase())] })], borders: BORDERS }),
                ...[0,1,2,3,4,5].flatMap(i => [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun(row.l[i].toString())] })], borders: BORDERS }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun(row.p[i].toString())] })], borders: BORDERS }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (row.l[i] + row.p[i]).toString(), bold: true })] })], borders: BORDERS, shading: SHADING_TOTAL }),
                ]),
                // Grand Total for this row
                new TableCell({ children: [new Paragraph({ children: [new TextRun(sumArr(row.l).toString())] })], borders: BORDERS }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(sumArr(row.p).toString())] })], borders: BORDERS }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (sumArr(row.l) + sumArr(row.p)).toString(), bold: true })] })], borders: BORDERS, shading: SHADING_TOTAL }),
            ]
        });
    });

    return new Table({
        width: { size: 17280, type: WidthType.DXA },
        rows: [headerRow, subHeaderRow, ...dataRows]
    });
}

/**
 * Table: Staff Data
 */
function createStaffDataTable(reportData: MonthlyReport): Table {
    // Similar logic for Staff Data
    return new Table({
        width: { size: 17280, type: WidthType.DXA },
        rows: [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph("JABATAN")], borders: BORDERS, shading: SHADING_HEADER }),
                    new TableCell({ children: [new Paragraph("PNS (L+P)")], borders: BORDERS, shading: SHADING_HEADER }),
                    new TableCell({ children: [new Paragraph("NON-PNS (L+P)")], borders: BORDERS, shading: SHADING_HEADER }),
                    new TableCell({ children: [new Paragraph("TOTAL")], borders: BORDERS, shading: SHADING_HEADER }),
                ]
            }),
            ...Object.entries(reportData.staffData).map(([job, data]) => new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(job)], borders: BORDERS }),
                    new TableCell({ children: [new Paragraph((data.pnsL + data.pnsP).toString())], borders: BORDERS }),
                    new TableCell({ children: [new Paragraph((data.nonPnsL + data.nonPnsP).toString())], borders: BORDERS }),
                    new TableCell({ children: [new Paragraph({ text: (data.pnsL + data.pnsP + data.nonPnsL + data.nonPnsP).toString(), bold: true })], borders: BORDERS, shading: SHADING_TOTAL }),
                ]
            }))
        ]
    });
}

/**
 * Section: Signature
 */
function createSignatureSection(config: SchoolConfig, month: number, year: number): Paragraph {
    const dateStr = format(new Date(year, month + 1, 0), 'dd MMMM yyyy', { locale: id });
    return new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 480 },
        children: [
            new TextRun({ text: `Kediri, ${dateStr}`, break: 1 }),
            new TextRun({ text: "Kepala Sekolah,", break: 1 }),
            new TextRun({ text: "", break: 4 }), // Blank lines for signature
            new TextRun({ text: config.principalName, bold: true, underline: {}, break: 1 }),
            new TextRun({ text: `NIP. ${config.principalNip}`, break: 1 }),
        ]
    });
}
