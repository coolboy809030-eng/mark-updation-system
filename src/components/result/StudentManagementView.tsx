import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  FileText, 
  Award, 
  Database, 
  RefreshCw, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Download, 
  Camera, 
  Calendar, 
  Phone, 
  BookOpen, 
  ArrowUpDown,
  Filter,
  Save,
  Wrench,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { ClassLevel } from '../../types';
import { formatDisplayDate } from '../../utils/dateFormatter';
import { FullStudentExamRecord, ExamType } from '../../types/resultTypes';
import { computeStudentSummary, getStudentSubjects } from '../../utils/resultCalculator';
import { SUBJECTS_BY_CLASS } from '../../data/schoolConfig';
import { getStudentURN, normalizeURN } from '../../utils/studentIdentity';
import { getStudentPhotoUrl } from '../../utils/photoMapping';

interface StudentManagementViewProps {
  selectedClass: ClassLevel;
  onClassChange: (cls: ClassLevel) => void;
  students: FullStudentExamRecord[];
  allottedSubjects: string[];
  examMode: ExamType;
  workingDaysHY: number;
  workingDaysAE: number;
  scriptUrl: string;
  onUpdateStudent: (updatedStudent: FullStudentExamRecord) => boolean | void;
  onAddStudent: (newStudent: FullStudentExamRecord) => boolean | void;
  onDeleteStudent: (admNo: string) => void;
  onRefreshFromSheet: () => Promise<void> | void;
  onViewReportCard: (roll: number) => void;
  onViewAdmitCard: (roll: number) => void;
  onOpenTroubleshooter: () => void;
}

