import React, { useRef, useState } from 'react';
import { FullStudentExamRecord, ExamType } from '../../types/resultTypes';
import { SCHOOL_NAME, ACADEMIC_SESSION } from '../../data/schoolConfig';
import { SCHOOL_LOGO_BASE64 } from '../../data/logoData';
import { 
  computeSubjectResult, 
  computeDualExamSubjectResult, 
  computeStudentSummary,
  getStudentSubjects,
  getFullSubjectName
} from '../../utils/resultCalculator';
import { PerformanceBarGraph, SubjectChartItem } from './PerformanceBarGraph';
import { exportReportCardToPdf } from '../../utils/pdfExport';
import { pad2 } from '../../utils/dateFormatter';
import { Download, BarChart2, PenTool } from 'lucide-react';
import { getStoredSignatures, SchoolSignatures } from '../../utils/signatureStorage';
import { OfficialSignaturesModal } from './OfficialSignaturesModal';
import { getStudentURN } from '../../utils/studentIdentity';
import { getStudentPhotoUrl } from '../../utils/photoMapping';

interface ReportCardProps {
  student: FullStudentExamRecord;
  subjects: string[];
  examMode: ExamType;
  rank?: number;
  workingDaysHY?: number;
  workingDaysAE?: number;
  hideControls?: boolean; // For batch print view
  showBarGraphProp?: boolean;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  student,
  subjects,
  examMode,
  rank,
  workingDaysHY = 110,
  workingDaysAE = 115,
  hideControls = false,
  showBarGraphProp
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [signatures, setSignatures] = useState<SchoolSignatures>(getStoredSignatures);
  const [isSignaturesModalOpen, setIsSignaturesModalOpen] = useState(false);

  React.useEffect(() => {
    const handleSignaturesUpdated = (e: any) => {
      if (e?.detail) setSignatures(e.detail);
      else setSignatures(getStoredSignatures());
    };
    window.addEventListener('school-signatures-updated', handleSignaturesUpdated);
    return () => window.removeEventListener('school-signatures-updated', handleSignaturesUpdated);
  }, []);

