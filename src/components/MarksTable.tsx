import React, { useRef } from 'react';
import { Student, EntryType, SegmentType } from '../types';
import { detectStudentOptionalSubject } from '../utils/studentSubjectDetector';
import { getStudentURN, getIdentityDiagnostics } from '../utils/studentIdentity';
import { MarkStatus } from '../utils/marksStatus';
import { CorrectionRequest } from '../utils/correctionRequests';
import { AttendanceStatus } from '../utils/attendance';
import { getAcademicTermLabel } from '../utils/academicTerm';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  FileSpreadsheet,
  X,
  Database,
  Edit3
} from 'lucide-react';

export type MarkVisualState = 'saved' | 'draft' | 'success' | 'failed' | 'empty';

interface MarksTableProps {
  students: Student[];
  totalClassStudentsCount?: number;
  entryType: EntryType;
  selectedClass: string;
  selectedSection?: string;
  selectedSubject: string;
  selectedSegment: SegmentType | '';
  attendanceType: string;
  totalWorkingDays: string;
  attendanceDate?: string;
  manualAttendanceMode?: boolean;
  marksEntryDeadline?: string;
  teacherId?: string;
  teacherName?: string;
  approvedCorrections?: CorrectionRequest[];
  onCorrectionRequest?: (request: {
    student: Student;
    urn: string;
    oldValue: string;
    requestedValue: string;
    reason: string;
  }) => void;

  // Values map: URN or roll -> value ('20', '80', 'AB', etc.)
  values: Record<string, string>;
  savedBackendMarks?: Record<string, string>;
  markVisualStates?: Record<string, MarkVisualState>;
  markStatuses?: Record<string, MarkStatus>;
  onValueChange: (identifier: string, value: string, student?: Student, correctionId?: string) => void;

  // Pagination
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;

  // Submission
  onSubmit: () => void;
  isSubmitting: boolean;
  onExportCsv?: () => void;
}

