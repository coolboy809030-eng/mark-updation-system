import React from 'react';
import { EntryType, ClassLevel, ExamType, SegmentType, TeacherAccount } from '../types';
import { SEGMENTS_BY_EXAM_TYPE } from '../data/schoolConfig';
import { getAcademicTermLabel } from '../utils/academicTerm';
import {
  RotateCcw,
  Trash2,
  Users,
  Calendar,
  BookOpen,
  Award,
  Layers,
  Sparkles,
  Info,
  UserCheck,
  AlertCircle,
  KeyRound,
  LogIn,
  LogOut,
  ShieldCheck
} from 'lucide-react';

interface ControlPanelProps {
  entryType: EntryType | '';
  onEntryTypeChange: (type: EntryType) => void;

  // Module 3C: Teacher Identity & Authentication
  teacherAccounts?: TeacherAccount[];
  selectedTeacherId: string;
  onTeacherChange: (teacherId: string) => void;
  isTeacherInactive?: boolean;
  authenticatedTeacher?: TeacherAccount | null;
  onOpenTeacherLogin?: () => void;
  onOpenTeacherChangePassword?: () => void;
  onTeacherLogout?: () => void;

  // Cascading Class Selection
  selectedClass: ClassLevel | '';
  onClassChange: (c: ClassLevel | '') => void;
  authorizedClasses: ClassLevel[];

  // Cascading Section Selection
  selectedSection: string;
  onSectionChange: (sec: string) => void;
  authorizedSections: string[];

  // Cascading Subject Selection
  selectedSubject: string;
  onSubjectChange: (s: string) => void;
  authorizedSubjects: string[];

  selectedExamType: ExamType | '';
  onExamTypeChange: (e: ExamType) => void;

  selectedSegment: SegmentType | '';
  onSegmentChange: (s: SegmentType) => void;

  attendanceType: ExamType | '';
  onAttendanceTypeChange: (a: ExamType) => void;
  attendanceDate?: string;
  onAttendanceDateChange?: (date: string) => void;
  manualAttendanceMode?: boolean;
  onToggleManualAttendanceMode?: (enabled: boolean) => void;

  totalWorkingDays: string;
  onTotalWorkingDaysChange?: (d: string) => void;

  onLoadStudents: () => void;
  onClearInputs: () => void;
  isLoading: boolean;
  hasLoadedStudents: boolean;
  isPermissionValid: boolean;
  segmentLocks?: Record<string, boolean>;
}

