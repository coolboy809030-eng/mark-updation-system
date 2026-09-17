import React, { useRef, useState } from 'react';
import { FullStudentExamRecord, ExamScheduleItem } from '../../types/resultTypes';
import { ClassLevel } from '../../types';
import { SCHOOL_NAME, SCHOOL_SUBTITLE, ACADEMIC_SESSION, SUBJECTS_BY_CLASS } from '../../data/schoolConfig';
import { SCHOOL_LOGO_BASE64 } from '../../data/logoData';
import { getFullSubjectName } from '../../utils/resultCalculator';
import { Download, UserCheck, Calendar, Clock, Camera, CheckCircle2, Image as ImageIcon, PenTool } from 'lucide-react';
import { exportAdmitCardToPdf } from '../../utils/pdfExport';
import { getStoredSignatures, SchoolSignatures } from '../../utils/signatureStorage';
import { OfficialSignaturesModal } from './OfficialSignaturesModal';
import { getStudentURN } from '../../utils/studentIdentity';
import { formatPhotoUrl, getStudentPhotoUrl } from '../../utils/photoMapping';
import { getStudentEvaluationCurriculum } from '../../utils/subjectCurriculum';

interface AdmitCardProps {
  student: FullStudentExamRecord;
  schedule: ExamScheduleItem[];
  examTitle?: string;
  hideControls?: boolean; // For batch print mode
  onUpdatePhoto?: (identifier: string, newPhotoUrl: string) => void;
  allottedSubjects?: string[];
  photoRoster?: FullStudentExamRecord[];
}

export { formatPhotoUrl } from '../../utils/photoMapping';

// Helper to determine the student's opted optional subject
export function getStudentOptedSubject(student: FullStudentExamRecord): string {
  if (student.optionalSubject && student.optionalSubject.trim()) {
    const raw = student.optionalSubject.trim();
    if (raw.toLowerCase() === 'sanskrit') return 'Sanskrit';
    if (raw.toLowerCase() === 'urdu') return 'Urdu';
    return raw;
  }
  const marks = student.rawMarks || {};
  const directOpted = (
    (student as any).optional_subject || 
    (student as any).optional || 
    (marks['Optional Subject'] as string) || 
    (marks['2nd Language'] as string) ||
    (marks['Optional'] as string) ||
    ''
  ).trim();

  if (directOpted) {
    if (directOpted.toLowerCase() === 'sanskrit') return 'Sanskrit';
    if (directOpted.toLowerCase() === 'urdu') return 'Urdu';
    return directOpted;
  }

  const hasSanskrit = Object.keys(marks).some(k => {
    const l = k.toLowerCase();
    return (l.startsWith('sanskrit') || l.includes('sanskrit')) && marks[k] !== undefined && marks[k] !== null && String(marks[k]).trim() !== '';
  });
  const hasUrdu = Object.keys(marks).some(k => {
    const l = k.toLowerCase();
    return (l.startsWith('urdu') || l.includes('urdu')) && marks[k] !== undefined && marks[k] !== null && String(marks[k]).trim() !== '';
  });

  if (hasSanskrit && !hasUrdu) return 'Sanskrit';
  if (hasUrdu && !hasSanskrit) return 'Urdu';

  if (student.name && student.name.match(/Kumar|Singh|Sharma|Raj|Prasad|Verma|Roy|Pandey|Gupta|Paswan|Sinha|Thakur|Ray|Anand/i)) {
    return 'Sanskrit';
  }
  return 'Urdu';
}

