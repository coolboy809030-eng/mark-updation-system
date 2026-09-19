import React, { useState } from 'react';
import { FullStudentExamRecord, ExamType } from '../../types/resultTypes';
import { 
  computeSubjectResult, 
  computeDualExamSubjectResult, 
  rankClassStudents,
  getStudentSubjects,
  computeClassAnalytics 
} from '../../utils/resultCalculator';
import { 
  exportTabulationToPdf, 
  exportTabulationToExcel,
  exportBlankTabulationToPdf,
  exportBlankTabulationToExcel 
} from '../../utils/tabulationExport';
import { SCHOOL_NAME, SCHOOL_SUBTITLE, ACADEMIC_SESSION } from '../../data/schoolConfig';
import { Download, Eye, FileSpreadsheet, FileText, CheckCircle2, ClipboardEdit, X } from 'lucide-react';

interface TabulationSheetProps {
  classLevel: string;
  students: FullStudentExamRecord[];
  subjects: string[];
  examMode: ExamType;
  workingDaysHY: number;
  workingDaysAE: number;
  onSelectStudent?: (student: FullStudentExamRecord) => void;
}

export const TabulationSheet: React.FC<TabulationSheetProps> = ({
  classLevel,
  students,
  subjects,
  examMode,
  workingDaysHY,
  workingDaysAE,
  onSelectStudent
}) => {
  const [detailedColumns, setDetailedColumns] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Blank Tabulation state
  const [showBlankModal, setShowBlankModal] = useState(false);
  const [blankSegment, setBlankSegment] = useState<'HY' | 'AE' | 'PT-1' | 'PT-2' | 'PT-3' | 'PT-4' | 'BOTH'>(
    examMode === 'AE' ? 'AE' : examMode === 'HY' ? 'HY' : 'BOTH'
  );
  const [isExportingBlankPdf, setIsExportingBlankPdf] = useState(false);
  const [isExportingBlankExcel, setIsExportingBlankExcel] = useState(false);

  const rankMap = rankClassStudents(students, subjects, examMode, workingDaysHY, workingDaysAE);

  // Download Blank Tabulation PDF
  const handleDownloadBlankPdf = () => {
    try {
      setIsExportingBlankPdf(true);
      exportBlankTabulationToPdf({
        classLevel,
        students,
        subjects,
        examSegment: blankSegment
      });
    } catch (err) {
      console.error('Blank PDF export failed:', err);
      alert('Could not generate blank PDF.');
    } finally {
      setIsExportingBlankPdf(false);
    }
  };

  // Download Blank Tabulation Excel
  const handleDownloadBlankExcel = () => {
    try {
      setIsExportingBlankExcel(true);
      exportBlankTabulationToExcel({
        classLevel,
        students,
        subjects,
        examSegment: blankSegment
      });
    } catch (err) {
      console.error('Blank Excel export failed:', err);
      alert('Could not generate blank Excel.');
    } finally {
      setIsExportingBlankExcel(false);
    }
  };

  // Download A4 Landscape PDF
  const handleDownloadPdf = () => {
    try {
      setIsExportingPdf(true);
      exportTabulationToPdf({
        classLevel,
        students,
        subjects,
        examMode,
        workingDaysHY,
        workingDaysAE
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Download Excel (.xlsx)
  const handleDownloadExcel = () => {
    try {
      setIsExportingExcel(true);
      exportTabulationToExcel({
        classLevel,
        students,
        subjects,
        examMode,
        workingDaysHY,
        workingDaysAE
      });
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export CSV of tabulation
  const handleExportCSV = () => {
    const headers = ['Roll', 'Adm No', 'Student Name', "Father's Name", 'Opted Subject'];
    subjects.forEach(sub => {
      headers.push(`${sub} Total`);
      headers.push(`${sub} Grade`);
    });
    headers.push('Grand Total', 'Max Marks', 'Percentage', 'Grade', 'Rank', 'Attendance', 'Status');

    const rows = students.map(st => {
      const info = rankMap.get(st.admNo);
      const stActive = getStudentSubjects(st, subjects);
      const optedSub = st.optionalSubject || (stActive.includes('Sanskrit') ? 'Sanskrit' : stActive.includes('Urdu') ? 'Urdu' : '—');

      const rowData = [
        st.roll,
        st.admNo,
        st.name,
        st.fatherName,
        optedSub
      ];

      subjects.forEach(sub => {
        if (!stActive.includes(sub)) {
          rowData.push('—');
          rowData.push('—');
          return;
        }

        if (examMode === 'BOTH') {
          const dual = computeDualExamSubjectResult(st, sub);
          rowData.push(dual.grandTotal);
          rowData.push(dual.grandGrade);
        } else if (examMode === 'HY' || examMode === 'AE') {
          const res = computeSubjectResult(st, sub, examMode);
          rowData.push(res.total);
          rowData.push(res.grade);
        } else {
          const raw = st.rawMarks[`${sub} ${examMode}`] ?? st.rawMarks[`${sub}-${examMode}`] ?? 0;
          rowData.push(raw);
          rowData.push('');
        }
      });

      rowData.push(
        info?.summary.totalObtained ?? 0,
        info?.summary.maxMarks ?? 0,
        `${(info?.summary.percentage ?? 0).toFixed(1)}%`,
        info?.summary.grade ?? '',
        info?.rank ?? '',
        `${info?.summary.presentDays}/${info?.summary.workingDays}`,
        info?.summary.resultStatus ?? 'PASS'
      );

      return rowData.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tabulation_Class_${classLevel}_${examMode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Centralized Class analytics
  const classSummaries = React.useMemo(() => {
    return students.map(st => rankMap.get(st.admNo)?.summary).filter(Boolean) as any[];
  }, [students, rankMap]);

  const classAnalytics = React.useMemo(() => {
    return computeClassAnalytics(classSummaries);
  }, [classSummaries]);

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden my-4">
      {/* Print-specific style to ensure repeat headers on every page and landscape fit */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Action Header */}
      <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Class Tabulation Register & Marksheet (Class {classLevel})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {students.length} students enrolled &bull; {subjects.length} evaluation subjects &bull; Mode: <span className="font-semibold text-indigo-900">{examMode === 'BOTH' ? 'Final Result' : examMode === 'HY' ? 'Term 1' : examMode === 'AE' ? 'Term 2' : examMode}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setDetailedColumns(!detailedColumns)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {detailedColumns ? 'Compact View' : 'Show Internal Splits (PT/PF/SE/WRT)'}
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download Tabulation Sheet as A4 Landscape PDF with repeated headers"
          >
            <FileText className="w-3.5 h-3.5" />
            {isExportingPdf ? 'Exporting PDF...' : 'Download PDF (A4)'}
          </button>

          {/* Download Excel (.xlsx) Button */}
          <button
            onClick={handleDownloadExcel}
            disabled={isExportingExcel}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download Tabulation Sheet as styled Excel (.xlsx) spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {isExportingExcel ? 'Exporting Excel...' : 'Download Excel (.xlsx)'}
          </button>

          {/* Blank Tabulation for Manual Marks Entry Button */}
          <button
            onClick={() => setShowBlankModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download Blank Tabulation Register (Segment-wise with Attendance column for manual marks entry)"
          >
            <ClipboardEdit className="w-3.5 h-3.5 text-amber-800" />
            Blank Tabulation (Manual Entry)
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export as CSV text file"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Print Official Header */}
      <div className="hidden print:block p-4 text-center border-b border-slate-300">
        <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">{SCHOOL_NAME}</h1>
        <p className="text-xs text-slate-600">{SCHOOL_SUBTITLE} &bull; {ACADEMIC_SESSION}</p>
        <p className="text-sm font-bold text-indigo-900 uppercase mt-1">
            TABULATION SHEET - CLASS {classLevel} ({examMode === 'BOTH' ? 'FINAL RESULT' : examMode === 'HY' ? 'TERM 1' : examMode === 'AE' ? 'TERM 2' : examMode})
        </p>
      </div>

      {/* Analytics Summary Badges */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-indigo-50/40 border-b border-slate-200 text-xs">
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-500 block">Class Average %</span>
          <strong className="text-base text-indigo-900 font-bold">{classAnalytics.avgPct}%</strong>
        </div>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-500 block">Pass Rate</span>
          <strong className="text-base text-emerald-700 font-bold">{classAnalytics.passCount}/{classAnalytics.totalStudents} ({classAnalytics.passPercentage}%)</strong>
        </div>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-500 block">Highest Total</span>
          <strong className="text-base text-slate-800 font-bold">{classAnalytics.highestScore} pts</strong>
        </div>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-500 block">Lowest Total</span>
          <strong className="text-base text-slate-800 font-bold">{classAnalytics.lowestScore} pts</strong>
        </div>
      </div>

      {/* Tabulation Table */}
      <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
        <table className="w-full text-xs text-left border-collapse min-w-[900px]">
          <thead className="sticky top-0 z-10 bg-indigo-950 text-white font-semibold divide-x divide-indigo-900 shadow-xs">
            <tr>
              <th className="py-2.5 px-2 text-center w-12">Roll</th>
              <th className="py-2.5 px-3 min-w-[140px]">Student Name</th>
              <th className="py-2.5 px-3 min-w-[130px] hidden sm:table-cell">Father's Name</th>
              
              {subjects.map(sub => (
                <th key={sub} className="py-2.5 px-2 text-center min-w-[90px] whitespace-nowrap" colSpan={detailedColumns && (examMode === 'HY' || examMode === 'AE') ? 5 : 1}>
                  {sub}
                </th>
              ))}

              <th className="py-2.5 px-2 text-center w-16 bg-indigo-900">Total</th>
              <th className="py-2.5 px-2 text-center w-14 bg-indigo-900">%</th>
              <th className="py-2.5 px-2 text-center w-14 bg-indigo-900">Grade</th>
              <th className="py-2.5 px-2 text-center w-12 bg-amber-900">Rank</th>
              <th className="py-2.5 px-2 text-center w-20">Attd</th>
              <th className="py-2.5 px-2 text-center w-16 no-print">Action</th>
            </tr>
            {detailedColumns && (examMode === 'HY' || examMode === 'AE') && (
              <tr className="bg-indigo-900/90 text-[10px] text-indigo-100 divide-x divide-indigo-800 text-center">
                <th></th>
                <th></th>
                <th className="hidden sm:table-cell"></th>
                {subjects.map(sub => (
                  <React.Fragment key={sub}>
                    <th className="py-1 px-1">PT</th>
                    <th className="py-1 px-1">PF</th>
                    <th className="py-1 px-1">SE</th>
                    <th className="py-1 px-1">WRT</th>
                    <th className="py-1 px-1 bg-indigo-950 font-bold">Tot</th>
                  </React.Fragment>
                ))}
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th className="no-print"></th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-200">
            {students.map((st, idx) => {
              const info = rankMap.get(st.admNo);
              const sm = info?.summary;
              const rk = info?.rank;
              const stActive = getStudentSubjects(st, subjects);

              return (
                <tr 
                  key={st.admNo} 
                  className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80 divide-x divide-slate-200 transition-colors' : 'bg-slate-50/50 hover:bg-slate-50/80 divide-x divide-slate-200 transition-colors'}
                >
                  <td className="py-2 px-2 text-center font-bold font-mono text-indigo-950">{st.roll}</td>
                  <td className="py-2 px-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{st.name}</span>
                      {(st.optionalSubject || stActive.includes('Sanskrit') || stActive.includes('Urdu')) && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                          (st.optionalSubject?.toLowerCase() === 'sanskrit' || stActive.includes('Sanskrit'))
                            ? 'bg-amber-100/90 text-amber-800 border border-amber-200' 
                            : 'bg-emerald-100/90 text-emerald-800 border border-emerald-200'
                        }`}>
                          {(st.optionalSubject?.toLowerCase() === 'sanskrit' || stActive.includes('Sanskrit')) ? 'Sanskrit' : 'Urdu'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-slate-600 hidden sm:table-cell text-[11px]">{st.fatherName}</td>

                  {/* Subject columns */}
                  {subjects.map(sub => {
                    const isOpted = stActive.includes(sub);

                    if (!isOpted) {
                      if (detailedColumns && (examMode === 'HY' || examMode === 'AE')) {
                        return (
                          <td key={sub} colSpan={5} className="py-1 px-1 text-center font-mono text-[10px] text-slate-400 italic bg-slate-50/50">
                            —
                          </td>
                        );
                      }
                      return (
                        <td key={sub} className="py-2 px-2 text-center font-mono text-[11px] text-slate-400 italic bg-slate-50/50">
                          —
                        </td>
                      );
                    }

                    if (examMode === 'BOTH') {
                      const dual = computeDualExamSubjectResult(st, sub);
                      return (
                        <td key={sub} className="py-2 px-2 text-center font-mono text-[11px]">
                          <span className="font-bold text-slate-900">{dual.grandTotal}</span>
                          <span className="text-[10px] text-slate-500 ml-1">({dual.grandGrade})</span>
                        </td>
                      );
                    } else if (examMode === 'HY' || examMode === 'AE') {
                      const res = computeSubjectResult(st, sub, examMode);
                      if (detailedColumns) {
                        return (
                          <React.Fragment key={sub}>
                            <td className="py-1 px-1 text-center font-mono font-bold text-slate-800 text-[10px]">{res.ptConverted}</td>
                            <td className="py-1 px-1 text-center font-mono font-bold text-slate-800 text-[10px]">{res.portfolio}</td>
                            <td className="py-1 px-1 text-center font-mono font-bold text-slate-800 text-[10px]">{res.subEnrichment}</td>
                            <td className="py-1 px-1 text-center font-mono font-bold text-slate-800 text-[10px]">{res.written}</td>
                            <td className="py-1 px-1 text-center font-mono font-bold text-indigo-900 bg-indigo-50/30">{res.total}</td>
                          </React.Fragment>
                        );
                      }
                      return (
                        <td key={sub} className="py-2 px-2 text-center font-mono text-[11px]">
                          <span className="font-bold text-slate-900">{res.total}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({res.grade})</span>
                        </td>
                      );
                    } else {
                      const raw = st.rawMarks[`${sub} ${examMode}`] ?? st.rawMarks[`${sub}-${examMode}`] ?? 0;
                      return (
                        <td key={sub} className="py-2 px-2 text-center font-mono text-[11px] font-bold text-slate-900">
                          {raw}
                        </td>
                      );
                    }
                  })}

                  <td className="py-2 px-2 text-center font-mono font-bold text-indigo-950 bg-indigo-50/30">
                    {sm?.totalObtained}
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-semibold text-slate-800">
                    {sm?.percentage}%
                  </td>
                  <td className="py-2 px-2 text-center font-bold">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                      sm?.grade === 'A1' || sm?.grade === 'A2' ? 'bg-emerald-100 text-emerald-800' :
                      sm?.grade === 'B1' || sm?.grade === 'B2' ? 'bg-blue-100 text-blue-800' :
                      sm?.grade === 'C1' || sm?.grade === 'C2' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {sm?.grade}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-amber-900 bg-amber-50/40">
                    #{rk}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-600">
                    {sm?.presentDays}/{sm?.workingDays}
                  </td>
                  <td className="py-2 px-2 text-center no-print">
                    {onSelectStudent && (
                      <button
                        onClick={() => onSelectStudent(st)}
                        className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                        title="View Report Card"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Blank Tabulation Modal for Manual Marks Entry */}
      {showBlankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <ClipboardEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Download Blank Tabulation Register
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manual marks entry sheet for Class {classLevel} &bull; {students.length} Students
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBlankModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segment Selector */}
            <div className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Examination Segment / Term:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'HY', label: 'Term 1' },
                    { id: 'AE', label: 'Term 2' },
                    { id: 'PT-1', label: 'PT-1' },
                    { id: 'PT-2', label: 'PT-2' },
                    { id: 'PT-3', label: 'PT-3' },
                    { id: 'PT-4', label: 'PT-4' },
                    { id: 'BOTH', label: 'Full Session (Final)' }
                  ].map((seg) => (
                    <button
                      key={seg.id}
                      onClick={() => setBlankSegment(seg.id as any)}
                      type="button"
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-left ${
                        blankSegment === seg.id
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {seg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Respective Subjects Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Respective Class Subjects Included:
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  {subjects.map((sub) => (
                    <span
                      key={sub}
                      className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-medium text-slate-800 shadow-2xs"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              {/* Form Features & Attendance Notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Format Highlights:
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11.5px] text-emerald-800">
                  <li><strong>Attendance Column Included:</strong> Dedicated (उपस्थिति / कार्य दिवस) column for manual entry.</li>
                  <li><strong>Pre-filled Student Roster:</strong> Roll No, Adm No, Student Name, Father Name pre-populated.</li>
                  <li><strong>2nd Language Handled:</strong> Urdu/Sanskrit students receive automatic N/A for alternative language.</li>
                  <li><strong>Signatures Block:</strong> Ready-to-sign footer for Class Teacher &amp; Examination Incharge.</li>
                </ul>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                onClick={() => setShowBlankModal(false)}
                type="button"
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleDownloadBlankPdf}
                disabled={isExportingBlankPdf}
                type="button"
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                <FileText className="w-4 h-4" />
                {isExportingBlankPdf ? 'Generating PDF...' : 'Download Blank PDF (A4 Landscape)'}
              </button>

              <button
                onClick={handleDownloadBlankExcel}
                disabled={isExportingBlankExcel}
                type="button"
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {isExportingBlankExcel ? 'Generating Excel...' : 'Download Blank Excel (.xlsx)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
