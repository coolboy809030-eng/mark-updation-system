import { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import {
  EntryType,
  ClassLevel,
  ExamType,
  SegmentType,
  Student,
  AppSettings,
  SheetSubmissionRecord,
  TeacherAllotment,
  TeacherAccount
} from './types';
import { SystemControlConfig, ClassSubjectAllotmentMap } from './types/resultTypes';
import { DEFAULT_STUDENTS_BY_CLASS, SUBJECTS_BY_CLASS } from './data/schoolConfig';
import { Header } from './components/Header';
import { ControlPanel, CLASS_OPTIONS } from './components/ControlPanel';
import { MarksTable } from './components/MarksTable';
import { PasswordModal } from './components/PasswordModal';
import { SettingsModal } from './components/SettingsModal';
import { GuideModal } from './components/GuideModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import {
  isAdminAuthenticated as readAdminSessionState,
  createAdminSession,
  clearAdminSession,
  validateAdminSession
} from './utils/adminSession';
import { exportMarksToCsv } from './utils/csvExport';
import { fetchClassResultsFromGoogle } from './utils/googleSheetFetcher';

const ResultGeneratorApp = lazy(() =>
  import('./components/result/ResultGeneratorApp').then(module => ({
    default: module.ResultGeneratorApp
  }))
);
import { detectStudentOptionalSubject, isStudentOptedForSubject } from './utils/studentSubjectDetector';
import { instantSyncBridge } from './utils/instantSyncBridge';
import {
  getMarkStatuses,
  saveMarkStatus
} from './utils/marksStatus';
import { isMarksDeadlinePassed } from './utils/marksDeadline';
import {
  AttendanceStatus,
  loadAttendanceValues,
  saveAttendanceRecord
} from './utils/attendance';
import {
  CorrectionRequest,
  createCorrectionRequest,
  loadCorrectionRequests,
  saveCorrectionRequests
} from './utils/correctionRequests';
import { getStudentURN, getIdentityDiagnostics, normalizeURN, migrateDraftValuesToURN } from './utils/studentIdentity';
import { loadCanonicalCurriculum, saveCanonicalCurriculum } from './utils/subjectCurriculum';
import {
  createBackendRequestContext,
  validateTeacherRequestContext,
  validateProtectedStudentMutation,
  buildProtectedPayload
} from './utils/backendSecurity';
import {
  loadTeacherAccounts,
  saveTeacherAccounts,
  loadTeacherAllotments,
  saveTeacherAllotments,
  syncAllotmentsWithTeacherAccounts,
  hasTeacherPermission,
  getTeacherAuthorizedClasses,
  getTeacherAuthorizedSections,
  getTeacherAuthorizedSubjects
} from './utils/teacherAccount';
import { getEffectiveGasUrl } from './config/appConfig';
import { fetchTeacherRegistryFromGAS, saveTeacherRegistryToGAS } from './services/teacherSyncService';
import {
  CheckCircle2,
  AlertCircle,
  Layers,
  Clock,
  Users,
  Settings,
  UserCheck,
  BookOpen,
  Shield
} from 'lucide-react';

const SETTINGS_STORAGE_KEY = 'pis_markupdation_settings_v1';
const SYSTEM_CONFIG_STORAGE_KEY = 'pis_system_control_v1';
const SUBJECT_ALLOTMENTS_STORAGE_KEY = 'pis_class_subject_allotments_v1';
const ADMIN_SESSION_KEY = 'pis_admin_session_auth_v1';
const ADMIN_PIN_STORAGE_KEY = 'pis_admin_master_pin_v1';
const SEGMENT_LOCKS_STORAGE_KEY = 'pis_segment_locks_v1';
const TEACHER_ALLOTMENTS_STORAGE_KEY = 'pis_teacher_allotments_v1';
const ADMIT_CARD_ALLOTMENTS_STORAGE_KEY = 'pis_admit_card_allotments_v1';

