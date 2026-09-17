import React, { useState, useEffect } from 'react';
import { FullStudentExamRecord, ExamScheduleItem } from '../../types/resultTypes';
import { ClassLevel } from '../../types';
import { SUBJECTS_BY_CLASS, SCHOOL_NAME, ACADEMIC_SESSION } from '../../data/schoolConfig';
import { getFullSubjectName } from '../../utils/resultCalculator';
import { AdmitCard, formatPhotoUrl } from './AdmitCard';
import {
  Calendar,
  Clock,
  Sparkles,
  Download,
  Users,
  Search,
  Save,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Camera,
  CheckSquare,
  Square,
  Layers,
  FileDown
} from 'lucide-react';
import { exportAdmitCardToPdf, exportBatchAdmitCardsToPdf } from '../../utils/pdfExport';

interface AdmitCardGeneratorProps {
  selectedClass: ClassLevel;
  students: FullStudentExamRecord[];
  onUpdateStudentPhoto?: (admNo: string, newPhotoUrl: string) => void;
  subjectAllotments?: Record<ClassLevel, string[]>;
  classAllottedSubjects?: string[];
}

export const AdmitCardGenerator: React.FC<AdmitCardGeneratorProps> = ({
  selectedClass,
  students,
  onUpdateStudentPhoto,
  subjectAllotments,
  classAllottedSubjects
}) => {
  // Exam Term Title
  const [examTitle, setExamTitle] = useState('Term 2 Examination');
  
  // View sub-mode: 'single' | 'batch' | 'schedule_editor'
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'schedule_editor'>('single');

  // Selected student for single preview
  const [selectedAdmNo, setSelectedAdmNo] = useState<string>(students[0]?.admNo || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Batch selection and PDF export state
  const [selectedBatchStudents, setSelectedBatchStudents] = useState<string[]>(() => students.map(s => s.admNo));
  const [isGeneratingBatchPdf, setIsGeneratingBatchPdf] = useState(false);
  const [batchPdfProgress, setBatchPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDownloadingSingleAdmNo, setIsDownloadingSingleAdmNo] = useState<string | null>(null);

  // Sync batch selection when students list changes
  useEffect(() => {
    setSelectedBatchStudents(students.map(s => s.admNo));
  }, [students]);

  const handleSelectAllBatch = () => {
    setSelectedBatchStudents(students.map(s => s.admNo));
  };

  const handleDeselectAllBatch = () => {
    setSelectedBatchStudents([]);
  };

  const toggleSelectStudent = (admNo: string) => {
    setSelectedBatchStudents(prev =>
      prev.includes(admNo) ? prev.filter(id => id !== admNo) : [...prev, admNo]
    );
  };

  const handleDownloadSingleAdmitCard = async (student: FullStudentExamRecord) => {
    const el = document.getElementById(`admit-card-${student.admNo}`);
    if (!el) {
      alert('Admit card preview element not found. Please try again.');
      return;
    }
    setIsDownloadingSingleAdmNo(student.admNo);
    try {
      const safeName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `AdmitCard_Class${student.studentClass}_Roll${student.roll}_${safeName}.pdf`;
      await exportAdmitCardToPdf({
        element: el,
        filename
      });
    } catch (err) {
      console.error('Failed to download Admit Card PDF:', err);
      alert('Could not download Admit Card PDF. Please try again.');
    } finally {
      setIsDownloadingSingleAdmNo(null);
    }
  };

  const handleDownloadBatchPdf = async () => {
    if (selectedBatchStudents.length === 0) {
      alert('Please select at least one student to download batch Admit Cards.');
      return;
    }

    // Ensure we are in batch view so elements are mounted in DOM
    if (activeTab !== 'batch') {
      setActiveTab('batch');
      await new Promise(r => setTimeout(r, 200));
    }

    const elements = selectedBatchStudents
      .map(admNo => document.getElementById(`admit-card-${admNo}`))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) {
      alert('No admit card elements found. Please ensure cards are rendered.');
      return;
    }

    setIsGeneratingBatchPdf(true);
    setBatchPdfProgress({ current: 1, total: elements.length });

    try {
      const cleanTerm = examTitle.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Class_${selectedClass}_AdmitCards_${cleanTerm}.pdf`;
      await exportBatchAdmitCardsToPdf({
        elements,
        filename,
        onProgress: (current, total) => {
          setBatchPdfProgress({ current, total });
        }
      });
    } catch (err) {
      console.error('Batch Admit Cards PDF generation error:', err);
      alert('Error generating Batch Admit Cards PDF. Please try again.');
    } finally {
      setIsGeneratingBatchPdf(false);
      setBatchPdfProgress(null);
    }
  };

  // Start Date for quick auto-schedule
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // 1 week from today
    return d.toISOString().split('T')[0];
  });

  const [defaultTiming, setDefaultTiming] = useState('09:00 AM - 12:00 PM');

  // Canonical Class Curriculum allotted to current class by Exam Authority
  const classSubjects = React.useMemo(() => {
    if (classAllottedSubjects && classAllottedSubjects.length > 0) {
      return classAllottedSubjects;
    }
    return (subjectAllotments && subjectAllotments[selectedClass]) || SUBJECTS_BY_CLASS[selectedClass] || [];
  }, [selectedClass, classAllottedSubjects, subjectAllotments]);

  const storageKey = `pis_exam_schedule_${selectedClass}_${examTitle.replace(/\s+/g, '_')}`;

  // Helper: Strictly sanitize schedule to ONLY include subjects allotted to this class
  const sanitizeScheduleForClass = React.useCallback((
    items: ExamScheduleItem[],
    subjects: string[],
    timing: string
  ): ExamScheduleItem[] => {
    const subjectsSet = new Set(subjects.map(s => s.toLowerCase()));
    // 1. Keep only items that belong to this class's allotted subjects
    const validExisting = (items || []).filter(item => subjectsSet.has(item.subject.toLowerCase()));

    // 2. If any allotted subject is missing from schedule, create its schedule entry
    const existingSubjectNames = new Set(validExisting.map(v => v.subject.toLowerCase()));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const missingItems: ExamScheduleItem[] = [];
    subjects.forEach((sub, idx) => {
      if (!existingSubjectNames.has(sub.toLowerCase())) {
        const d = new Date();
        d.setDate(d.getDate() + 7 + (validExisting.length + idx) * 2);
        missingItems.push({
          subject: sub,
          date: d.toISOString().split('T')[0],
          day: days[d.getDay()],
          time: timing
        });
      }
    });

    return [...validExisting, ...missingItems];
  }, []);

  const [schedule, setSchedule] = useState<ExamScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return sanitizeScheduleForClass(parsed, classSubjects, '09:00 AM - 12:00 PM');
        }
      }
    } catch {
      // ignore
    }
    // Default initial schedule for classSubjects
    return classSubjects.map((sub, idx) => {
      const d = new Date();
      d.setDate(d.getDate() + 7 + idx * 2); // Every 2 days
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        subject: sub,
        date: d.toISOString().split('T')[0],
        day: days[d.getDay()],
        time: '09:00 AM - 12:00 PM'
      };
    });
  });

  // Reload or reset schedule when class changes, ensuring ONLY class subjects exist
  useEffect(() => {
    const key = `pis_exam_schedule_${selectedClass}_${examTitle.replace(/\s+/g, '_')}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSchedule(sanitizeScheduleForClass(parsed, classSubjects, defaultTiming));
          return;
        }
      }
    } catch {
      // ignore
    }
    // Generate fresh schedule strictly for new class allotted subjects
    const newSched = classSubjects.map((sub, idx) => {
      const d = new Date();
      d.setDate(d.getDate() + 7 + idx * 2);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        subject: sub,
        date: d.toISOString().split('T')[0],
        day: days[d.getDay()],
        time: defaultTiming
      };
    });
    setSchedule(newSched);
  }, [selectedClass, examTitle, classSubjects, defaultTiming, sanitizeScheduleForClass]);

  // Save schedule to localStorage (purging any un-allotted subjects)
  const handleSaveSchedule = () => {
    try {
      const validSet = new Set(classSubjects.map(s => s.toLowerCase()));
      const cleaned = schedule.filter(item => validSet.has(item.subject.toLowerCase()));
      localStorage.setItem(storageKey, JSON.stringify(cleaned));
      setSchedule(cleaned);
      alert(`Class ${selectedClass} Examination timetable saved successfully (${cleaned.length} subjects: Core + Optional)!`);
    } catch {
      // ignore
    }
  };

  // Quick 1-click Auto Schedule Allotment (Sequential dates for core subjects + parallel shift for elective pair)
  const handleAutoAllotDates = () => {
    const daysName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let curr = new Date(startDate);

    const newSched: ExamScheduleItem[] = [];
    const hasUrdu = classSubjects.some(s => s.toLowerCase() === 'urdu' || s.toLowerCase().includes('urdu'));
    const hasSanskrit = classSubjects.some(s => s.toLowerCase() === 'sanskrit' || s.toLowerCase().includes('sanskrit'));
    const hasElectivePair = hasUrdu && hasSanskrit;

    // Subjects to schedule sequentially
    const sequentialSubjects = hasElectivePair
      ? classSubjects.filter(s => {
          const l = s.toLowerCase();
          return l !== 'urdu' && !l.includes('urdu') && l !== 'sanskrit' && !l.includes('sanskrit');
        })
      : classSubjects;

    sequentialSubjects.forEach((sub) => {
      if (curr.getDay() === 0) {
        curr.setDate(curr.getDate() + 1); // Skip Sunday
      }
      newSched.push({
        subject: sub,
        date: curr.toISOString().split('T')[0],
        day: daysName[curr.getDay()],
        time: defaultTiming
      });
      curr.setDate(curr.getDate() + 2);
    });

    // If Urdu & Sanskrit elective pair exists, schedule them on parallel shift (same day)
    if (hasElectivePair) {
      if (curr.getDay() === 0) {
        curr.setDate(curr.getDate() + 1);
      }
      const optDateStr = curr.toISOString().split('T')[0];
      const optDayStr = daysName[curr.getDay()];

      const electiveSubjects = classSubjects.filter(s => {
        const l = s.toLowerCase();
        return l === 'urdu' || l.includes('urdu') || l === 'sanskrit' || l.includes('sanskrit');
      });

      electiveSubjects.forEach((opt) => {
        newSched.push({
          subject: opt,
          date: optDateStr,
          day: optDayStr,
          time: defaultTiming
        });
      });
    }

    setSchedule(newSched);
    localStorage.setItem(storageKey, JSON.stringify(newSched));
  };

  // Update a single subject's date or time
  const handleUpdateSubjectDate = (subject: string, field: 'date' | 'time', value: string) => {
    const daysName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    setSchedule(prev => {
      const updated = prev.map(item => {
        if (item.subject === subject) {
          if (field === 'date') {
            const parsed = new Date(value);
            const dayStr = isNaN(parsed.getTime()) ? '' : daysName[parsed.getDay()];
            return { ...item, date: value, day: dayStr };
          } else {
            return { ...item, time: value };
          }
        }
        return item;
      });
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Update currently selected student if students list changes
  useEffect(() => {
    if (students.length > 0 && (!selectedAdmNo || !students.some(s => s.admNo === selectedAdmNo))) {
      setSelectedAdmNo(students[0].admNo);
    }
  }, [students, selectedAdmNo]);

  const currentStudent = students.find(s => s.admNo === selectedAdmNo) || students[0];

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(s.roll).includes(searchQuery) ||
    s.admNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full">
      {/* Control Banner for Admit Card System */}
      <div className="no-print bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1b4332]/10 text-[#1b4332] border border-[#1b4332]/20 uppercase">
                Admit Card Generator
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Class {selectedClass} &bull; {students.length} Students Loaded
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              Class {selectedClass} Examination Admit Cards &amp; Date-Sheet
            </h2>
          </div>

          {/* Action Tabs: Single Preview, Batch Cards, Allot Dates */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-white text-[#1b4332] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Card
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'batch'
                  ? 'bg-white text-[#1b4332] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batch All ({students.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schedule_editor')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'schedule_editor'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Allot Dates &amp; Timetable
            </button>
          </div>
        </div>

        {/* Configuration Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
          {/* 1. Exam Term Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Examination Title
            </label>
            <select
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
            >
              <option value="Term-1 Examination">Term 1 Examination</option>
              <option value="Term-2 Examination">Term 2 Examination</option>
              <option value="Annual Examination">Term 2 Examination (Annual)</option>
              <option value="Pre-Board Examination">Pre-Board Examination</option>
              <option value="Periodic Test 1 (PT-1)">Periodic Test 1 (PT-1)</option>
              <option value="Periodic Test 2 (PT-2)">Periodic Test 2 (PT-2)</option>
              <option value="Periodic Test 3 (PT-3)">Periodic Test 3 (PT-3)</option>
              <option value="Periodic Test 4 (PT-4)">Periodic Test 4 (PT-4)</option>
            </select>
          </div>

          {/* 2. Student Search / Selector (Visible in single mode) */}
          {activeTab === 'single' && (
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Select Candidate
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedAdmNo}
                  onChange={(e) => setSelectedAdmNo(e.target.value)}
                  className="flex-1 text-xs font-bold text-[#1b4332] bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                >
                  {students.map((st) => (
                    <option key={st.admNo} value={st.admNo}>
                      Roll {String(st.roll).padStart(2, '0')} - {st.name} ({st.fatherName || 'Father N/A'})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => currentStudent && handleDownloadSingleAdmitCard(currentStudent)}
                  disabled={!currentStudent || isDownloadingSingleAdmNo === currentStudent.admNo}
                  className="px-4 py-2 bg-[#1b4332] hover:bg-[#143326] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
                  title="Download selected candidate's Admit Card as PDF"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isDownloadingSingleAdmNo === currentStudent?.admNo ? 'Exporting...' : 'Download PDF'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Batch Download Action Button */}
          {activeTab === 'batch' && (
            <div className="sm:col-span-2 flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={handleDownloadBatchPdf}
                disabled={isGeneratingBatchPdf || selectedBatchStudents.length === 0}
                className="px-4 py-2 bg-[#1b4332] hover:bg-[#143326] text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition-colors"
                title="Download selected Admit Cards as multi-page PDF"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>
                  {isGeneratingBatchPdf 
                    ? (batchPdfProgress ? `Exporting (${batchPdfProgress.current}/${batchPdfProgress.total})...` : 'Generating PDF...')
                    : `Download Batch PDF (${selectedBatchStudents.length})`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: SCHEDULE / TIMETABLE EDITOR */}
      {activeTab === 'schedule_editor' && (
        <div className="no-print bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1b4332]" />
                  Allot Subject Exam Dates (Class {selectedClass})
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1b4332]/10 text-[#1b4332] border border-[#1b4332]/25">
                  Class {selectedClass} Allotted Subjects Only ({classSubjects.length})
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Keval wahi subject show ho rahe hain jo Class {selectedClass} me allot kiye gaye hain. Dates keval inhi allotted subjects ko allot hongi.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoAllotDates}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Automatically generate consecutive dates starting from Start Date for allotted subjects"
              >
                <Sparkles className="w-3.5 h-3.5" /> 1-Click Auto Allot Dates
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                className="px-3.5 py-1.5 bg-[#1b4332] hover:bg-[#143326] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" /> Save Dates
              </button>
            </div>
          </div>

          {/* Quick Auto-generator Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Exam Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Standard Exam Timing:</label>
              <input
                type="text"
                value={defaultTiming}
                onChange={(e) => setDefaultTiming(e.target.value)}
                placeholder="e.g. 09:00 AM - 12:00 PM"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          {/* Subject-wise Date Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2 px-3 w-12 text-center">#</th>
                  <th className="py-2 px-3 min-w-[180px]">Subject Name</th>
                  <th className="py-2 px-3 min-w-[170px]">Exam Date</th>
                  <th className="py-2 px-3 min-w-[120px]">Day</th>
                  <th className="py-2 px-3 min-w-[180px]">Exam Timing / Shift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classSubjects.map((sub, idx) => {
                  const currentItem = schedule.find(s => s.subject === sub) || {
                    subject: sub,
                    date: '',
                    day: '',
                    time: '09:00 AM - 12:00 PM'
                  };

                  return (
                    <tr key={sub} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-800">
                        {getFullSubjectName(sub)}
                        {sub.toLowerCase() === 'urdu' ? (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                            Optional (Urdu Opted)
                          </span>
                        ) : sub.toLowerCase() === 'sanskrit' ? (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                            Optional (Sanskrit Opted)
                          </span>
                        ) : (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                            Core Subject (All Students)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={currentItem.date}
                          onChange={(e) => handleUpdateSubjectDate(sub, 'date', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                        />
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-600">
                        {currentItem.day || '—'}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={currentItem.time}
                          onChange={(e) => handleUpdateSubjectDate(sub, 'time', e.target.value)}
                          placeholder="09:00 AM - 12:00 PM"
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className="px-4 py-2 bg-[#1b4332] text-white text-xs font-bold rounded-lg hover:bg-[#143326] cursor-pointer"
            >
              Done &amp; Preview Admit Cards &rarr;
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: SINGLE ADMIT CARD PREVIEW */}
      {activeTab === 'single' && currentStudent && (
        <AdmitCard
          student={currentStudent}
          schedule={schedule}
          examTitle={examTitle}
          onUpdatePhoto={onUpdateStudentPhoto}
          photoRoster={students}
          allottedSubjects={classSubjects}
        />
      )}

      {/* VIEW 3: BATCH ALL ADMIT CARDS WITH INDIVIDUAL & BULK PDF DOWNLOAD */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          {/* Top Batch Management Strip */}
          <div className="no-print bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1b4332]/10 text-[#1b4332] border border-[#1b4332]/20">
                {selectedBatchStudents.length} of {students.length} Selected
              </span>
              <button
                type="button"
                onClick={handleSelectAllBatch}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                Select All ({students.length})
              </button>
              <button
                type="button"
                onClick={handleDeselectAllBatch}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Square className="w-3.5 h-3.5 text-slate-500" />
                Deselect All
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter student / roll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b4332] w-44"
                />
              </div>

              <button
                type="button"
                onClick={handleDownloadBatchPdf}
                disabled={isGeneratingBatchPdf || selectedBatchStudents.length === 0}
                className="px-4 py-1.5 bg-[#1b4332] hover:bg-[#143326] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
                title="Download selected Admit Cards as multi-page PDF"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {isGeneratingBatchPdf 
                    ? `Exporting (${batchPdfProgress?.current || 0}/${batchPdfProgress?.total || selectedBatchStudents.length})...`
                    : `Download Batch PDF (${selectedBatchStudents.length})`}
                </span>
              </button>
            </div>
          </div>

          {/* Student Cards List */}
          <div className="space-y-6">
            {filteredStudents.map((st) => {
              const isSelected = selectedBatchStudents.includes(st.admNo);

              return (
                <div key={st.admNo} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3 sm:p-4 transition-all">
                  {/* Student Card Top Bar with Checkbox and 1-Click Single PDF Download */}
                  <div className="no-print flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectStudent(st.admNo)}
                        className="w-4 h-4 text-[#1b4332] rounded border-slate-300 focus:ring-[#1b4332] cursor-pointer"
                        title="Include in Batch PDF"
                      />
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#1b4332] text-white">
                        Roll {String(st.roll).padStart(2, '0')}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {st.name}
                      </span>
                      <span className="text-xs text-slate-500 hidden sm:inline">
                        (Adm: {st.admNo} &bull; Father: {st.fatherName || 'N/A'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleAdmitCard(st)}
                        disabled={isDownloadingSingleAdmNo === st.admNo}
                        className="px-3 py-1.5 bg-[#1b4332] hover:bg-[#143326] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
                        title="Download only this student's Admit Card as PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isDownloadingSingleAdmNo === st.admNo ? 'Downloading...' : 'Download PDF'}</span>
                      </button>
                    </div>
                  </div>

                  {/* The Admit Card Preview Element */}
                  <div className={isSelected ? 'opacity-100' : 'opacity-60'}>
                    <AdmitCard
                      student={st}
                      schedule={schedule}
                      examTitle={examTitle}
                      hideControls={true}
                      onUpdatePhoto={onUpdateStudentPhoto}
                      photoRoster={students}
                      allottedSubjects={classSubjects}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Batch PDF Generation Progress Overlay */}
      {isGeneratingBatchPdf && batchPdfProgress && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#1b4332]/10 text-[#1b4332] flex items-center justify-center mx-auto mb-3">
              <Download className="w-6 h-6 animate-bounce text-[#1b4332]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Generating Batch Admit Cards PDF
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Processing Admit Card {batchPdfProgress.current} of {batchPdfProgress.total} for Class {selectedClass}...
            </p>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2">
              <div
                className="bg-[#1b4332] h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((batchPdfProgress.current / batchPdfProgress.total) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-600 font-mono">
              {Math.round((batchPdfProgress.current / batchPdfProgress.total) * 100)}% Completed
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