export const AdmitCard: React.FC<AdmitCardProps> = ({
  student,
  schedule,
  examTitle = 'Term 2 Examination',
  hideControls = false,
  onUpdatePhoto,
  allottedSubjects,
  photoRoster = []
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
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
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [tempPhotoUrl, setTempPhotoUrl] = useState(student.photoUrl || '');

  // Determine student's opted optional subject (e.g. Urdu vs Sanskrit)
  const studentOptedSubject = React.useMemo(() => {
    return getStudentOptedSubject(student);
  }, [student]);

  // Combine allotted subjects via Canonical Student Evaluation Roster
  // Guarantees that class curriculum (e.g. 5 subjects) is never accidentally reduced to 4,
  // and handles optional subject elective rules strictly without demographic guessing.
  const studentSchedule = React.useMemo(() => {
    // 1. Allotted subjects for this student's class (from Exam Authority control or default)
    const classAllotted = (allottedSubjects && allottedSubjects.length > 0)
      ? allottedSubjects
      : SUBJECTS_BY_CLASS[student.studentClass as ClassLevel] || [];

    // 2. Canonical evaluation subjects for this student
    const { subjects: studentSubs } = getStudentEvaluationCurriculum(
      student,
      classAllotted,
      student.studentClass
    );

    // 4. Map to timetable schedule items from schedule state (allotment system date & time)
    const scheduleMap = new Map<string, ExamScheduleItem>();
    (schedule || []).forEach(item => {
      scheduleMap.set(item.subject.toLowerCase().trim(), item);
    });

    const findScheduleItem = (subName: string): ExamScheduleItem | undefined => {
      const subKey = subName.toLowerCase().trim();

      // 1. Exact match in schedule timetable
      if (scheduleMap.has(subKey)) {
        return scheduleMap.get(subKey);
      }

      // 2. Optional subject special resolution (Urdu, Sanskrit, or this student's opted subject)
      const isSubUrdu = subKey.includes('urdu');
      const isSubSanskrit = subKey.includes('sanskrit');
      const isOpted = subKey === studentOptedSubject.toLowerCase().trim();

      if (isSubUrdu || isSubSanskrit || isOpted) {
        // Look for combined or generic optional timetable slot (e.g. 'Urdu / Sanskrit')
        for (const [key, item] of scheduleMap.entries()) {
          if (isSubUrdu && (key.includes('urdu') || key.includes('2nd lang') || key.includes('optional'))) {
            return item;
          }
          if (isSubSanskrit && (key.includes('sanskrit') || key.includes('2nd lang') || key.includes('optional'))) {
            return item;
          }
        }
        // If parallel language slot exists in timetable, share its date & time slot
        if (isSubUrdu && scheduleMap.has('sanskrit')) return scheduleMap.get('sanskrit');
        if (isSubSanskrit && scheduleMap.has('urdu')) return scheduleMap.get('urdu');

        // Check for generic "optional subject" or "2nd language" timetable items
        if (scheduleMap.has('optional subject')) return scheduleMap.get('optional subject');
        if (scheduleMap.has('optional')) return scheduleMap.get('optional');
        if (scheduleMap.has('2nd language')) return scheduleMap.get('2nd language');
        if (scheduleMap.has('second language')) return scheduleMap.get('second language');
      }

      // 3. Substring match fallback (e.g. 'Social Studies' vs 'Social Science')
      for (const [key, item] of scheduleMap.entries()) {
        if (key.includes(subKey) || subKey.includes(key)) {
          return item;
        }
      }

      return undefined;
    };

    return studentSubs.map(subName => {
      const matchedItem = findScheduleItem(subName);
      if (matchedItem) {
        return {
          ...matchedItem,
          subject: subName // Ensure the student's exact optional subject name is shown!
        };
      }
      return {
        subject: subName,
        date: '',
        day: '',
        time: '09:00 AM - 12:00 PM'
      };
    });
  }, [schedule, student.studentClass, studentOptedSubject, allottedSubjects]);

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      const element = cardRef.current;
      const safeName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `AdmitCard_${student.studentClass}_Roll${student.roll}_${safeName}.pdf`;
      await exportAdmitCardToPdf({
        element,
        filename
      });
    } catch (err) {
      console.error('Failed to generate Admit Card PDF', err);
      alert('Could not export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const photoMapping = getStudentPhotoUrl(student, photoRoster);
  const photoSrc = photoMapping.url;

  const handleSavePhoto = () => {
    const urn = getStudentURN(student);
    if (!urn) {
      alert(`⚠️ Cannot update photo: Student ${student.name} (Roll ${student.roll}) lacks an authoritative Column B URN.`);
      return;
    }
    if (onUpdatePhoto) {
      onUpdatePhoto(urn, tempPhotoUrl.trim());
    }
    setIsEditingPhoto(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-3">
      {/* Top Action Buttons (Hidden when printing or in batch mode) */}
      {!hideControls && (
        <div className="no-print flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#1b4332] text-white">
              Roll {String(student.roll).padStart(2, '0')}
            </span>
            <span className="text-xs font-bold text-slate-800">
              {student.name} &bull; Class {student.studentClass}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingPhoto(!isEditingPhoto)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Link / Update Student Photo URL"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600" /> Photo URL
            </button>
            <button
              type="button"
              onClick={() => setIsSignaturesModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="प्रिंसिपल और एग्जाम कंट्रोलर के हस्ताक्षर अपलोड / प्रबंधित करें"
            >
              <PenTool className="w-3.5 h-3.5 text-indigo-700" />
              <span>हस्ताक्षर</span>
              {(signatures.principalSignUrl || signatures.controllerSignUrl) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="हस्ताक्षर सक्रिय हैं"></span>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#1b4332] hover:bg-[#143326] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> {isExporting ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      )}

      {/* Optional Photo URL Input Popover */}
      {isEditingPhoto && (
        <div className="no-print bg-slate-50 border border-slate-300 rounded-xl p-3 mb-3 text-xs space-y-2">
          <div className="font-bold text-slate-800 flex items-center justify-between">
            <span>Link Student Photo (Google Drive / Web URL)</span>
            <button
              type="button"
              onClick={() => setIsEditingPhoto(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
            >
              &times;
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Paste direct image URL or Google Drive share link (Make sure Google Drive image access is set to "Anyone with the link").
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://drive.google.com/file/d/... or https://..."
              value={tempPhotoUrl}
              onChange={(e) => setTempPhotoUrl(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
            />
            <button
              type="button"
              onClick={handleSavePhoto}
              className="px-3 py-1.5 bg-[#1b4332] text-white font-bold rounded-lg hover:bg-[#143326] cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* The Printable A4 Admit Card */}
      <div
        ref={cardRef}
        id={`admit-card-${student.admNo}`}
        className="admit-card-printable bg-white rounded-sm shadow-md border-2 border-[#1b4332] relative overflow-hidden font-sans text-slate-900 print:shadow-none print:rounded-none print:border-2 print:border-[#1b4332] p-3 sm:p-4"
      >
        {/* Background Watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] select-none"
          aria-hidden="true"
        >
          <img
            src={SCHOOL_LOGO_BASE64}
            alt="School Watermark"
            className="w-72 h-72 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* 1. Official Header */}
        <div className="relative border-b-2 border-[#1b4332] pb-2.5 mb-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* School Logo */}
            <div className="w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
              <img
                src={SCHOOL_LOGO_BASE64}
                alt="School Crest"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* School Title Details */}
            <div className="flex-1 text-center px-1">
              <h1 className="text-lg sm:text-xl font-black tracking-wider text-[#1b4332] uppercase leading-tight font-serif">
                {SCHOOL_NAME}
              </h1>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                {SCHOOL_SUBTITLE}
              </p>
              <p className="text-[10px] text-slate-500">
                Recognized &amp; Following CBSE Curriculum Framework
              </p>

              {/* Admit Card Banner & Red Session Box - Centrally aligned and vertically stacked */}
              <div className="mt-1.5 flex flex-col items-center justify-center gap-1 w-full">
                <div className="inline-block bg-[#1b4332] text-white px-4 py-0.5 rounded-xs font-black text-xs sm:text-[13px] tracking-widest uppercase shadow-2xs">
                  EXAMINATION ADMIT CARD &bull; {examTitle}
                </div>
                <div className="inline-flex items-center justify-center border border-red-500 bg-red-50/80 rounded px-2.5 py-0.5 shadow-2xs">
                  <span className="text-[8px] sm:text-[8.5px] font-bold text-red-600 uppercase tracking-wider">
                    Session: <span className="font-extrabold font-mono">{ACADEMIC_SESSION.replace(/^session\s*/i, '')}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Official Crest / Validation Placeholder */}
            <div className="w-16 sm:w-18 shrink-0 hidden sm:flex flex-col items-center justify-center text-center border border-dashed border-slate-300 rounded p-1 bg-slate-50 text-[9px] text-slate-400">
              <UserCheck className="w-6 h-6 text-slate-400 mb-0.5" />
              <span>OFFICIAL</span>
            </div>
          </div>
        </div>

        {/* 2. Candidate Particulars Box */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 mb-3 bg-[#fbfdfb] border border-[#1b4332]/40 rounded-xs p-2 sm:p-2.5 text-[11px]">
          {/* Details Column (3 cols wide) */}
          <div className="md:col-span-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
            <div className="flex items-center">
              <span className="w-24 text-slate-600 font-medium">Candidate Name:</span>
              <span className="font-bold text-slate-900 uppercase text-xs">{student.name}</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-slate-600 font-medium">Roll No:</span>
              <span className="font-mono font-bold text-slate-900 bg-amber-100 text-amber-950 px-2 py-0.2 rounded border border-amber-300">
                {String(student.roll).padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center">
              <span className="w-24 text-slate-600 font-medium">Father's Name:</span>
              <span className="font-bold text-slate-900 uppercase">{student.fatherName || 'N/A'}</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-slate-600 font-medium">Class &amp; Sec:</span>
              <span className="font-bold text-[#1b4332]">Class {student.studentClass} - {student.section || 'A'}</span>
            </div>

            <div className="flex items-center">
              <span className="w-24 text-slate-600 font-medium">Mother's Name:</span>
              <span className="font-semibold text-slate-800 uppercase">{student.motherName || 'N/A'}</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-slate-600 font-medium">Adm / Reg No:</span>
              <span className="font-mono font-bold text-slate-800">{student.admNo}</span>
            </div>

            <div className="flex items-center">
              <span className="w-24 text-slate-600 font-medium">Date of Birth:</span>
              <span className="font-medium text-slate-800">{student.dob || 'N/A'}</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-slate-600 font-medium">Opt. Subject:</span>
              <span className="font-bold text-[#1b4332] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {studentOptedSubject}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-24 text-slate-600 font-medium">Exam Center:</span>
              <span className="font-medium text-slate-800 text-[10px]">Peace Int. School Campus</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-slate-600 font-medium">Candidate:</span>
              <span className="font-medium text-slate-700 text-[10px]">Regular Student</span>
            </div>
          </div>

          {/* Student Photograph Frame - Exact 1 Inch physical size (1" x 1.2" standard passport format) */}
          <div className="md:col-span-1 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-2 shrink-0">
            <div 
              style={{
                width: '1in',
                height: '1.2in',
                minWidth: '1in',
                minHeight: '1.2in',
                maxWidth: '1in',
                maxHeight: '1.2in'
              }}
              className="admit-card-photo-1in border-2 border-slate-700 bg-white rounded-xs flex flex-col items-center justify-center overflow-hidden relative shadow-2xs print:border-2 print:border-black"
            >
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt={student.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    // Fallback on broken image if Google Drive direct link encounters origin/cors issues
                    const target = e.target as HTMLImageElement;
                    if (target.src.includes('lh3.googleusercontent.com/d/')) {
                      const id = target.src.split('/d/')[1];
                      target.src = `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
                    } else if (target.src.includes('drive.google.com/thumbnail')) {
                      const idMatch = target.src.match(/[?&]id=([^&]+)/);
                      if (idMatch && idMatch[1]) {
                        target.src = `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
                      } else {
                        target.style.display = 'none';
                      }
                    } else {
                      target.style.display = 'none';
                    }
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-1">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-0.5">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[7.5px] font-bold text-slate-600 uppercase tracking-tighter leading-tight">
                    Affix Photo<br />(1" &times; 1.2")
                  </span>
                </div>
              )}
            </div>
            <span className="text-[8.5px] text-slate-600 font-bold mt-1 text-center">
              Photo (1" &times; 1.2")
            </span>
            {student.photoUrl && (
              <span className="no-print mt-0.5 text-[7.5px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                Sheet Link Active
              </span>
            )}
          </div>
        </div>

        {/* 3. Subject-wise Date Sheet / Schedule Table */}
        <div className="border border-[#1b4332] rounded-xs overflow-hidden mb-3">
          <div className="bg-[#1b4332] text-white px-2.5 py-0.5 font-bold text-[11px] flex items-center justify-between">
            <span>Subject-wise Examination Schedule &amp; Timetable</span>
            <span className="text-[9.5px] font-normal opacity-90">Please check your subject dates carefully</span>
          </div>
          <table className="w-full text-[10.5px] text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f5] text-slate-700 font-bold border-b border-[#1b4332]/30 text-center">
                <th className="py-1 px-2 text-center w-10 border-r border-[#d1d5db]">S.No</th>
                <th className="py-1 px-2 text-left border-r border-[#d1d5db]">Subject Name</th>
                <th className="py-1 px-2 border-r border-[#d1d5db] w-28">Exam Date</th>
                <th className="py-1 px-2 border-r border-[#d1d5db] w-24">Day</th>
                <th className="py-1 px-2 border-r border-[#d1d5db] w-36">Exam Timing</th>
                <th className="py-1 px-2 w-32">Invigilator Sign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d1d5db]">
              {studentSchedule.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-500 italic text-[11px]">
                    No exam dates allotted yet. Please allot dates in the Schedule Editor above.
                  </td>
                </tr>
              ) : (
                studentSchedule.map((item, idx) => {
                  return (
                    <tr key={item.subject} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                      <td className="py-1 px-2 text-center font-mono text-slate-600 border-r border-[#d1d5db]">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 font-bold text-slate-900 border-r border-[#d1d5db]">
                        {getFullSubjectName(item.subject)}
                        {(item.subject.toLowerCase() === 'urdu' ||
                          item.subject.toLowerCase() === 'sanskrit' ||
                          item.subject.toLowerCase() === studentOptedSubject.toLowerCase()) && (
                          <span className="ml-1.5 text-[9px] font-semibold text-[#1b4332] bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                            Optional (Opted)
                          </span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-center font-mono font-semibold text-slate-900 border-r border-[#d1d5db]">
                        {item.date || '—'}
                      </td>
                      <td className="py-1 px-2 text-center font-medium text-slate-700 border-r border-[#d1d5db]">
                        {item.day || '—'}
                      </td>
                      <td className="py-1 px-2 text-center font-mono text-slate-700 border-r border-[#d1d5db]">
                        {item.time || '09:00 AM - 12:00 PM'}
                      </td>
                      <td className="py-1 px-2 text-center text-slate-300">
                        &nbsp;
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Important Candidate Instructions */}
        <div className="border border-slate-300 rounded-xs p-2 bg-[#fcfcfc] mb-3 text-[9.5px] leading-relaxed text-slate-700">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1b4332]"></span>
            Important Instructions for Candidate:
          </div>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>It is mandatory to bring this Admit Card to the examination hall on all exam days.</li>
            <li>Candidates must occupy their allotted seats 15 minutes prior to the commencement of the exam.</li>
            <li>No candidate will be allowed to leave the examination room before the scheduled finishing time.</li>
            <li>Electronic gadgets, mobile phones, calculators, or unauthorized study papers are strictly forbidden.</li>
            <li>Borrowing stationery (pen, pencil, ruler, eraser) is strictly prohibited inside the examination room.</li>
          </ol>
        </div>

        {/* 5. Official Signatures Block (Restored with Uploaded Signatures) */}
        <div className="grid grid-cols-3 gap-3 pt-2.5 border-t border-slate-300 text-center text-[9px] sm:text-[9.5px]">
          {/* Candidate Signature */}
          <div className="flex flex-col justify-end items-center">
            <div className="h-8 w-full border-b border-dashed border-slate-400 flex items-end justify-center pb-0.5 text-slate-400 italic text-[8.5px]">
              {/* To be signed by student in exam hall */}
            </div>
            <span className="font-bold text-slate-800 block mt-1 uppercase text-[8px] sm:text-[8.5px]">Candidate's Signature</span>
          </div>

          {/* Exam Controller Signature */}
          <div className="flex flex-col justify-end items-center">
            <div className="h-8 w-full border-b border-dashed border-slate-400 flex items-end justify-center pb-0.5 overflow-hidden">
              {signatures.controllerSignUrl ? (
                <img 
                  src={signatures.controllerSignUrl} 
                  alt="Exam Controller Signature" 
                  className="max-h-7 max-w-[120px] object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-serif italic font-semibold text-[#1b4332] text-xs">P.I.S. Exam Cell</span>
              )}
            </div>
            <span className="font-bold text-slate-800 block mt-1 uppercase text-[8px] sm:text-[8.5px]">Controller of Exam</span>
          </div>

          {/* Principal Signature */}
          <div className="flex flex-col justify-end items-center">
            <div className="h-8 w-full border-b border-dashed border-slate-400 flex items-end justify-center pb-0.5 overflow-hidden">
              {signatures.principalSignUrl ? (
                <img 
                  src={signatures.principalSignUrl} 
                  alt="Principal Signature" 
                  className="max-h-7 max-w-[120px] object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-serif italic font-semibold text-indigo-900 text-xs">Principal</span>
              )}
            </div>
            <span className="font-bold text-slate-800 block mt-1 uppercase text-[8px] sm:text-[8.5px]">Principal / Headmaster</span>
          </div>
        </div>
      </div>

      {/* Official Signatures Modal */}
      <OfficialSignaturesModal
        isOpen={isSignaturesModalOpen}
        onClose={() => setIsSignaturesModalOpen(false)}
        onSignaturesUpdated={(newSigs) => setSignatures(newSigs)}
      />
    </div>
  );
};
