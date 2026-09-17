import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ClassLevel } from '../../types';
import { 
  ExamType, 
  FullStudentExamRecord, 
  ResultViewMode, 
  SystemControlConfig 
} from '../../types/resultTypes';
import { 
  SUBJECTS_BY_CLASS, 
  SCHOOL_NAME, 
  SCHOOL_SUBTITLE, 
  ACADEMIC_SESSION 
} from '../../data/schoolConfig';
import { SCHOOL_LOGO_BASE64 } from '../../data/logoData';
import { getInitialClassExamRecords } from '../../data/mockResultData';
import { 
  rankClassStudents, 
  getFullSubjectName,
  computeStudentSummary,
  getStudentSubjects
} from '../../utils/resultCalculator';
import { 
  exportReportCardToPdf, 
  exportBatchReportCardsToPdf 
} from '../../utils/pdfExport';
import { ReportCard } from './ReportCard';
import { TabulationSheet } from './TabulationSheet';
import { ClassProgressDashboard } from './ClassProgressDashboard';
import { AdminSettingsModal } from './AdminSettingsModal';
import { CorrectionRequestsModal } from './CorrectionRequestsModal';
import { CorrectionRequest } from '../../utils/correctionRequests';
import { AdmitCardGenerator } from './AdmitCardGenerator';
import { ClassSubjectAllotmentModal } from './ClassSubjectAllotmentModal';
import { TeacherLinkSyncHubModal } from './TeacherLinkSyncHubModal';
import { GoogleSheetStructureModal } from './GoogleSheetStructureModal';
import { ResultNavigationSidebar } from './ResultNavigationSidebar';
import { StudentManagementView } from './StudentManagementView';
import { GoogleSheetDiagnosticModal } from './GoogleSheetDiagnosticModal';
import { fetchClassResultsFromGoogle } from '../../utils/googleSheetFetcher';
import { instantSyncBridge } from '../../utils/instantSyncBridge';
import { getStudentURN, normalizeURN } from '../../utils/studentIdentity';
import { getStudentPhotoUrl } from '../../utils/photoMapping';
import { SyncStatusBar } from '../common/SyncStatusBar';
import { 
  FileSpreadsheet, 
  UserCheck, 
  BarChart2, 
  Settings, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Search, 
  GraduationCap,
  Layers,
  Sparkles,
  Contact,
  BookOpen,
  Filter,
  Sliders,
  Share2,
  Lock,
  LogOut,
  Eye,
  Database,
  Shield,
  ShieldCheck,
  Menu,
  Maximize2,
  X,
  FileText,
  Download,
  CheckSquare,
  Square,
  Users,
  Wrench,
  CheckCircle2,
  AlertCircle,
  PanelLeft
} from 'lucide-react';

interface ResultGeneratorAppProps {
  onSwitchToMarkUpdation?: () => void;
  onSignOutAdmin?: () => void;
  systemConfig: SystemControlConfig;
  onUpdateSystemConfig: (cfg: SystemControlConfig) => void;
  scriptUrl: string;
  onUpdateScriptUrl: (url: string) => void;
  subjectAllotments?: Record<ClassLevel, string[]>;
  onUpdateSubjectAllotments?: (newMap: Record<ClassLevel, string[]>) => void;
  admitCardAllotments?: Record<ClassLevel, string[]>;
  onUpdateAdmitCardAllotments?: (newMap: Record<ClassLevel, string[]>) => void;
  adminPin?: string;
  onChangeAdminPin?: (newPin: string) => void;
  correctionRequests?: CorrectionRequest[];
  onReviewCorrection?: (id: string, status: 'Approved' | 'Rejected') => void;
}

