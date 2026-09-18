import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { MarksAuditRecord } from './marksAudit';
import { formatDisplayDate, formatDisplayDateTime, formatDisplayTime } from './dateFormatter';
import { SCHOOL_NAME, SCHOOL_SUBTITLE, ACADEMIC_SESSION } from '../data/schoolConfig';

interface ExportAuditParams {
  records: MarksAuditRecord[];
  className: string;
  filtersSummary?: string;
}

/**
 * Generates an official school Marks Audit PDF report
 * using standard A4 Landscape dimensions and typography.
 */
export function exportMarksAuditToPdf({
  records,
  className,
  filtersSummary = ''
}: ExportAuditParams): void {
  // Landscape A4: 297mm wide x 210mm high
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const generatedDateTime = formatDisplayDateTime(now);

  // 1. School Header Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(27, 77, 62); // Deep Forest Green #1B4D3E
  doc.text(SCHOOL_NAME || 'P.I.S. HIGH SCHOOL', 148.5, 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(SCHOOL_SUBTITLE || 'CBSE Affiliated Senior Secondary School', 148.5, 17, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('OFFICIAL MARKS AUDIT & VERIFICATION REGISTRY', 148.5, 23, { align: 'center' });

  // Subtitle metadata bar
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const metaLeft = `Class: ${className || 'All Classes'} | Session: ${ACADEMIC_SESSION} | Total Records: ${records.length}`;
  const metaRight = `Audit Generated: ${generatedDateTime}`;
  doc.text(metaLeft, 14, 29);
  doc.text(metaRight, 283, 29, { align: 'right' });

  if (filtersSummary) {
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Active Filters: ${filtersSummary}`, 14, 33);
  }

  // Divider rule
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, 35, 283, 35);

  // 2. Table Data
  const head = [
    [
      '#',
      'URN / Adm ID',
      'Roll',
      'Student Name',
      'Class-Sec',
      'Subject',
      'Segment',
      'Mark',
      'Teacher ID',
      'Teacher Name',
      'Status',
      'Date',
      'Time'
    ]
  ];

  const body = records.map((r, idx) => {
    let dateStr = '—';
    let timeStr = '—';

    if (r.savedAt) {
      dateStr = formatDisplayDate(r.savedAt);
      timeStr = formatDisplayTime(r.savedAt);
    } else if (r.isPreExistingSheetData) {
      dateStr = 'Pre-existing';
      timeStr = 'Sheet Master';
    }

    return [
      String(idx + 1),
      r.urn || r.admNo || '—',
      String(r.roll || '—'),
      r.studentName || '—',
      `${r.className || ''}-${r.section || 'A'}`,
      r.subject || '—',
      r.segment || '—',
      String(r.mark || '—'),
      r.teacherId || '—',
      r.teacherName || '—',
      r.status || 'Saved',
      dateStr,
      timeStr
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: filtersSummary ? 37 : 36,
    margin: { left: 14, right: 14, bottom: 25 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [27, 77, 62],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, // #
      1: { cellWidth: 24, halign: 'left' },   // URN
      2: { cellWidth: 10, halign: 'center' }, // Roll
      3: { cellWidth: 38, halign: 'left' },   // Name
      4: { cellWidth: 16, halign: 'center' }, // Class-Sec
      5: { cellWidth: 26, halign: 'left' },   // Subject
      6: { cellWidth: 18, halign: 'center' }, // Segment
      7: { cellWidth: 14, halign: 'center', fontStyle: 'bold' }, // Mark
      8: { cellWidth: 22, halign: 'left' },   // Teacher ID
      9: { cellWidth: 28, halign: 'left' },   // Teacher Name
      10: { cellWidth: 26, halign: 'center' },// Status
      11: { cellWidth: 22, halign: 'center' },// Date
      12: { cellWidth: 18, halign: 'center' } // Time
    },
    didDrawPage: (data) => {
      // Footer page numbering & official audit note
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = data.pageNumber;

      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Official Examination Authority Audit &bull; Generated: ${generatedDateTime} &bull; Page ${currentPage} of ${pageCount}`,
        14,
        202
      );

      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        '* Note: Records marked "Pre-existing" represent legacy Google Sheet entries where cell-level edit timestamps are not stored by the spreadsheet.',
        14,
        206
      );

      // Signatures
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text('Prepared By: __________________', 150, 202);
      doc.text('Exam Incharge: __________________', 205, 202);
      doc.text('Principal: __________________', 255, 202);
    }
  });

  const filename = `Marks_Audit_Report_Class_${className || 'All'}_${formatDisplayDate(now)}.pdf`;
  doc.save(filename);
}

