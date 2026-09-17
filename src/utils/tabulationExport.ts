import { jsPDF } from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FullStudentExamRecord, ExamType } from '../types/resultTypes';
import { 
  computeSubjectResult, 
  computeDualExamSubjectResult, 
  rankClassStudents,
  getStudentSubjects 
} from './resultCalculator';
import { SCHOOL_NAME, SCHOOL_SUBTITLE, ACADEMIC_SESSION } from '../data/schoolConfig';
import { formatDisplayDate } from './dateFormatter';

interface TabulationExportParams {
  classLevel: string;
  students: FullStudentExamRecord[];
  subjects: string[];
  examMode: ExamType;
  workingDaysHY: number;
  workingDaysAE: number;
}

function getExamModeLabel(examMode: ExamType): string {
  switch (examMode) {
    case 'BOTH':
      return 'FINAL RESULT (TERM-1 + TERM-2)';
    case 'HY':
      return 'TERM-1 EXAMINATION';
    case 'AE':
      return 'TERM-2 EXAMINATION';
    default:
      return `${examMode} EVALUATION`;
  }
}

/**
 * Exports class tabulation register to a perfectly fitted A4 Landscape PDF
 * with repeated headers on every page, clean typography, and proper margins.
 */
export function exportTabulationToPdf({
  classLevel,
  students,
  subjects,
  examMode,
  workingDaysHY,
  workingDaysAE
}: TabulationExportParams): void {
  // A4 Landscape: 297mm wide x 210mm high
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const rankMap = rankClassStudents(students, subjects, examMode, workingDaysHY, workingDaysAE);
  const examLabel = getExamModeLabel(examMode);

  // Table Headers
  const headRow: string[] = ['Roll', 'Adm No', 'Student Name', "Father's Name"];
  subjects.forEach(sub => {
    // Shorten subject name if needed for compact display
    headRow.push(sub);
  });
  headRow.push('Total', 'Max', '%', 'Grd', 'Rnk', 'Attnd', 'Result');

  // Build Body Rows
  const bodyRows: RowInput[] = students.map(st => {
    const info = rankMap.get(st.admNo);
    const activeSubs = getStudentSubjects(st, subjects);

    const row: (string | number)[] = [
      st.roll,
      st.admNo.replace('PIS-2025-', ''),
      st.name,
      st.fatherName || ''
    ];

    subjects.forEach(sub => {
      if (!activeSubs.includes(sub)) {
        row.push('—');
        return;
      }

      if (examMode === 'BOTH') {
        const dual = computeDualExamSubjectResult(st, sub);
        row.push(`${dual.grandTotal} (${dual.grandGrade})`);
      } else if (examMode === 'HY' || examMode === 'AE') {
        const res = computeSubjectResult(st, sub, examMode);
        row.push(`${res.total} (${res.grade})`);
      } else {
        const raw = st.rawMarks[`${sub} ${examMode}`] ?? st.rawMarks[`${sub}-${examMode}`] ?? 0;
        row.push(String(raw));
      }
    });

    const attStr = `${info?.summary.presentDays ?? 0}/${info?.summary.workingDays ?? (examMode === 'BOTH' ? workingDaysHY + workingDaysAE : examMode === 'HY' ? workingDaysHY : workingDaysAE)}`;

    row.push(
      info?.summary.totalObtained ?? 0,
      info?.summary.maxMarks ?? 0,
      `${(info?.summary.percentage ?? 0).toFixed(1)}%`,
      info?.summary.grade ?? '',
      info?.rank ? `#${info.rank}` : '—',
      attStr,
      info?.summary.resultStatus ?? 'PASS'
    );

    return row;
  });

  // Calculate subject-specific column widths based on count
  const subjectCount = subjects.length;
  const subColWidth = subjectCount > 7 ? 14 : 16;

  const columnStyles: Record<number, { cellWidth?: number; halign?: 'left' | 'center' | 'right' }> = {
    0: { cellWidth: 10, halign: 'center' }, // Roll
    1: { cellWidth: 16, halign: 'center' }, // Adm No
    2: { cellWidth: 32, halign: 'left' },   // Name
    3: { cellWidth: 30, halign: 'left' },   // Father's Name
  };

  // Subject columns
  subjects.forEach((_, idx) => {
    columnStyles[4 + idx] = { cellWidth: subColWidth, halign: 'center' };
  });

  // Summary columns
  const baseOffset = 4 + subjects.length;
  columnStyles[baseOffset] = { cellWidth: 13, halign: 'center' };     // Total
  columnStyles[baseOffset + 1] = { cellWidth: 11, halign: 'center' }; // Max
  columnStyles[baseOffset + 2] = { cellWidth: 13, halign: 'center' }; // %
  columnStyles[baseOffset + 3] = { cellWidth: 10, halign: 'center' }; // Grade
  columnStyles[baseOffset + 4] = { cellWidth: 10, halign: 'center' }; // Rank
  columnStyles[baseOffset + 5] = { cellWidth: 14, halign: 'center' }; // Attnd
  columnStyles[baseOffset + 6] = { cellWidth: 14, halign: 'center' }; // Result

  // Use autoTable with proper repeat headers and margins
  autoTable(doc, {
    head: [headRow],
    body: bodyRows,
    startY: 25,
    margin: { top: 25, left: 8, right: 8, bottom: 14 },
    showHead: 'everyPage', // REPEAT HEADER ROW ON EVERY PAGE
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
      lineColor: [209, 213, 219],
      lineWidth: 0.2,
      textColor: [15, 23, 42],
      overflow: 'ellipsize',
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [27, 67, 50], // Deep School Green #1b4332
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate-50
    },
    columnStyles: columnStyles,
    didDrawPage: (data) => {
      // Header on every page
      doc.saveGraphicsState();
      
      // School Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(27, 67, 50);
      doc.text(SCHOOL_NAME, 148.5, 9, { align: 'center' });

      // School Subtitle & Address
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`${SCHOOL_SUBTITLE} • Session ${ACADEMIC_SESSION}`, 148.5, 13.5, { align: 'center' });

      // Tabulation Register Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`TABULATION REGISTER — CLASS ${classLevel.toUpperCase()} (${examLabel})`, 148.5, 18, { align: 'center' });

      // Top Right metadata
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Students: ${students.length} | Date: ${formatDisplayDate(new Date())}`, 289, 18, { align: 'right' });

      // Footer
      const pageStr = `Page ${data.pageNumber} of ${(doc as any).internal.getNumberOfPages()}`;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(pageStr, 148.5, 204, { align: 'center' });

      // Footer Signatures
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text('Prepared by: Class Teacher', 12, 204);
      doc.text('Checked by: Exam In-Charge', 148.5, 204, { align: 'center' });
      doc.text('Verified by: Principal', 285, 204, { align: 'right' });

      doc.restoreGraphicsState();
    }
  });

  // Save the PDF
  const filename = `Tabulation_Register_Class_${classLevel.replace(/\s+/g, '_')}_${examMode}.pdf`;
  doc.save(filename);
}

/**
 * Exports class tabulation register to a formatted Excel (.xlsx) file
 * with clean headers, correct data types, formulas, and auto-sized columns.
 */
export function exportTabulationToExcel({
  classLevel,
  students,
  subjects,
  examMode,
  workingDaysHY,
  workingDaysAE
}: TabulationExportParams): void {
  const rankMap = rankClassStudents(students, subjects, examMode, workingDaysHY, workingDaysAE);
  const examLabel = getExamModeLabel(examMode);

  // Construct Data for Sheet
  const worksheetData: (string | number)[][] = [];

  // Title rows
  worksheetData.push([SCHOOL_NAME]);
  worksheetData.push([`${SCHOOL_SUBTITLE} • Session ${ACADEMIC_SESSION}`]);
  worksheetData.push([`TABULATION REGISTER — CLASS ${classLevel.toUpperCase()} (${examLabel})`]);
  worksheetData.push([]); // blank row

  // Header Row
  const headerRow: string[] = ['Roll No', 'Admission No', 'Student Name', "Father's Name", 'Opted Subject'];
  subjects.forEach(sub => {
    headerRow.push(`${sub} Marks`);
    headerRow.push(`${sub} Grade`);
  });
  headerRow.push('Grand Total', 'Max Marks', 'Percentage (%)', 'Grade', 'Rank', 'Attendance', 'Result Status');
  worksheetData.push(headerRow);

  // Data Rows
  students.forEach(st => {
    const info = rankMap.get(st.admNo);
    const activeSubs = getStudentSubjects(st, subjects);
    const optedLanguage = st.optionalSubject || (activeSubs.includes('Sanskrit') ? 'Sanskrit' : activeSubs.includes('Urdu') ? 'Urdu' : 'Standard');

    const row: (string | number)[] = [
      st.roll,
      st.admNo,
      st.name,
      st.fatherName || '',
      optedLanguage
    ];

    subjects.forEach(sub => {
      if (!activeSubs.includes(sub)) {
        row.push('—');
        row.push('—');
        return;
      }

      if (examMode === 'BOTH') {
        const dual = computeDualExamSubjectResult(st, sub);
        row.push(dual.grandTotal);
        row.push(dual.grandGrade);
      } else if (examMode === 'HY' || examMode === 'AE') {
        const res = computeSubjectResult(st, sub, examMode);
        row.push(res.total);
        row.push(res.grade);
      } else {
        const raw = st.rawMarks[`${sub} ${examMode}`] ?? st.rawMarks[`${sub}-${examMode}`] ?? 0;
        row.push(typeof raw === 'number' ? raw : String(raw));
        row.push('');
      }
    });

    const totalWorking = examMode === 'BOTH' ? workingDaysHY + workingDaysAE : examMode === 'HY' ? workingDaysHY : workingDaysAE;
    const attStr = `${info?.summary.presentDays ?? 0} / ${info?.summary.workingDays ?? totalWorking}`;

    row.push(
      info?.summary.totalObtained ?? 0,
      info?.summary.maxMarks ?? 0,
      parseFloat((info?.summary.percentage ?? 0).toFixed(2)),
      info?.summary.grade ?? '',
      info?.rank ?? '',
      attStr,
      info?.summary.resultStatus ?? 'PASS'
    );

    worksheetData.push(row);
  });

  // Summary Row at the bottom
  let totalScoreSum = 0;
  let highestScore = 0;
  let lowestScore = 999999;
  let passCount = 0;

  students.forEach(st => {
    const sm = rankMap.get(st.admNo)?.summary;
    if (sm) {
      totalScoreSum += sm.percentage;
      if (sm.totalObtained > highestScore) highestScore = sm.totalObtained;
      if (sm.totalObtained < lowestScore) lowestScore = sm.totalObtained;
      if (sm.resultStatus === 'PASS') passCount++;
    }
  });

  const avgPct = students.length > 0 ? (totalScoreSum / students.length).toFixed(2) : '0';
  worksheetData.push([]); // blank row
  worksheetData.push([
    'CLASS SUMMARY',
    `Total Students: ${students.length}`,
    `Passed: ${passCount}`,
    `Class Average: ${avgPct}%`,
    `Highest Marks: ${highestScore}`,
    `Lowest Marks: ${lowestScore === 999999 ? 0 : lowestScore}`
  ]);

  // Create workbook & worksheet
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const colWidths = headerRow.map((h, i) => {
    if (i === 0) return { wch: 8 }; // Roll
    if (i === 1) return { wch: 15 }; // Adm
    if (i === 2) return { wch: 22 }; // Name
    if (i === 3) return { wch: 22 }; // Father's Name
    if (i === 4) return { wch: 14 }; // Opted Subject
    return { wch: Math.max(h.length + 3, 10) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  const sheetName = `Class_${classLevel.slice(0, 10)}_Tabulation`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Save Excel file
  const filename = `Tabulation_Class_${classLevel.replace(/\s+/g, '_')}_${examMode}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export interface BlankTabulationParams {
  classLevel: string;
  students: FullStudentExamRecord[];
  subjects: string[];
  examSegment?: string;
  session?: string;
}

/**
 * Exports a clean, blank tabulation register for offline manual marks entry.
 * Includes student demographics, respective class subjects, and an attendance column.
 */
export function exportBlankTabulationToPdf({
  classLevel,
  students,
  subjects,
  examSegment = 'HY',
  session = ACADEMIC_SESSION
}: BlankTabulationParams): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const segmentTitle = examSegment === 'BOTH' 
    ? 'FULL SESSION / FINAL EVALUATION'
    : examSegment === 'HY'
    ? 'HALF YEARLY (TERM-1) EXAMINATION'
    : examSegment === 'AE'
    ? 'ANNUAL (TERM-2) EXAMINATION'
    : `${examSegment} EXAMINATION / ASSESSMENT`;

  // Headers
  const headRow: string[] = ['Roll', 'Adm No', 'Student Name', "Father's Name", '2nd Lang'];
  subjects.forEach(sub => {
    headRow.push(sub);
  });
  headRow.push('Attendance\n(Pres/Total)', 'Total Marks', 'Remarks / Sign');

  // Sorted students by roll
  const sortedStudents = [...students].sort((a, b) => a.roll - b.roll);

  // Body rows with blank cells for marks entry
  const bodyRows: RowInput[] = sortedStudents.map(st => {
    const activeSubs = getStudentSubjects(st, subjects);
    const optedLanguage = st.optionalSubject || (activeSubs.includes('Sanskrit') ? 'Sanskrit' : activeSubs.includes('Urdu') ? 'Urdu' : '—');

    const row: (string | number)[] = [
      st.roll,
      st.admNo.replace('PIS-2025-', ''),
      st.name,
      st.fatherName || '',
      optedLanguage
    ];

    // Subject columns: empty string for active subject, 'N/A' for excluded language
    subjects.forEach(sub => {
      const isUrdu = sub.toLowerCase() === 'urdu';
      const isSanskrit = sub.toLowerCase() === 'sanskrit';

      if (isUrdu && optedLanguage === 'Sanskrit') {
        row.push('N/A');
      } else if (isSanskrit && optedLanguage === 'Urdu') {
        row.push('N/A');
      } else {
        row.push(''); // Blank cell for manual pen/pencil marks entry
      }
    });

    // Attendance column (blank template e.g. "   /   ")
    row.push('    /    ');

    // Total Marks (blank)
    row.push('');

    // Remarks / Signature (blank)
    row.push('');

    return row;
  });

  const subjectCount = subjects.length;
  const subColWidth = Math.max(14, Math.min(22, Math.floor(130 / (subjectCount || 1))));

  const columnStyles: Record<number, { cellWidth?: number; halign?: 'left' | 'center' | 'right' }> = {
    0: { cellWidth: 10, halign: 'center' }, // Roll
    1: { cellWidth: 16, halign: 'center' }, // Adm No
    2: { cellWidth: 32, halign: 'left' },   // Name
    3: { cellWidth: 28, halign: 'left' },   // Father's Name
    4: { cellWidth: 16, halign: 'center' }, // 2nd Lang
  };

  subjects.forEach((_, idx) => {
    columnStyles[5 + idx] = { cellWidth: subColWidth, halign: 'center' };
  });

  const baseOffset = 5 + subjects.length;
  columnStyles[baseOffset] = { cellWidth: 22, halign: 'center' };     // Attendance
  columnStyles[baseOffset + 1] = { cellWidth: 18, halign: 'center' }; // Total Marks
  columnStyles[baseOffset + 2] = { cellWidth: 22, halign: 'center' }; // Remarks/Sign

  autoTable(doc, {
    head: [headRow],
    body: bodyRows,
    startY: 25,
    margin: { top: 25, left: 8, right: 8, bottom: 18 },
    showHead: 'everyPage',
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      minCellHeight: 6.5,
      lineColor: [180, 185, 195],
      lineWidth: 0.25,
      textColor: [15, 23, 42],
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: [27, 67, 50], // Deep Emerald Green
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 8
    },
    alternateRowStyles: {
      fillColor: [250, 252, 251]
    },
    columnStyles,
    didDrawPage: (data) => {
      // Header Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(27, 67, 50);
      doc.text(SCHOOL_NAME.toUpperCase(), 148.5, 7, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${SCHOOL_SUBTITLE} • SESSION ${session}`, 148.5, 11.5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(180, 83, 9); // Amber-700
      doc.text(`BLANK TABULATION REGISTER FOR MANUAL MARKS ENTRY — CLASS ${classLevel.toUpperCase()}`, 148.5, 16.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`Segment / Exam: ${segmentTitle} | Total Students: ${students.length}`, 148.5, 21, { align: 'center' });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = data.pageNumber;

      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated from Examination Authority on ${formatDisplayDate(new Date())} | Page ${currentPage} of ${pageCount}`,
        14,
        204
      );

      // Signatures line on bottom of each page
      doc.setFont('helvetica', 'bold');
      doc.text('Subject Teacher: _________________', 85, 204);
      doc.text('Class Teacher: _________________', 155, 204);
      doc.text('Exam Incharge: _________________', 220, 204);
    }
  });

  doc.save(`Blank_Tabulation_Class_${classLevel.replace(/\s+/g, '_')}_${examSegment}_ManualEntry.pdf`);
}