export const MarksTable: React.FC<MarksTableProps> = ({
  students,
  totalClassStudentsCount,
  entryType,
  selectedClass,
  selectedSection,
  selectedSubject,
  selectedSegment,
  attendanceType,
  totalWorkingDays,
  attendanceDate = '',
  manualAttendanceMode = false,
  marksEntryDeadline = '',
  teacherId = '',
  approvedCorrections = [],
  onCorrectionRequest,
  values,
  savedBackendMarks = {},
  markVisualStates = {},
  markStatuses = {},
  onValueChange,
  currentPage,
  pageSize,
  onPageChange,
  onSubmit,
  isSubmitting,
  onExportCsv
}) => {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [pendingUpdate, setPendingUpdate] = React.useState<{
    student: Student;
    urn: string;
    oldValue: string;
    newValue: string;
    correctionId?: string;
  } | null>(null);
  const [correctionDraft, setCorrectionDraft] = React.useState<{
    student: Student;
    urn: string;
    oldValue: string;
    requestedValue: string;
  } | null>(null);
  const [correctionReason, setCorrectionReason] = React.useState('');

  const deadlinePassed = Boolean(marksEntryDeadline && new Date(marksEntryDeadline).getTime() < Date.now());

  // Max value constraint
  const maxAllowed = React.useMemo(() => {
    if (entryType === 'attendance') {
      return parseInt(totalWorkingDays) || 365;
    }
    if (selectedSegment === 'HY' || selectedSegment === 'AE') {
      return 80;
    }
    return 20; // PT-1, PT-2, PT-3, PT-4
  }, [entryType, totalWorkingDays, selectedSegment]);

  // Handle single input keyup & boundary enforcement (URN ONLY - No roll fallback for mutation)
  const handleInputChange = (student: Student, rawVal: string) => {
    const studentUrn = getStudentURN(student);
    if (!studentUrn) {
      alert(`⚠️ Cannot enter marks: Student (Roll ${student.roll}: ${student.name}) lacks an authoritative Column B URN. Please assign a URN first.`);
      return;
    }
    if (entryType === 'attendance') {
      if (manualAttendanceMode) {
        const numeric = rawVal.replace(/[^0-9]/g, '');
        const clean = numeric === '' ? '' : String(Math.min(Number(numeric), Number(totalWorkingDays) || 365));
        requestValueChange(student, studentUrn, clean);
        return;
      }
      const upper = rawVal.trim().toUpperCase();
      requestValueChange(student, studentUrn, upper === 'A' || upper === 'AB' || upper === 'ABS' ? 'Absent' : 'Present');
      return;
    }

    const upper = rawVal.toUpperCase();

    // Check for Absent
    if (upper === 'A' || upper === 'AB' || upper === 'ABS') {
      requestValueChange(student, studentUrn, 'AB');
      return;
    }

    // Keep only numbers
    const cleanDigits = rawVal.replace(/[^0-9]/g, '');

    if (cleanDigits === '') {
      requestValueChange(student, studentUrn, '');
      return;
    }

    const num = parseInt(cleanDigits, 10);
    if (num > maxAllowed) {
      // Revert/cap or ignore
      alert(`⚠️ Exceeds limit! Maximum allowed is ${maxAllowed}.`);
      return;
    }

    requestValueChange(student, studentUrn, num.toString());
  };

  const requestValueChange = (student: Student, urn: string, newValue: string) => {
    const oldValue = values[urn] || '';
    if (oldValue === newValue) return;

    const approvedCorrection = entryType === 'attendance'
      ? undefined
      : approvedCorrections.find(request =>
          request.urn === urn &&
          request.oldValue === oldValue &&
          request.requestedValue === newValue
        );

    if (deadlinePassed && entryType !== 'attendance') {
      const isApprovedCorrection = Boolean(approvedCorrection);

      if (!isApprovedCorrection) {
        if (oldValue) {
          setCorrectionDraft({ student, urn, oldValue, requestedValue: newValue });
          setCorrectionReason('');
        } else {
          window.alert('Marks entry deadline has passed. Please submit a correction request to the administrator.');
        }
        return;
      }
    }

    if (oldValue !== '') {
      setPendingUpdate({
        student,
        urn,
        oldValue,
        newValue,
        correctionId: approvedCorrection?.id
      });
      return;
    }

    onValueChange(urn, newValue, student);
  };

  // Keyboard navigation: Enter or ArrowDown jumps to next row
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextStudent = paginatedStudents[index + 1];
      if (nextStudent) {
        const nextUrn = getStudentURN(nextStudent);
        if (nextUrn && inputRefs.current[nextUrn]) {
          inputRefs.current[nextUrn]?.focus();
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStudent = paginatedStudents[index - 1];
      if (prevStudent) {
        const prevUrn = getStudentURN(prevStudent);
        if (prevUrn && inputRefs.current[prevUrn]) {
          inputRefs.current[prevUrn]?.focus();
        }
      }
    }
  };

  // Quick Absent toggle (URN STRICT - Never fallback to roll)
  const toggleAbsent = (student: Student) => {
    const studentUrn = getStudentURN(student);
    if (!studentUrn) {
      alert(`⚠️ Cannot modify marks: Student (Roll ${student.roll}: ${student.name}) lacks an authoritative Column B URN. Please assign a URN first.`);
      return;
    }

    const current = values[studentUrn];

    if (entryType === 'attendance') {
      requestValueChange(student, studentUrn, current === 'Absent' ? 'Present' : 'Absent');
    } else if (current === 'AB') {
    } else {
      requestValueChange(student, studentUrn, 'AB');
    }
  };

  // Pagination slice
  const totalPages = React.useMemo(() => Math.ceil(students.length / pageSize) || 1, [students.length, pageSize]);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedStudents = React.useMemo(
    () => students.slice(startIndex, startIndex + pageSize),
    [students, startIndex, pageSize]
  );

  // Identity diagnostics
  const identityDiagnostics = React.useMemo(() => getIdentityDiagnostics(students), [students]);

  // Stats calculation
  const totalCount = students.length;
  const stats = React.useMemo(() => {
    let filled = 0;
    let absent = 0;

    for (const student of students) {
      const urn = getStudentURN(student);
      if (!urn) continue;

      const val = values[urn];
      if (val !== undefined && val !== '') {
        filled += 1;
      }

      if (entryType === 'attendance' ? val === 'Absent' : val === 'AB') {
        absent += 1;
      }
    }

    return {
      filledCount: filled,
      absentCount: absent,
      pendingCount: totalCount - filled,
      percentageCompleted: totalCount > 0 ? Math.round((filled / totalCount) * 100) : 0
    };
  }, [students, values, entryType, totalCount]);

  const { filledCount, absentCount, pendingCount, percentageCompleted } = stats;

  // Title description for column
  const inputColumnTitle = React.useMemo(() => {
    if (entryType === 'attendance') {
      return manualAttendanceMode
        ? `Present Days (Max ${totalWorkingDays || 'Working Days'})`
        : `Presented Days (Max ${totalWorkingDays || 'Working Days'})`;
    }
    if (selectedSegment === 'HY' || selectedSegment === 'AE') {
      const termTitle = getAcademicTermLabel(selectedSegment);
      return `${termTitle} Written (Max 80)`;
    }
    return `${selectedSegment || 'PT'} Marks (Max 20)`;
  }, [entryType, selectedSegment, totalWorkingDays]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all">
      {/* Table Summary Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#D4AF37] text-slate-950 uppercase">
              Class {selectedClass}{selectedSection ? ` - Sec ${selectedSection}` : ''}
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {entryType === 'marks'
                ? `${selectedSubject} • ${selectedSegment === 'HY' || selectedSegment === 'AE' ? `${getAcademicTermLabel(selectedSegment)} Written` : selectedSegment}`
                : `Attendance Term • ${getAcademicTermLabel(attendanceType)}`}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mt-1">
            {entryType === 'marks' ? 'Student Marks Entry Sheet' : 'Student Attendance Entry Sheet'}
          </h3>
        </div>

        {/* Progress and Stats Pill */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
          <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
            <span className="text-slate-400">Total:</span>
            <span className="font-bold text-white">{totalCount}</span>
          </div>
          <div className="bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-400/30 flex items-center gap-2">
            <span className="text-emerald-300">{entryType === 'attendance' ? 'Present:' : 'Entered:'}</span>
            <span className="font-bold text-emerald-300">{filledCount}</span>
          </div>
          {absentCount > 0 && (
            <div className="bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-400/30 flex items-center gap-2">
              <span className="text-rose-300">Absent:</span>
              <span className="font-bold text-rose-300">{absentCount}</span>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-400/30 flex items-center gap-2">
              <span className="text-amber-300">{entryType === 'attendance' ? 'Not Marked:' : 'Pending:'}</span>
              <span className="font-bold text-amber-300">{pendingCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Completion Progress Bar */}
      <div className="w-full bg-slate-100 h-1.5">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-[#1B4D3E] transition-all duration-300"
          style={{ width: `${percentageCompleted}%` }}
        />
      </div>

      {/* Visual States Legend Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
          <span>Marks Visual Indicators:</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-1.5" title="Mark currently saved in backend Google Sheet">
            <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-600 inline-block shadow-xs" />
            <span className="font-bold text-blue-950">BLUE:</span>
            <span className="text-slate-600">Saved (Backend)</span>
          </div>
          <div className="flex items-center gap-1.5" title="Mark modified locally — pending save">
            <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500 inline-block shadow-xs" />
            <span className="font-bold text-amber-950">YELLOW:</span>
            <span className="text-slate-600">Changed / Draft</span>
          </div>
          <div className="flex items-center gap-1.5" title="Confirmed successfully saved by backend">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600 inline-block shadow-xs" />
            <span className="font-bold text-emerald-950">GREEN:</span>
            <span className="text-slate-600">Successfully Saved</span>
          </div>
        </div>
      </div>

      {deadlinePassed && entryType !== 'attendance' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 text-xs text-amber-900">
          Marks entry deadline has passed. Existing marks are locked; use a correction request for changes.
        </div>
      )}

      {/* Optional Subject Filter Active Banner */}
      {totalClassStudentsCount && totalClassStudentsCount > students.length ? (
        <div className="bg-amber-50/90 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Optional Subject Filter Active:</strong> Showing only <strong>{students.length}</strong> candidates opted for <strong>{selectedSubject}</strong> (out of {totalClassStudentsCount} total in Class {selectedClass}).
            </span>
          </div>
          <span className="text-[11px] font-semibold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md shrink-0">
            Opted Candidates Only
          </span>
        </div>
      ) : null}

      {/* Missing URN Warning Banner */}
      {identityDiagnostics.missingURNCount > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex items-center gap-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Missing Authoritative URN:</strong> {identityDiagnostics.missingURNCount} student(s) lack a Column B URN. Mark/Attendance input is strictly locked for these rows until a valid URN is assigned in Google Sheet.
          </span>
        </div>
      )}

      {/* Identity Conflict Warning Banner */}
      {identityDiagnostics.duplicateURNCount > 0 && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-6 py-2.5 flex items-center gap-2 text-xs text-rose-900">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            <strong>URN Conflict Warning:</strong> Duplicate URN ID detected for {identityDiagnostics.duplicateURNCount} record(s). Please verify Column B (Admission No.) in your Google Sheet.
          </span>
        </div>
      )}

      {/* The Student Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th className="py-3 px-4 w-20 text-center">Roll No</th>
              <th className="py-3 px-4 min-w-[180px]">Student Name</th>
              <th className="py-3 px-4 hidden sm:table-cell min-w-[150px]">Father's Name</th>
              <th className="py-3 px-4 text-center min-w-[150px]">{inputColumnTitle}</th>
              {entryType === 'attendance' && (
                <th className="py-3 px-4 text-center w-28">Attendance %</th>
              )}
              <th className="py-3 px-4 text-center w-24">Quick AB</th>
              <th className="py-3 px-4 text-center w-20">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  {totalClassStudentsCount && totalClassStudentsCount > 0 ? (
                    <>
                      <p className="font-semibold text-slate-800 text-sm">No students opted for {selectedSubject} in Class {selectedClass}.</p>
                      <p className="text-xs text-slate-500 mt-1">
                        All {totalClassStudentsCount} students in this class have opted for alternative languages or subjects.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">No students loaded yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Select class & click "Load Students" above.</p>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              paginatedStudents.map((student, index) => {
                const rollStr = String(student.roll);
                const studentUrn = getStudentURN(student);
                const currentVal = studentUrn && values[studentUrn] !== undefined ? values[studentUrn] : '';
                const isAbsent = entryType === 'attendance' ? currentVal === 'Absent' : currentVal === 'AB';
                const isFilled = currentVal !== '';
                const markStatus = studentUrn ? (markStatuses[studentUrn] || (isFilled ? 'Entered' : 'Pending')) : 'Locked';
                const attendanceStatusLabel = currentVal || 'Pending';

                // Check language exemption (Urdu vs Sanskrit)
                const isLangSubject = selectedSubject === 'Urdu' || selectedSubject === 'Sanskrit';
                const optSubject = detectStudentOptionalSubject(student);
                const isNotOpted = isLangSubject && optSubject !== selectedSubject;

                // Calculate attendance percentage if in attendance mode
                let attendancePct: number | null = null;
                const workingDaysNum = parseInt(totalWorkingDays);
                if (entryType === 'attendance' && isFilled && !isAbsent && workingDaysNum > 0) {
                  attendancePct = Math.round((parseInt(currentVal) / workingDaysNum) * 100);
                  if (attendancePct > 100) attendancePct = 100;
                }

                // Determine precise visual state:
                // Blue: Saved in backend
                // Yellow: Changed locally / Draft
                // Green: Confirmed saved to backend
                // Failed: Save failed (draft preserved)
                const visualState: MarkVisualState = (() => {
                  if (!studentUrn || !isFilled) return 'empty';

                  const explicit = markVisualStates[studentUrn];
                  if (explicit === 'failed') return 'failed';

                  const savedVal = savedBackendMarks[studentUrn];
                  const hasSaved = savedVal !== undefined && savedVal !== '';

                  if (explicit === 'success') {
                    if (hasSaved && currentVal !== savedVal) {
                      return 'draft';
                    }
                    return 'success';
                  }

                  if (explicit === 'draft') {
                    if (hasSaved && currentVal === savedVal) {
                      return 'saved';
                    }
                    return 'draft';
                  }

                  if (hasSaved && currentVal === savedVal) {
                    return 'saved';
                  }

                  return 'draft';
                })();

                // Row background styling
                const rowClass = isNotOpted
                  ? 'bg-slate-50/70 opacity-60'
                  : visualState === 'failed'
                  ? 'bg-rose-50/30 hover:bg-rose-50/50'
                  : visualState === 'draft'
                  ? 'bg-amber-50/30 hover:bg-amber-50/50'
                  : visualState === 'success'
                  ? 'bg-emerald-50/30 hover:bg-emerald-50/50'
                  : visualState === 'saved'
                  ? 'bg-blue-50/20 hover:bg-blue-50/40'
                  : isAbsent
                  ? 'bg-rose-50/40 hover:bg-rose-50/60'
                  : 'hover:bg-slate-50/80';

                // Input styling based on visual state
                let inputVisualClass = '';
                if (visualState === 'failed') {
                  inputVisualClass = 'bg-amber-50 border-2 border-rose-500 text-rose-950 font-extrabold shadow-sm ring-2 ring-rose-200';
                } else if (visualState === 'draft') {
                  inputVisualClass = 'bg-amber-50 border-2 border-amber-400 text-amber-950 font-extrabold shadow-sm ring-2 ring-amber-200/50 focus:border-amber-600 focus:ring-amber-300';
                } else if (visualState === 'success') {
                  inputVisualClass = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-950 font-extrabold shadow-sm ring-2 ring-emerald-200/50 focus:border-emerald-700 focus:ring-emerald-300';
                } else if (visualState === 'saved') {
                  inputVisualClass = 'bg-blue-50/70 border-2 border-blue-400 text-blue-950 font-extrabold shadow-sm ring-2 ring-blue-100 focus:border-blue-600 focus:ring-blue-200';
                } else if (isAbsent) {
                  inputVisualClass = 'bg-rose-100 border-rose-400 text-rose-800 font-extrabold shadow-inner';
                } else {
                  inputVisualClass = 'bg-white border-slate-300 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20';
                }

                return (
                  <tr
                    key={studentUrn ? `urn-${studentUrn}` : `roll-${student.roll}-${index}`}
                    className={`transition-colors ${rowClass}`}
                  >
                    {/* Roll No */}
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 inline-flex items-center justify-center font-mono text-xs">
                        {student.roll}
                      </span>
                    </td>

                    {/* Student Name & Unique Identifier */}
                    <td className="py-3 px-4 font-semibold text-slate-900 uppercase">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>{student.name}</span>
                          {optSubject && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              optSubject === 'Urdu' 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {optSubject}
                            </span>
                          )}
                        </div>
                        {studentUrn ? (
                          <span className="text-[10px] font-mono text-slate-500 font-normal tracking-wide">
                            URN: {studentUrn}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-amber-600 font-medium" title="Column B URN is blank in sheet">
                            ⚠️ No URN
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Father's Name */}
                    <td className="py-3 px-4 text-slate-600 uppercase text-xs hidden sm:table-cell">
                      {student.fatherName || '—'}
                    </td>

                    {/* Value Input */}
                    <td className="py-2.5 px-4 text-center">
                      {isNotOpted ? (
                        <span className="text-xs font-semibold text-slate-400 italic bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          Opted {optSubject}
                        </span>
                      ) : !studentUrn ? (
                        <div className="inline-flex items-center justify-center">
                          <input
                            type="text"
                            disabled
                            value=""
                            placeholder="Locked: No URN"
                            title={`Roll ${student.roll} (${student.name}) lacks a Column B URN. Marks cannot be saved without an authoritative URN.`}
                            className="w-28 px-3 py-2 text-center text-xs font-semibold rounded-xl border border-amber-300 bg-amber-50/80 text-amber-800 cursor-not-allowed italic"
                          />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center">
                          <input
                            ref={(el) => {
                              if (studentUrn) {
                                inputRefs.current[studentUrn] = el;
                              }
                            }}
                            type="text"
                            value={currentVal}
                            onChange={(e) => handleInputChange(student, e.target.value)}
                            readOnly={entryType === 'attendance' && !manualAttendanceMode}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            placeholder={entryType === 'attendance' ? (manualAttendanceMode ? `0-${maxAllowed}` : 'Present / Absent') : (isAbsent ? 'AB' : `0-${maxAllowed}`)}
                            className={`w-28 px-3 py-2 text-center text-sm rounded-xl border transition-all ${inputVisualClass}`}
                          />
                        </div>
                      )}
                    </td>

                    {/* Attendance % Column */}
                    {entryType === 'attendance' && (
                      <td className="py-3 px-4 text-center">
                        {entryType === 'attendance' && manualAttendanceMode ? (
                          <span className="text-xs font-bold text-emerald-600">{currentVal || '—'}/{totalWorkingDays || '—'}</span>
                        ) : entryType === 'attendance' && currentVal === 'Present' ? (
                          <span className="text-xs font-bold text-emerald-600">PRESENT</span>
                        ) : entryType === 'attendance' && currentVal === 'Absent' ? (
                          <span className="text-xs font-bold text-rose-600">ABSENT</span>
                        ) : attendancePct !== null ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              attendancePct >= 75
                                ? 'bg-emerald-100 text-emerald-800'
                                : attendancePct >= 50
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {attendancePct}%
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    )}

                    {/* Quick Absent Button */}
                    <td className="py-3 px-4 text-center">
                      {isNotOpted ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : !studentUrn ? (
                        <button
                          type="button"
                          disabled
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                          title="Disabled: Student lacks an authoritative URN"
                        >
                          AB
                        </button>
                      ) : entryType === 'attendance' ? (
                        manualAttendanceMode ? (
                          <span className="text-[11px] text-slate-400">Manual</span>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button type="button" onClick={() => requestValueChange(student, studentUrn, 'Present')} className={`px-2 py-1 text-[11px] font-bold rounded-lg border ${currentVal === 'Present' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>P</button>
                            <button type="button" onClick={() => requestValueChange(student, studentUrn, 'Absent')} className={`px-2 py-1 text-[11px] font-bold rounded-lg border ${currentVal === 'Absent' ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>A</button>
                          </div>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleAbsent(student)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                            isAbsent
                              ? visualState === 'saved'
                                ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                : visualState === 'draft'
                                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                : visualState === 'success'
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                : 'bg-rose-600 text-white border-rose-700 shadow-sm'
                              : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200'
                          }`}
                          title={isAbsent ? 'Click to remove Absent' : 'Click to mark Absent (AB)'}
                        >
                          {isAbsent ? (visualState === 'saved' ? 'AB (Saved)' : visualState === 'draft' ? 'AB (Draft)' : visualState === 'success' ? 'AB (Saved ✓)' : 'AB ✓') : 'AB'}
                        </button>
                      )}
                    </td>

                    {/* Live Status Checkmark */}
                    <td className="py-3 px-4 text-center">
                      {isNotOpted ? (
                        <span className="text-[11px] text-slate-400 font-medium">—</span>
                      ) : entryType === 'attendance' ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                          currentVal ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {currentVal ? <CheckCircle2 className="w-3 h-3" /> : '—'}
                          {attendanceStatusLabel}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${
                            visualState === 'failed'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : visualState === 'draft'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : visualState === 'success'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : visualState === 'saved'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                          title={
                            visualState === 'failed'
                              ? 'Backend save failed. Draft preserved locally.'
                              : visualState === 'draft'
                              ? 'Changed locally — not yet saved to backend.'
                              : visualState === 'success'
                              ? 'Confirmed successfully saved to backend.'
                              : visualState === 'saved'
                              ? 'Saved in backend database.'
                              : 'Pending entry'
                          }
                        >
                          {visualState === 'failed' ? (
                            <>
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>Save Failed</span>
                            </>
                          ) : visualState === 'draft' ? (
                            <>
                              <Edit3 className="w-3 h-3 text-amber-700" />
                              <span>Draft</span>
                            </>
                          ) : visualState === 'success' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Saved ✓</span>
                            </>
                          ) : visualState === 'saved' ? (
                            <>
                              <Database className="w-3 h-3 text-blue-700" />
                              <span>Saved</span>
                            </>
                          ) : (
                            <span>Pending</span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Bottom Action Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Pagination controls */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
              title="Previous Batch"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
              title="Next Batch"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-slate-400">
            ({startIndex + 1} - {Math.min(startIndex + pageSize, totalCount)} of {totalCount} students)
          </span>
        </div>

        {/* Submit to PIS Data Base Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || filledCount === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#1B4D3E] via-[#24664f] to-[#1B4D3E] hover:from-[#153e32] hover:to-[#1a4f3d] text-white shadow-lg shadow-emerald-950/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all scale-[1.01] hover:scale-[1.02] active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Submitting to PIS Data Base...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-[#D4AF37]" />
                <span>SUBMIT {filledCount} RECORD{filledCount !== 1 ? 'S' : ''} TO PIS DATA BASE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {pendingUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Confirm Mark Update</h3>
              <button type="button" onClick={() => setPendingUpdate(null)} className="p-1 text-slate-300 hover:text-white" title="Cancel">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2 text-xs text-slate-700">
              <p><strong>Student:</strong> {pendingUpdate.student.name}</p>
              <p><strong>URN:</strong> {pendingUpdate.urn}</p>
              <p><strong>Subject:</strong> {selectedSubject || 'Attendance'}</p>
              <p><strong>Segment:</strong> {selectedSegment || attendanceType}</p>
              <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-slate-200">
                <p><strong>Old Mark:</strong><br />{pendingUpdate.oldValue}</p>
                <p><strong>New Mark:</strong><br />{pendingUpdate.newValue || 'Blank'}</p>
              </div>
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingUpdate(null)} className="px-3 py-2 text-xs font-bold text-slate-600 rounded-lg border border-slate-300 bg-white">Cancel</button>
              <button type="button" onClick={() => { onValueChange(pendingUpdate.urn, pendingUpdate.newValue, pendingUpdate.student, pendingUpdate.correctionId); setPendingUpdate(null); }} className="px-3 py-2 text-xs font-bold text-white rounded-lg bg-[#1B4D3E]">Confirm Update</button>
            </div>
          </div>
        </div>
      )}

      {correctionDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Request Mark Correction</h3>
            </div>
            <div className="p-5 space-y-2 text-xs text-slate-700">
              <p><strong>Student:</strong> {correctionDraft.student.name} (Roll {correctionDraft.student.roll})</p>
              <p><strong>URN:</strong> {correctionDraft.urn}</p>
              <p><strong>Subject:</strong> {selectedSubject || 'Attendance'}</p>
              <p><strong>Segment:</strong> {selectedSegment || attendanceType}</p>
              <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-slate-200">
                <p><strong>Current:</strong><br />{correctionDraft.oldValue}</p>
                <p><strong>Requested:</strong><br />{correctionDraft.requestedValue || 'Blank'}</p>
              </div>
              <label className="block pt-2 font-semibold">Reason
                <textarea value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} className="mt-1 w-full min-h-20 rounded-lg border border-slate-300 p-2 font-normal" placeholder="Explain the correction" />
              </label>
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setCorrectionDraft(null)} className="px-3 py-2 text-xs font-bold text-slate-600 rounded-lg border border-slate-300 bg-white">Cancel</button>
              <button type="button" disabled={!correctionReason.trim() || !teacherId || !onCorrectionRequest} onClick={() => { if (correctionDraft && onCorrectionRequest) { onCorrectionRequest({ ...correctionDraft, reason: correctionReason.trim() }); setCorrectionDraft(null); } }} className="px-3 py-2 text-xs font-bold text-white rounded-lg bg-[#1B4D3E] disabled:opacity-50">Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