export const StudentManagementView: React.FC<StudentManagementViewProps> = ({
  selectedClass,
  onClassChange,
  students,
  allottedSubjects,
  examMode,
  workingDaysHY,
  workingDaysAE,
  scriptUrl,
  onUpdateStudent,
  onAddStudent,
  onDeleteStudent,
  onRefreshFromSheet,
  onViewReportCard,
  onViewAdmitCard,
  onOpenTroubleshooter
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<'ALL' | 'Urdu' | 'Sanskrit'>('ALL');
  const [filterResultStatus, setFilterResultStatus] = useState<'ALL' | 'PASS' | 'NEEDS_IMPROVEMENT'>('ALL');
  
  // Modal states
  const [editingStudent, setEditingStudent] = useState<FullStudentExamRecord | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<FullStudentExamRecord | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'biodata' | 'marks'>('biodata');

  // Form State for Editing/Adding
  const [formData, setFormData] = useState({
    roll: '',
    admNo: '',
    studentClass: selectedClass as ClassLevel,
    section: 'A',
    name: '',
    fatherName: '',
    motherName: '',
    dob: '',
    mobile: '',
    optionalSubject: 'Urdu' as 'Urdu' | 'Sanskrit',
    photoUrl: '',
    attendanceHY: '95/110',
    attendanceAE: '102/115',
    rawMarks: {} as Record<string, any>
  });

  const classesList: ClassLevel[] = [
    'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
  ];

  // Subjects applicable to this class
  const classSubjects = useMemo(() => {
    return allottedSubjects && allottedSubjects.length > 0 
      ? allottedSubjects 
      : (SUBJECTS_BY_CLASS[selectedClass] || []);
  }, [allottedSubjects, selectedClass]);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      const q = searchQuery.toLowerCase().trim();
      const stUrn = getStudentURN(st) || '';
      const matchesSearch = !q || 
        st.name.toLowerCase().includes(q) ||
        String(st.roll).includes(q) ||
        st.admNo.toLowerCase().includes(q) ||
        (stUrn && stUrn.toLowerCase().includes(q)) ||
        st.fatherName.toLowerCase().includes(q) ||
        (st.mobile && st.mobile.includes(q));

      const matchesLang = filterLanguage === 'ALL' || st.optionalSubject === filterLanguage;

      if (!matchesSearch || !matchesLang) return false;

      if (filterResultStatus !== 'ALL') {
        const activeSubs = getStudentSubjects(st, classSubjects);
        const summary = computeStudentSummary(st, activeSubs, examMode, workingDaysHY, workingDaysAE);
        const stStatus = summary.resultStatus === 'PASS' ? 'PASS' : 'NEEDS_IMPROVEMENT';
        if (stStatus !== filterResultStatus) return false;
      }

      return true;
    });
  }, [students, searchQuery, filterLanguage, filterResultStatus, classSubjects, examMode, workingDaysHY, workingDaysAE]);

  // Quick stats
  const stats = useMemo(() => {
    const total = students.length;
    const urduCount = students.filter(s => s.optionalSubject === 'Urdu').length;
    const sanskritCount = students.filter(s => s.optionalSubject === 'Sanskrit').length;
    let passCount = 0;
    let totalPct = 0;

    students.forEach(st => {
      const activeSubs = getStudentSubjects(st, classSubjects);
      const summary = computeStudentSummary(st, activeSubs, examMode, workingDaysHY, workingDaysAE);
      if (summary.resultStatus === 'PASS') passCount++;
      totalPct += summary.percentage;
    });

    const avgPercentage = total > 0 ? (totalPct / total).toFixed(1) : '0';
    return { total, urduCount, sanskritCount, passCount, avgPercentage };
  }, [students, classSubjects, examMode, workingDaysHY, workingDaysAE]);

  // Open Edit Modal for a student
  const handleOpenEdit = (st: FullStudentExamRecord) => {
    setEditingStudent(st);
    setIsAddingNew(false);
    setActiveTab('biodata');
    setStatusMessage(null);
    const canonicalUrn = getStudentURN(st) || st.admNo;
    setFormData({
      roll: String(st.roll),
      admNo: canonicalUrn,
      studentClass: (st.studentClass || selectedClass) as ClassLevel,
      section: st.section || 'A',
      name: st.name,
      fatherName: st.fatherName,
      motherName: st.motherName,
      dob: st.dob || '15/07/2014',
      mobile: st.mobile || '9835100000',
      optionalSubject: (st.optionalSubject === 'Sanskrit' ? 'Sanskrit' : 'Urdu'),
      photoUrl: st.photoUrl || '',
      attendanceHY: st.attendanceHY || '95/110',
      attendanceAE: st.attendanceAE || '102/115',
      rawMarks: { ...(st.rawMarks || {}) }
    });
  };

  // Open Add Student Modal
  const handleOpenAdd = () => {
    const nextRoll = students.length > 0 
      ? Math.max(...students.map(s => typeof s.roll === 'number' ? s.roll : parseInt(String(s.roll), 10) || 0)) + 1 
      : 1;

    setEditingStudent(null);
    setIsAddingNew(true);
    setActiveTab('biodata');
    setStatusMessage(null);
    setFormData({
      roll: String(nextRoll),
      admNo: `PIS-2025-${selectedClass}-${String(nextRoll).padStart(3, '0')}`,
      studentClass: selectedClass,
      section: 'A',
      name: '',
      fatherName: '',
      motherName: '',
      dob: '15/07/2014',
      mobile: '9835100000',
      optionalSubject: 'Urdu',
      photoUrl: '',
      attendanceHY: '95/110',
      attendanceAE: '102/115',
      rawMarks: {}
    });
  };

  // Live calculation of edited student
  const previewStudentSummary = useMemo(() => {
    if (!editingStudent && !isAddingNew) return null;
    const tempStudent: FullStudentExamRecord = {
      roll: parseInt(formData.roll, 10) || 1,
      admNo: formData.admNo.trim() || 'TMP',
      studentClass: formData.studentClass,
      section: formData.section.trim() || 'A',
      name: formData.name.trim() || 'Student',
      fatherName: formData.fatherName.trim() || 'GUARDIAN',
      motherName: formData.motherName.trim() || 'MOTHER',
      dob: formData.dob.trim(),
      mobile: formData.mobile.trim(),
      optionalSubject: formData.optionalSubject,
      photoUrl: formData.photoUrl.trim(),
      attendanceHY: formData.attendanceHY,
      attendanceAE: formData.attendanceAE,
      rawMarks: formData.rawMarks
    };
    const activeSubs = getStudentSubjects(tempStudent, classSubjects);
    return computeStudentSummary(tempStudent, activeSubs, examMode, workingDaysHY, workingDaysAE);
  }, [formData, editingStudent, isAddingNew, selectedClass, classSubjects, examMode, workingDaysHY, workingDaysAE]);

  // Handle Save
  const handleSaveStudent = async (syncToSheet = false) => {
    if (!formData.name.trim()) {
      setStatusMessage({ text: 'Student Name is required!', type: 'error' });
      return;
    }

    const normalizedUrn = normalizeURN(formData.admNo);
    if (!normalizedUrn) {
      setStatusMessage({ text: 'Authoritative URN (Column B / Admission No) is required. Cannot save student without a valid URN.', type: 'error' });
      return;
    }

    if (editingStudent && normalizedUrn !== getStudentURN(editingStudent)) {
      setStatusMessage({ text: 'Student URN is permanent and cannot be changed during class or section movement.', type: 'error' });
      return;
    }

    if (formData.photoUrl.trim() && getStudentPhotoUrl({ urn: normalizedUrn, photoUrl: formData.photoUrl.trim() }).diagnostic === 'PHOTO_URL_INVALID') {
      setStatusMessage({ text: 'Photo URL is invalid. Use a direct image URL, Google Drive link, or Drive file ID.', type: 'error' });
      return;
    }

    const rollNum = parseInt(formData.roll, 10) || 1;
    const record: FullStudentExamRecord = {
      urn: normalizedUrn,
      roll: rollNum,
      admNo: normalizedUrn,
      studentClass: formData.studentClass,
      section: formData.section.trim() || 'A',
      name: formData.name.trim(),
      fatherName: formData.fatherName.trim() || 'GUARDIAN',
      motherName: formData.motherName.trim() || 'MOTHER',
      dob: formData.dob.trim() || '15/07/2014',
      mobile: formData.mobile.trim() || '9835100000',
      optionalSubject: formData.optionalSubject,
      photoUrl: formData.photoUrl.trim(),
      attendanceHY: formData.attendanceHY.trim() || '95/110',
      attendanceAE: formData.attendanceAE.trim() || '102/115',
      rawMarks: formData.rawMarks
    };

    if (isAddingNew) {
      if (onAddStudent(record) === false) {
        setStatusMessage({ text: 'Cannot save: this authoritative URN already belongs to another student.', type: 'error' });
        return;
      }
    } else {
      if (onUpdateStudent(record) === false) {
        setStatusMessage({ text: 'Cannot save: this authoritative URN conflicts with another student record.', type: 'error' });
        return;
      }
    }

    // If requested, sync to Google Sheet
    if (syncToSheet && scriptUrl && !scriptUrl.includes('PASTE_YOUR')) {
      setIsSyncing(true);
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateStudentDetails',
            class: record.studentClass,
            student: record
          })
        });
        setStatusMessage({ text: `Saved and queued sync to Google Sheet for ${record.name}!`, type: 'success' });
      } catch (err: any) {
        setStatusMessage({ text: `Saved locally. Google Sheet sync failed: ${err.message}`, type: 'info' });
      } finally {
        setIsSyncing(false);
      }
    } else {
      setStatusMessage({ text: `Successfully saved ${record.name} (Roll #${record.roll})!`, type: 'success' });
    }

    setTimeout(() => {
      setEditingStudent(null);
      setIsAddingNew(false);
    }, 800);
  };

  // Confirm delete student
  const handleConfirmDelete = async () => {
    if (!deletingStudent) return;
    const studentUrn = getStudentURN(deletingStudent);
    if (!studentUrn) {
      setStatusMessage({ text: `Cannot delete: ${deletingStudent.name} (Roll ${deletingStudent.roll}) lacks an authoritative Column B URN.`, type: 'error' });
      setDeletingStudent(null);
      return;
    }
    const name = deletingStudent.name;

    onDeleteStudent(studentUrn);

    // Optional delete action to Google Sheet
    if (scriptUrl && !scriptUrl.includes('PASTE_YOUR')) {
      try {
        fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'deleteStudent',
            class: selectedClass,
            urn: studentUrn,
            admNo: studentUrn
          })
        }).catch(() => {});
      } catch {}
    }

    setDeletingStudent(null);
    setStatusMessage({ text: `Deleted ${name} (URN: ${studentUrn}) from Class ${selectedClass}.`, type: 'info' });
  };

  // Copy TSV data to paste into Google Sheet or Excel
  const handleCopyTSV = () => {
    const headers = ['Roll', 'Adm No', 'Name', 'Father Name', 'Mother Name', 'DOB', 'Mobile', '2nd Language', 'Attendance-HY', 'Attendance-AE', 'Percentage', 'Grade'];
    const rows = students.map(st => {
      const activeSubs = getStudentSubjects(st, classSubjects);
      const summary = computeStudentSummary(st, activeSubs, examMode, workingDaysHY, workingDaysAE);
      return [
        st.roll,
        st.admNo,
        st.name,
        st.fatherName,
        st.motherName,
        st.dob,
        st.mobile,
        st.optionalSubject,
        st.attendanceHY,
        st.attendanceAE,
        summary.percentage + '%',
        summary.grade
      ].join('\t');
    });

    const tsv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsv);
    setStatusMessage({ text: 'Copied class data to clipboard (TSV format, ready for Google Sheets)!', type: 'success' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* 1. Header Banner & Class Selector */}
      <div className="bg-gradient-to-r from-[#1B4D3E] via-[#143B2F] to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-emerald-900/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] bg-amber-400 text-emerald-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Student Records &amp; Results Hub
            </span>
            <span className="text-[11px] text-emerald-200 font-medium">
              Peace International School
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-300" />
            <span>Student Management (विद्यार्थी प्रबंधन)</span>
          </h2>
          <p className="text-xs text-emerald-100/80 mt-0.5">
            विद्यार्थियों का नाम, रोल नंबर, विवरण, अंक (रिजल्ट) बदलें, अपडेट करें, नया जोड़ें या हटाएं।
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenTroubleshooter}
            className="px-3 py-2 bg-emerald-900/80 hover:bg-emerald-800 text-amber-200 border border-emerald-600/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Google Sheet URL Connection Diagnostic"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-300" />
            <span>Sheet Diagnostics</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              setIsSyncing(true);
              try {
                await onRefreshFromSheet();
                setStatusMessage({ text: 'Synced latest records from Google Sheet / cache!', type: 'success' });
              } finally {
                setIsSyncing(false);
              }
            }}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : 'text-amber-300'}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync with Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-emerald-950" />
            <span>+ Add New Student</span>
          </button>
        </div>
      </div>

      {/* Status Toast */}
      {statusMessage && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : statusMessage.type === 'error'
            ? 'bg-rose-50 text-rose-900 border border-rose-200'
            : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Class Selector Bar & Class Metrics */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-4">
        
        {/* Class Selection Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">Select Class:</span>
            {classesList.map(cls => (
              <button
                key={cls}
                type="button"
                onClick={() => onClassChange(cls)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  selectedClass === cls
                    ? 'bg-[#1B4D3E] text-white shadow-xs scale-105'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {cls === 'Nursery' || cls === 'LKG' || cls === 'UKG' ? cls : `Class ${cls}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
              title="Copy table to paste into Excel or Google Sheets"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copy TSV</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 font-bold block">Total Enrolled</span>
            <span className="text-lg font-black text-slate-900">{stats.total} Students</span>
          </div>
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/70">
            <span className="text-[11px] text-emerald-800 font-bold block">Language Distribution</span>
            <span className="text-xs font-bold text-emerald-950">
              Urdu: <strong>{stats.urduCount}</strong> &bull; Sanskrit: <strong>{stats.sanskritCount}</strong>
            </span>
          </div>
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/70">
            <span className="text-[11px] text-amber-800 font-bold block">Average Performance</span>
            <span className="text-lg font-black text-amber-950">{stats.avgPercentage}%</span>
          </div>
          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200/70">
            <span className="text-[11px] text-indigo-800 font-bold block">Passed Students</span>
            <span className="text-lg font-black text-indigo-950">{stats.passCount} / {stats.total}</span>
          </div>
        </div>

        {/* 3. Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, roll number, admission no, father's name, or mobile..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Language Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">Language:</span>
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value as any)}
              className="text-xs font-semibold bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">All Languages</option>
              <option value="Urdu">Urdu Only</option>
              <option value="Sanskrit">Sanskrit Only</option>
            </select>
          </div>

          {/* Result Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">Status:</span>
            <select
              value={filterResultStatus}
              onChange={(e) => setFilterResultStatus(e.target.value as any)}
              className="text-xs font-semibold bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">All Results</option>
              <option value="PASS">Pass Only</option>
              <option value="NEEDS_IMPROVEMENT">Needs Improvement</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Student Roster Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Students Roster &bull; Class {selectedClass}
            </span>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              {filteredStudents.length} of {students.length} Showing
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-14 text-center">Roll</th>
                <th className="py-3 px-3">Student Name &amp; Adm No</th>
                <th className="py-3 px-3">Parents Info</th>
                <th className="py-3 px-3">DOB / Mobile</th>
                <th className="py-3 px-3">2nd Lang</th>
                <th className="py-3 px-3 text-center">Exam Result</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm">No students found matching the criteria.</p>
                    <p className="text-xs text-slate-500 mt-1">Try resetting your search query or class filter.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const activeSubs = getStudentSubjects(st, classSubjects);
                  const summary = computeStudentSummary(st, activeSubs, examMode, workingDaysHY, workingDaysAE);

                  return (
                    <tr key={st.admNo} className="hover:bg-slate-50/80 transition-colors group">
                      
                      {/* Roll & Photo Avatar */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center border border-slate-300">
                            {st.roll}
                          </span>
                          {getStudentPhotoUrl(st, students).url && (
                            <img 
                              src={getStudentPhotoUrl(st, students).url} 
                              alt="" 
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-full object-cover border border-slate-300"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                            />
                          )}
                        </div>
                      </td>

                      {/* Name & Admission No */}
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{st.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                          {getStudentURN(st) ? (
                            <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px] font-bold">
                              URN: {getStudentURN(st)}
                            </span>
                          ) : (
                            <span className="text-slate-400">Adm: {st.admNo}</span>
                          )}
                        </div>
                      </td>

                      {/* Parents */}
                      <td className="py-3 px-3 text-slate-700">
                        <div className="font-semibold text-xs">F: {st.fatherName || 'GUARDIAN'}</div>
                        <div className="text-[11px] text-slate-500">M: {st.motherName || 'MOTHER'}</div>
                      </td>

                      {/* DOB & Mobile */}
                      <td className="py-3 px-3 text-slate-600">
                        <div className="flex items-center gap-1 text-[11px] font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDisplayDate(st.dob) || '15-Jul-2014'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{st.mobile || '9835100000'}</span>
                        </div>
                      </td>

                      {/* Language */}
                      <td className="py-3 px-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          st.optionalSubject === 'Sanskrit'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}>
                          {st.optionalSubject || 'Urdu'}
                        </span>
                      </td>

                      {/* Result */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                            summary.resultStatus === 'PASS' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {summary.resultStatus} ({summary.percentage}%)
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold mt-0.5">
                            Grade {summary.grade} &bull; {summary.totalObtained}/{summary.maxMarks}
                          </span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Edit Details & Marks */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(st)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                            title="Edit Student Biodata, Photo & All Subject Marks"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* View Report Card */}
                          <button
                            type="button"
                            onClick={() => onViewReportCard(st.roll)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 text-xs font-bold transition-colors cursor-pointer"
                            title="View / Download Report Card"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* View Admit Card */}
                          <button
                            type="button"
                            onClick={() => onViewAdmitCard(st.roll)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                            title="View / Download Admit Card"
                          >
                            <Award className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Student */}
                          <button
                            type="button"
                            onClick={() => setDeletingStudent(st)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                            title="Delete Student from this class"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Comprehensive Student Edit & Marks Update Modal */}
      {(editingStudent || isAddingNew) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1B4D3E] to-slate-900 text-white p-4 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  {isAddingNew ? <UserPlus className="w-5 h-5 text-amber-300" /> : <Edit3 className="w-5 h-5 text-amber-300" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isAddingNew ? `Add New Student to Class ${selectedClass}` : `Edit Student: ${editingStudent?.name} (Roll #${editingStudent?.roll})`}
                  </h3>
                  <p className="text-xs text-emerald-200">
                    छात्र की व्यक्तिगत जानकारी, भाषा, फोटो व परीक्षा अंक (रिजल्ट) अपडेट करें
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingStudent(null);
                  setIsAddingNew(false);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Result Calculation Ribbon */}
            {previewStudentSummary && (
              <div className="bg-emerald-950 text-white px-6 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900/50 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span className="font-bold text-slate-200">Live Result Preview:</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                    previewStudentSummary.resultStatus === 'PASS' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {previewStudentSummary.resultStatus}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span>Total: <strong>{previewStudentSummary.totalMarksObtained} / {previewStudentSummary.totalMaxMarks}</strong></span>
                  <span>Percentage: <strong className="text-amber-300">{previewStudentSummary.percentage}%</strong></span>
                  <span>Grade: <strong className="text-emerald-300">{previewStudentSummary.grade}</strong></span>
                </div>
              </div>
            )}

            {/* Modal Tabs Navigation */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('biodata')}
                className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
                  activeTab === 'biodata' 
                    ? 'border-emerald-700 text-emerald-800 bg-white' 
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>1. Personal Biodata &amp; Info</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('marks')}
                className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
                  activeTab === 'marks' 
                    ? 'border-emerald-700 text-emerald-800 bg-white' 
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>2. Subject Marks &amp; Results (परीक्षा अंक)</span>
              </button>
            </div>

            {/* Modal Body Form */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* TAB 1: BIODATA */}
              {activeTab === 'biodata' && (
                <div className="space-y-4">
                  
                  {/* Roll & Admission No */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Roll Number *
                      </label>
                      <input
                        type="number"
                        value={formData.roll}
                        onChange={(e) => setFormData({ ...formData, roll: e.target.value })}
                        className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        URN / Admission Number (Column B) *
                      </label>
                      <input
                        type="text"
                        value={formData.admNo}
                        disabled={!isAddingNew}
                        onChange={(e) => setFormData({ ...formData, admNo: e.target.value })}
                        className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        placeholder={`PIS-2025-${selectedClass}-001`}
                      />
                    </div>
                  </div>

                  {/* Current academic placement; URN remains the permanent identity. */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Current Class *</label>
                      <select
                        value={formData.studentClass}
                        disabled={isAddingNew}
                        onChange={(e) => setFormData({ ...formData, studentClass: e.target.value as ClassLevel })}
                        className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      >
                        {classesList.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Current Section *</label>
                      <input
                        type="text"
                        value={formData.section}
                        onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                        className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        placeholder="A"
                      />
                    </div>
                  </div>

                  {/* Student Name */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      placeholder="e.g. Mohammad Bilal"
                    />
                  </div>

                  {/* Father & Mother Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Father's Name
                      </label>
                      <input
                        type="text"
                        value={formData.fatherName}
                        onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                        className="w-full text-xs font-semibold border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        placeholder="MD SULTAN"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Mother's Name
                      </label>
                      <input
                        type="text"
                        value={formData.motherName}
                        onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                        className="w-full text-xs font-semibold border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        placeholder="MOTHER"
                      />
                    </div>
                  </div>

                  {/* DOB, Mobile & Language */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Date of Birth (DD/MM/YYYY)
                      </label>
                      <input
                        type="text"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="w-full text-xs font-mono border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        placeholder="15/07/2014"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Contact Mobile
                      </label>
                      <input
                        type="text"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        className="w-full text-xs font-mono border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        placeholder="9835100000"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        2nd / Optional Language *
                      </label>
                      <select
                        value={formData.optionalSubject}
                        onChange={(e) => setFormData({ ...formData, optionalSubject: e.target.value as any })}
                        className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      >
                        <option value="Urdu">Urdu (उर्दू)</option>
                        <option value="Sanskrit">Sanskrit (संस्कृत)</option>
                      </select>
                    </div>
                  </div>

                  {/* Photo URL & Attendance */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Student Photo URL / Google Drive Link
                      </label>
                      <input
                        type="text"
                        value={formData.photoUrl}
                        onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                        className="w-full text-xs font-mono border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        placeholder="https://drive.google.com/file/d/... or direct image URL"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Term 1 Attendance
                      </label>
                      <input
                        type="text"
                        value={formData.attendanceHY}
                        onChange={(e) => setFormData({ ...formData, attendanceHY: e.target.value })}
                        className="w-full text-xs font-mono border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        placeholder="95/110"
                      />
                    </div>
                  </div>

                  {/* Photo Preview if present */}
                  {formData.photoUrl && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                      <img 
                        src={formData.photoUrl} 
                        alt="Preview" 
                        referrerPolicy="no-referrer"
                        className="w-12 h-14 object-cover rounded-lg border border-slate-300"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                      <div className="text-[11px] text-slate-500">
                        <span className="font-bold text-slate-800 block">Photo Preview</span>
                        <span>This photo will appear automatically on Report Cards and Admit Cards.</span>
                      </div>
                    </div>
                  )}

                </div>
              )}

                              {/* TAB 2: MARKS & RESULTS */}
              {activeTab === 'marks' && (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-[11px] leading-relaxed">
                    <strong>अंक प्रविष्टि दिशा-निर्देश:</strong> प्रत्येक विषय के लिए विभिन्न टर्म (PT-1, PT-2, Term 1, PT-3, PT-4, Term 2) के प्राप्तांक दर्ज करें। ऊपर रिबन में कुल अंक और प्रतिशत स्वतः अपडेट हो रहे हैं।
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full min-w-[760px] text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                          <th className="py-2.5 px-3">Subject Name</th>
                          <th className="py-2.5 px-2 text-center">PT-1</th>
                          <th className="py-2.5 px-2 text-center">PT-2</th>
                          <th className="py-2.5 px-2 text-center">HY (Term 1)</th>
                          <th className="py-2.5 px-2 text-center">PT-3</th>
                          <th className="py-2.5 px-2 text-center">PT-4</th>
                          <th className="py-2.5 px-2 text-center">AE (Term 2)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {classSubjects.map((sub) => {
                          const isLanguage = sub === 'Urdu' || sub === 'Sanskrit';
                          const isOptedOut = isLanguage && sub !== formData.optionalSubject;

                          const getVal = (segment: string) => {
                            const key1 = `${sub}_${segment}`;
                            const key2 = `${sub}-${segment}`;
                            const key3 = `${sub} ${segment}`;
                            return formData.rawMarks[key1] ?? formData.rawMarks[key2] ?? formData.rawMarks[key3] ?? '';
                          };

                          const setVal = (segment: string, val: string) => {
                            const key = `${sub}_${segment}`;
                            setFormData(prev => ({
                              ...prev,
                              rawMarks: {
                                ...prev.rawMarks,
                                [key]: val,
                                [`${sub}-${segment}`]: val,
                                [`${sub} ${segment}`]: val
                              }
                            }));
                          };

                          return (
                            <tr 
                              key={sub} 
                              className={`transition-colors ${isOptedOut ? 'opacity-40 bg-slate-50' : 'hover:bg-slate-50'}`}
                            >
                              <td className="py-2 px-3 font-bold text-slate-800">
                                {sub}
                                {isOptedOut && (
                                  <span className="text-[10px] text-slate-400 font-normal block">
                                    (Not opted: Student chose {formData.optionalSubject})
                                  </span>
                                )}
                              </td>

                              {/* PT-1 */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="text"
                                  disabled={isOptedOut}
                                  value={getVal('PT_1') || getVal('PT-1')}
                                  onChange={(e) => setVal('PT-1', e.target.value)}
                                  className="w-14 text-center font-mono font-bold text-xs p-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                                  placeholder="0"
                                />
                              </td>

                              {/* PT-2 */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="text"
                                  disabled={isOptedOut}
                                  value={getVal('PT_2') || getVal('PT-2')}
                                  onChange={(e) => setVal('PT-2', e.target.value)}
                                  className="w-14 text-center font-mono font-bold text-xs p-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                                  placeholder="0"
                                />
                              </td>

                              {/* Half Yearly */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="text"
                                  disabled={isOptedOut}
                                  value={getVal('HY')}
                                  onChange={(e) => setVal('HY', e.target.value)}
                                  className="w-16 text-center font-mono font-black text-xs p-1 border border-indigo-300 bg-indigo-50/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                                  placeholder="0"
                                />
                              </td>

                              {/* PT-3 */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="text"
                                  disabled={isOptedOut}
                                  value={getVal('PT_3') || getVal('PT-3')}
                                  onChange={(e) => setVal('PT-3', e.target.value)}
                                  className="w-14 text-center font-mono font-bold text-xs p-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                                  placeholder="0"
                                />
                              </td>

                              {/* PT-4 */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="text"
                                  disabled={isOptedOut}
                                  value={getVal('PT_4') || getVal('PT-4')}
                                  onChange={(e) => setVal('PT-4', e.target.value)}
                                  className="w-14 text-center font-mono font-bold text-xs p-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                                  placeholder="0"
                                />
                              </td>

                              {/* Annual Exam */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="text"
                                  disabled={isOptedOut}
                                  value={getVal('AE')}
                                  onChange={(e) => setVal('AE', e.target.value)}
                                  className="w-16 text-center font-mono font-black text-xs p-1 border border-emerald-300 bg-emerald-50/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                  placeholder="0"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingStudent(null);
                  setIsAddingNew(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveStudent(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Locally</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveStudent(true)}
                  disabled={isSyncing}
                  className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#153e32] disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {isSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Database className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>Save &amp; Sync to Sheet</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900">Delete Student Record?</h4>
              <p className="text-xs text-slate-500">
                क्या आप वाकई <strong>{deletingStudent.name}</strong> (Roll #{deletingStudent.roll}, Adm: {deletingStudent.admNo}) को Class {selectedClass} से हटाना चाहते हैं?
              </p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900">
              यह छात्र इस क्लास की सूची, रिपोर्ट कार्ड और मार्कशीट से हट जाएगा।
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