export const ResultGeneratorApp: React.FC<ResultGeneratorAppProps> = ({
  onSwitchToMarkUpdation,
  onSignOutAdmin,
  systemConfig,
  onUpdateSystemConfig,
  scriptUrl,
  onUpdateScriptUrl,
  subjectAllotments,
  onUpdateSubjectAllotments,
  admitCardAllotments,
  onUpdateAdmitCardAllotments,
  adminPin = '1234',
  onChangeAdminPin,
  correctionRequests = [],
  onReviewCorrection
}) => {
  // Navigation & Filter States
  const [selectedClass, setSelectedClass] = useState<ClassLevel | ''>('');
  const [examMode, setExamMode] = useState<ExamType>('HY');
  const [viewMode, setViewMode] = useState<ResultViewMode>('report_card');
  const [selectedRoll, setSelectedRoll] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [classRecords, setClassRecords] = useState<FullStudentExamRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isCorrectionRequestsOpen, setIsCorrectionRequestsOpen] = useState(false);
  const [isSubjectAllotmentModalOpen, setIsSubjectAllotmentModalOpen] = useState(false);
  const [isTeacherLinkHubOpen, setIsTeacherLinkHubOpen] = useState(false);
  const [isSheetStructureOpen, setIsSheetStructureOpen] = useState(false);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [fetchToast, setFetchToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Modern Sidebar Navigation States
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);

  // Collapsible PDF Preview & Modal States (Default Hidden for Clean GUI)
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);

  // Performance Bar Graph Preference
  const [showBarGraph, setShowBarGraph] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pis_pref_show_bargraph');
      if (saved !== null) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return false;
  });

  const handleToggleGlobalBarGraph = () => {
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

  // Batch Print States (Collapsible Preview, Range Selection & Batch PDF Export)
  const [isBatchPreviewExpanded, setIsBatchPreviewExpanded] = useState(false);
  const [selectedBatchStudents, setSelectedBatchStudents] = useState<string[]>([]);
  const [batchRangeFrom, setBatchRangeFrom] = useState<string>('1');
  const [batchRangeTo, setBatchRangeTo] = useState<string>('');
  const [isGeneratingBatchPdf, setIsGeneratingBatchPdf] = useState(false);
  const [batchPdfProgress, setBatchPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [modalActiveRoll, setModalActiveRoll] = useState<number | null>(null);

  // Sync batch selection when records change
  useEffect(() => {
    if (classRecords.length > 0) {
      setSelectedBatchStudents(classRecords.map(s => s.admNo));
      setBatchRangeFrom('1');
      setBatchRangeTo(String(classRecords.length));
    }
  }, [classRecords]);

  const handleApplyBatchRange = () => {
    const from = parseInt(batchRangeFrom, 10);
    const to = parseInt(batchRangeTo, 10);
    if (isNaN(from) || isNaN(to) || from > to) return;
    const filtered = classRecords
      .filter(st => {
        const rollNum = Number(st.roll);
        return !isNaN(rollNum) && rollNum >= from && rollNum <= to;
      })
      .map(st => st.admNo);
    setSelectedBatchStudents(filtered);
  };

  const handleSelectAllBatch = () => {
    setSelectedBatchStudents(classRecords.map(s => s.admNo));
  };

  const handleClearAllBatch = () => {
    setSelectedBatchStudents([]);
  };

  const handleToggleBatchStudent = (admNo: string) => {
    setSelectedBatchStudents(prev => 
      prev.includes(admNo) ? prev.filter(id => id !== admNo) : [...prev, admNo]
    );
  };

  const handleDownloadSinglePdf = async (student: FullStudentExamRecord) => {
    if (!isPreviewExpanded && viewMode === 'report_card') {
      setIsPreviewExpanded(true);
      await new Promise(r => setTimeout(r, 200));
    }
    const el = document.getElementById(`report-card-${student.admNo}`);
    if (!el) return;
    try {
      const filename = `ReportCard_${student.name.replace(/\s+/g, '_')}_Class${student.studentClass}_${examMode}.pdf`;
      await exportReportCardToPdf({
        element: el,
        filename
      });
    } catch (e) {
      console.error('Single PDF error', e);
    }
  };

  const handleDownloadBatchPdf = async () => {
    if (!isBatchPreviewExpanded) {
      setIsBatchPreviewExpanded(true);
      await new Promise(r => setTimeout(r, 450));
    }

    const elements: HTMLElement[] = [];
    for (const st of classRecords) {
      if (selectedBatchStudents.includes(st.admNo)) {
        const el = document.getElementById(`report-card-${st.admNo}`);
        if (el) elements.push(el);
      }
    }

    if (elements.length === 0) {
      return;
    }

    setIsGeneratingBatchPdf(true);
    setBatchPdfProgress({ current: 0, total: elements.length });
    try {
      const filename = `ReportCards_Class${selectedClass}_${examMode}_Batch_${elements.length}Students.pdf`;
      await exportBatchReportCardsToPdf({
        elements,
        filename,
        onProgress: (current, total) => {
          setBatchPdfProgress({ current, total });
        }
      });
    } catch (err) {
      console.error('Batch PDF generation error:', err);
    } finally {
      setIsGeneratingBatchPdf(false);
      setBatchPdfProgress(null);
    }
  };

  // Load records whenever class changes
  useEffect(() => {
    if (selectedClass) {
      loadClassData(selectedClass);
    } else {
      setClassRecords([]);
      setIsLoading(false);
    }
  }, [selectedClass]);

  // Real-time zero-latency sync listener: whenever marks or student records are modified in Teacher Portal,
  // update the class records in 0ms without requiring reload or remote fetch!
  useEffect(() => {
    const handleInstantSync = (e: any) => {
      const targetClass = e?.detail?.className || e?.detail?.class;
      if (selectedClass && (!targetClass || targetClass === selectedClass)) {
        const cacheKey = `pis_exam_results_${selectedClass}_2025`;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setClassRecords(parsed);
              const now = new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
              setLastSyncedTime(now);
            }
          }
        } catch (err) {
          console.warn('Instant sync reload warning', err);
        }
      }
    };

    window.addEventListener('pis_instant_sync', handleInstantSync);
    return () => window.removeEventListener('pis_instant_sync', handleInstantSync);
  }, [selectedClass]);

  const loadClassData = async (cls: ClassLevel | '', forceRemote = false) => {
    if (!cls) {
      setClassRecords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const cacheKey = `pis_exam_results_${cls}_2025`;

    // If not forcing remote, check localStorage cache first
    if (!forceRemote) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setClassRecords(parsed);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Cache parse error', e);
        }
      }
    }

    // Try fetching from Google Apps Script or Google Sheets if URL provided
    if (scriptUrl && scriptUrl.trim() !== '' && !scriptUrl.includes('PASTE_YOUR')) {
      try {
        const result = await fetchClassResultsFromGoogle(scriptUrl, cls);
        if (result.success && result.students.length > 0) {
          setClassRecords(result.students);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(result.students));
          } catch {}
          setLastSyncedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
          setFetchToast({
            message: `Class ${cls}: Successfully synced ${result.students.length} students from Google Sheet (${result.source})`,
            type: 'success'
          });
          setTimeout(() => setFetchToast(null), 2000); // Exactly 2 seconds as requested
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn('Remote Google fetch failed, checking fallback:', err);
        setFetchToast({
          message: `Sheet Sync Info: ${err.message || 'Check deployment access'}. Using local dataset.`,
          type: 'info'
        });
        setTimeout(() => setFetchToast(null), 2000); // Exactly 2 seconds as requested
      }
    }

    // Fallback: check cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClassRecords(parsed);
          setIsLoading(false);
          return;
        }
      } catch {}
    }

    // Generate standard dataset (also preserving any student photos)
    const defaults = getInitialClassExamRecords(cls).map(st => {
      const urn = getStudentURN(st);
      const savedPhoto = urn ? localStorage.getItem(`pis_photo_${urn}`) : '';
      return savedPhoto ? { ...st, photoUrl: savedPhoto } : st;
    });
    setClassRecords(defaults);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(defaults));
    } catch {}
    setLastSyncedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    setIsLoading(false);
  };

  const handleRefresh = () => {
    if (!selectedClass) return;
    const cacheKey = `pis_exam_results_${selectedClass}_2025`;
    localStorage.removeItem(cacheKey);
    loadClassData(selectedClass, true);
  };

  // Student Management CRUD Handlers
  const handleUpdateStudent = (updatedStudent: FullStudentExamRecord): boolean => {
    const updatedUrn = getStudentURN(updatedStudent);
    if (!updatedUrn) {
      console.warn(`[Identity Enforcer] Blocked student update: Record lacks authoritative Column B URN for Roll ${updatedStudent.roll} (${updatedStudent.name}).`);
      return false;
    }

    const matches = classRecords.filter(student => getStudentURN(student) === updatedUrn);
    if (matches.length !== 1) return false;

    const sourceClass = selectedClass;
    const targetClass = updatedStudent.studentClass as ClassLevel;
    const sourceCacheKey = `pis_exam_results_${sourceClass}_2025`;
    const normalizedStudent = { ...updatedStudent, urn: updatedUrn, admNo: updatedUrn };

    if (targetClass === sourceClass) {
      const updated = classRecords.map(student => getStudentURN(student) === updatedUrn ? normalizedStudent : student);
      setClassRecords(updated);
      try {
        localStorage.setItem(sourceCacheKey, JSON.stringify(updated));
      } catch {}
    } else {
      const targetCacheKey = `pis_exam_results_${targetClass}_2025`;
      let targetRecords: FullStudentExamRecord[] = [];
      try {
        const cachedTarget = localStorage.getItem(targetCacheKey);
        const parsedTarget = cachedTarget ? JSON.parse(cachedTarget) : [];
        targetRecords = Array.isArray(parsedTarget) ? parsedTarget : [];
      } catch {}

      if (targetRecords.some(student => getStudentURN(student) === updatedUrn)) return false;

      const sourceUpdated = classRecords.filter(student => getStudentURN(student) !== updatedUrn);
      const targetUpdated = [...targetRecords, normalizedStudent].sort((a, b) => a.roll - b.roll);
      setClassRecords(sourceUpdated);
      try {
        localStorage.setItem(sourceCacheKey, JSON.stringify(sourceUpdated));
        localStorage.setItem(targetCacheKey, JSON.stringify(targetUpdated));
      } catch {}
    }

    if (selectedClass) {
      instantSyncBridge.emitLocalSync(selectedClass);
    }
    return true;
  };

  const handleAddStudent = (newStudent: FullStudentExamRecord): boolean => {
    const studentUrn = getStudentURN(newStudent) || normalizeURN(newStudent.admNo);
    if (!studentUrn) {
      console.warn(`[Identity Enforcer] Blocked student add: Record lacks authoritative Column B URN for Roll ${newStudent.roll} (${newStudent.name}).`);
      return false;
    }
    const finalizedStudent: FullStudentExamRecord = {
      ...newStudent,
      urn: studentUrn,
      admNo: studentUrn
    };
    if (classRecords.some(student => getStudentURN(student) === finalizedStudent.urn)) return false;
    const updated = [...classRecords, finalizedStudent].sort((a, b) => a.roll - b.roll);
    setClassRecords(updated);
      const cacheKey = `pis_exam_results_${selectedClass}_2025`;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch {}
    if (selectedClass) {
      instantSyncBridge.emitLocalSync(selectedClass);
    }
    return true;
  };

  const handleDeleteStudent = (identifier: string) => {
    const targetUrn = normalizeURN(identifier);
    if (!targetUrn) {
      console.warn(`[Identity Enforcer] Blocked student delete: Missing authoritative URN for identifier "${identifier}".`);
      return;
    }
    setClassRecords(prev => {
      const updated = prev.filter(s => {
        const sUrn = getStudentURN(s);
        // Authoritative URN is the ONLY deletion identity.
        return sUrn !== targetUrn;
      });
      const cacheKey = `pis_exam_results_${selectedClass}_2025`;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (selectedClass) {
      instantSyncBridge.emitLocalSync(selectedClass);
    }
  };

  // Class Allotted Subjects (Controlled centrally from Result Generator / Exam Authority)
  const classAllottedSubjects = React.useMemo(() => {
    if (!selectedClass) return [];
    return (subjectAllotments && subjectAllotments[selectedClass]) || SUBJECTS_BY_CLASS[selectedClass] || [];
  }, [selectedClass, subjectAllotments]);

  // Dependent Subject Filter: 'ALL' or specific subject name or 'CUSTOM'
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [customSelectedSubjects, setCustomSelectedSubjects] = useState<string[]>([]);

  // When class or subject allotments change, automatically reset subject filter to 'ALL' and refresh custom list
  useEffect(() => {
    setSelectedSubjectFilter('ALL');
    if (selectedClass) {
      setCustomSelectedSubjects((subjectAllotments && subjectAllotments[selectedClass]) || SUBJECTS_BY_CLASS[selectedClass] || []);
    } else {
      setCustomSelectedSubjects([]);
    }
  }, [selectedClass, subjectAllotments]);

  // Derived active subjects to be included in results (Report cards, tabulation, rankings)
  const activeSubjects = React.useMemo(() => {
    if (selectedSubjectFilter === 'ALL' || !selectedSubjectFilter) {
      return classAllottedSubjects;
    }
    if (selectedSubjectFilter === 'CUSTOM') {
      return customSelectedSubjects.length > 0 ? customSelectedSubjects : classAllottedSubjects;
    }
    const filtered = classAllottedSubjects.filter(
      s => s.toLowerCase() === selectedSubjectFilter.toLowerCase()
    );
    return filtered.length > 0 ? filtered : classAllottedSubjects;
  }, [selectedSubjectFilter, customSelectedSubjects, classAllottedSubjects]);
  
  // Calculate Class Ranks using active subjects
  const rankMap = rankClassStudents(
    classRecords, 
    activeSubjects, 
    examMode, 
    systemConfig.workingDaysHY, 
    systemConfig.workingDaysAE
  );

  // Current active student for single report card view
  const currentStudent = classRecords.find(st => st.roll === selectedRoll) || classRecords[0];

  // Memoized student summary for candidate summary card
  const studentSummary = React.useMemo(() => {
    if (!currentStudent) return null;
    return computeStudentSummary(
      currentStudent,
      activeSubjects,
      examMode,
      systemConfig.workingDaysHY,
      systemConfig.workingDaysAE
    );
  }, [currentStudent, activeSubjects, examMode, systemConfig.workingDaysHY, systemConfig.workingDaysAE]);

  // Academic Summary for Class in Batch Print Mode
  const batchClassSummary = useMemo(() => {
    if (!classRecords.length) return null;
    let totalScoreSum = 0;
    let totalMaxSum = 0;
    let passCount = 0;
    let failCount = 0;

    classRecords.forEach(st => {
      const studentActiveSubs = getStudentSubjects(st, activeSubjects);
      const sum = computeStudentSummary(st, studentActiveSubs, examMode, systemConfig.workingDaysHY, systemConfig.workingDaysAE);
      totalScoreSum += sum.totalObtained;
      totalMaxSum += sum.maxMarks;
      if (sum.resultStatus === 'PASS') passCount++;
      else failCount++;
    });

    const avgPct = totalMaxSum > 0 ? ((totalScoreSum / totalMaxSum) * 100).toFixed(1) : '0';
    return {
      totalStudents: classRecords.length,
      passCount,
      failCount,
      avgPct
    };
  }, [classRecords, activeSubjects, examMode, systemConfig.workingDaysHY, systemConfig.workingDaysAE]);

  // Navigate to previous / next student
  const handlePrevStudent = () => {
    const currentIndex = classRecords.findIndex(st => st.roll === selectedRoll);
    if (currentIndex > 0) {
      setSelectedRoll(classRecords[currentIndex - 1].roll);
    }
  };

  const handleNextStudent = () => {
    const currentIndex = classRecords.findIndex(st => st.roll === selectedRoll);
    if (currentIndex < classRecords.length - 1) {
      setSelectedRoll(classRecords[currentIndex + 1].roll);
    }
  };

  // Toggle optional language (Urdu vs Sanskrit) for a student (URN ONLY)
  const handleToggleOptionalSubject = (identifier: string, newSubject: 'Urdu' | 'Sanskrit') => {
    const targetUrn = normalizeURN(identifier);
    if (!targetUrn) {
      console.warn(`[Identity Enforcer] Blocked optional subject change: Missing authoritative URN for "${identifier}".`);
      return;
    }
    setClassRecords(prev => {
      const updated = prev.map(s => {
        const sUrn = getStudentURN(s);
        if (sUrn === targetUrn) {
          return { ...s, optionalSubject: newSubject };
        }
        return s;
      });
      const cacheKey = `pis_exam_results_${selectedClass}_2025`;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Update photo for student (e.g. from Admit Card link editor or Google Sheet sync)
  const handleUpdateStudentPhoto = (identifier: string, newPhotoUrl: string) => {
    const targetUrn = normalizeURN(identifier);
    if (!targetUrn) {
      console.warn(`[Identity Enforcer] Blocked photo update: Missing authoritative URN for "${identifier}".`);
      return;
    }
    if (newPhotoUrl.trim() && getStudentPhotoUrl({ urn: targetUrn, photoUrl: newPhotoUrl }).diagnostic === 'PHOTO_URL_INVALID') {
      console.warn(`[Photo Mapping] Blocked invalid photo URL for URN "${targetUrn}".`);
      return;
    }
    try {
      localStorage.setItem(`pis_photo_${targetUrn}`, newPhotoUrl);
    } catch {
      // ignore
    }
    setClassRecords(prev => {
      const updated = prev.map(s => {
        const sUrn = getStudentURN(s);
        if (sUrn === targetUrn) {
          return { ...s, photoUrl: newPhotoUrl };
        }
        return s;
      });
      const cacheKey = `pis_exam_results_${selectedClass}_2025`;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Import students & marks from Excel or Google Sheet Structure Center
  const handleImportStudentsToClass = (cls: ClassLevel, importedStudents: any[]) => {
    const normalized: FullStudentExamRecord[] = importedStudents.map((st, idx) => {
      const rollNum = typeof st.roll === 'number' ? st.roll : parseInt(st.roll) || (idx + 1);
      const studentUrn = getStudentURN(st) || normalizeURN(st.admNo);
      const admNo = studentUrn || st.admNo || `PIS-2025-${cls}-${String(rollNum).padStart(3, '0')}`;
      return {
        urn: studentUrn,
        admNo,
        roll: rollNum,
        name: st.name || `Student ${rollNum}`,
        fatherName: st.fatherName || 'GUARDIAN',
        motherName: st.motherName || 'MOTHER',
        dob: st.dob || '15/07/2014',
        studentClass: cls,
        section: st.section || 'A',
        mobile: st.mobile || '9835100000',
        optionalSubject: (st.optionalSubject === 'Sanskrit' ? 'Sanskrit' : 'Urdu') as 'Urdu' | 'Sanskrit',
        photoUrl: st.photoUrl || '',
        rawMarks: st.rawMarks || {},
        attendanceHY: st.attendanceHY || '95/110',
        attendanceAE: st.attendanceAE || '102/115'
      };
    });

    if (cls === selectedClass) {
      setClassRecords(normalized);
      if (normalized.length > 0) {
        setSelectedRoll(normalized[0].roll);
      }
    }

    const cacheKey = `pis_exam_results_${cls}_2025`;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(normalized));
    } catch (e) {
      console.warn('Failed to save imported class records', e);
    }
  };

  // Filtered students for dropdown or search
  const filteredStudents = classRecords.filter(st => {
    const sUrn = getStudentURN(st) || '';
    return (
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(st.roll).includes(searchQuery) ||
      st.admNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sUrn && sUrn.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const classesList: ClassLevel[] = [
    'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
  ];

  return (
    <div className={`min-h-screen bg-slate-100/70 font-sans text-slate-900 pb-16 transition-all duration-300 ${
      isCollapsedDesktop ? 'lg:pl-18' : 'lg:pl-76 xl:pl-82'
    }`}>
      {/* Modern Sidebar Navigation with 6 Categorized Accordions */}
      <div className="no-print">
        <ResultNavigationSidebar
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsedDesktop={isCollapsedDesktop}
          onToggleCollapsedDesktop={() => setIsCollapsedDesktop(prev => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedClass={selectedClass}
          onClassChange={(cls) => {
            setSelectedClass(cls);
            setSelectedRoll(1);
          }}
          examMode={examMode}
          onExamModeChange={setExamMode}
          classRecords={classRecords}
          selectedRoll={selectedRoll}
          onSelectRoll={setSelectedRoll}
          onPrevStudent={handlePrevStudent}
          onNextStudent={handleNextStudent}
          currentStudent={currentStudent}
          onToggleOptionalSubject={handleToggleOptionalSubject}
          classAllottedSubjects={classAllottedSubjects}
          selectedSubjectFilter={selectedSubjectFilter}
          onSubjectFilterChange={(val) => {
            setSelectedSubjectFilter(val);
            if (val === 'ALL') {
              setCustomSelectedSubjects([...classAllottedSubjects]);
            } else if (val !== 'CUSTOM') {
              setCustomSelectedSubjects([val]);
            }
          }}
          customSelectedSubjects={customSelectedSubjects}
          onToggleCustomSubject={(sub) => {
            if (customSelectedSubjects.includes(sub)) {
              setCustomSelectedSubjects(prev => prev.filter(s => s !== sub));
            } else {
              setCustomSelectedSubjects(prev => [...prev, sub]);
            }
          }}
          onSelectAllCustomSubjects={() => setCustomSelectedSubjects([...classAllottedSubjects])}
          onClearCustomSubjects={() => setCustomSelectedSubjects([])}
          showBarGraph={showBarGraph}
          onToggleBarGraph={handleToggleGlobalBarGraph}
          onOpenTeacherLinkHub={() => setIsTeacherLinkHubOpen(true)}
          onOpenSheetStructure={() => setIsSheetStructureOpen(true)}
          onOpenSubjectAllotments={() => setIsSubjectAllotmentModalOpen(true)}
          onOpenAdminSettings={() => setIsAdminModalOpen(true)}
          onOpenCorrectionRequests={() => setIsCorrectionRequestsOpen(true)}
          onRefreshData={handleRefresh}
          isLoading={isLoading}
          lastSyncedTime={lastSyncedTime}
          systemConfig={systemConfig}
          onSwitchToMarkUpdation={onSwitchToMarkUpdation}
          onSignOutAdmin={onSignOutAdmin}
          isPreviewExpanded={viewMode === 'bulk_cards' ? isBatchPreviewExpanded : isPreviewExpanded}
          onTogglePreviewExpanded={() => {
            if (viewMode === 'bulk_cards') {
              setIsBatchPreviewExpanded(prev => !prev);
            } else {
              setIsPreviewExpanded(prev => !prev);
            }
          }}
          onOpenPreviewModal={() => {
            setModalActiveRoll(selectedRoll || 1);
            setIsFullScreenModalOpen(true);
          }}
        />
      </div>

      {/* Top Header Bar (Clean, Uncluttered — Report, Print & Admin Moved to Left Sidebar) */}
      <header className="no-print bg-indigo-950 text-white border-b border-indigo-900 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button with clear visual label */}
            <button
              id="btn-toggle-mobile-menu"
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden px-2.5 py-1.5 -ml-1 text-amber-300 hover:text-white bg-slate-900/80 hover:bg-slate-800/90 border border-amber-400/40 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Open Navigation Menu"
            >
              <PanelLeft className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold">नेविगेशन मेन्यू</span>
            </button>

            {/* Desktop Sidebar Toggle Button */}
            <button
              id="btn-toggle-desktop-sidebar"
              type="button"
              onClick={() => setIsCollapsedDesktop(prev => !prev)}
              className="hidden lg:flex p-1.5 -ml-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer items-center gap-1.5"
              title={isCollapsedDesktop ? 'Expand Left Sidebar' : 'Collapse Left Sidebar'}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsedDesktop ? 'rotate-180' : ''}`} />
              <span className="text-[11px] font-semibold text-indigo-200">
                {isCollapsedDesktop ? 'Expand Menu' : 'Collapse'}
              </span>
            </button>

            <div className="w-9 h-9 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center shadow-xs border border-amber-400/40">
              <img 
                src={SCHOOL_LOGO_BASE64} 
                alt="School Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight uppercase font-serif">
                  {SCHOOL_NAME}
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                  Office Master
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 hidden sm:block">
                {ACADEMIC_SESSION} &bull; CBSE Evaluation &amp; Tabulation System
              </p>
            </div>
          </div>

          {/* Right Status & Quick Info */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Realtime Instant & Cloud Sync Indicator */}
            <SyncStatusBar 
              isSheetConfigured={Boolean(scriptUrl && !scriptUrl.includes('PASTE_YOUR'))} 
              onManualSync={handleRefresh}
            />

            {/* Active Class & Mode Pill */}
            <div className="hidden sm:flex items-center gap-1.5 bg-indigo-900/70 border border-indigo-800/80 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-100">
              <span className="font-bold text-amber-300">{selectedClass ? `Class ${selectedClass}` : 'कक्षा चुनें'}</span>
              {selectedClass && (
                <>
                  <span className="text-indigo-400">&bull;</span>
                  <span className="text-slate-200">
                    {examMode === 'BOTH' ? 'Dual Term' : examMode}
                  </span>
                  <span className="text-indigo-400">&bull;</span>
                  <span className="font-mono text-amber-300 text-[11px]">{classRecords.length} Students</span>
                </>
              )}
            </div>

            {/* Quick Refresh */}
            <button
              id="btn-header-sync"
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={lastSyncedTime ? `Sync with Google Sheet (Last: ${lastSyncedTime})` : 'Sync with Google Sheet'}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-300' : ''}`} />
            </button>

            {/* Google Sheet URL Diagnostic & Fetch Troubleshooter */}
            <button
              id="btn-header-diagnostic"
              type="button"
              onClick={() => setIsDiagnosticModalOpen(true)}
              className="p-2 text-indigo-200 hover:text-amber-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title="Google Sheet URL Diagnostics & Data Fetch Troubleshooter (शीट जांचें)"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span className="hidden xl:inline font-semibold text-amber-300">शीट जांचें</span>
            </button>

            {/* Direct Download .txt Report Button */}
            <a
              id="btn-download-txt-report-result-portal"
              href="/FINAL_TECHNICAL_HANDOVER_REPORT.txt"
              download="FINAL_TECHNICAL_HANDOVER_REPORT.txt"
              className="px-2.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Download Master Technical Baseline Report (.txt)"
            >
              <FileText className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden sm:inline">Handover .txt</span>
            </a>

            {/* Quick Download PDF */}
            <button
              id="btn-header-download-pdf"
              onClick={() => {
                if (viewMode === 'bulk_cards') {
                  handleDownloadBatchPdf();
                } else if (currentStudent) {
                  handleDownloadSinglePdf(currentStudent);
                }
              }}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Download Report Card as PDF"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        {/* Centered Notification Popup (बीचों-बीच 2 सेकंड के लिए) */}
        {fetchToast && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in pointer-events-none">
            <div
              className={`pointer-events-auto max-w-sm w-full mx-auto p-5 rounded-2xl border shadow-2xl text-center flex flex-col items-center gap-3 transform transition-all animate-scale-in ${
                fetchToast.type === 'success'
                  ? 'bg-white border-emerald-300 text-slate-900'
                  : fetchToast.type === 'error'
                  ? 'bg-white border-rose-300 text-slate-900'
                  : 'bg-white border-amber-300 text-slate-900'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                  fetchToast.type === 'success'
                    ? 'bg-emerald-100 text-emerald-700'
                    : fetchToast.type === 'error'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {fetchToast.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {fetchToast.type === 'success'
                    ? 'सफलतापूर्वक संपन्न'
                    : fetchToast.type === 'error'
                    ? 'चेतावनी / त्रुटि'
                    : 'सूचना'}
                </h3>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  {fetchToast.message}
                </p>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all duration-2000 ${
                    fetchToast.type === 'success'
                      ? 'bg-emerald-500'
                      : fetchToast.type === 'error'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Controls Toolbar (Hidden in Print) */}
        <div className="no-print bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4 mb-6">
          {/* Consolidated Action-Bar Row: Document Type Selector + Action Controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            {/* Unified Document Selector (Segmented on Large, Select on Mobile) */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden xl:inline">
                Document:
              </span>

              {/* Mobile / Tablet Dropdown Selector */}
              <div className="md:hidden w-full sm:w-auto">
                <select
                  id="select-document-type-mobile"
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as ResultViewMode)}
                  className="w-full text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="student_management">👥 Student Management (अपडेट/हटाएं)</option>
                  <option value="report_card">🎓 Single Report Card</option>
                  <option value="bulk_cards">📦 Batch Cards ({classRecords.length})</option>
                  <option value="tabulation_sheet">📊 Tabulation Register</option>
                  <option value="dashboard">📈 Class Progress Tracker</option>
                  <option value="admit_card">🪪 Admit Card Generator</option>
                </select>
              </div>

              {/* Desktop Segmented Tab Group */}
              <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
                <button
                  id="tab-student-management"
                  onClick={() => setViewMode('student_management')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'student_management' 
                      ? 'bg-white text-indigo-950 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Student Management: View, Update, Add or Delete Students"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Student Mgmt</span>
                </button>

                <button
                  id="tab-single-card"
                  onClick={() => setViewMode('report_card')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'report_card' 
                      ? 'bg-white text-indigo-950 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Report Card</span>
                </button>

                <button
                  id="tab-batch-cards"
                  onClick={() => setViewMode('bulk_cards')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'bulk_cards' 
                      ? 'bg-white text-indigo-950 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Batch Cards ({classRecords.length})</span>
                </button>

                <button
                  id="tab-tabulation"
                  onClick={() => setViewMode('tabulation_sheet')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'tabulation_sheet' 
                      ? 'bg-white text-indigo-950 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tabulation</span>
                </button>

                <button
                  id="tab-dashboard"
                  onClick={() => setViewMode('dashboard')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'dashboard' 
                      ? 'bg-white text-indigo-950 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Progress</span>
                </button>

                <button
                  id="tab-admit-card"
                  onClick={() => setViewMode('admit_card')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'admit_card' 
                      ? 'bg-white text-emerald-950 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Contact className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Admit Card</span>
                </button>
              </div>
            </div>

            {/* Right Action Tools in Consolidated Row */}
            <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
              {/* Preview Toggle Button (When on Report Card or Batch Cards) */}
              {(viewMode === 'report_card' || viewMode === 'bulk_cards') && (
                <button
                  id="btn-toggle-report-preview-row"
                  type="button"
                  onClick={() => {
                    if (viewMode === 'report_card') {
                      setIsPreviewExpanded(prev => !prev);
                    } else {
                      setIsBatchPreviewExpanded(prev => !prev);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    (viewMode === 'report_card' ? isPreviewExpanded : isBatchPreviewExpanded)
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    {(viewMode === 'report_card' ? isPreviewExpanded : isBatchPreviewExpanded)
                      ? (viewMode === 'report_card' ? 'Hide Preview' : 'Hide Batch Preview')
                      : (viewMode === 'report_card' ? 'Preview / View Report' : 'Preview Batch Cards')}
                  </span>
                </button>
              )}

              {/* Sheet Structure Modal Trigger */}
              <button
                id="btn-toolbar-sheet-structure"
                onClick={() => setIsSheetStructureOpen(true)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Sheet Structure & Excel Import"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Sheet &amp; Excel</span>
              </button>

              {/* Quick Download PDF */}
              <button
                id="btn-toolbar-quick-download-pdf"
                onClick={() => {
                  if (viewMode === 'bulk_cards') {
                    handleDownloadBatchPdf();
                  } else if (currentStudent) {
                    handleDownloadSinglePdf(currentStudent);
                  }
                }}
                className="px-3 py-1.5 text-xs font-bold bg-[#1b4332] hover:bg-[#153527] text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Download A4 PDF Report Card"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* Row 2: Selectors (Class, Dependent Subject Filter, Exam Type, Student) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-start">
            {/* 1. Class Selector */}
            <div className="lg:col-span-2 sm:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Select Class
              </label>
              <select
                id="select-result-class"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value as ClassLevel | '');
                  setSelectedRoll(1);
                }}
                className={`w-full text-xs font-bold rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs ${
                  !selectedClass 
                    ? 'bg-amber-50 border-2 border-amber-400 text-amber-900 animate-pulse' 
                    : 'bg-white border border-slate-300 text-slate-800'
                }`}
              >
                <option value="">-- कक्षा चुनें (Select Class) --</option>
                {classesList.map(c => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
            </div>

            {/* 2. Dependent Subject Filter Dropdown Menu */}
            <div className="lg:col-span-4 sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-indigo-600" />
                  <span>Included Subjects {selectedClass ? `(Class ${selectedClass})` : ''}</span>
                </label>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full border bg-indigo-50 border-indigo-200 text-indigo-700">
                  {!selectedClass
                    ? 'No Class'
                    : selectedSubjectFilter === 'ALL' 
                    ? `All (${classAllottedSubjects.length})` 
                    : selectedSubjectFilter === 'CUSTOM'
                    ? `${activeSubjects.length} of ${classAllottedSubjects.length}`
                    : '1 Subject'}
                </span>
              </div>
              <select
                id="select-class-dependent-subject"
                value={selectedSubjectFilter}
                disabled={!selectedClass}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSubjectFilter(val);
                  if (val === 'ALL') {
                    setCustomSelectedSubjects([...classAllottedSubjects]);
                  } else if (val !== 'CUSTOM') {
                    setCustomSelectedSubjects([val]);
                  }
                }}
                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
              >
                {!selectedClass ? (
                  <option value="ALL">-- पहले कक्षा चुनें (Select Class First) --</option>
                ) : (
                  <>
                    <option value="ALL">
                      ★ All Subjects ({classAllottedSubjects.length} Allotted to Class {selectedClass})
                    </option>
                    <optgroup label={`Individual Subjects (Class ${selectedClass})`}>
                      {classAllottedSubjects.map((subj) => (
                        <option key={subj} value={subj}>
                          {getFullSubjectName(subj)}
                        </option>
                      ))}
                    </optgroup>
                    <option value="CUSTOM">
                      ⚙️ Customize Specific Subjects (Multi-Select)...
                    </option>
                  </>
                )}
              </select>
            </div>

            {/* 3. Exam Mode Selector */}
            <div className="lg:col-span-2 sm:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Exam Evaluation Mode
              </label>
              <select
                id="select-exam-mode"
                value={examMode}
                onChange={(e) => setExamMode(e.target.value as ExamType)}
                className="w-full text-xs font-semibold text-indigo-950 bg-white border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs"
              >
                <option value="HY">Term 1 (PT1+PT2+WRT)</option>
                <option value="AE">Term 2 (PT3+PT4+WRT)</option>
                <option value="BOTH">Final Result (Term 1 + Term 2)</option>
                <option value="PT-1">Periodic Test 1 (Out of 20)</option>
                <option value="PT-2">Periodic Test 2 (Out of 20)</option>
                <option value="PT-3">Periodic Test 3 (Out of 20)</option>
                <option value="PT-4">Periodic Test 4 (Out of 20)</option>
              </select>
            </div>

            {/* 4. Student Selector (Active in Single Card Mode) */}
            {viewMode === 'report_card' ? (
              <div className="lg:col-span-4 sm:col-span-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Student (Roll / Name)
                  </label>
                  {currentStudent && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9.5px] text-slate-500 font-semibold">2nd Lang:</span>
                      <button
                        type="button"
                        onClick={() => handleToggleOptionalSubject(currentStudent.admNo, 'Urdu')}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold cursor-pointer transition-all ${
                          currentStudent.optionalSubject === 'Urdu'
                            ? 'bg-[#1b4332] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Set Urdu as opted language"
                      >
                        Urdu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleOptionalSubject(currentStudent.admNo, 'Sanskrit')}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold cursor-pointer transition-all ${
                          currentStudent.optionalSubject === 'Sanskrit'
                            ? 'bg-amber-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Set Sanskrit as opted language"
                      >
                        Sanskrit
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevStudent}
                    disabled={!selectedClass || classRecords.findIndex(s => s.roll === selectedRoll) <= 0}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Previous Student"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>

                  <select
                    id="select-student-roll"
                    value={selectedRoll}
                    disabled={!selectedClass || classRecords.length === 0}
                    onChange={(e) => setSelectedRoll(parseInt(e.target.value))}
                    className="flex-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs truncate disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {!selectedClass ? (
                      <option value="">-- पहले कक्षा चुनें (Select Class First) --</option>
                    ) : (
                      classRecords.map(st => {
                        const rk = rankMap.get(st.admNo)?.rank;
                        return (
                          <option key={st.admNo} value={st.roll}>
                            Roll {st.roll}: {st.name} {rk ? `(Rank #${rk})` : ''} {st.optionalSubject ? `[${st.optionalSubject}]` : ''} - {st.admNo}
                          </option>
                        );
                      })
                    )}
                  </select>

                  <button
                    onClick={handleNextStudent}
                    disabled={classRecords.findIndex(s => s.roll === selectedRoll) >= classRecords.length - 1}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Next Student"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-4 sm:col-span-1 flex items-center justify-end h-full pt-4">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Enrolled Strength</span>
                  <span className="text-sm font-bold text-slate-800">{classRecords.length} Candidates Loaded</span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Custom Subject Checklist (appears when CUSTOM option is chosen) */}
          {selectedSubjectFilter === 'CUSTOM' && (
            <div className="mt-3 p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  Check / Uncheck subjects to include in Class {selectedClass} results:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomSelectedSubjects([...classAllottedSubjects])}
                    className="text-[10.5px] font-bold text-indigo-700 hover:underline cursor-pointer"
                  >
                    Select All ({classAllottedSubjects.length})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setCustomSelectedSubjects([])}
                    className="text-[10.5px] font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {classAllottedSubjects.map((sub) => {
                  const isChecked = customSelectedSubjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setCustomSelectedSubjects(prev => prev.filter(s => s !== sub));
                        } else {
                          setCustomSelectedSubjects(prev => [...prev, sub]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs'
                          : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                        isChecked ? 'bg-white text-indigo-600 font-black' : 'border border-slate-400'
                      }`}>
                        {isChecked ? '✓' : ''}
                      </span>
                      <span>{getFullSubjectName(sub)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Filter Notice if not ALL */}
          {selectedSubjectFilter !== 'ALL' && (
            <div className="mt-2.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <span className="font-bold">Active Filter:</span>
                <span>
                  Results generated for{' '}
                  <span className="font-bold underline">
                    {activeSubjects.length} subject(s)
                  </span>{' '}
                  ({activeSubjects.map(s => getFullSubjectName(s)).join(', ')})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSubjectFilter('ALL');
                  setCustomSelectedSubjects([...classAllottedSubjects]);
                }}
                className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded text-[10.5px] font-bold cursor-pointer transition-colors"
              >
                Reset to All Subjects
              </button>
            </div>
          )}
        </div>

        {/* Content Views */}
        {isLoading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Calculating marks and preparing report sheets...</p>
          </div>
        ) : !selectedClass ? (
          <div className="no-print bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-14 text-center max-w-xl mx-auto my-8 shadow-sm space-y-5 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
              <BookOpen className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-serif text-slate-900">
                कृपया कक्षा (Class) का चयन करें
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                ऊपर दिए गए ड्रॉपडाउन मेनू से किसी कक्षा को चुनें। जब आप ड्रॉपडाउन मेनू में किसी कक्षा को चुनेंगे, केवल तभी उस कक्षा से संबंधित विद्यार्थियों का विवरण, रिपोर्ट कार्ड, प्रवेश पत्र (Admit Card), एवं सारणीयन रजिस्टर नीचे दिखाई देगा।
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                कक्षा चुनें (Select Class)
              </label>
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
                {classesList.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedClass(c);
                      setSelectedRoll(1);
                    }}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    Class {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 1: SINGLE REPORT CARD (Default Hidden / Collapsible Preview for Clean GUI) */}
            {viewMode === 'report_card' && currentStudent && (
              <div className="space-y-4">
                {/* Candidate Summary Card (Always clean & informative on screen) */}
                <div className="no-print bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-950 to-indigo-800 text-amber-300 font-black text-lg flex items-center justify-center shadow-xs border border-indigo-700 shrink-0">
                        {currentStudent.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900">
                            {currentStudent.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Roll #{currentStudent.roll}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            Adm: {currentStudent.admNo}
                          </span>
                          {rankMap.get(currentStudent.admNo)?.rank && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Rank #{rankMap.get(currentStudent.admNo)?.rank}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span>Class: <strong>{currentStudent.studentClass}</strong></span>
                          <span>•</span>
                          <span>Father: <strong>{currentStudent.fatherName || 'N/A'}</strong></span>
                          <span>•</span>
                          <span>Mother: <strong>{currentStudent.motherName || 'N/A'}</strong></span>
                          {currentStudent.optionalSubject && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-bold">2nd Lang: {currentStudent.optionalSubject}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Academic Snapshot */}
                    {studentSummary && (
                      <div className="flex items-center gap-2 self-stretch lg:self-auto justify-between lg:justify-end bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <div className="text-center px-3 border-r border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Total Marks</div>
                          <div className="text-sm font-black text-slate-800">
                            {studentSummary.totalObtained} <span className="text-[10px] text-slate-400 font-normal">/ {studentSummary.maxMarks}</span>
                          </div>
                        </div>
                        <div className="text-center px-3 border-r border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Percentage</div>
                          <div className="text-sm font-black text-indigo-700">
                            {studentSummary.percentage}%
                          </div>
                        </div>
                        <div className="text-center px-3 border-r border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Grade</div>
                          <div className="text-sm font-black text-emerald-700">
                            {studentSummary.grade}
                          </div>
                        </div>
                        <div className="text-center px-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Status</div>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            studentSummary.resultStatus === 'PASS' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {studentSummary.resultStatus}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="pt-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Evaluation: <strong>{examMode === 'BOTH' ? 'Final Dual Result' : examMode === 'HY' ? 'Term 1' : examMode === 'AE' ? 'Term 2' : examMode}</strong> &bull; {isPreviewExpanded ? 'Report card preview is expanded below.' : 'Preview collapsed to keep workspace uncluttered.'}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        id="btn-toggle-preview-accordion"
                        type="button"
                        onClick={() => setIsPreviewExpanded(prev => !prev)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          isPreviewExpanded
                            ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isPreviewExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Hide Report Card Preview</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Generate &amp; View Report Card</span>
                          </>
                        )}
                      </button>

                      <button
                        id="btn-open-fullscreen-modal"
                        type="button"
                        onClick={() => setIsFullScreenModalOpen(true)}
                        className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Open Full Screen Interactive Modal Preview"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Full-Screen Modal</span>
                      </button>

                      <button
                        id="btn-quick-download-card"
                        type="button"
                        onClick={() => handleDownloadSinglePdf(currentStudent)}
                        className="px-3.5 py-2 text-xs font-bold bg-[#1b4332] hover:bg-[#153527] text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Download Official A4 Report Card as PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-300" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collapsible Report Card Preview Container */}
                <div className={isPreviewExpanded ? 'block' : 'hidden print:block'}>
                  {isPreviewExpanded && (
                    <div className="no-print bg-gradient-to-r from-indigo-950 to-indigo-900 text-white rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 shadow-md border border-indigo-800 mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-300" />
                        <span className="text-xs font-bold">
                          Official Report Card Preview &bull; Roll #{selectedRoll}: {currentStudent.name} (Class {selectedClass})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleGlobalBarGraph()}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                            showBarGraph ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                          }`}
                        >
                          <BarChart2 className="w-3 h-3" />
                          <span>{showBarGraph ? 'Graph: ON' : 'Graph: OFF'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsFullScreenModalOpen(true)}
                          className="px-2.5 py-1 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 text-white flex items-center gap-1 transition-colors cursor-pointer"
                          title="Open full screen view"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Full Screen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSinglePdf(currentStudent)}
                          className="px-3 py-1 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          title="Download Report Card as PDF"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download PDF</span>
                        </button>
                        <button
                          id="btn-collapse-preview-bar"
                          type="button"
                          onClick={() => setIsPreviewExpanded(false)}
                          className="px-2.5 py-1 text-xs font-medium bg-white/15 hover:bg-white/25 rounded-lg text-indigo-100 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Hide Preview</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <ReportCard
                    student={currentStudent}
                    subjects={activeSubjects}
                    examMode={examMode}
                    rank={rankMap.get(currentStudent.admNo)?.rank}
                    workingDaysHY={systemConfig.workingDaysHY}
                    workingDaysAE={systemConfig.workingDaysAE}
                    showBarGraphProp={showBarGraph}
                  />
                </div>
              </div>
            )}

            {/* VIEW 2: BATCH PRINT ALL CLASS CARDS */}
            {viewMode === 'bulk_cards' && (
              <div className="space-y-6">
                {/* 1. Class Batch Summary & Control Card (Clean, Uncluttered, Comprehensive) */}
                <div className="no-print bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0 border border-emerald-500/30">
                        {selectedClass}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                            Batch Print Center &bull; Class {selectedClass}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                            {classRecords.length} Students Total
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          <span>{ACADEMIC_SESSION}</span>
                          <span>&bull;</span>
                          <span className="font-semibold text-slate-700">
                            Evaluation: {examMode === 'BOTH' ? 'Final Dual Result' : examMode === 'HY' ? 'Term 1 (PT1+PT2+HY)' : examMode === 'AE' ? 'Term 2 (PT3+PT4+AE)' : examMode}
                          </span>
                          <span>&bull;</span>
                          <span>{activeSubjects.length} Active Subjects</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Batch Academic Snapshot */}
                    {batchClassSummary && (
                      <div className="flex items-center gap-2 self-stretch lg:self-auto justify-between lg:justify-end bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <div className="text-center px-3 border-r border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Total Enrolled</div>
                          <div className="text-sm font-black text-slate-800">
                            {batchClassSummary.totalStudents}
                          </div>
                        </div>
                        <div className="text-center px-3 border-r border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Print Selected</div>
                          <div className="text-sm font-black text-emerald-700">
                            {selectedBatchStudents.length} <span className="text-[10px] text-slate-400 font-normal">/ {classRecords.length}</span>
                          </div>
                        </div>
                        <div className="text-center px-3 border-r border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Class Average</div>
                          <div className="text-sm font-black text-indigo-700">
                            {batchClassSummary.avgPct}%
                          </div>
                        </div>
                        <div className="text-center px-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Passed / Re-exam</div>
                          <div className="text-xs font-bold text-slate-700">
                            <span className="text-emerald-700 font-black">{batchClassSummary.passCount} Pass</span>
                            {batchClassSummary.failCount > 0 && (
                              <span className="text-rose-600 font-black ml-1">({batchClassSummary.failCount})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Range & Selective Filtering Row */}
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Print Range:</span>
                      </span>

                      <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
                        <span className="text-slate-400 text-[11px]">Roll</span>
                        <input
                          type="number"
                          min="1"
                          max={classRecords.length}
                          value={batchRangeFrom}
                          onChange={(e) => setBatchRangeFrom(e.target.value)}
                          className="w-12 text-center text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600 border-b border-slate-200"
                          placeholder="1"
                        />
                        <span className="text-slate-400 text-[11px]">to</span>
                        <input
                          type="number"
                          min="1"
                          max={classRecords.length}
                          value={batchRangeTo}
                          onChange={(e) => setBatchRangeTo(e.target.value)}
                          className="w-12 text-center text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600 border-b border-slate-200"
                          placeholder={String(classRecords.length)}
                        />
                        <button
                          type="button"
                          onClick={handleApplyBatchRange}
                          className="ml-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] cursor-pointer transition-colors shadow-2xs"
                        >
                          Apply
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleSelectAllBatch}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer transition-colors shadow-2xs"
                      >
                        Select All ({classRecords.length})
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllBatch}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer transition-colors shadow-2xs"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium">
                      {selectedBatchStudents.length === classRecords.length ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5" /> All {classRecords.length} students selected for batch printing
                        </span>
                      ) : (
                        <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          Selective Print: {selectedBatchStudents.length} of {classRecords.length} students ({classRecords.length - selectedBatchStudents.length} excluded)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Primary Action Controls Row */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {isBatchPreviewExpanded 
                          ? 'Batch cards preview is expanded below with individual student action bars.' 
                          : 'Cards preview collapsed for optimal speed. Click "Generate & View Batch Cards" to preview.'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 1. Toggle Accordion Preview Button */}
                      <button
                        id="btn-toggle-batch-preview-accordion"
                        type="button"
                        onClick={() => setIsBatchPreviewExpanded(prev => !prev)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          isBatchPreviewExpanded
                            ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isBatchPreviewExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Hide Batch Preview</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Generate &amp; View Batch Cards ({selectedBatchStudents.length})</span>
                          </>
                        )}
                      </button>

                      {/* 2. Global Bar Graph Toggle */}
                      <button
                        id="btn-batch-toggle-bargraph"
                        type="button"
                        onClick={handleToggleGlobalBarGraph}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                          showBarGraph
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                        }`}
                        title="Toggle Subject Bar Graph across all batch cards"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{showBarGraph ? 'Marks Bar Graph: ON' : 'Marks Bar Graph: OFF'}</span>
                      </button>

                      {/* 3. Full-Screen Interactive Batch Modal */}
                      <button
                        id="btn-open-batch-fullscreen-modal"
                        type="button"
                        onClick={() => {
                          setModalActiveRoll(selectedRoll || 1);
                          setIsFullScreenModalOpen(true);
                        }}
                        className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Open Full Screen Interactive Modal to navigate all student cards"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Full-Screen Modal</span>
                      </button>

                      {/* 4. Direct Batch PDF Download */}
                      <button
                        id="btn-download-batch-pdf"
                        type="button"
                        onClick={handleDownloadBatchPdf}
                        disabled={isGeneratingBatchPdf || selectedBatchStudents.length === 0}
                        className="px-4 py-2 text-xs font-bold text-white bg-[#1b4332] hover:bg-[#153527] rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Download multi-page PDF with all selected report cards"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isGeneratingBatchPdf ? 'Generating PDF...' : `Download Batch PDF (${selectedBatchStudents.length})`}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Collapsible Batch Report Cards Preview Container */}
                <div className={isBatchPreviewExpanded ? 'block' : 'hidden print:block'}>
                  {isBatchPreviewExpanded && (
                    <div className="no-print bg-gradient-to-r from-[#1b4332] to-[#153527] text-white rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 shadow-md border border-emerald-900/40 mb-4 sticky top-18 z-20">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-300" />
                        <span className="text-xs font-bold">
                          Batch Report Cards Preview &bull; {selectedBatchStudents.length} of {classRecords.length} Cards Visible (Class {selectedClass})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleGlobalBarGraph()}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                            showBarGraph ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                          }`}
                        >
                          <BarChart2 className="w-3 h-3" />
                          <span>{showBarGraph ? 'Graph: ON' : 'Graph: OFF'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadBatchPdf()}
                          disabled={isGeneratingBatchPdf}
                          className="px-2.5 py-1 text-xs font-medium bg-teal-600/80 hover:bg-teal-500 rounded-lg border border-teal-400/40 text-white flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalActiveRoll(selectedRoll || 1);
                            setIsFullScreenModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 text-white flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Full Screen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBatchPreviewExpanded(false)}
                          className="px-2.5 py-1 text-xs font-medium bg-white/15 hover:bg-white/25 rounded-lg text-emerald-100 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Hide Preview</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-8 print:space-y-0">
                    {classRecords.map(st => {
                      const isIncluded = selectedBatchStudents.includes(st.admNo);
                      const shouldPrint = isIncluded;
                      const studentActiveSubs = getStudentSubjects(st, activeSubjects);
                      const stSummary = computeStudentSummary(st, studentActiveSubs, examMode, systemConfig.workingDaysHY, systemConfig.workingDaysAE);

                      return (
                        <div 
                          key={st.admNo} 
                          className={`result-card-print ${!shouldPrint ? 'print:hidden' : ''} ${!isIncluded ? 'no-print' : ''}`}
                        >
                          {/* Screen Card Toolbar for Each Student in Batch */}
                          {isIncluded ? (
                            <div className="no-print bg-slate-100 border border-slate-300 rounded-t-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs mb-0">
                              <div className="flex items-center gap-2.5">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isIncluded}
                                    onChange={() => handleToggleBatchStudent(st.admNo)}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                  />
                                  <span className="text-xs font-bold text-slate-800">
                                    Roll #{st.roll}: {st.name}
                                  </span>
                                </label>
                                <span className="text-[11px] text-slate-400 font-mono">Adm: {st.admNo}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  stSummary.resultStatus === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {stSummary.percentage}% &bull; Grade {stSummary.grade}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadSinglePdf(st)}
                                  className="px-2.5 py-1 bg-[#1b4332] hover:bg-[#153527] text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                  title="Download individual PDF for this student"
                                >
                                  <Download className="w-3 h-3 text-amber-300" />
                                  <span>Download PDF</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalActiveRoll(st.roll);
                                    setIsFullScreenModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View full screen modal"
                                >
                                  <Maximize2 className="w-3 h-3 text-slate-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRoll(st.roll);
                                    setViewMode('report_card');
                                  }}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Open in Single Report Card view"
                                >
                                  <span>Single View</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="no-print bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 flex items-center justify-between text-xs text-slate-500">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={false}
                                  onChange={() => handleToggleBatchStudent(st.admNo)}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                />
                                <span className="font-semibold text-slate-600">
                                  Roll #{st.roll}: {st.name} (Adm: {st.admNo}) &mdash; <strong className="text-amber-800 font-bold">Excluded from batch print</strong>
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleToggleBatchStudent(st.admNo)}
                                className="text-emerald-700 font-bold hover:underline cursor-pointer text-[11px]"
                              >
                                Include in Batch
                              </button>
                            </div>
                          )}

                          {/* The Card Component */}
                          {isIncluded && (
                            <ReportCard
                              student={st}
                              subjects={activeSubjects}
                              examMode={examMode}
                              rank={rankMap.get(st.admNo)?.rank}
                              workingDaysHY={systemConfig.workingDaysHY}
                              workingDaysAE={systemConfig.workingDaysAE}
                              hideControls={true}
                              showBarGraphProp={showBarGraph}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 0: STUDENT MANAGEMENT SYSTEM (स्टूडेंट मैनेजमेंट) */}
            {viewMode === 'student_management' && (
              <StudentManagementView
                selectedClass={selectedClass}
                onClassChange={(cls) => {
                  setSelectedClass(cls);
                  setSelectedRoll(1);
                }}
                students={classRecords}
                allottedSubjects={classAllottedSubjects}
                examMode={examMode}
                workingDaysHY={systemConfig.workingDaysHY}
                workingDaysAE={systemConfig.workingDaysAE}
                scriptUrl={scriptUrl}
                onUpdateStudent={handleUpdateStudent}
                onAddStudent={handleAddStudent}
                onDeleteStudent={handleDeleteStudent}
                onRefreshFromSheet={() => loadClassData(selectedClass, true)}
                onViewReportCard={(roll) => {
                  setSelectedRoll(roll);
                  setViewMode('report_card');
                }}
                onViewAdmitCard={(roll) => {
                  setSelectedRoll(roll);
                  setViewMode('admit_card');
                }}
                onOpenTroubleshooter={() => setIsDiagnosticModalOpen(true)}
              />
            )}

            {/* VIEW 3: CLASS TABULATION SHEET */}
            {viewMode === 'tabulation_sheet' && (
              <TabulationSheet
                classLevel={selectedClass}
                students={classRecords}
                subjects={activeSubjects}
                examMode={examMode}
                workingDaysHY={systemConfig.workingDaysHY}
                workingDaysAE={systemConfig.workingDaysAE}
                onSelectStudent={(st) => {
                  setSelectedRoll(st.roll);
                  setViewMode('report_card');
                }}
              />
            )}

            {/* VIEW 4: PROGRESS DASHBOARD */}
            {viewMode === 'dashboard' && (
              <ClassProgressDashboard
                onSelectClass={(cls) => {
                  setSelectedClass(cls);
                  setViewMode('report_card');
                }}
                systemConfig={systemConfig}
                activeClass={selectedClass}
                subjectAllotments={subjectAllotments}
              />
            )}

            {/* VIEW 5: ADMIT CARD GENERATOR */}
            {viewMode === 'admit_card' && (
              <AdmitCardGenerator
                selectedClass={selectedClass as ClassLevel}
                students={classRecords}
                onUpdateStudentPhoto={handleUpdateStudentPhoto}
                subjectAllotments={subjectAllotments}
                classAllottedSubjects={classAllottedSubjects}
              />
            )}
          </>
        )}

        {/* Bottom Status & Logout Bar (Result Generator Sabse Neeche Last Me) */}
        <div className="mt-8 pt-4 pb-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs bg-white/80 backdrop-blur-xs rounded-2xl p-4 border border-slate-200/80 shadow-xs no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">प्रशासक सत्र (Admin Session Active)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">लॉगिन सक्रिय</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Peace International School &bull; Office Master &amp; Result Control Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {onSwitchToMarkUpdation && (
              <button
                type="button"
                onClick={onSwitchToMarkUpdation}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>मार्क्स एंट्री पोर्टल (Marks Portal)</span>
              </button>
            )}

            {onSignOutAdmin && (
              <button
                id="btn-page-bottom-logout"
                type="button"
                onClick={onSignOutAdmin}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md active:scale-95"
              >
                <LogOut className="w-4 h-4 text-white" />
                <span>लॉगआउट (Logout Admin)</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Admin Settings Modal */}
      <AdminSettingsModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        config={systemConfig}
        onSaveConfig={onUpdateSystemConfig}
        scriptUrl={scriptUrl}
        onSaveScriptUrl={onUpdateScriptUrl}
        onOpenSubjectAllotment={() => setIsSubjectAllotmentModalOpen(true)}
        adminPin={adminPin}
        onChangeAdminPin={onChangeAdminPin}
      />

      <CorrectionRequestsModal
        isOpen={isCorrectionRequestsOpen}
        onClose={() => setIsCorrectionRequestsOpen(false)}
        requests={correctionRequests}
        onReview={(id, status) => onReviewCorrection?.(id, status)}
      />

      {/* Class Subject Allotment Modal (Governs Marks Updation & Results) */}
      <ClassSubjectAllotmentModal
        isOpen={isSubjectAllotmentModalOpen}
        onClose={() => setIsSubjectAllotmentModalOpen(false)}
        subjectAllotments={subjectAllotments || {}}
        onSaveSubjectAllotments={(newMap) => {
          if (onUpdateSubjectAllotments) {
            onUpdateSubjectAllotments(newMap);
          }
        }}
        initialClass={selectedClass || '5'}
        onSwitchToMarkUpdation={onSwitchToMarkUpdation}
      />

      {/* Teacher Link & Google Sheet Synchronization Hub Modal */}
      <TeacherLinkSyncHubModal
        isOpen={isTeacherLinkHubOpen}
        onClose={() => setIsTeacherLinkHubOpen(false)}
        scriptUrl={scriptUrl}
        systemConfig={systemConfig}
        onUpdateSystemConfig={onUpdateSystemConfig}
        onTriggerSync={handleRefresh}
        isSyncing={isLoading}
        lastSyncedTime={lastSyncedTime}
        totalStudentsLoaded={classRecords.length}
        onOpenSheetStructure={() => setIsSheetStructureOpen(true)}
      />

      {/* Google Sheets & MS Excel Structure & Workbook Center Modal */}
      <GoogleSheetStructureModal
        isOpen={isSheetStructureOpen}
        onClose={() => setIsSheetStructureOpen(false)}
        selectedClass={selectedClass || '5'}
        onClassChange={(cls) => {
          setSelectedClass(cls);
          setSelectedRoll(1);
        }}
        subjectAllotments={subjectAllotments || {}}
        onImportStudentsToClass={handleImportStudentsToClass}
        googleSheetApiUrl={scriptUrl}
      />

      {/* Google Sheet Diagnostic & Troubleshooter Modal */}
      <GoogleSheetDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        scriptUrl={scriptUrl}
        onSaveScriptUrl={(newUrl) => {
          onUpdateScriptUrl(newUrl);
          loadClassData(selectedClass, true);
        }}
        activeClass={selectedClass}
        onForceSync={(cls) => loadClassData(cls, true)}
      />

      {/* Interactive Full-Screen Modal Preview Overlay */}
      {isFullScreenModalOpen && (() => {
        const activeRoll = modalActiveRoll ?? selectedRoll ?? 1;
        const modalStudent = classRecords.find(st => st.roll === activeRoll) || currentStudent || classRecords[0];
        if (!modalStudent) return null;

        const currentStudentIndex = classRecords.findIndex(st => st.roll === modalStudent.roll);
        const hasPrev = currentStudentIndex > 0;
        const hasNext = currentStudentIndex < classRecords.length - 1;

        const handleModalPrev = () => {
          if (hasPrev) {
            setModalActiveRoll(classRecords[currentStudentIndex - 1].roll);
          }
        };

        const handleModalNext = () => {
          if (hasNext) {
            setModalActiveRoll(classRecords[currentStudentIndex + 1].roll);
          }
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-5 no-print animate-fade-in">
            <div className="w-full max-w-5xl bg-indigo-950 text-white rounded-t-2xl px-4 py-3 flex items-center justify-between border-b border-indigo-800 sticky top-0 z-10 shadow-xl">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <span>Official Report Card Modal Preview &bull; {modalStudent.name} (Roll #{modalStudent.roll})</span>
                    <span className="text-[10px] bg-indigo-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                      {currentStudentIndex + 1} of {classRecords.length}
                    </span>
                  </h4>
                  <p className="text-[11px] text-indigo-200">
                    Class {selectedClass} &bull; {examMode === 'BOTH' ? 'Final Dual Result' : examMode === 'HY' ? 'Term 1' : examMode === 'AE' ? 'Term 2' : examMode} &bull; Mode: {viewMode === 'bulk_cards' ? 'Batch Cards View' : 'Single Card View'}
                  </p>
                </div>
              </div>

              {/* Navigation & Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Student Switcher for Class */}
                {classRecords.length > 1 && (
                  <div className="flex items-center bg-indigo-900/90 border border-indigo-700/80 rounded-lg p-0.5">
                    <button
                      type="button"
                      disabled={!hasPrev}
                      onClick={handleModalPrev}
                      className="p-1 text-slate-300 hover:text-white disabled:opacity-30 rounded hover:bg-indigo-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Previous Student"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <select
                      value={modalStudent.roll}
                      onChange={(e) => setModalActiveRoll(Number(e.target.value))}
                      className="bg-transparent text-white text-xs font-semibold px-2 py-0.5 focus:outline-none cursor-pointer"
                    >
                      {classRecords.map(s => (
                        <option key={s.admNo} value={s.roll} className="bg-indigo-950 text-white">
                          Roll #{s.roll} &bull; {s.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!hasNext}
                      onClick={handleModalNext}
                      className="p-1 text-slate-300 hover:text-white disabled:opacity-30 rounded hover:bg-indigo-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Next Student"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Toggle Bar Graph Button in Modal */}
                <button
                  type="button"
                  onClick={handleToggleGlobalBarGraph}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                    showBarGraph ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                  title="Toggle Bar Graph on card"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>{showBarGraph ? 'Graph: ON' : 'Graph: OFF'}</span>
                </button>

                {/* Download PDF for Active Student */}
                <button
                  type="button"
                  onClick={() => handleDownloadSinglePdf(modalStudent)}
                  className="px-2.5 py-1.5 text-xs font-bold bg-[#1b4332] hover:bg-[#153527] text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Download individual PDF for this student"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                {/* If in Batch Mode, option to Download Batch PDF */}
                {viewMode === 'bulk_cards' && (
                  <button
                    type="button"
                    onClick={() => handleDownloadBatchPdf()}
                    disabled={isGeneratingBatchPdf || selectedBatchStudents.length === 0}
                    className="px-2.5 py-1.5 text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    title="Download batch PDF with all selected cards"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-300" />
                    <span>Download Batch PDF ({selectedBatchStudents.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsFullScreenModalOpen(false)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="w-full max-w-5xl bg-slate-200/90 p-2 sm:p-6 rounded-b-2xl shadow-2xl flex justify-center overflow-x-auto">
              <ReportCard
                student={modalStudent}
                subjects={activeSubjects}
                examMode={examMode}
                rank={rankMap.get(modalStudent.admNo)?.rank}
                workingDaysHY={systemConfig.workingDaysHY}
                workingDaysAE={systemConfig.workingDaysAE}
                showBarGraphProp={showBarGraph}
              />
            </div>
          </div>
        );
      })()}

      {/* Batch PDF Generation Progress Overlay */}
      {isGeneratingBatchPdf && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center animate-pulse">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Generating Batch A4 PDF</h3>
              <p className="text-xs text-slate-500 mt-1">
                Rendering crisp high-resolution cards for Class {selectedClass}...
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Rendering Progress</span>
                <span className="font-mono text-emerald-700">
                  {batchPdfProgress?.current || 0} / {batchPdfProgress?.total || selectedBatchStudents.length}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                  style={{ 
                    width: `${batchPdfProgress && batchPdfProgress.total > 0 ? (batchPdfProgress.current / batchPdfProgress.total) * 100 : 10}%` 
                  }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Please wait while the multi-page PDF document is being created.
            </p>
          </div>
        </div>
      )}
      {/* Floating Mobile Left Navigation Trigger (always accessible on phones) */}
      {!isMobileSidebarOpen && (
        <button
          id="btn-floating-mobile-sidebar"
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="lg:hidden fixed bottom-5 left-4 z-40 bg-gradient-to-r from-indigo-950 to-slate-900 text-amber-300 border-2 border-amber-400/80 rounded-full px-4 py-2.5 flex items-center gap-2 shadow-2xl font-bold text-xs active:scale-95 transition-all cursor-pointer shadow-indigo-950/60"
          title="Open Left Navigation Panel"
        >
          <PanelLeft className="w-4 h-4 text-amber-400" />
          <span>नेविगेशन पैनल</span>
        </button>
      )}
    </div>
  );
};