/**
 * Generates an Excel spreadsheet of the audit records
 */
export function exportMarksAuditToExcel({
  records,
  className,
  filtersSummary = ''
}: ExportAuditParams): void {
  const now = new Date();
  const generatedDateTime = formatDisplayDateTime(now);

  const rows = records.map((r, idx) => {
    let dateStr = '—';
    let timeStr = '—';

    if (r.savedAt) {
      dateStr = formatDisplayDate(r.savedAt);
      timeStr = formatDisplayTime(r.savedAt);
    } else if (r.isPreExistingSheetData) {
      dateStr = 'Pre-existing in Sheet';
      timeStr = 'Sheet Master';
    }

    return {
      'S.No': idx + 1,
      'Student URN': r.urn || r.admNo || '',
      'Roll No': r.roll || '',
      'Student Name': r.studentName || '',
      'Class': r.className || '',
      'Section': r.section || 'A',
      'Subject': r.subject || '',
      'Exam / Segment': r.segment || '',
      'Mark / Value': r.mark || '',
      'Teacher ID': r.teacherId || '',
      'Teacher Name': r.teacherName || '',
      'Action / Status': r.status || '',
      'Saved Date': dateStr,
      'Saved Time': timeStr,
      'Data Source': r.isPreExistingSheetData ? 'Pre-existing Google Sheet' : 'Portal Recorded Submission'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks Audit Registry');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 18 }, // URN
    { wch: 8 },  // Roll
    { wch: 25 }, // Name
    { wch: 10 }, // Class
    { wch: 8 },  // Section
    { wch: 20 }, // Subject
    { wch: 15 }, // Segment
    { wch: 12 }, // Mark
    { wch: 18 }, // Teacher ID
    { wch: 22 }, // Teacher Name
    { wch: 22 }, // Status
    { wch: 16 }, // Saved Date
    { wch: 14 }, // Saved Time
    { wch: 28 }  // Data Source
  ];

  const filename = `Marks_Audit_Class_${className || 'All'}_${formatDisplayDate(now)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Generates a clean CSV download of the audit records
 */
export function exportMarksAuditToCsv({
  records,
  className
}: ExportAuditParams): void {
  const headers = [
    'S.No',
    'Student URN',
    'Roll No',
    'Student Name',
    'Class',
    'Section',
    'Subject',
    'Exam / Segment',
    'Mark',
    'Teacher ID',
    'Teacher Name',
    'Status',
    'Saved Date',
    'Saved Time'
  ];

  const lines = records.map((r, idx) => {
    let dateStr = '—';
    let timeStr = '—';

    if (r.savedAt) {
      dateStr = formatDisplayDate(r.savedAt);
      timeStr = formatDisplayTime(r.savedAt);
    } else if (r.isPreExistingSheetData) {
      dateStr = 'Pre-existing in Sheet';
      timeStr = 'Sheet Master';
    }

    return [
      idx + 1,
      `"${r.urn || r.admNo || ''}"`,
      r.roll || '',
      `"${(r.studentName || '').replace(/"/g, '""')}"`,
      `"${r.className || ''}"`,
      `"${r.section || 'A'}"`,
      `"${r.subject || ''}"`,
      `"${r.segment || ''}"`,
      `"${r.mark || ''}"`,
      `"${r.teacherId || ''}"`,
      `"${r.teacherName || ''}"`,
      `"${r.status || ''}"`,
      `"${dateStr}"`,
      `"${timeStr}"`
    ].join(',');
  });

  const csvContent = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Marks_Audit_Class_${className || 'All'}_${formatDisplayDate(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