export const CLASS_OPTIONS: ClassLevel[] = [
  'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  entryType,
  onEntryTypeChange,
  teacherAccounts = [],
  selectedTeacherId,
  onTeacherChange,
  isTeacherInactive = false,
  authenticatedTeacher,
  onOpenTeacherLogin,
  onOpenTeacherChangePassword,
  onTeacherLogout,
  selectedClass,
  onClassChange,
  authorizedClasses,
  selectedSection,
  onSectionChange,
  authorizedSections,
  selectedSubject,
  onSubjectChange,
  authorizedSubjects,
  selectedExamType,
  onExamTypeChange,
  selectedSegment,
  onSegmentChange,
  attendanceType,
  onAttendanceTypeChange,
  attendanceDate = '',
  onAttendanceDateChange,
  manualAttendanceMode = false,
  onToggleManualAttendanceMode,
  totalWorkingDays,
  onTotalWorkingDaysChange,
  onLoadStudents,
  onClearInputs,
  onClearSheetData,
  isLoading,
  hasLoadedStudents,
  isPermissionValid,
  segmentLocks
}) => {
  const segments = selectedExamType ? SEGMENTS_BY_EXAM_TYPE[selectedExamType] || [] : [];
  
  // Filter out segments locked by Admin - Teachers will NOT see locked segments
  const availableSegments = segments.filter(seg => !segmentLocks || !segmentLocks[seg]);
  const isAttendanceLocked = Boolean(segmentLocks?.['attendance']);

  // If active selectedSegment got locked by admin, reset it
  React.useEffect(() => {
    if (selectedSegment && !availableSegments.includes(selectedSegment)) {
      onSegmentChange((availableSegments[0] as SegmentType) || '');
    }
  }, [availableSegments, selectedSegment, onSegmentChange]);

  // Selected teacher details
  const activeTeacher = React.useMemo(() => {
    if (!selectedTeacherId) return null;
    return teacherAccounts.find(t => (t.teacherId || '').trim().toUpperCase() === selectedTeacherId.trim().toUpperCase()) || null;
  }, [teacherAccounts, selectedTeacherId]);

  // Determine Max marks or constraint for current segment
  const getSegmentNotice = () => {
    if (isTeacherInactive) {
      return '⚠️ शिक्षक खाता निष्क्रिय है — अंक प्रविष्टि की अनुमति नहीं है।';
    }
    if (!selectedTeacherId) {
      return 'चरण 1: अंक प्रविष्टि शुरू करने हेतु अपना शिक्षक खाता चुनें।';
    }
    if (!selectedClass) {
      return 'चरण 2: अधिकृत कक्षा चुनें।';
    }
    if (!selectedSection) {
      return 'चरण 3: अधिकृत सेक्शन चुनें।';
    }
    if (entryType === 'marks' && !selectedSubject) {
      return 'चरण 4: अधिकृत विषय चुनें।';
    }
    if (entryType === 'attendance') {
      const days = parseInt(totalWorkingDays) || 0;
      const termName = getAcademicTermLabel(attendanceType);
      return `Attendance (${termName}): Enter present days (0 to max ${days} working days set by Admin).`;
    }
    if (selectedSegment === 'HY' || selectedSegment === 'AE') {
      const termName = getAcademicTermLabel(selectedSegment);
      return `${termName} Written Exam: Max 80 marks (PF 5 & SE 5 are auto-computed)`;
    }
    if (selectedSegment) {
      return `${selectedSegment}: Max 20 marks. Type 'A' or 'AB' for Absent.`;
    }
    return 'Select class, section, subject, and exam segment to begin.';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 transition-all">
      {/* Top Banner: Entry Type Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Task Mode
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            What would you like to update?
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2 max-w-md w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onEntryTypeChange('marks')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
              entryType === 'marks'
                ? 'bg-gradient-to-r from-[#1B4D3E] to-[#24664f] text-white border-emerald-700 shadow-md shadow-emerald-950/10 scale-[1.02]'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#D4AF37]" />
            <span>📊 Enter Marks</span>
          </button>

          <button
            type="button"
            onClick={() => !isAttendanceLocked && onEntryTypeChange('attendance')}
            disabled={isAttendanceLocked}
            title={isAttendanceLocked ? 'Attendance entry is locked by Admin' : 'Fill Attendance'}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
              isAttendanceLocked
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                : entryType === 'attendance'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-700 shadow-md shadow-amber-950/10 scale-[1.02]'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>{isAttendanceLocked ? '🔒 Attendance Locked' : '📋 Fill Attendance'}</span>
          </button>
        </div>
      </div>

      {/* Module 3C: Teacher Identity Selection & Authentication Bar */}
      <div className="mb-4 pb-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-700" />
            <span>शिक्षक पहचान व प्रमाणीकरण (Teacher Identity & Login) *</span>
          </label>
          <div className="flex items-center gap-2">
            {authenticatedTeacher ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>लॉगिन सत्यापित (Logged in)</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-medium">
                प्रमाणीकरण: Teacher ID + Password → Authorized Classes
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <select
              value={selectedTeacherId}
              onChange={(e) => onTeacherChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all cursor-pointer"
            >
              <option value="">-- शिक्षक खाता चुनें (Select Teacher Account) --</option>
              {teacherAccounts.map((acc, idx) => (
                <option key={`${acc.id || acc.teacherId}_${idx}`} value={acc.teacherId}>
                  {acc.teacherId} — {acc.teacherName} {acc.active ? '' : '⚠️ [Inactive]'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {activeTeacher ? (
              <div
                className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                  activeTeacher.active
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-mono font-bold">{activeTeacher.teacherId}</span>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  {authenticatedTeacher?.teacherId === activeTeacher.teacherId ? (
                    <>
                      <button
                        type="button"
                        onClick={onOpenTeacherChangePassword}
                        className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="पासवर्ड बदलें"
                      >
                        <KeyRound className="w-2.5 h-2.5" />
                        <span>पासवर्ड</span>
                      </button>
                      <button
                        type="button"
                        onClick={onTeacherLogout}
                        className="p-1 rounded-md bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="लॉगआउट करें"
                      >
                        <LogOut className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenTeacherLogin}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>लॉगिन</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenTeacherLogin}
                className="w-full px-3 py-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-xs text-emerald-800 text-center font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-700" />
                <span>शिक्षक लॉगिन करें (Login)</span>
              </button>
            )}
          </div>
        </div>

        {/* Inactive Account Alert */}
        {isTeacherInactive && (
          <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>खाता निष्क्रिय है (Account Inactive):</strong> शिक्षक खाता [{selectedTeacherId}] वर्तमान में निष्क्रिय है। अंक प्रविष्टि की अनुमति नहीं है।
            </span>
          </div>
        )}

        {/* No Classes Authorized Alert */}
        {selectedTeacherId && !isTeacherInactive && authorizedClasses.length === 0 && (
          <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>कोई कक्षा अधिकृत नहीं (No Authorized Classes):</strong> शिक्षक [{selectedTeacherId}] को कोई कक्षा आवंटित नहीं है। कृपया व्यवस्थापक से संपर्क करें।
            </span>
          </div>
        )}
      </div>

      {/* Row Controls based on Mode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Class Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>Class *</span>
            </label>
            {selectedTeacherId && !isTeacherInactive && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {authorizedClasses.length} Allowed
              </span>
            )}
          </div>
          <select
            value={selectedClass}
            onChange={(e) => onClassChange(e.target.value as ClassLevel)}
            disabled={!selectedTeacherId || isTeacherInactive || authorizedClasses.length === 0}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {!selectedTeacherId
                ? '-- Select Teacher First --'
                : isTeacherInactive
                ? '-- Teacher Inactive --'
                : authorizedClasses.length === 0
                ? '-- No Authorized Classes --'
                : '-- Select Class --'}
            </option>
            {authorizedClasses.map((c) => (
              <option key={c} value={c}>
                {c.startsWith('Nursery') || c.startsWith('L') || c.startsWith('U') ? c : `Class ${c}`}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Section Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-700" />
              <span>Section *</span>
            </label>
            {selectedClass && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {authorizedSections.length} Allowed
              </span>
            )}
          </div>
          <select
            value={selectedSection}
            onChange={(e) => onSectionChange(e.target.value)}
            disabled={!selectedClass || authorizedSections.length === 0}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {!selectedClass
                ? '-- Select Class First --'
                : authorizedSections.length === 0
                ? '-- No Authorized Sections --'
                : '-- Select Section --'}
            </option>
            {authorizedSections.map((sec) => (
              <option key={sec} value={sec}>
                Section {sec}
              </option>
            ))}
          </select>
        </div>

        {/* MARKS MODE CONTROLS */}
        {entryType === 'marks' && (
          <>
            {/* 3. Subject */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Subject *</span>
                </label>
                {selectedSection && (
                  <span className="text-[10px] font-bold text-[#1b4332] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {authorizedSubjects.length} Allowed
                  </span>
                )}
              </div>
              <select
                value={selectedSubject}
                onChange={(e) => onSubjectChange(e.target.value)}
                disabled={!selectedSection || authorizedSubjects.length === 0}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedSection
                    ? '-- Select Section First --'
                    : authorizedSubjects.length === 0
                    ? '-- No Authorized Subjects --'
                    : '-- Select Authorized Subject --'}
                </option>
                {authorizedSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
              {selectedSection && authorizedSubjects.length === 0 && (
                <p className="text-[10px] text-amber-700 mt-1 font-semibold">
                  इस सेक्शन हेतु शिक्षक के लिए कोई विषय अधिकृत नहीं है।
                </p>
              )}
            </div>

            {/* 4. Exam Term & Segment */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-700" />
                <span>Term & Segment</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={selectedExamType}
                  onChange={(e) => onExamTypeChange(e.target.value as ExamType)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all"
                >
                  <option value="HY">Term 1</option>
                  <option value="AN">Term 2</option>
                </select>

                <select
                  value={selectedSegment}
                  onChange={(e) => onSegmentChange(e.target.value as SegmentType)}
                  disabled={!selectedExamType || availableSegments.length === 0}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {availableSegments.length === 0 ? 'Locked' : '-- Segment --'}
                  </option>
                  {availableSegments.map((seg) => (
                    <option key={seg} value={seg}>
                      {seg}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* ATTENDANCE MODE CONTROLS */}
        {entryType === 'attendance' && (
          <>
            {/* 3. Attendance Term */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Attendance Term</span>
              </label>
              <select
                value={attendanceType}
                onChange={(e) => onAttendanceTypeChange(e.target.value as ExamType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-all"
              >
                <option value="">-- Select Term --</option>
                <option value="HY">Term 1 Attendance</option>
                <option value="AN">Term 2 Attendance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Attendance Date</span>
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={e => onAttendanceDateChange?.(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#1B4D3E]" />
                <span>Attendance Mode</span>
              </label>
              <button
                type="button"
                onClick={() => onToggleManualAttendanceMode?.(!manualAttendanceMode)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  manualAttendanceMode
                    ? 'bg-[#1B4D3E] text-white border-[#1B4D3E] shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>{manualAttendanceMode ? '✅ Manual Total Attendance ON' : '🗓️ Daily Present/Absent'}</span>
              </button>
            </div>

            {/* 4. Total Working Days (Fixed by Admin in Result Generator) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#1B4D3E]" />
                <span>Total Working Days</span>
              </label>
              <div className="w-full bg-emerald-50/80 border border-emerald-300/80 rounded-xl px-3 py-2 text-sm flex items-center justify-between shadow-2xs">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono font-black text-emerald-950 text-base">
                    {totalWorkingDays || (attendanceType === 'AN' ? 115 : 110)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-800">
                    Days ({attendanceType === 'AN' ? 'Term 2' : 'Term 1'})
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-700 text-white px-2 py-0.5 rounded-md">
                  Admin Fixed
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons & Rule Strip */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Dynamic rule / notice helper */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
          <Info className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{getSegmentNotice()}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5 justify-end">
          {hasLoadedStudents && (
            <button
              type="button"
              onClick={onClearInputs}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
              title="Clear current input fields"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Inputs</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLoadStudents}
            disabled={isLoading || !entryType || !isPermissionValid}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#1B4D3E] to-[#24664f] hover:from-[#163f33] hover:to-[#1d5340] text-white shadow-md shadow-emerald-950/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Loading Students...</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 text-[#D4AF37]" />
                <span>LOAD STUDENTS</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