export default function App() {
  // Read URL query parameters for routing
  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const isExplicitTeacher =
    searchParams.get('portal') === 'teacher' ||
    searchParams.get('mode') === 'teacher';

  const isExplicitAdmin =
    searchParams.get('portal') === 'admin' ||
    searchParams.get('admin') === 'true' ||
    searchParams.get('admin') === '1';

  const isExplicitResultGen =
    searchParams.get('app') === 'result_generator' ||
    searchParams.get('portal') === 'result';

  // ------------------------------------------------------------
  // ADMIN SESSION AUTHENTICATION
  // ------------------------------------------------------------
  const [isAdminAuthenticatedState, setIsAdminAuthenticatedState] = useState<boolean>(() => {
    if (isExplicitTeacher) return false;
    return readAdminSessionState();
  });

  const isAdminAuthenticatedFlag = isAdminAuthenticatedState && validateAdminSession();

  // ------------------------------------------------------------
  // APP SELECTION
  // Unauthenticated users stay in Mark Entry until Admin login.
  // ------------------------------------------------------------
  const [activeApp, setActiveApp] = useState<'result_generator' | 'mark_updation'>(() => {
    if (isExplicitTeacher) return 'mark_updation';

    // Explicit admin/result request must authenticate first.
    if (isExplicitAdmin || isExplicitResultGen) {
      return 'mark_updation';
    }

    // Normal workspace starts in Mark Entry.
    return 'mark_updation';
  });

  useEffect(() => {
    if (isExplicitTeacher) {
      setIsAdminAuthenticatedState(false);
      return;
    }

    const syncAdminSession = () => {
      const valid = validateAdminSession();
      setIsAdminAuthenticatedState(prev => {
        if (prev === valid) return prev;
        return valid;
      });

      if (!valid && activeApp === 'result_generator') {
        setActiveApp('mark_updation');
      }
    };

    syncAdminSession();
    const interval = window.setInterval(syncAdminSession, 30000);

    return () => window.clearInterval(interval);
  }, [isExplicitTeacher, activeApp]);

  // ------------------------------------------------------------
  // ADMIN LOGIN MODAL
  // ------------------------------------------------------------
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(() => {
    return (
      (isExplicitAdmin || isExplicitResultGen) &&
      !isAdminAuthenticatedFlag &&
      !isExplicitTeacher
    );
  });

  const [adminPin, setAdminPin] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_PIN_STORAGE_KEY);

      if (saved && saved.trim()) {
        return saved.trim();
      }
    } catch {
      // ignore
    }

    // No insecure hardcoded Admin PIN.
    return '';
  });

  // ------------------------------------------------------------
  // ADMIN LOGIN SUCCESS
  // ------------------------------------------------------------
  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticatedState(true);
    createAdminSession();

    setActiveApp('result_generator');
    setIsAdminLoginOpen(false);
    setIsSettingsOpen(false);
  };

  // ------------------------------------------------------------
  // OPEN ADMIN / RESULT GENERATOR
  // ------------------------------------------------------------
  const handleOpenAdminLogin = () => {
    if (isAdminAuthenticatedFlag) {
      setActiveApp('result_generator');
      return;
    }

    setIsAdminLoginOpen(true);
  };

  const handleOpenResultGenerator = () => {
    if (isAdminAuthenticatedFlag) {
      setActiveApp('result_generator');
      return;
    }

    setIsAdminLoginOpen(true);
  };

  // ------------------------------------------------------------
  // ADMIN SIGN OUT
  // ------------------------------------------------------------
  const handleAdminSignOut = () => {
    setIsAdminAuthenticatedState(false);
    clearAdminSession();
    setActiveApp('mark_updation');
  };

  // ------------------------------------------------------------
  // SYSTEM CONFIGURATION
  // ------------------------------------------------------------
  const [systemConfig, setSystemConfig] = useState<SystemControlConfig>(() => {
    try {
      const saved = localStorage.getItem(SYSTEM_CONFIG_STORAGE_KEY);

      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }

    return {
      marksEntryStatus: 'ON',
      marksEntryDeadline: '',
      workingDaysHY: 110,
      workingDaysAE: 115
    };
  });

  const handleUpdateSystemConfig = (newCfg: SystemControlConfig) => {
    setSystemConfig(newCfg);
    localStorage.setItem(
      SYSTEM_CONFIG_STORAGE_KEY,
      JSON.stringify(newCfg)
    );
  };

  // ------------------------------------------------------------
  // CANONICAL CLASS SUBJECT CURRICULUM
  // ------------------------------------------------------------
  const [subjectAllotments, setSubjectAllotments] =
    useState<ClassSubjectAllotmentMap>(() => {
      const loaded = loadCanonicalCurriculum();

      if (loaded.notices.length > 0) {
        console.info(
          '[Curriculum Loader]',
          loaded.notices.join(' | ')
        );
      }

      return loaded.curriculum;
    });

  const handleUpdateSubjectAllotments = (
    newAllotments: ClassSubjectAllotmentMap
  ) => {
    setSubjectAllotments(newAllotments);
    saveCanonicalCurriculum(newAllotments);

    showNotification(
      'success',
      'कक्षा पाठ्यक्रम व विषय आवंटन अपडेट कर दिया गया!'
    );
  };

  useEffect(() => {
    const onCurriculumUpdated = (e: any) => {
      if (e.detail && e.detail.curriculum) {
        setSubjectAllotments(e.detail.curriculum);
      }
    };

    window.addEventListener(
      'school_curriculum_updated',
      onCurriculumUpdated
    );

    return () => {
      window.removeEventListener(
        'school_curriculum_updated',
        onCurriculumUpdated
      );
    };
  }, []);

  // ------------------------------------------------------------
  // SETTINGS
  // ------------------------------------------------------------
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          googleSheetApiUrl: getEffectiveGasUrl(parsed?.googleSheetApiUrl)
        };
      }
    } catch {
      // fallback
    }

    return {
      googleSheetApiUrl: getEffectiveGasUrl(),
      lockPassword: '1234',
      studentsPerPage: 20,
      isOfflineDemo: false
    };
  });

  // ------------------------------------------------------------
  // SEGMENT LOCKS
  // ------------------------------------------------------------
  const [segmentLocks, setSegmentLocks] =
    useState<Record<string, boolean>>(() => {
      try {
        const saved = localStorage.getItem(
          SEGMENT_LOCKS_STORAGE_KEY
        );

        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // fallback
      }

      return {
        'PT-1': false,
        'PT-2': false,
        'HY': false,
        'PT-3': false,
        'PT-4': false,
        'AE': false,
        attendance: false
      };
    });

  const handleUpdateSegmentLocks = (
    newLocks: Record<string, boolean>
  ) => {
    setSegmentLocks(newLocks);

    localStorage.setItem(
      SEGMENT_LOCKS_STORAGE_KEY,
      JSON.stringify(newLocks)
    );

    showNotification(
      'success',
      'सेगमेंट सुरक्षा लॉक सेटिंग्स अपडेट कर दी गई हैं!'
    );
  };

  // ------------------------------------------------------------
  // TEACHER ACCOUNTS (Cross-Device with Google Sheet _TEACHERS)
  // ------------------------------------------------------------
  const [teacherAccounts, setTeacherAccounts] =
    useState<TeacherAccount[]>(() => {
      return loadTeacherAccounts();
    });

  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>(() => loadCorrectionRequests());

  useEffect(() => {
    const refreshCorrections = () => setCorrectionRequests(loadCorrectionRequests());
    window.addEventListener('correction_requests_updated', refreshCorrections);
    return () => window.removeEventListener('correction_requests_updated', refreshCorrections);
  }, []);

  // ------------------------------------------------------------
  // TEACHER ALLOTMENTS / PERMISSIONS
  // ------------------------------------------------------------
  const [teacherAllotments, setTeacherAllotments] =
    useState<TeacherAllotment[]>(() => {
      return loadTeacherAllotments();
    });

  // Cross-device sync from Google Sheet _TEACHERS tab on startup
  useEffect(() => {
    const syncFromCloud = async () => {
      const gasUrl = settings.googleSheetApiUrl;
      if (!gasUrl || gasUrl.includes('PASTE_YOUR')) return;
      try {
        const cloudData = await fetchTeacherRegistryFromGAS(gasUrl);
        if (cloudData.success && cloudData.accounts && cloudData.accounts.length > 0) {
          setTeacherAccounts(cloudData.accounts);
          saveTeacherAccounts(cloudData.accounts);
          if (cloudData.allotments && cloudData.allotments.length > 0) {
            setTeacherAllotments(cloudData.allotments);
            saveTeacherAllotments(cloudData.allotments);
          }
        }
      } catch (e) {
        // Graceful fallback to local cache
      }
    };
    syncFromCloud();
  }, [settings.googleSheetApiUrl]);

  const handleUpdateTeacherAccounts = (
    newAccounts: TeacherAccount[]
  ) => {
    setTeacherAccounts(newAccounts);
    saveTeacherAccounts(newAccounts);

    setTeacherAllotments(prev => {
      const synced = syncAllotmentsWithTeacherAccounts(
        prev,
        newAccounts
      );

      try {
        localStorage.setItem(
          TEACHER_ALLOTMENTS_STORAGE_KEY,
          JSON.stringify(synced)
        );
      } catch {
        // ignore
      }

      // Auto-sync update to Google Sheet _TEACHERS tab
      if (settings.googleSheetApiUrl && !settings.googleSheetApiUrl.includes('PASTE_YOUR')) {
        saveTeacherRegistryToGAS(newAccounts, synced, settings.googleSheetApiUrl).catch(() => {});
      }

      return synced;
    });

    showNotification(
      'success',
      'शिक्षक खाता सूची सफलतापूर्वक अपडेट कर दी गई!'
    );
  };

  useEffect(() => {
    const onAccountsUpdated = (e: any) => {
      if (
        e.detail &&
        Array.isArray(e.detail.accounts)
      ) {
        setTeacherAccounts(e.detail.accounts);
      }
    };

    window.addEventListener(
      'teacher_accounts_updated',
      onAccountsUpdated
    );

    return () => {
      window.removeEventListener(
        'teacher_accounts_updated',
        onAccountsUpdated
      );
    };
  }, []);

  const handleUpdateTeacherAllotments = (
    newAllotments: TeacherAllotment[]
  ) => {
    setTeacherAllotments(newAllotments);
    saveTeacherAllotments(newAllotments);

    // Auto-sync update to Google Sheet _TEACHERS tab
    if (settings.googleSheetApiUrl && !settings.googleSheetApiUrl.includes('PASTE_YOUR')) {
      saveTeacherRegistryToGAS(teacherAccounts, newAllotments, settings.googleSheetApiUrl).catch(() => {});
    }

    showNotification(
      'success',
      'शिक्षक विषय आवंटन सफलतापूर्वक सहेज लिया गया!'
    );
  };

  // ------------------------------------------------------------
  // ADMIT CARD ALLOTMENTS
  // Unified with canonical curriculum
  // ------------------------------------------------------------
  const admitCardAllotments = subjectAllotments;

  const handleUpdateAdmitCardAllotments = (
    newAllotments: ClassSubjectAllotmentMap
  ) => {
    handleUpdateSubjectAllotments(newAllotments);
  };

  // ------------------------------------------------------------
  // CHANGE ADMIN PIN
  // ------------------------------------------------------------
  const handleChangeAdminPin = (newPin: string) => {
    const cleanPin = newPin.trim();

    if (!cleanPin) {
      showNotification(
        'error',
        'Admin PIN खाली नहीं हो सकता।'
      );
      return;
    }

    setAdminPin(cleanPin);

    try {
      localStorage.setItem(
        ADMIN_PIN_STORAGE_KEY,
        cleanPin
      );
    } catch {
      // ignore
    }

    setSettings(prev => {
      const updated = {
        ...prev,
        lockPassword: cleanPin
      };

      try {
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }

      return updated;
    });

    showNotification(
      'success',
      'एडमिन पासवर्ड सफलतापूर्वक अपडेट हो गया!'
    );
  };

  // ------------------------------------------------------------
  // ONLINE / OFFLINE
  // ------------------------------------------------------------
  const [isOnline, setIsOnline] =
    useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ------------------------------------------------------------
  // SAVE SETTINGS
  // ------------------------------------------------------------
  const handleSaveSettings = (
    newSettings: AppSettings
  ) => {
    setSettings(newSettings);

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(newSettings)
    );

    showNotification(
      'success',
      'Settings updated successfully!'
    );
  };

  // ------------------------------------------------------------
  // ENTRY CONFIGURATION
  // ------------------------------------------------------------
  const [entryType, setEntryType] =
    useState<EntryType>('marks');

  const [selectedClass, setSelectedClass] =
    useState<ClassLevel | ''>('');

  const [selectedSubject, setSelectedSubject] =
    useState<string>('');

  const [selectedExamType, setSelectedExamType] =
    useState<ExamType | ''>('HY');

  const [selectedSegment, setSelectedSegment] =
    useState<SegmentType | ''>('PT-1');

  const [attendanceType, setAttendanceType] =
    useState<ExamType | ''>('HY');

  const [manualAttendanceMode, setManualAttendanceMode] = useState(false);

  const [attendanceDate, setAttendanceDate] = useState(() => {
    const today = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  });

  const totalWorkingDays = String(
    (attendanceType === 'AN'
      ? systemConfig.workingDaysAE
      : systemConfig.workingDaysHY) ||
      (attendanceType === 'AN' ? 115 : 110)
  );

  // ------------------------------------------------------------
  // TEACHER ID + CASCADING WORKFLOW
  // ------------------------------------------------------------
  const [selectedTeacherId, setSelectedTeacherId] =
    useState<string>(() => {
      const urlParam = searchParams.get('teacherId');

      if (urlParam) return urlParam;

      try {
        const saved = localStorage.getItem(
          'pis_active_teacher_id'
        );

        if (saved) return saved;
      } catch {}

      return '';
    });

  const [selectedSection, setSelectedSection] =
    useState<string>('');

  const selectedTeacher = useMemo(() => {
    if (!selectedTeacherId) return null;

    const cleanId =
      selectedTeacherId.trim().toUpperCase();

    return (
      teacherAccounts.find(
        t =>
          (t.teacherId || '')
            .trim()
            .toUpperCase() === cleanId
      ) || null
    );
  }, [teacherAccounts, selectedTeacherId]);

  const approvedCorrections = useMemo(() => correctionRequests.filter(request =>
    request.status === 'Approved' &&
    request.teacherId === selectedTeacherId &&
    request.className === selectedClass &&
    request.section === selectedSection &&
    request.subject === selectedSubject &&
    request.segment === (entryType === 'attendance' ? attendanceType : selectedSegment)
  ), [correctionRequests, selectedTeacherId, selectedClass, selectedSection, selectedSubject, selectedSegment, attendanceType, entryType]);

  const isTeacherInactive = Boolean(
    selectedTeacher && !selectedTeacher.active
  );

  const authorizedClasses = useMemo<ClassLevel[]>(() => {
    if (
      !selectedTeacherId ||
      isTeacherInactive
    ) {
      return [];
    }

    const list = getTeacherAuthorizedClasses(
      teacherAllotments,
      selectedTeacherId
    );

    return list.filter(
      (c): c is ClassLevel =>
        CLASS_OPTIONS.includes(c as ClassLevel)
    );
  }, [
    teacherAllotments,
    selectedTeacherId,
    isTeacherInactive
  ]);

  const authorizedSections = useMemo<string[]>(() => {
    if (
      !selectedTeacherId ||
      !selectedClass ||
      isTeacherInactive
    ) {
      return [];
    }

    return getTeacherAuthorizedSections(
      teacherAllotments,
      selectedTeacherId,
      selectedClass
    );
  }, [
    teacherAllotments,
    selectedTeacherId,
    selectedClass,
    isTeacherInactive
  ]);

  const authorizedSubjects = useMemo<string[]>(() => {
    if (
      !selectedTeacherId ||
      !selectedClass ||
      !selectedSection ||
      isTeacherInactive
    ) {
      return [];
    }

    const teacherSubs =
      getTeacherAuthorizedSubjects(
        teacherAllotments,
        selectedTeacherId,
        selectedClass,
        selectedSection
      );

    const masterSubs =
      (subjectAllotments &&
        subjectAllotments[selectedClass]) ||
      SUBJECTS_BY_CLASS[selectedClass] ||
      [];

    return teacherSubs.filter(sub =>
      masterSubs.includes(sub)
    );
  }, [
    teacherAllotments,
    selectedTeacherId,
    selectedClass,
    selectedSection,
    isTeacherInactive,
    subjectAllotments
  ]);

  const isPermissionValid = useMemo<boolean>(() => {
    if (
      !selectedTeacherId ||
      isTeacherInactive ||
      !selectedClass ||
      !selectedSection
    ) {
      return false;
    }

    if (entryType === 'marks') {
      if (!selectedSubject) return false;

      return hasTeacherPermission(
        teacherAllotments,
        selectedTeacherId,
        selectedClass,
        selectedSection,
        selectedSubject
      );
    }

    return (
      authorizedClasses.includes(selectedClass) &&
      authorizedSections.includes(selectedSection)
    );
  }, [
    teacherAllotments,
    selectedTeacherId,
    isTeacherInactive,
    selectedClass,
    selectedSection,
    selectedSubject,
    entryType,
    authorizedClasses,
    authorizedSections
  ]);

  // ------------------------------------------------------------
  // CASCADING VALIDATION
  // ------------------------------------------------------------
  useEffect(() => {
    if (
      selectedClass &&
      !authorizedClasses.includes(selectedClass)
    ) {
      setSelectedClass('');
      setSelectedSection('');
      setSelectedSubject('');
      setStudents([]);
      setValues({});
    }
  }, [selectedClass, authorizedClasses]);

  useEffect(() => {
    if (
      selectedSection &&
      !authorizedSections.includes(selectedSection)
    ) {
      setSelectedSection('');
      setSelectedSubject('');
      setStudents([]);
      setValues({});
    }
  }, [selectedSection, authorizedSections]);

  useEffect(() => {
    if (
      selectedSubject &&
      !authorizedSubjects.includes(selectedSubject)
    ) {
      setSelectedSubject('');
      setValues({});
    }
  }, [selectedSubject, authorizedSubjects]);

  const handleTeacherChange = (
    teacherId: string
  ) => {
    setSelectedTeacherId(teacherId);

    try {
      if (teacherId) {
        localStorage.setItem(
          'pis_active_teacher_id',
          teacherId
        );
      } else {
        localStorage.removeItem(
          'pis_active_teacher_id'
        );
      }
    } catch {}

    setSelectedClass('');
    setSelectedSection('');
    setSelectedSubject('');
    setStudents([]);
    setValues({});
  };

  const handleSelectClass = (
    newClass: ClassLevel | ''
  ) => {
    setSelectedClass(newClass);
    setSelectedSection('');
    setSelectedSubject('');
    setStudents([]);
    setValues({});
  };

  const handleSelectSection = (
    newSection: string
  ) => {
    setSelectedSection(newSection);
    setSelectedSubject('');
    setStudents([]);
    setValues({});
  };

  const handleSelectSubject = (
    newSubject: string
  ) => {
    setSelectedSubject(newSubject);
    setValues({});
  };

  // ------------------------------------------------------------
  // STUDENT / MARKS STATE
  // ------------------------------------------------------------
  const [students, setStudents] =
    useState<Student[]>([]);

  const [values, setValues] =
    useState<Record<string, string>>({});

  const [, setMarkStatusRevision] = useState(0);

  const [currentPage, setCurrentPage] =
    useState<number>(1);

  const [isLoading, setIsLoading] =
    useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] =
    useState<boolean>(false);

  // ------------------------------------------------------------
  // MODALS
  // ------------------------------------------------------------
  const [isSettingsOpen, setIsSettingsOpen] =
    useState(false);

  const [isGuideOpen, setIsGuideOpen] =
    useState(false);

  const [isPasswordModalOpen, setIsPasswordModalOpen] =
    useState(false);

  const [pendingRecords, setPendingRecords] =
    useState<SheetSubmissionRecord[]>([]);

  const [isLastCandidateInBatch, setIsLastCandidateInBatch] =
    useState(false);

  // ------------------------------------------------------------
  // NOTIFICATION
  // ------------------------------------------------------------
  const [notification, setNotification] =
    useState<{
      type: 'success' | 'error' | 'warning';
      message: string;
    } | null>(null);

  const showNotification = useCallback(
    (
      type: 'success' | 'error' | 'warning',
      message: string
    ) => {
      setNotification({
        type,
        message
      });
    },
    []
  );

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [notification]);

  // ------------------------------------------------------------
  // DRAFT KEY
  // ------------------------------------------------------------
  const draftKey = useMemo(() => {
    if (!selectedClass || !selectedSection) {
      return '';
    }

    if (entryType === 'attendance') {
      return `pis_draft_att_${selectedClass}_${selectedSection}_${attendanceDate}`;
    }

    if (!selectedSubject || !selectedSegment) {
      return '';
    }

    return `pis_draft_marks_${selectedClass}_${selectedSection}_${selectedSubject}_${selectedSegment}`;
  }, [
    entryType,
    selectedClass,
    selectedSection,
    attendanceType,
    attendanceDate,
    selectedSubject,
    selectedSegment
  ]);

  const markStatuses = useMemo(
    () => getMarkStatuses(
      selectedClass,
      selectedSubject,
      entryType === 'attendance' ? attendanceType : selectedSegment,
      entryType,
      values,
      entryType === 'attendance' ? attendanceDate : ''
    ),
    [selectedClass, selectedSubject, selectedSegment, entryType, attendanceType, values]
  );

  // ------------------------------------------------------------
  // ACTIVE STUDENTS
  // ------------------------------------------------------------
  const activeStudents = useMemo(() => {
    let list = students;

    if (selectedSection) {
      list = list.filter(
        s =>
          !s.section ||
          s.section
            .trim()
            .toUpperCase() ===
            selectedSection
              .trim()
              .toUpperCase()
      );
    }

    if (entryType === 'attendance') {
      return list;
    }

    if (!selectedSubject) {
      return list;
    }

    return list.filter(s =>
      isStudentOptedForSubject(
        s,
        selectedSubject
      )
    );
  }, [
    students,
    selectedSection,
    entryType,
    selectedSubject
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedSubject,
    selectedSection,
    selectedClass,
    entryType
  ]);

  // ------------------------------------------------------------
  // LOAD STUDENTS
  // ------------------------------------------------------------
  const handleLoadStudents = useCallback(
    async (classOverride?: ClassLevel) => {
      const classToLoad =
        classOverride || selectedClass;

      if (
        !classToLoad ||
        !isPermissionValid
      ) {
        setStudents([]);
        return;
      }

      setIsLoading(true);
      setCurrentPage(1);

      const sheetUrl =
        settings.googleSheetApiUrl.trim();

      let loadedStudents: Student[] = [];

      if (
        sheetUrl &&
        !sheetUrl.includes('PASTE_YOUR')
      ) {
        try {
          const result = await fetchClassResultsFromGoogle(sheetUrl, classToLoad);

          if (
            result.success &&
            result.students &&
            result.students.length > 0
          ) {
            loadedStudents = result.students.map((st: any) => ({
              ...st,
              urn: getStudentURN(st) || st.urn || st.admNo,
              admNo: getStudentURN(st) || st.admNo || st.urn,
              optionalSubject: st.optionalSubject || detectStudentOptionalSubject(st)
            }));

            showNotification(
              'success',
              `Fetched ${loadedStudents.length} students live from Google Sheet!`
            );
          } else {
            showNotification(
              'warning',
              `${
                result.message ||
                'No students found on sheet.'
              } Loaded local roster.`
            );

            loadedStudents = (
              DEFAULT_STUDENTS_BY_CLASS[
                classToLoad
              ] || []
            ).map((st: any) => ({
              ...st,
              optionalSubject:
                detectStudentOptionalSubject(st)
            }));
          }
        } catch (err: any) {
          console.warn('Direct Google fetch failed; trying legacy Apps Script route', err);

          try {
            const response = await fetch(
              `${sheetUrl}?action=getStudents&class=${encodeURIComponent(
                classToLoad
              )}`
            );

            const data = await response.json();

            if (
              data.status === 'success' &&
              data.students &&
              data.students.length > 0
            ) {
              loadedStudents = data.students.map((st: any) => ({
                ...st,
                urn: getStudentURN(st) || st.urn || st.admNo,
                admNo: getStudentURN(st) || st.admNo || st.urn,
                optionalSubject: st.optionalSubject || detectStudentOptionalSubject(st)
              }));

              showNotification(
                'success',
                `Fetched ${loadedStudents.length} students live from the legacy Google Sheet API!`
              );
            } else {
              showNotification(
                'warning',
                `${
                  data.message ||
                  'No students found on sheet.'
                } Loaded local roster.`
              );

              loadedStudents = (
                DEFAULT_STUDENTS_BY_CLASS[
                  classToLoad
                ] || []
              ).map((st: any) => ({
                ...st,
                optionalSubject:
                  detectStudentOptionalSubject(st)
              }));
            }
          } catch (legacyErr: any) {
            showNotification(
              'warning',
              `Could not connect to Sheet (${
                legacyErr.message || err.message || 'Network'
              }). Using standard class roster.`
            );

            loadedStudents = (
              DEFAULT_STUDENTS_BY_CLASS[
                classToLoad
              ] || []
            ).map((st: any) => ({
              ...st,
              optionalSubject:
                detectStudentOptionalSubject(st)
            }));
          }
        }
      } else {
        loadedStudents = (
          DEFAULT_STUDENTS_BY_CLASS[
            classToLoad
          ] || []
        ).map((st: any) => ({
          ...st,
          urn: getStudentURN(st),
          admNo:
            getStudentURN(st) ||
            st.admNo,
          optionalSubject:
            detectStudentOptionalSubject(st)
        }));

        showNotification(
          'success',
          `Loaded ${loadedStudents.length} students for Class ${classToLoad} (Ready for Entry).`
        );
      }

      setStudents(loadedStudents);

      let loadedValues: Record<
        string,
        string
      > = {};

      if (draftKey) {
        try {
          const savedDraft =
            localStorage.getItem(
              draftKey
            );

          if (savedDraft) {
            loadedValues =
              JSON.parse(savedDraft);

            if (
              Object.keys(
                loadedValues
              ).length > 0
            ) {
              const canonicalDraft =
                migrateDraftValuesToURN(
                  loadedValues,
                  loadedStudents
                );

              setValues(canonicalDraft);

              showNotification(
                'info' as any,
                'Restored previously unsaved draft for this segment!'
              );

              setIsLoading(false);
              return;
            }
          }
        } catch {
          // ignore
        }
      }

      if (entryType === 'attendance') {
        setValues(loadAttendanceValues(classToLoad, selectedSection, attendanceDate));
        setIsLoading(false);
        return;
      }

      const existingMarks =
        instantSyncBridge.extractExistingMarks(
          classToLoad,
          selectedSubject,
          entryType === 'attendance'
            ? attendanceType
            : selectedSegment,
          entryType,
          selectedExamType
        );

      if (
        Object.keys(existingMarks)
          .length > 0
      ) {
        setValues(existingMarks);

        showNotification(
          'info' as any,
          `Loaded ${Object.keys(existingMarks).length} existing marks from master store.`
        );
      } else {
        setValues({});
      }

      setIsLoading(false);
    },
    [
      selectedClass,
      selectedSection,
      selectedSubject,
      selectedSegment,
      entryType,
      attendanceType,
      selectedExamType,
      attendanceDate,
      settings.googleSheetApiUrl,
      draftKey,
      showNotification,
      isPermissionValid
    ]
  );

  useEffect(() => {
    if (
      isPermissionValid &&
      selectedClass &&
      selectedSection &&
      (entryType === 'attendance' ||
        selectedSubject)
    ) {
      handleLoadStudents(
        selectedClass
      );
    }
  }, [
    isPermissionValid,
    selectedClass,
    selectedSection,
    selectedSubject,
    selectedSegment,
    entryType,
    attendanceType,
    attendanceDate,
    handleLoadStudents
  ]);

  useEffect(() => {
    if (
      !selectedClass ||
      !selectedSection ||
      !isPermissionValid
    ) {
      setStudents([]);
      setValues({});
    }
  }, [
    selectedClass,
    selectedSection,
    isPermissionValid
  ]);

  useEffect(() => {
    if (!draftKey) return;

    if (
      Object.keys(values).length > 0
    ) {
      localStorage.setItem(
        draftKey,
        JSON.stringify(values)
      );
    }
  }, [values, draftKey]);

  // ------------------------------------------------------------
  // VALUE CHANGE
  // ------------------------------------------------------------
  const handleValueChange = (
    identifier: string,
    val: string,
    student?: Student,
    correctionId?: string
  ) => {
    const studentUrn = student
      ? getStudentURN(student)
      : normalizeURN(identifier);
    const previousValue = studentUrn ? values[studentUrn] || '' : '';
    const status = val
      ? previousValue
        ? 'Updated'
        : 'Entered'
      : 'Pending';

    const teacherContext = createBackendRequestContext({
      actorType: 'teacher',
      action: entryType === 'attendance' ? 'attendance_update' : 'mark_update',
      teacherId: selectedTeacher?.teacherId,
      className: selectedClass,
      section: selectedSection,
      subject: selectedSubject,
      segment: entryType === 'attendance' ? attendanceType : selectedSegment,
      resourceType: entryType === 'attendance' ? 'attendance' : 'marks',
      urns: studentUrn ? [studentUrn] : [],
      isActiveTeacher: Boolean(selectedTeacher?.active)
    });

    const authValid = validateTeacherRequestContext(teacherContext);
    const studentMutationValidation = validateProtectedStudentMutation({
      teacherId: selectedTeacher?.teacherId,
      isActiveTeacher: Boolean(selectedTeacher?.active),
      className: selectedClass,
      section: selectedSection,
      subject: selectedSubject,
      segment: entryType === 'attendance' ? attendanceType : selectedSegment,
      urn: studentUrn || undefined,
      allowEmptyUrn: false
    });

    if (entryType === 'attendance') {
      if (manualAttendanceMode) {
        if (!selectedClass || !selectedSection || !attendanceDate) {
          showNotification('error', 'Manual attendance requires a class, section, and attendance term/date.');
          return;
        }
        const numericValue = Number(val);
        const maxDays = Number(totalWorkingDays) || 365;
        if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > maxDays) {
          showNotification('error', `Manual attendance must be a number between 0 and ${maxDays}.`);
          return;
        }
      } else {
        if (!selectedClass || !selectedSection || !attendanceDate || (val !== 'Present' && val !== 'Absent')) {
          showNotification('error', 'Attendance requires a date, section, and Present/Absent status.');
          return;
        }
      }
      if (getIdentityDiagnostics(students).duplicateURNCount > 0) {
        showNotification('error', 'Attendance blocked: duplicate authoritative URNs were detected.');
        return;
      }
    }

    if (!authValid || !studentMutationValidation.valid) {
      showNotification('warning', studentMutationValidation.error || 'This protected request is missing a valid authenticated teacher context.');
      return;
    }

    setValues(prev => ({
      ...prev,
      [identifier]: val
    }));

    if (selectedClass && studentUrn) {
      if (entryType === 'attendance') {
        if (!manualAttendanceMode) {
          saveAttendanceRecord({
            urn: studentUrn,
            className: selectedClass,
            section: selectedSection,
            date: attendanceDate,
            status: val as AttendanceStatus,
            teacherId: selectedTeacher?.teacherId,
            teacherName: selectedTeacher?.teacherName
          });
        }
        saveMarkStatus(
          selectedClass,
          '',
          attendanceType,
          entryType,
          studentUrn,
          val,
          previousValue,
          status,
          attendanceDate
        );
        setMarkStatusRevision(revision => revision + 1);
        return;
      }

      instantSyncBridge.saveSingleMarkInstant(
        selectedClass,
        identifier,
        selectedSubject,
        entryType === 'attendance'
          ? attendanceType
          : selectedSegment,
        val,
        entryType,
        studentUrn
      );
      saveMarkStatus(
        selectedClass,
        selectedSubject,
        entryType === 'attendance' ? attendanceType : selectedSegment,
        entryType,
        studentUrn,
        val,
        previousValue,
        status
      );
      setMarkStatusRevision(revision => revision + 1);

      if (correctionId) {
        const completedAt = new Date().toISOString();
        const updatedRequests = correctionRequests.map(request => request.id === correctionId
          ? { ...request, status: 'Completed' as const, completedAt }
          : request);
        setCorrectionRequests(updatedRequests);
        saveCorrectionRequests(updatedRequests);
      }
    }
  };

  const handleCorrectionRequest = ({
    student,
    urn,
    oldValue,
    requestedValue,
    reason
  }: {
    student: Student;
    urn: string;
    oldValue: string;
    requestedValue: string;
    reason: string;
  }) => {
    if (!selectedTeacher || !selectedTeacher.active || !urn) {
      showNotification('error', 'Correction request blocked: an active teacher and authoritative URN are required.');
      return;
    }

    const request = createCorrectionRequest({
      teacherId: selectedTeacher.teacherId,
      teacherName: selectedTeacher.teacherName,
      urn,
      className: selectedClass,
      section: selectedSection,
      subject: selectedSubject,
      segment: entryType === 'attendance' ? attendanceType : selectedSegment,
      oldValue,
      requestedValue,
      reason
    });
    const updatedRequests = [...correctionRequests, request];
    setCorrectionRequests(updatedRequests);
    saveCorrectionRequests(updatedRequests);
    showNotification('success', `Correction request submitted for ${student.name} (URN: ${urn}).`);
  };

  // ------------------------------------------------------------
  // CLEAR INPUTS
  // ------------------------------------------------------------
  const handleClearInputs = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all entered values for this sheet?'
      )
    ) {
      setValues({});

      if (draftKey) {
        localStorage.removeItem(
          draftKey
        );
      }

      showNotification(
        'warning',
        'All inputs cleared.'
      );
    }
  };

  const handleClearSheetData = async (targetClass?: string) => {
    const cls = targetClass || selectedClass;
    if (!cls) {
      showNotification('error', 'Please select a class before clearing Google Sheet data.');
      return;
    }

    const sheetUrl = settings.googleSheetApiUrl.trim();
    if (!sheetUrl || sheetUrl.includes('PASTE_YOUR')) {
      showNotification('warning', 'No Google Sheet URL is configured.');
      return;
    }

    try {
      const response = await fetch(sheetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'clearSheetData',
          class: cls,
          entryType: entryType || 'marks'
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        if (cls === selectedClass) {
          setValues({});
          if (draftKey) localStorage.removeItem(draftKey);
        }
        showNotification('success', data.message || `Cleared all marks and attendance for Class ${cls}.`);
      } else {
        showNotification('error', data.message || 'Could not clear Google Sheet data.');
      }
    } catch (err: any) {
      showNotification('error', `Unable to clear Google Sheet data: ${err?.message || 'Network or connection error'}`);
    }
  };

  // ------------------------------------------------------------
  // PREPARE SUBMISSION
  // ------------------------------------------------------------
  const handleInitiateSubmit = () => {
    if (students.length === 0) {
      showNotification(
        'error',
        'No students loaded.'
      );
      return;
    }

    const records: SheetSubmissionRecord[] =
      [];

    const isWrittenMode =
      selectedSegment === 'HY' ||
      selectedSegment === 'AE';

    const studentsWithoutURN: {
      roll: number | string;
      name: string;
    }[] = [];

    students.forEach(s => {
      const studentUrn =
        getStudentURN(s);

      if (!studentUrn) {
        studentsWithoutURN.push({
          roll: s.roll,
          name: s.name
        });

        return;
      }

      const val =
        values[studentUrn];

      if (
        val !== undefined &&
        val !== ''
      ) {
        const parsedVal =
          val === 'AB'
            ? 'AB'
            : parseInt(val, 10);

        if (
          entryType ===
          'attendance'
        ) {
          records.push({
            urn: studentUrn,
            admNo: studentUrn,
            roll: s.roll,
            name: s.name,
            class: selectedClass,
            subject: '',
            examType: attendanceType,
            segment: 'Attendance',
            type: 'Attendance',
            value: val,
            attendanceStatus: val === 'Absent' ? 'Absent' : 'Present',
            date: attendanceDate,
            section: selectedSection
          });
        } else {
          records.push({
            urn: studentUrn,
            admNo: studentUrn,
            roll: s.roll,
            name: s.name,
            class: selectedClass,
            subject:
              selectedSubject,
            examType:
              selectedExamType,
            segment:
              selectedSegment,
            type: isWrittenMode
              ? `${selectedSegment}-WRT`
              : selectedSegment,
            value: parsedVal
          });
        }
      }
    });

    if (
      studentsWithoutURN.length > 0
    ) {
      const sample =
        studentsWithoutURN
          .slice(0, 3)
          .map(
            s =>
              `Roll ${s.roll} (${s.name})`
          )
          .join(', ');

      console.warn(
        `[Identity Warning] Skipped ${studentsWithoutURN.length} student(s) lacking authoritative Column B URN: ${sample}`
      );
    }

    if (records.length === 0) {
      if (
        studentsWithoutURN.length > 0
      ) {
        showNotification(
          'error',
          `⚠️ Cannot submit: ${studentsWithoutURN.length} student(s) in this class lack an authoritative Column B URN. Please assign URNs in Google Sheet.`
        );
      } else {
        showNotification(
          'error',
          'Please enter at least one mark or attendance value before submitting.'
        );
      }

      return;
    }

    if (
      systemConfig.marksEntryStatus ===
      'OFF'
    ) {
      showNotification(
        'error',
        '⚠️ Marks entry is currently locked by the Examination Authority. Submissions are disabled.'
      );

      return;
    }

    if (
      isMarksDeadlinePassed(systemConfig.marksEntryDeadline)
    ) {
        showNotification(
          'error',
          '⚠️ Marks entry deadline has passed. Submissions are closed.'
        );

        return;
    }

    const lastStudent =
      activeStudents[
        activeStudents.length - 1
      ];

    const hasLastCandidate =
      lastStudent &&
      records.some(
        r =>
          String(r.roll) ===
          String(lastStudent.roll)
      );

    setPendingRecords(records);
    setIsLastCandidateInBatch(
      hasLastCandidate
    );

    if (hasLastCandidate) {
      setIsPasswordModalOpen(true);
    } else {
      executeSubmission(records);
    }
  };

  // ------------------------------------------------------------
  // EXECUTE SUBMISSION
  // ------------------------------------------------------------
  const updateSubmittedMarkStatuses = (
    recordsToSubmit: SheetSubmissionRecord[],
    status: 'Sync Pending' | 'Cloud Synced'
  ) => {
    recordsToSubmit.forEach(record => {
      const urn = getStudentURN(record);
      if (!urn) return;

      saveMarkStatus(
        selectedClass,
        record.subject,
        record.type === 'Attendance' ? record.examType : record.segment,
        record.type === 'Attendance' ? 'attendance' : 'marks',
        urn,
        String(record.value),
        '',
        status,
        record.type === 'Attendance' ? (record.date || '') : ''
      );
    });
    setMarkStatusRevision(revision => revision + 1);
  };

  const executeSubmission = async (
    recordsToSubmit: SheetSubmissionRecord[]
  ) => {
    if (entryType !== 'attendance') {
      instantSyncBridge.saveBatchMarksInstant(
        selectedClass,
        recordsToSubmit
      );
    }
    updateSubmittedMarkStatuses(recordsToSubmit, 'Sync Pending');

    if (draftKey) {
      localStorage.removeItem(
        draftKey
      );
    }

    const sheetUrl =
      settings.googleSheetApiUrl.trim();

    const isConfigured = Boolean(
      sheetUrl &&
        !sheetUrl.includes(
          'PASTE_YOUR'
        )
    );

    showNotification(
      'success',
      `⚡ ${recordsToSubmit.length} रिकॉर्ड्स तुरंत लागू हो गए (0.01s)! ${
        isConfigured
          ? 'क्लाउड सिंक बैकग्राउंड में चालू...'
          : '(स्थानीय सत्र में सुरक्षित)'
      }`
    );

    if (isConfigured) {
      setIsSubmitting(false);

      const requestContext = createBackendRequestContext({
        actorType: 'teacher',
        action: entryType === 'attendance' ? 'attendance_submit' : 'marks_submit',
        teacherId: selectedTeacher?.teacherId,
        className: selectedClass,
        section: selectedSection,
        subject: selectedSubject,
        segment: entryType === 'attendance' ? attendanceType : selectedSegment,
        resourceType: entryType === 'attendance' ? 'attendance' : 'marks',
        urns: recordsToSubmit.map(record => getStudentURN(record) || '').filter(Boolean),
        isActiveTeacher: Boolean(selectedTeacher?.active)
      });

      const protectedPayload = buildProtectedPayload({ records: recordsToSubmit }, requestContext);

      instantSyncBridge.queueSheetSync(
        sheetUrl,
        protectedPayload,
        selectedClass,
        msg => {
          updateSubmittedMarkStatuses(recordsToSubmit, 'Cloud Synced');
          showNotification(
            'success',
            `✅ Google Sheet सिंक सफल: ${recordsToSubmit.length} प्रविष्टियां सुरक्षित!`
          );
        },
        err => {
          updateSubmittedMarkStatuses(recordsToSubmit, 'Sync Pending');
          showNotification(
            'warning',
            `⚠️ ऑफ़लाइन सुरक्षित (0.01s)। Google Sheet सिंक: ${err}`
          );
        }
      );
    } else {
      setIsSubmitting(false);
    }
  };

  const handlePasswordConfirmed =
    () => {
      setIsPasswordModalOpen(false);
      executeSubmission(
        pendingRecords
      );
    };

  // ------------------------------------------------------------
  // CSV EXPORT
  // ------------------------------------------------------------
  const handleExportCsv = () => {
    if (
      activeStudents.length === 0
    ) {
      showNotification(
        'error',
        'No students to export.'
      );

      return;
    }

    exportMarksToCsv({
      students: activeStudents,
      values,
      className: selectedClass,
      entryType,
      subject: selectedSubject,
      segment:
        entryType === 'attendance'
          ? attendanceType
          : selectedSegment,
      workingDays:
        totalWorkingDays
    });

    showNotification(
      'success',
      'CSV Backup file downloaded!'
    );
  };

  const handleReviewCorrection = (id: string, status: 'Approved' | 'Rejected') => {
    const reviewedAt = new Date().toISOString();
    const updatedRequests = correctionRequests.map(request => request.id === id
      ? { ...request, status, reviewedAt, reviewedBy: 'Admin' }
      : request);
    setCorrectionRequests(updatedRequests);
    saveCorrectionRequests(updatedRequests);
  };

  // ------------------------------------------------------------
  // PROTECTED RESULT GENERATOR
  // ------------------------------------------------------------
  if (
    activeApp ===
      'result_generator' &&
    isAdminAuthenticatedFlag
  ) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-700">
            <div className="text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-[#1B4D3E]" />
              <div className="text-sm font-semibold">Loading Office Master…</div>
            </div>
          </div>
        }
      >
        <ResultGeneratorApp
          onSwitchToMarkUpdation={() =>
            setActiveApp(
              'mark_updation'
            )
          }
          onSignOutAdmin={
            handleAdminSignOut
          }
          systemConfig={
            systemConfig
          }
          onUpdateSystemConfig={
            handleUpdateSystemConfig
          }
          scriptUrl={
            settings.googleSheetApiUrl
          }
          onUpdateScriptUrl={url =>
            handleSaveSettings({
              ...settings,
              googleSheetApiUrl: url
            })
          }
          subjectAllotments={
            subjectAllotments
          }
          onUpdateSubjectAllotments={
            handleUpdateSubjectAllotments
          }
          admitCardAllotments={
            admitCardAllotments
          }
          onUpdateAdmitCardAllotments={
            handleUpdateAdmitCardAllotments
          }
          adminPin={adminPin}
          onChangeAdminPin={
            handleChangeAdminPin
          }
          correctionRequests={correctionRequests}
          onReviewCorrection={handleReviewCorrection}
        />
      </Suspense>
    );
  }

  // ------------------------------------------------------------
  // MARK ENTRY PORTAL
  // ------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f3efe6] text-slate-900 flex flex-col font-sans selection:bg-[#D4AF37]/30 selection:text-emerald-950">

      <Header
        isOnline={isOnline}
        isSheetConfigured={Boolean(
          settings.googleSheetApiUrl &&
            !settings.googleSheetApiUrl.includes(
              'PASTE_YOUR'
            )
        )}
        onOpenSettings={() =>
          setIsSettingsOpen(true)
        }
        onOpenGuide={() =>
          setIsGuideOpen(true)
        }
        entryType={entryType}
        onOpenAdminLogin={
          handleOpenAdminLogin
        }
        isAdminSessionActive={
          isAdminAuthenticatedFlag
        }
        onSwitchToResultGenerator={
          handleOpenResultGenerator
        }
        isSystemLocked={
          systemConfig.marksEntryStatus ===
          'OFF'
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">

        {isAdminAuthenticatedFlag && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-3.5 px-4 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border border-indigo-700/50">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />

              <div>
                <span className="font-bold text-amber-300">
                  Admin Mode Active:{' '}
                </span>

                <span className="text-slate-200">
                  You have administrative privileges to manage database sync, segment locks, and working days.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() =>
                  setIsSettingsOpen(
                    true
                  )
                }
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>
                  Admin Settings
                </span>
              </button>

              <button
                onClick={
                  handleAdminSignOut
                }
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer border border-white/20"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {systemConfig.marksEntryStatus ===
          'OFF' && (
          <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />

            <span>
              <strong>
                Portal Locked:
              </strong>{' '}
              Marks entry has been disabled by the Examination Incharge. You can view local rosters, but server submissions will be blocked.
            </span>
          </div>
        )}

        {systemConfig.marksEntryDeadline &&
          systemConfig.marksEntryStatus ===
            'ON' && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />

            <span>
              <strong>
                Notice:
              </strong>{' '}
              Marks submission deadline is{' '}
              <strong>
                {new Date(
                  systemConfig.marksEntryDeadline
                ).toLocaleString(
                  'en-IN'
                )}
              </strong>
              . Please ensure all candidates are submitted before expiry.
            </span>
          </div>
        )}

        {notification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in pointer-events-none">
            <div
              className={`pointer-events-auto max-w-sm w-full mx-auto p-5 rounded-2xl border shadow-2xl text-center flex flex-col items-center gap-3 transform transition-all animate-scale-in ${
                notification.type ===
                'success'
                  ? 'bg-white border-emerald-300 text-slate-900'
                  : notification.type ===
                    'error'
                  ? 'bg-white border-rose-300 text-slate-900'
                  : 'bg-white border-amber-300 text-slate-900'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                  notification.type ===
                  'success'
                    ? 'bg-emerald-100 text-emerald-700'
                    : notification.type ===
                      'error'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {notification.type ===
                'success' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {notification.type ===
                  'success'
                    ? 'सफलतापूर्वक संपन्न'
                    : notification.type ===
                      'error'
                    ? 'चेतावनी / त्रुटि'
                    : 'सूचना'}
                </h3>

                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  {notification.message}
                </p>
              </div>

              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all duration-2000 ${
                    notification.type ===
                    'success'
                      ? 'bg-emerald-500'
                      : notification.type ===
                        'error'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                  style={{
                    width: '100%'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <ControlPanel
          entryType={entryType}
          onEntryTypeChange={type => {
            setEntryType(type);
            setValues({});
          }}
          selectedClass={
            selectedClass
          }
          onClassChange={
            handleSelectClass
          }
          selectedSection={
            selectedSection
          }
          onSectionChange={
            handleSelectSection
          }
          selectedSubject={
            selectedSubject
          }
          onSubjectChange={
            handleSelectSubject
          }
          selectedExamType={
            selectedExamType
          }
          onExamTypeChange={e => {
            setSelectedExamType(e);

            if (e === 'HY') {
              setSelectedSegment(
                'PT-1'
              );
            }

            if (e === 'AN') {
              setSelectedSegment(
                'PT-3'
              );
            }

            setValues({});
          }}
          selectedSegment={
            selectedSegment
          }
          onSegmentChange={s => {
            setSelectedSegment(s);
            setValues({});
          }}
          attendanceType={
            attendanceType
          }
          attendanceDate={attendanceDate}
          onAttendanceDateChange={date => {
            setAttendanceDate(date);
            setValues({});
          }}
          onAttendanceTypeChange={a => {
            setAttendanceType(a);
            setValues({});
          }}
          manualAttendanceMode={manualAttendanceMode}
          onToggleManualAttendanceMode={enabled => {
            setManualAttendanceMode(enabled);
            setValues({});
          }}
          totalWorkingDays={
            totalWorkingDays
          }
          onLoadStudents={() =>
            handleLoadStudents()
          }
          onClearInputs={
            handleClearInputs
          }
          isLoading={isLoading}
          hasLoadedStudents={
            students.length > 0
          }
          subjectAllotments={
            subjectAllotments
          }
          segmentLocks={
            segmentLocks
          }
          teacherAccounts={
            teacherAccounts
          }
          selectedTeacherId={
            selectedTeacherId
          }
          onTeacherChange={
            handleTeacherChange
          }
          authorizedClasses={
            authorizedClasses
          }
          authorizedSections={
            authorizedSections
          }
          authorizedSubjects={
            authorizedSubjects
          }
          isPermissionValid={
            isPermissionValid
          }
        />

        {/* Teacher workflow */}
        {!selectedTeacherId ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center transition-all">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-800 mb-4 shadow-inner">
              <UserCheck className="w-8 h-8 text-amber-700" />
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1.5">
              Select Your Teacher Account to Begin
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed mb-6">
              Please select your Teacher ID from the dropdown above or click on your profile below. The portal will automatically unlock only the specific classes, sections, and subjects assigned to your account.
            </p>

            {teacherAccounts.filter(
              t => t.active
            ).length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-2xl">
                {teacherAccounts
                  .filter(
                    t => t.active
                  )
                  .map(t => (
                    <button
                      key={
                        t.teacherId
                      }
                      type="button"
                      onClick={() =>
                        handleTeacherChange(
                          t.teacherId
                        )
                      }
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-[#1B4D3E] hover:text-white text-slate-700 transition-all border border-slate-200 hover:border-emerald-800 shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-2"
                    >
                      <span className="font-mono text-emerald-700 hover:text-emerald-300">
                        {
                          t.teacherId
                        }
                      </span>

                      <span>
                        —
                      </span>

                      <span>
                        {
                          t.teacherName
                        }
                      </span>
                    </button>
                  ))}
              </div>
            ) : (
              <div className="text-xs text-amber-700 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                No active teacher accounts found. Please configure teacher accounts in Admin Settings.
              </div>
            )}
          </div>
        ) : isTeacherInactive ? (
          <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center transition-all">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 mb-4 shadow-inner">
              <AlertCircle className="w-8 h-8 text-rose-600" />
            </div>

            <h3 className="text-lg font-bold text-rose-900 mb-1.5">
              Teacher Account Inactive
            </h3>

            <p className="text-xs sm:text-sm text-rose-700 max-w-md mx-auto leading-relaxed">
              Teacher account{' '}
              <span className="font-mono font-bold">
                [
                {
                  selectedTeacherId
                }
                ]
              </span>{' '}
              is currently marked inactive. Mark entry access is disabled for inactive teacher accounts.
            </p>
          </div>
        ) : authorizedClasses.length ===
          0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center transition-all">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-800 mb-4 shadow-inner">
              <AlertCircle className="w-8 h-8 text-amber-700" />
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1.5">
              No Authorized Classes Allotted
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Teacher{' '}
              <span className="font-semibold text-slate-800">
                {
                  selectedTeacher?.teacherName ||
                  selectedTeacherId
                }
              </span>{' '}
              does not have any active class allotments.
            </p>
          </div>
        ) : !selectedClass ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center transition-all">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 mb-4 shadow-inner">
              <Users className="w-8 h-8 text-emerald-700" />
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1.5">
              Select an Authorized Class
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
              Choose one of your allotted classes below to proceed:
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl">
              {authorizedClasses.map(
                c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      handleSelectClass(
                        c
                      )
                    }
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-[#1B4D3E] hover:text-white text-slate-700 transition-all border border-slate-200 hover:border-emerald-800 shadow-2xs hover:shadow-xs cursor-pointer"
                  >
                    {c.startsWith(
                      'Nursery'
                    ) ||
                    c.startsWith(
                      'L'
                    ) ||
                    c.startsWith(
                      'U'
                    )
                      ? c
                      : `Class ${c}`}
                  </button>
                )
              )}
            </div>
          </div>
        ) : authorizedSections.length ===
          0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center transition-all">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-800 mb-4 shadow-inner">
              <AlertCircle className="w-8 h-8 text-amber-700" />
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1.5">
              No Authorized Sections Found
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              No sections are assigned to your account for Class{' '}
              <span className="font-bold text-slate-800">
                {selectedClass}
              </span>.
            </p>
          </div>
        ) : !selectedSection ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center transition-all">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-800 mb-4 shadow-inner">
              <Layers className="w-8 h-8 text-teal-700" />
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1.5">
              Select an Authorized Section for Class{' '}
              {selectedClass}
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
              Please choose a section allotted to you:
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {authorizedSections.map(
                sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() =>
                      handleSelectSection(
                        sec
                      )
                    }
                    className="px-6 py-3 rounded-xl text-sm font-bold bg-slate-50 hover:bg-[#1B4D3E] hover:text-white text-slate-800 transition-all border border-slate-200 hover:border-emerald-800 shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Section {sec}
                  </button>
                )
              )}
            </div>
          </div>
        ) : entryType === 'marks' &&
          authorizedSubjects.length ===
            0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center transition-all">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-800 mb-4 shadow-inner">
              <AlertCircle className="w-8 h-8 text-amber-700" />
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1.5">
              No Authorized Subjects Found
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              No subjects in Class{' '}
              {selectedClass} -
              Section{' '}
              {selectedSection}{' '}
              are authorized for your teacher account.
            </p>
          </div>
        ) : entryType === 'marks' &&
          !selectedSubject ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center transition-all">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 mb-4 shadow-inner">
              <BookOpen className="w-8 h-8 text-emerald-700" />
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1.5">
              Select an Authorized Subject
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
              Choose one of your allotted subjects for Class{' '}
              {selectedClass} (
              {selectedSection}):
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-2xl">
              {authorizedSubjects.map(
                sub => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() =>
                      handleSelectSubject(
                        sub
                      )
                    }
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-[#1B4D3E] hover:text-white text-slate-700 transition-all border border-slate-200 hover:border-emerald-800 shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    {sub}
                  </button>
                )
              )}
            </div>
          </div>
        ) : !isPermissionValid ? (
          <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center transition-all">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 mb-4 shadow-inner">
              <AlertCircle className="w-8 h-8 text-rose-600" />
            </div>

            <h3 className="text-lg font-bold text-rose-900 mb-1.5">
              Unauthorized Combination
            </h3>

            <p className="text-xs sm:text-sm text-rose-700 max-w-md mx-auto leading-relaxed">
              You do not have permission to enter marks for this Class, Section, and Subject combination. Marks entry has been blocked.
            </p>
          </div>
        ) : students.length ===
          0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center transition-all">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 mb-4 shadow-inner">
              <Users className="w-8 h-8 text-emerald-700" />
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1.5">
              Ready: Class{' '}
              {selectedClass} -
              Section{' '}
              {selectedSection}{' '}
              {entryType ===
              'marks'
                ? `• ${selectedSubject}`
                : '• Attendance'}
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
              Authorization verified. Click below to load student records and open the evaluation sheet:
            </p>

            <button
              type="button"
              onClick={() =>
                handleLoadStudents()
              }
              disabled={isLoading}
              className="px-6 py-3 rounded-xl text-sm font-bold bg-[#1B4D3E] text-white hover:bg-[#143a2f] transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
            >
              <Users className="w-4 h-4" />

              {isLoading
                ? 'Loading Students...'
                : 'Load Students & Open Sheet'}
            </button>
          </div>
        ) : (
          <MarksTable
            students={
              activeStudents
            }
            totalClassStudentsCount={
              students.length
            }
            entryType={
              entryType
            }
            selectedClass={
              selectedClass
            }
            selectedSection={
              selectedSection
            }
            selectedSubject={
              selectedSubject
            }
            selectedSegment={
              selectedSegment
            }
            attendanceType={
              attendanceType
            }
            totalWorkingDays={
              totalWorkingDays
            }
            attendanceDate={attendanceDate}
            manualAttendanceMode={manualAttendanceMode}
            values={values}
              marksEntryDeadline={systemConfig.marksEntryDeadline}
              teacherId={selectedTeacherId}
              approvedCorrections={approvedCorrections}
              onCorrectionRequest={handleCorrectionRequest}
            markStatuses={markStatuses}
            onValueChange={
              handleValueChange
            }
            currentPage={
              currentPage
            }
            pageSize={
              settings.studentsPerPage
            }
            onPageChange={
              setCurrentPage
            }
            onSubmit={
              handleInitiateSubmit
            }
            isSubmitting={
              isSubmitting
            }
            onExportCsv={
              handleExportCsv
            }
          />
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-4 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />

            <span className="font-semibold text-slate-800">
              Peace International School Standard Evaluation
            </span>

            <span className="hidden md:inline">
              •
            </span>

            <span className="hidden md:inline text-slate-500">
              PT: Max 20 • Term Written: Max 80 • Working Days: Max 365
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setIsGuideOpen(
                  true
                )
              }
              className="text-emerald-800 hover:text-emerald-950 font-semibold underline cursor-pointer"
            >
              Evaluation Guide & Shortcuts
            </button>

            {!isAdminAuthenticatedFlag ? (
              <>
                <span>•</span>
                <button
                  onClick={handleOpenAdminLogin}
                  className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="परीक्षा प्रभारी / व्यवस्थापक लॉगिन"
                >
                  <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>व्यवस्थापक प्रवेश (Admin Login)</span>
                </button>
              </>
            ) : (
              <>
                <span>•</span>
                <button
                  onClick={() =>
                    setIsSettingsOpen(
                      true
                    )
                  }
                  className="text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
                >
                  PIS Data Base एवं Admin Controls
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Password Modal */}
      <PasswordModal
        isOpen={
          isPasswordModalOpen
        }
        onClose={() =>
          setIsPasswordModalOpen(
            false
          )
        }
        onConfirm={
          handlePasswordConfirmed
        }
        expectedPin={
          settings.lockPassword
        }
        recordCount={
          pendingRecords.length
        }
        isLastCandidate={
          isLastCandidateInBatch
        }
      />

      {/* Admin Settings */}
      <SettingsModal
        isOpen={
          isSettingsOpen
        }
        onClose={() =>
          setIsSettingsOpen(
            false
          )
        }
        settings={settings}
        onSaveSettings={
          handleSaveSettings
        }
        onSwitchToResultGenerator={
          handleOpenResultGenerator
        }
        adminPin={
          adminPin
        }
        onChangeAdminPin={
          handleChangeAdminPin
        }
        segmentLocks={
          segmentLocks
        }
        onUpdateSegmentLocks={
          handleUpdateSegmentLocks
        }
        teacherAllotments={
          teacherAllotments
        }
        onUpdateTeacherAllotments={
          handleUpdateTeacherAllotments
        }
        teacherAccounts={
          teacherAccounts
        }
        onUpdateTeacherAccounts={
          handleUpdateTeacherAccounts
        }
        subjectAllotments={
          subjectAllotments
        }
        onUpdateSubjectAllotments={
          handleUpdateSubjectAllotments
        }
        admitCardAllotments={
          admitCardAllotments
        }
        onUpdateAdmitCardAllotments={
          handleUpdateAdmitCardAllotments
        }
        onClearSheetData={
          handleClearSheetData
        }
      />

      <GuideModal
        isOpen={
          isGuideOpen
        }
        onClose={() =>
          setIsGuideOpen(false)
        }
      />

      {/* Admin Authentication */}
      <AdminLoginModal
        isOpen={
          isAdminLoginOpen
        }
        onClose={() =>
          setIsAdminLoginOpen(
            false
          )
        }
        onSuccess={
          handleAdminLoginSuccess
        }
        adminPin={
          adminPin
        }
      />
    </div>
  );
}