/**
 * Exports a blank tabulation sheet in Excel (.xlsx) format for manual marks entry.
 */
export function exportBlankTabulationToExcel({
  classLevel,
  students,
  subjects,
  examSegment = 'HY',
  session = ACADEMIC_SESSION
}: BlankTabulationParams): void {
  const segmentTitle = examSegment === 'BOTH' 
    ? 'FULL SESSION'
    : examSegment === 'HY'
    ? 'HALF YEARLY (TERM-1)'
    : examSegment === 'AE'
    ? 'ANNUAL (TERM-2)'
    : `${examSegment}`;

  const worksheetData: (string | number)[][] = [];

  worksheetData.push([SCHOOL_NAME]);
  worksheetData.push([`${SCHOOL_SUBTITLE} • Session ${session}`]);
  worksheetData.push([`BLANK TABULATION REGISTER FOR MANUAL MARKS ENTRY — CLASS ${classLevel.toUpperCase()} (${segmentTitle})`]);
  worksheetData.push([`Total Students: ${students.length} | Generated: ${formatDisplayDate(new Date())}`]);
  worksheetData.push([]); // blank row

  const headerRow: string[] = ['Roll No', 'Admission No', 'Student Name', "Father's Name", '2nd Language'];
  subjects.forEach(sub => {
    headerRow.push(`${sub} Marks`);
  });
  headerRow.push('Attendance (Present/Total)', 'Grand Total', 'Remarks / Teacher Signature');
  worksheetData.push(headerRow);

  const sortedStudents = [...students].sort((a, b) => a.roll - b.roll);

  sortedStudents.forEach(st => {
    const activeSubs = getStudentSubjects(st, subjects);
    const optedLanguage = st.optionalSubject || (activeSubs.includes('Sanskrit') ? 'Sanskrit' : activeSubs.includes('Urdu') ? 'Urdu' : '—');

    const row: (string | number)[] = [
      st.roll,
      st.admNo,
      st.name,
      st.fatherName || '',
      optedLanguage
    ];

    subjects.forEach(sub => {
      const isUrdu = sub.toLowerCase() === 'urdu';
      const isSanskrit = sub.toLowerCase() === 'sanskrit';

      if (isUrdu && optedLanguage === 'Sanskrit') {
        row.push('N/A');
      } else if (isSanskrit && optedLanguage === 'Urdu') {
        row.push('N/A');
      } else {
        row.push(''); // blank cell for marks
      }
    });

    row.push('   /   '); // blank attendance
    row.push('');        // blank total
    row.push('');        // blank remarks

    worksheetData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const colWidths = headerRow.map((h, i) => {
    if (i === 0) return { wch: 8 };
    if (i === 1) return { wch: 16 };
    if (i === 2) return { wch: 24 };
    if (i === 3) return { wch: 22 };
    if (i === 4) return { wch: 14 };
    return { wch: Math.max(h.length + 3, 14) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  const sheetName = `Blank_Class_${classLevel.slice(0, 10)}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  XLSX.writeFile(wb, `Blank_Tabulation_Class_${classLevel.replace(/\s+/g, '_')}_${examSegment}_ManualEntry.xlsx`);
}