  const [showBarGraph, setShowBarGraph] = useState<boolean>(() => {
    if (showBarGraphProp !== undefined) return showBarGraphProp;
    try {
      const saved = localStorage.getItem('pis_pref_show_bargraph');
      if (saved !== null) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return false; // By default off so output is 100% identical to uploaded PDF, user toggles anytime!
  });

  React.useEffect(() => {
    if (showBarGraphProp !== undefined) {
      setShowBarGraph(showBarGraphProp);
    }
  }, [showBarGraphProp]);

  const handleToggleBarGraph = () => {
    setShowBarGraph((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pis_pref_show_bargraph', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const activeSubjects = React.useMemo(() => {
    return getStudentSubjects(student, subjects);
  }, [student, subjects]);

  const studentURN = getStudentURN(student);
  const photoMapping = getStudentPhotoUrl(student);
  const photoSrc = photoMapping.url;

  const summary = computeStudentSummary(student, activeSubjects, examMode, workingDaysHY, workingDaysAE);

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const filename = `ReportCard_${student.name.replace(/\s+/g, '_')}_Class${student.studentClass}_${examMode}.pdf`;
      await exportReportCardToPdf({
        element: cardRef.current,
        filename
      });
    } catch (e: any) {
      console.error('PDF export error:', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Determine title badge text based on examMode
  const getPillBadgeText = () => {
    switch (examMode) {
      case 'PT-1':
        return 'PROGRESS REPORT — PT-1';
      case 'PT-2':
        return 'PROGRESS REPORT — PT-2';
      case 'PT-3':
        return 'PROGRESS REPORT — PT-3';
      case 'PT-4':
        return 'PROGRESS REPORT — PT-4';
      case 'HY':
        return 'PROGRESS REPORT — TERM 1';
      case 'AE':
        return 'PROGRESS REPORT — TERM 2';
      case 'BOTH':
      default:
        return 'PROGRESS REPORT — FINAL RESULT';
    }
  };

  // Format Roll No to two digits if numeric (e.g. "07")
  const formattedRoll = !isNaN(Number(student.roll)) 
    ? pad2(Number(student.roll)) 
    : String(student.roll);

  // Compute chart items for the bar graph (only using student's active subjects)
  const chartItems: SubjectChartItem[] = React.useMemo(() => {
    return activeSubjects.map((sub) => {
      const fullSubName = getFullSubjectName(sub);
      if (examMode === 'BOTH') {
        const dual = computeDualExamSubjectResult(student, sub);
        return {
          subject: fullSubName,
          scored: dual.grandTotal,
          max: 200,
          percentage: dual.grandPercentage,
          grade: dual.grandGrade
        };
      } else if (examMode === 'HY' || examMode === 'AE') {
        const res = computeSubjectResult(student, sub, examMode);
        return {
          subject: fullSubName,
          scored: res.total,
          max: 100,
          percentage: res.total,
          grade: res.grade
        };
      } else {
        // Unit Test
        const raw = student.rawMarks[`${sub} ${examMode}`] ?? student.rawMarks[`${sub}-${examMode}`] ?? 0;
        const marks = typeof raw === 'number' ? raw : parseFloat(String(raw)) || 0;
        const pct = Math.round((marks / 20) * 100);
        const gr = marks === 0 && String(raw).toUpperCase() === 'AB' ? 'AB' : (pct >= 91 ? 'A1' : pct >= 81 ? 'A2' : pct >= 71 ? 'B1' : pct >= 61 ? 'B2' : pct >= 51 ? 'C1' : pct >= 41 ? 'C2' : pct >= 33 ? 'D' : 'E');
        return {
          subject: fullSubName,
          scored: marks,
          max: 20,
          percentage: pct,
          grade: gr
        };
      }
    });
  }, [student, activeSubjects, examMode]);

  const isDual = examMode === 'BOTH';
  const isSinglePT = examMode === 'PT-1' || examMode === 'PT-2' || examMode === 'PT-3' || examMode === 'PT-4';
  const showGradingAndAbbrTable = !isSinglePT; // Unit test does not show CBSE grading table at bottom in PDF

  return (
    <div className="w-full max-w-4xl mx-auto my-4 print:my-0 print:max-w-none">
      {/* Action Bar (Hidden in Print) */}
      {!hideControls && (
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 font-medium">
              Student: <strong className="text-slate-900">{student.name}</strong> (Roll {student.roll})
            </span>

            {/* Toggle Bar Graph Button */}
            <button
              id="btn-toggle-bargraph"
              onClick={handleToggleBarGraph}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                showBarGraph
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle subject performance bar graph"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{showBarGraph ? 'Marks Bar Graph: ON' : 'Marks Bar Graph: OFF'}</span>
            </button>

            {/* Manage Signatures Button */}
            <button
              type="button"
              onClick={() => setIsSignaturesModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-900 hover:bg-indigo-100 transition-all cursor-pointer"
              title="प्रिंसिपल और एग्जाम कंट्रोलर के साइन अपलोड या प्रबंधित करें"
            >
              <PenTool className="w-3.5 h-3.5 text-indigo-700" />
              <span>हस्ताक्षर (Signatures)</span>
              {(signatures.principalSignUrl || signatures.controllerSignUrl) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="हस्ताक्षर सक्रिय हैं"></span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id={`btn-pdf-${student.roll}`}
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1b4332] hover:bg-[#153527] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
            </button>
          </div>
        </div>
      )}

      {/* Official Signatures Modal */}
      <OfficialSignaturesModal
        isOpen={isSignaturesModalOpen}
        onClose={() => setIsSignaturesModalOpen(false)}
        onSignaturesUpdated={(newSigs) => setSignatures(newSigs)}
      />

      {/* The Printable A4 Sheet - EXACT REPLICA OF UPLOADED PDF */}
      <div 
        ref={cardRef}
        id={`report-card-${student.admNo}`}
        className="result-card-print bg-white rounded-sm shadow-md border-2 border-[#1b4332] relative overflow-hidden font-sans text-slate-900 print:shadow-none print:rounded-none print:border-2 print:border-[#1b4332] p-2.5 sm:p-3 print:p-2"
      >
        {/* Circular School Seal Watermark in Center */}
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.065] print:opacity-[0.075] select-none"
          aria-hidden="true"
        >
          <img 
            src={SCHOOL_LOGO_BASE64} 
            alt="School Watermark" 
            className="w-72 h-72 sm:w-84 sm:h-84 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* 1. Header Section */}
        <div className="relative pb-1 mb-1.5 min-h-[70px] sm:min-h-[74px]">
          {/* School Crest Logo (Left) - Increased 25% with margin so it never touches top or side border */}
          <div className="absolute left-1.5 top-0.5 flex items-center justify-center w-[68px] h-[68px] sm:w-[72px] sm:h-[72px]">
            <img 
              src={SCHOOL_LOGO_BASE64} 
              alt="Peace International School Logo" 
              className="w-full h-full object-contain rounded-full border border-slate-200/80 shadow-2xs"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* School Titles - Centralized with balanced padding */}
          <div className="w-full text-center px-4 sm:px-6 flex flex-col items-center justify-center">
            <h1 className="font-bold tracking-wider font-serif text-[#1b4332] uppercase text-xl sm:text-2xl text-center">
              {SCHOOL_NAME}
            </h1>
            <p className="text-slate-800 font-bold text-[10.5px] sm:text-xs mt-0.5 text-center">
              Chakjado Dargabela, Vaishali, Bihar
            </p>

            {/* Pill Banner & Red Session Box - Vertically stacked, distinct spacing, centrally aligned */}
            <div className="mt-1 flex flex-col items-center justify-center gap-1 w-full">
              {/* Report Card Title Box */}
              <span className="inline-block bg-[#1b4332] text-white rounded font-bold uppercase px-4 py-0.5 text-[9.5px] sm:text-[10px] tracking-wider text-center shadow-xs">
                {getPillBadgeText()}
              </span>

              {/* Red Session Box directly below report card box with spacing */}
              <div className="inline-flex items-center justify-center border border-red-500 bg-red-50/80 rounded px-2.5 py-0.5 shadow-2xs">
                <span className="text-[8px] sm:text-[8.5px] font-bold text-red-600 uppercase tracking-wider">
                  Session: <span className="font-extrabold font-mono">{ACADEMIC_SESSION.replace(/^session\s*/i, '')}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Student Information Box */}
        <div className="border border-[#d1d5db] rounded-xs bg-white text-slate-800 p-1.5 px-3 mb-1.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            {/* Student Particulars Grid */}
            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-0.5">
              {/* Row 1 */}
              <div className="flex items-center">
                <span className="w-26 text-slate-600">Student Name:</span>
                <span className="font-bold text-slate-900 uppercase">{student.name}</span>
              </div>
              <div className="flex items-center">
                <span className="w-24 text-slate-600">Roll No:</span>
                <span className="font-bold text-slate-900">{formattedRoll}</span>
              </div>

              {/* Row 2 */}
              <div className="flex items-center">
                <span className="w-26 text-slate-600">Father's Name:</span>
                <span className="font-bold text-slate-900 uppercase">{student.fatherName || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <span className="w-24 text-slate-600">Class &amp; Sec:</span>
                <span className="font-bold text-slate-900">
                  Class {student.studentClass}{student.section ? ` - ${student.section}` : ''}
                </span>
              </div>

              {/* Row 3 */}
              <div className="flex items-center">
                <span className="w-26 text-slate-600">Mother's Name:</span>
                <span className="font-bold text-slate-900 uppercase">{student.motherName || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <span className="w-24 text-slate-600">URN / Adm No:</span>
                <span className="font-mono font-bold text-slate-900">{studentURN || student.admNo || 'N/A'}</span>
              </div>
            </div>

            {/* Student Photograph Frame (Rendered if available via authoritative URN/Drive mapping) */}
            {photoSrc && (
              <div className="shrink-0 pl-2 border-l border-slate-200">
                <div className="w-[52px] h-[62px] border border-slate-300 rounded-xs overflow-hidden bg-slate-50 flex items-center justify-center shadow-2xs">
                  <img 
                    src={photoSrc} 
                    alt={student.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src.includes('lh3.googleusercontent.com/d/')) {
                        const id = target.src.split('/d/')[1];
                        target.src = `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Academic Tables */}
        
        {/* CASE A: Single Unit Test (Page 1 in PDF) */}
        {isSinglePT && (
          <div className="mb-1.5 border border-[#1b4332] rounded-xs overflow-hidden">
            {/* Table Green Banner */}
            <div className="bg-[#1b4332] text-white px-3 py-0.5 font-bold text-xs">
              {examMode === 'PT-1' ? 'Unit Test 1 (PT-1)' :
               examMode === 'PT-2' ? 'Unit Test 2 (PT-2)' :
               examMode === 'PT-3' ? 'Unit Test 3 (PT-3)' :
               'Unit Test 4 (PT-4)'}
            </div>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#f9fafb] text-slate-700 font-semibold border-b border-[#d1d5db]">
                  <th className="py-0.5 px-2.5 border-r border-[#d1d5db] whitespace-nowrap">Subject</th>
                  <th className="py-0.5 px-2.5 text-center border-r border-[#d1d5db] w-48">Marks (out of 20)</th>
                  <th className="py-0.5 px-2.5 text-center w-28">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d1d5db]">
                {activeSubjects.map((sub, idx) => {
                  const raw = student.rawMarks[`${sub} ${examMode}`] ?? student.rawMarks[`${sub}-${examMode}`] ?? 0;
                  const marks = typeof raw === 'number' ? raw : parseFloat(String(raw)) || 0;
                  const pct = Math.round((marks / 20) * 100);
                  const gr = marks === 0 && String(raw).toUpperCase() === 'AB' ? 'AB' : (pct >= 91 ? 'A1' : pct >= 81 ? 'A2' : pct >= 71 ? 'B1' : pct >= 61 ? 'B2' : pct >= 51 ? 'C1' : pct >= 41 ? 'C2' : pct >= 33 ? 'D' : 'E');
                  return (
                    <tr key={sub} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                      <td className="py-0.5 px-2.5 font-bold text-slate-900 border-r border-[#d1d5db] whitespace-nowrap">{getFullSubjectName(sub)}</td>
                      <td className="py-0.5 px-2.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{marks}</td>
                      <td className="py-0.5 px-2.5 text-center font-bold text-slate-800">{gr}</td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr className="bg-white font-bold border-t-2 border-[#1b4332]">
                  <td className="py-1 px-2.5 text-slate-900 border-r border-[#d1d5db] whitespace-nowrap">Total</td>
                  <td className="py-1 px-2.5 text-center font-mono text-slate-900 border-r border-[#d1d5db]">
                    {summary.totalObtained} / {summary.maxMarks}
                  </td>
                  <td className="py-1 px-2.5 text-center font-bold text-slate-900">
                    {summary.grade}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* CASE B: Half Yearly or Annual (Page 2 in PDF) */}
        {!isDual && !isSinglePT && (
          <div className="mb-1.5 border border-[#1b4332] rounded-xs overflow-hidden">
            {/* Table Green Banner */}
            <div className="bg-[#1b4332] text-white px-3 py-0.5 font-bold text-xs">
              {examMode === 'HY' ? 'Term 1 Examination' : 'Term 2 Examination'}
            </div>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#f9fafb] text-slate-700 font-semibold border-b border-[#d1d5db] text-center">
                  <th className="py-0.5 px-2.5 text-left border-r border-[#d1d5db] whitespace-nowrap">Subject</th>
                  <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-16">PT</th>
                  <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-16">PF</th>
                  <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-16">SE</th>
                  <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-24">Written</th>
                  <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-20">Total</th>
                  <th className="py-0.5 px-1.5 w-16">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d1d5db]">
                {activeSubjects.map((sub, idx) => {
                  const res = computeSubjectResult(student, sub, examMode as 'HY' | 'AE');
                  return (
                    <tr key={sub} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                      <td className="py-0.5 px-2.5 font-bold text-slate-900 border-r border-[#d1d5db] whitespace-nowrap">{getFullSubjectName(sub)}</td>
                      <td className="py-0.5 px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.ptConverted}</td>
                      <td className="py-0.5 px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.portfolio}</td>
                      <td className="py-0.5 px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.subEnrichment}</td>
                      <td className="py-0.5 px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.written}</td>
                      <td className="py-0.5 px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">
                        {res.isAbsent ? 'AB' : res.total}
                      </td>
                      <td className="py-0.5 px-1.5 text-center font-bold text-slate-900">{res.grade}</td>
                    </tr>
                  );
                })}
                {/* Grand Total Row */}
                <tr className="bg-white font-bold border-t-2 border-[#1b4332]">
                  <td className="py-1 px-2.5 text-slate-900 border-r border-[#d1d5db] whitespace-nowrap">Grand Total</td>
                  <td className="py-1 px-1.5 border-r border-[#d1d5db]"></td>
                  <td className="py-1 px-1.5 border-r border-[#d1d5db]"></td>
                  <td className="py-1 px-1.5 border-r border-[#d1d5db]"></td>
                  <td className="py-1 px-1.5 border-r border-[#d1d5db]"></td>
                  <td className="py-1 px-1.5 text-center font-mono text-slate-900 border-r border-[#d1d5db]">
                    {summary.totalObtained}
                  </td>
                  <td className="py-1 px-1.5 text-center font-bold text-slate-900">
                    {summary.grade}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* CASE C: Combined (Term-1 & Term-2) (Page 3 in PDF) */}
        {isDual && (
          <div className="space-y-1.5 mb-2">
            {/* Table 1: Term-1 Examination */}
            <div className="border border-[#1b4332] rounded-xs overflow-hidden">
              <div className="bg-[#1b4332] text-white px-2.5 py-0.5 font-bold text-[10.5px]">
                Term 1 Examination
              </div>
              <table className="w-full text-[10px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#f9fafb] text-slate-700 font-semibold border-b border-[#d1d5db] text-center">
                    <th className="py-0.5 px-2 text-left border-r border-[#d1d5db] whitespace-nowrap">Subject</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-14">PT</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-14">PF</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-14">SE</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-20">Written</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-16">Total</th>
                    <th className="py-0.5 px-1.5 w-14">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d1d5db]">
                  {activeSubjects.map((sub, idx) => {
                    const res = computeSubjectResult(student, sub, 'HY');
                    return (
                      <tr key={sub} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                        <td className="py-[2px] px-2 font-bold text-slate-900 border-r border-[#d1d5db] whitespace-nowrap">{getFullSubjectName(sub)}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.ptConverted}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.portfolio}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.subEnrichment}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.written}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.total}</td>
                        <td className="py-[2px] px-1.5 text-center font-bold text-slate-900">{res.grade}</td>
                      </tr>
                    );
                  })}
                  {/* HY Grand Total */}
                  <tr className="bg-white font-bold border-t border-[#1b4332]">
                    <td className="py-0.5 px-2 text-slate-900 border-r border-[#d1d5db] whitespace-nowrap">Term 1 Total</td>
                    <td className="py-0.5 px-1.5 border-r border-[#d1d5db]"></td>
                    <td className="py-0.5 px-1.5 border-r border-[#d1d5db]"></td>
                    <td className="py-0.5 px-1.5 border-r border-[#d1d5db]"></td>
                    <td className="py-0.5 px-1.5 border-r border-[#d1d5db]"></td>
                    <td className="py-0.5 px-1.5 text-center font-mono text-slate-900 border-r border-[#d1d5db]">
                      {activeSubjects.reduce((sum, s) => sum + computeSubjectResult(student, s, 'HY').total, 0)}
                    </td>
                    <td className="py-0.5 px-1.5 text-center font-bold text-slate-900">
                      {summary.grade}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 2: Term-2 Examination */}
            <div className="border border-[#1b4332] rounded-xs overflow-hidden">
              <div className="bg-[#1b4332] text-white px-2.5 py-0.5 font-bold text-[10.5px]">
                Term 2 Examination
              </div>
              <table className="w-full text-[10px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#f9fafb] text-slate-700 font-semibold border-b border-[#d1d5db] text-center">
                    <th className="py-0.5 px-2 text-left border-r border-[#d1d5db] whitespace-nowrap">Subject</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-14">PT</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-14">PF</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-14">SE</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-20">Written</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-16">Total</th>
                    <th className="py-0.5 px-1.5 w-14">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d1d5db]">
                  {activeSubjects.map((sub, idx) => {
                    const res = computeSubjectResult(student, sub, 'AE');
                    return (
                      <tr key={sub} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                        <td className="py-[2px] px-2 font-bold text-slate-900 border-r border-[#d1d5db] whitespace-nowrap">{getFullSubjectName(sub)}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.ptConverted}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.portfolio}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.subEnrichment}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.written}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{res.total}</td>
                        <td className="py-[2px] px-1.5 text-center font-bold text-slate-900">{res.grade}</td>
                      </tr>
                    );
                  })}
                  {/* AE Grand Total */}
                  <tr className="bg-white font-bold border-t border-[#1b4332]">
                    <td className="py-0.5 px-2 text-slate-900 border-r border-[#d1d5db] whitespace-nowrap">Term 2 Total</td>
                    <td className="py-0.5 px-1.5 border-r border-[#d1d5db]"></td>
                    <td className="py-0.5 px-1.5 border-r border-[#d1d5db]"></td>
                    <td className="py-0.5 px-1.5 border-r border-[#d1d5db]"></td>
                    <td className="py-0.5 px-1.5 border-r border-[#d1d5db]"></td>
                    <td className="py-0.5 px-1.5 text-center font-mono text-slate-900 border-r border-[#d1d5db]">
                      {activeSubjects.reduce((sum, s) => sum + computeSubjectResult(student, s, 'AE').total, 0)}
                    </td>
                    <td className="py-0.5 px-1.5 text-center font-bold text-slate-900">
                      {summary.grade}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 3: Subject-wise Final Grand Total */}
            <div className="border border-[#1b4332] rounded-xs overflow-hidden">
              <div className="bg-[#1b4332] text-white px-2.5 py-0.5 font-bold text-[10.5px]">
                Subject-wise Final Grand Total
              </div>
              <table className="w-full text-[10px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#f9fafb] text-slate-700 font-semibold border-b border-[#d1d5db] text-center">
                    <th className="py-0.5 px-2 text-left border-r border-[#d1d5db] whitespace-nowrap">Subject</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-24">Term 1 Total</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-24">Term 2 Total</th>
                    <th className="py-0.5 px-1.5 border-r border-[#d1d5db] w-28">Final Total</th>
                    <th className="py-0.5 px-1.5 w-16">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d1d5db]">
                  {activeSubjects.map((sub, idx) => {
                    const dual = computeDualExamSubjectResult(student, sub);
                    return (
                      <tr key={sub} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                        <td className="py-[2px] px-2 font-bold text-slate-900 border-r border-[#d1d5db] whitespace-nowrap">{getFullSubjectName(sub)}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{dual.hyResult.total}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{dual.aeResult.total}</td>
                        <td className="py-[2px] px-1.5 text-center font-mono font-bold text-slate-900 border-r border-[#d1d5db]">{dual.grandTotal}</td>
                        <td className="py-[2px] px-1.5 text-center font-bold text-slate-900">{dual.grandGrade}</td>
                      </tr>
                    );
                  })}
                  {/* Overall Grand Total Row */}
                  <tr className="bg-white font-bold border-t border-[#1b4332]">
                    <td className="py-0.5 px-2 text-slate-900 border-r border-[#d1d5db] whitespace-nowrap" colSpan={3}>Overall Final Total</td>
                    <td className="py-0.5 px-1.5 text-center font-mono text-slate-900 border-r border-[#d1d5db]">
                      {summary.totalObtained}
                    </td>
                    <td className="py-0.5 px-1.5 text-center font-bold text-slate-900">
                      {summary.grade}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Overall Summary Box (4 Framed Rectangles side-by-side) */}
        <div className="grid grid-cols-4 gap-2 mb-1.5">
          {/* OVERALL % */}
          <div className="border border-[#4b5563] rounded-xs text-center bg-white py-1 px-1.5">
            <div className="font-semibold text-slate-500 uppercase tracking-wider text-[8.5px] leading-tight">
              OVERALL %
            </div>
            <div className="font-bold text-slate-900 text-base sm:text-lg leading-tight mt-0.5">
              {summary.percentage}%
            </div>
          </div>

          {/* OVERALL GRADE */}
          <div className="border border-[#4b5563] rounded-xs text-center bg-white py-1 px-1.5">
            <div className="font-semibold text-slate-500 uppercase tracking-wider text-[8.5px] leading-tight">
              OVERALL GRADE
            </div>
            <div className="font-bold text-slate-900 text-base sm:text-lg leading-tight mt-0.5">
              {summary.grade}
            </div>
          </div>

          {/* ATTENDANCE % */}
          <div className="border border-[#4b5563] rounded-xs text-center bg-white py-1 px-1.5">
            <div className="font-semibold text-slate-500 uppercase tracking-wider text-[8.5px] leading-tight">
              ATTENDANCE %
            </div>
            <div className="font-bold text-slate-900 text-base sm:text-lg leading-tight mt-0.5">
              {isSinglePT ? 'N/A' : `${summary.attendancePercent}%`}
            </div>
          </div>

          {/* RESULT STATUS */}
          <div className="border border-[#4b5563] rounded-xs text-center bg-white py-1 px-1.5">
            <div className="font-semibold text-slate-500 uppercase tracking-wider text-[8.5px] leading-tight">
              RESULT
            </div>
            <div className={`font-extrabold text-sm sm:text-base leading-tight mt-0.5 ${
              summary.resultStatus === 'PASS' ? 'text-[#1b4332]' : 'text-red-600'
            }`}>
              {summary.resultStatus}
            </div>
          </div>
        </div>

        {/* 5. Remarks Box (Compact single-line) */}
        <div className="border border-[#d1d5db] rounded-xs bg-white py-1 px-2.5 mb-1.5 text-xs flex flex-wrap sm:flex-nowrap items-baseline gap-1.5">
          <span className="font-bold text-slate-900 uppercase text-[9px] shrink-0 tracking-wider">
            REMARKS:
          </span>
          <span className="text-slate-700 font-medium text-[10px]">
            {summary.motivationalComment}
          </span>
        </div>

        {/* 6. Performance Bar Graph (User requested option!) */}
        {showBarGraph && (
          <PerformanceBarGraph 
            items={chartItems} 
            examTitle={examMode === 'BOTH' ? 'Final Result' : examMode === 'HY' ? 'Term 1' : examMode === 'AE' ? 'Term 2' : examMode}
          />
        )}

        {/* 8. CBSE Grading Scale & Abbreviations (Transposed Format for A4 Single-Page Fit) */}
        {showGradingAndAbbrTable && (
          <div className="space-y-1 pt-0.5 text-slate-900 font-bold">
            {/* CBSE GRADING SCALE (Transposed Horizontal Format) */}
            <div className="border border-[#d1d5db] rounded-xs overflow-hidden bg-white">
              <div className="bg-[#f9fafb] px-2 py-0.5 font-bold text-slate-900 border-b border-[#d1d5db] text-[8.5px] uppercase tracking-wider flex items-center justify-between">
                <span>CBSE Grading Scale (8-Point Scale)</span>
                <span className="text-[7.5px] text-slate-600 font-bold">Min. Qualifying Pass Grade: D (33%)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[8px] sm:text-[8.5px] text-center font-bold">
                  <tbody>
                    <tr className="border-b border-[#d1d5db] bg-[#fafafa]">
                      <th className="py-0.5 px-1.5 font-bold text-left font-sans text-slate-900 bg-slate-50 border-r border-[#d1d5db] whitespace-nowrap w-24">
                        Marks Range
                      </th>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-mono font-bold text-slate-900 whitespace-nowrap">91 - 100</td>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-mono font-bold text-slate-900 whitespace-nowrap">81 - 90</td>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-mono font-bold text-slate-900 whitespace-nowrap">71 - 80</td>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-mono font-bold text-slate-900 whitespace-nowrap">61 - 70</td>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-mono font-bold text-slate-900 whitespace-nowrap">51 - 60</td>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-mono font-bold text-slate-900 whitespace-nowrap">41 - 50</td>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-mono font-bold text-slate-900 whitespace-nowrap">33 - 40</td>
                      <td className="py-0.5 px-1 font-mono font-bold text-slate-900 whitespace-nowrap">0 - 32</td>
                    </tr>
                    <tr className="font-bold">
                      <th className="py-0.5 px-1.5 text-left font-sans text-slate-900 bg-slate-50 border-r border-[#d1d5db] whitespace-nowrap font-bold">
                        Grade
                      </th>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-extrabold text-[#1b4332] bg-emerald-50/40">A1</td>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-extrabold text-[#2d6a4f] bg-emerald-50/40">A2</td>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-extrabold text-teal-800 bg-teal-50/30">B1</td>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-extrabold text-teal-700 bg-teal-50/30">B2</td>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-extrabold text-amber-800 bg-amber-50/30">C1</td>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-extrabold text-amber-700 bg-amber-50/30">C2</td>
                      <td className="py-0.5 px-1 border-r border-[#d1d5db] font-extrabold text-slate-900">D</td>
                      <td className="py-0.5 px-1 font-extrabold text-red-600 bg-red-50/30">E (Needs Imp.)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ABBREVIATIONS (Transposed Horizontal Format) */}
            <div className="border border-[#d1d5db] rounded-xs overflow-hidden bg-white">
              <div className="bg-[#f9fafb] px-2 py-0.5 font-bold text-slate-900 border-b border-[#d1d5db] text-[8.5px] uppercase tracking-wider">
                Abbreviations
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[8px] sm:text-[8.5px] text-center font-bold">
                  <tbody>
                    <tr className="border-b border-[#d1d5db] bg-[#fafafa]">
                      <th className="py-0.5 px-1.5 font-bold text-left font-sans text-slate-900 bg-slate-50 border-r border-[#d1d5db] whitespace-nowrap w-24">
                        Abbreviation
                      </th>
                      <td className="py-0.5 px-1.5 border-r border-[#d1d5db] font-mono font-bold text-[#1b4332]">PT</td>
                      <td className="py-0.5 px-1.5 border-r border-[#d1d5db] font-mono font-bold text-[#1b4332]">PF</td>
                      <td className="py-0.5 px-1.5 border-r border-[#d1d5db] font-mono font-bold text-[#1b4332]">SE</td>
                      <td className="py-0.5 px-1.5 border-r border-[#d1d5db] font-mono font-bold text-[#1b4332]">WRT</td>
                      <td className="py-0.5 px-1.5 font-mono font-bold text-red-600">AB</td>
                    </tr>
                    <tr className="text-slate-900 font-bold">
                      <th className="py-0.5 px-1.5 text-left font-sans text-slate-900 bg-slate-50 border-r border-[#d1d5db] whitespace-nowrap font-bold">
                        Description
                      </th>
                      <td className="py-0.5 px-1.5 border-r border-[#d1d5db] whitespace-nowrap font-bold text-slate-900">Periodic Test</td>
                      <td className="py-0.5 px-1.5 border-r border-[#d1d5db] whitespace-nowrap font-bold text-slate-900">Portfolio</td>
                      <td className="py-0.5 px-1.5 border-r border-[#d1d5db] whitespace-nowrap font-bold text-slate-900">Subject Enrichment</td>
                      <td className="py-0.5 px-1.5 border-r border-[#d1d5db] whitespace-nowrap font-bold text-slate-900">Written Examination</td>
                      <td className="py-0.5 px-1.5 whitespace-nowrap font-bold text-red-600">Absent</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 9. Official Signatures Block (Restored with Uploaded Signatures) */}
        <div className="pt-2 border-t border-slate-300 mt-2 grid grid-cols-3 gap-2 sm:gap-4 text-center text-[8.5px] sm:text-[9.5px]">
          {/* Class Teacher Signature */}
          <div className="flex flex-col justify-end items-center">
            <div className="h-9 w-full flex items-end justify-center pb-0.5 border-b border-dashed border-slate-400">
              <span className="text-[9.5px] font-sans font-medium text-slate-400 italic">Signature</span>
            </div>
            <span className="font-bold text-slate-800 mt-1 uppercase tracking-wider text-[8px] sm:text-[9px]">
              Class Teacher
            </span>
          </div>

          {/* Exam Controller Signature */}
          <div className="flex flex-col justify-end items-center">
            <div className="h-9 w-full flex items-end justify-center pb-0.5 border-b border-dashed border-slate-400 overflow-hidden">
              {signatures.controllerSignUrl ? (
                <img 
                  src={signatures.controllerSignUrl} 
                  alt="Exam Controller Signature" 
                  className="max-h-8 max-w-[125px] object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-serif italic font-semibold text-[#1b4332] text-xs">P.I.S. Exam Cell</span>
              )}
            </div>
            <span className="font-bold text-slate-800 mt-1 uppercase tracking-wider text-[8px] sm:text-[9px]">
              Controller of Examination
            </span>
          </div>

          {/* Principal Signature */}
          <div className="flex flex-col justify-end items-center">
            <div className="h-9 w-full flex items-end justify-center pb-0.5 border-b border-dashed border-slate-400 overflow-hidden">
              {signatures.principalSignUrl ? (
                <img 
                  src={signatures.principalSignUrl} 
                  alt="Principal Signature" 
                  className="max-h-8 max-w-[125px] object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-serif italic font-semibold text-indigo-900 text-xs">Principal</span>
              )}
            </div>
            <span className="font-bold text-slate-800 mt-1 uppercase tracking-wider text-[8px] sm:text-[9px]">
              Principal / Headmaster
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
