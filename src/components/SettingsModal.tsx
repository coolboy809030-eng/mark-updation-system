import React, { useState, useEffect } from 'react';
import { AppSettings, ClassLevel, TeacherAllotment, TeacherAccount } from '../types';
import { SUBJECTS_BY_CLASS, ALL_SUBJECT_OPTIONS, MASTER_ADMIN_PIN } from '../data/schoolConfig';
import { CLASS_OPTIONS } from './ControlPanel';
import {
  generateNextTeacherId,
  isTeacherIdUnique,
  findDuplicateTeacherPermissions,
  adminResetTeacherPassword,
  getPendingPasswordResetRequests,
  dismissPasswordResetRequest,
  DEFAULT_TEACHER_PASSWORD
} from '../utils/teacherAccount';
import { fetchTeacherRegistryFromGAS, saveTeacherRegistryToGAS, updateTeacherPasswordInGAS } from '../services/teacherSyncService';
import {
  Shield,
  KeyRound,
  Lock,
  Unlock,
  Check,
  X,
  Database,
  Users,
  BookOpen,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Plus,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
  Sparkles,
  RefreshCw,
  ListFilter,
  Download,
  FileText,
  UserCheck,
  UserX,
  Edit3,
  UserPlus,
  Cloud,
  CloudUpload,
  CloudDownload,
  Link2,
  Eye,
  EyeOff,
  Bell,
  RotateCcw
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onSwitchToResultGenerator?: () => void;

  // Admin PIN management (Req 3, 4)
  adminPin: string;
  onChangeAdminPin: (newPin: string) => void;

  // Segment Locks (Req 5)
  segmentLocks: Record<string, boolean>;
  onUpdateSegmentLocks: (locks: Record<string, boolean>) => void;

  // Teacher Subject Allotment (Req 5)
  teacherAllotments: TeacherAllotment[];
  onUpdateTeacherAllotments: (allotments: TeacherAllotment[]) => void;

  // Teacher Accounts (Module 3A: Teacher Account Foundation)
  teacherAccounts?: TeacherAccount[];
  onUpdateTeacherAccounts?: (accounts: TeacherAccount[]) => void;

  // Subject Allotments (Class-level)
  subjectAllotments: Record<ClassLevel, string[]>;
  onUpdateSubjectAllotments: (allotments: Record<ClassLevel, string[]>) => void;

  // Admit Card Subject Allotment (Req 5)
  admitCardAllotments: Record<ClassLevel, string[]>;
  onUpdateAdmitCardAllotments: (allotments: Record<ClassLevel, string[]>) => void;

  // Destructive sheet data clearance (Admin Only)
  onClearSheetData?: (targetClass: string) => Promise<void> | void;
}

type AdminTab = 'locks' | 'teachers' | 'admit_card' | 'password' | 'database';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onSwitchToResultGenerator,
  adminPin,
  onChangeAdminPin,
  segmentLocks,
  onUpdateSegmentLocks,
  teacherAllotments,
  onUpdateTeacherAllotments,
  teacherAccounts = [],
  onUpdateTeacherAccounts,
  subjectAllotments,
  onUpdateSubjectAllotments,
  admitCardAllotments,
  onUpdateAdmitCardAllotments,
  onClearSheetData
}) => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('locks');

  // Password change state
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Failed attempts tracking for security warning
  const [passwordFailedAttempts, setPasswordFailedAttempts] = useState<number>(() => {
    try {
      return parseInt(sessionStorage.getItem('pis_admin_failed_attempts') || '0', 10);
    } catch {
      return 0;
    }
  });

  // Admin Destructive Clear State
  const [clearTargetClass, setClearTargetClass] = useState<ClassLevel>('1');
  const [isClearingSheet, setIsClearingSheet] = useState(false);
  const [clearStatusMessage, setClearStatusMessage] = useState<string | null>(null);

  // Cross-device Cloud Teacher Registry Sync State
  const [isSyncingTeachersCloud, setIsSyncingTeachersCloud] = useState(false);
  const [teacherCloudSyncStatus, setTeacherCloudSyncStatus] = useState<string | null>(null);

  // PIS Data Base State
  const [databaseUrl, setDatabaseUrl] = useState(settings.googleSheetApiUrl);
  const [pageSize, setPageSize] = useState(settings.studentsPerPage);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Teacher Account Foundation State (Module 3A)
  const currentAccounts = teacherAccounts;
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [teacherIdInput, setTeacherIdInput] = useState(() => generateNextTeacherId(currentAccounts));
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [teacherContactInput, setTeacherContactInput] = useState('');
  const [teacherPasswordInput, setTeacherPasswordInput] = useState(DEFAULT_TEACHER_PASSWORD);
  const [teacherActiveInput, setTeacherActiveInput] = useState(true);
  const [teacherAccountDiag, setTeacherAccountDiag] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [copiedTeacherId, setCopiedTeacherId] = useState<string | null>(null);
  const [showTeacherPasswords, setShowTeacherPasswords] = useState<Record<string, boolean>>({});
  const [resetRequests, setResetRequests] = useState(() => getPendingPasswordResetRequests());
  const [resettingTeacherId, setResettingTeacherId] = useState<string | null>(null);

  // Sync reset requests on open
  useEffect(() => {
    if (isOpen) {
      setResetRequests(getPendingPasswordResetRequests());
    }
  }, [isOpen]);

  const handleCopyPersonalTeacherLink = (tId: string) => {
    const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
    const personalUrl = `${base}?portal=teacher&teacherId=${encodeURIComponent(tId)}`;
    navigator.clipboard.writeText(personalUrl);
    setCopiedTeacherId(tId);
    setTimeout(() => setCopiedTeacherId(null), 2500);
  };

  // Sync teacherIdInput if accounts change and not editing
  useEffect(() => {
    if (!editingAccountId) {
      setTeacherIdInput(generateNextTeacherId(currentAccounts));
    }
  }, [currentAccounts.length, editingAccountId]);

  // Teacher Allotment Form State
  const [selectedTeacherAccId, setSelectedTeacherAccId] = useState<string>('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherClass, setNewTeacherClass] = useState<ClassLevel>('5');
  const [newTeacherSections, setNewTeacherSections] = useState<string[]>(['A']);
  const [newTeacherSubjects, setNewTeacherSubjects] = useState<string[]>(['Hindi', 'English']);
  const [allotmentDiag, setAllotmentDiag] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Admit Card Allotment State
  const [selectedAdmitClass, setSelectedAdmitClass] = useState<ClassLevel>('5');
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  if (!isOpen) return null;

  // Test PIS Data Base Connection
  const handleTestConnection = async () => {
    if (!databaseUrl || databaseUrl.includes('PASTE_YOUR')) {
      setTestStatus('⚠️ Please enter a valid PIS Data Base API link first.');
      return;
    }

    setIsTesting(true);
    setTestStatus(null);

    try {
      const res = await fetch(`${databaseUrl}?action=getSystemControl`);
      const data = await res.json();
      if (data.status === 'success') {
        setTestStatus(`✅ PIS Data Base Connected! System Status: ${data.enabled ? 'ONLINE (ACTIVE)' : 'OFF'}`);
      } else {
        setTestStatus(`⚠️ PIS Data Base responded: ${data.message || 'Unknown response'}`);
      }
    } catch (err: any) {
      setTestStatus(`❌ Connection Error: ${err?.message || 'Could not connect to PIS Data Base. Check connection or URL.'}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Save Database & General Settings
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      googleSheetApiUrl: databaseUrl.trim(),
      studentsPerPage: pageSize
    });
    onClose();
  };

  // Handle Admin Password Change
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    const cleanCurrent = currentPinInput.trim();
    const cleanNew = newPinInput.trim();
    const cleanConfirm = confirmPinInput.trim();

    const expectedCurrent = (adminPin || '').trim() || MASTER_ADMIN_PIN;
    if (cleanCurrent !== expectedCurrent && cleanCurrent !== MASTER_ADMIN_PIN) {
      const nextCount = passwordFailedAttempts + 1;
      setPasswordFailedAttempts(nextCount);
      try {
        sessionStorage.setItem('pis_admin_failed_attempts', String(nextCount));
      } catch {
        // ignore
      }

      if (nextCount > 3) {
        setPasswordMsg({
          type: 'error',
          text: 'Your Mark Entry Power can be locked'
        });
      } else {
        setPasswordMsg({
          type: 'error',
          text: `वर्तमान पासवर्ड अमान्य है। (गलत प्रयास ${nextCount}/3)`
        });
      }
      return;
    }

    if (cleanNew.length < 4) {
      setPasswordMsg({
        type: 'error',
        text: 'नया पासवर्ड कम से कम 4 अक्षरों या अंकों का होना चाहिए।'
      });
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setPasswordMsg({
        type: 'error',
        text: 'नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते हैं।'
      });
      return;
    }

    // Success: Update Admin Password
    onChangeAdminPin(cleanNew);
    onSaveSettings({
      ...settings,
      lockPassword: cleanNew
    });
    setPasswordFailedAttempts(0);
    try {
      sessionStorage.removeItem('pis_admin_failed_attempts');
    } catch {
      // ignore
    }

    setPasswordMsg({
      type: 'success',
      text: '✅ एडमिन पासवर्ड सफलतापूर्वक बदल दिया गया है!'
    });
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
  };

  // Toggle Single Segment Lock
  const handleToggleSegmentLock = (segmentKey: string) => {
    const nextLocks = {
      ...segmentLocks,
      [segmentKey]: !segmentLocks[segmentKey]
    };
    onUpdateSegmentLocks(nextLocks);
  };

  // Quick Preset Segment Locks
  const setAllSegmentsLock = (lock: boolean) => {
    const keys = ['PT-1', 'PT-2', 'HY', 'PT-3', 'PT-4', 'AE', 'attendance'];
    const updated: Record<string, boolean> = {};
    keys.forEach(k => {
      updated[k] = lock;
    });
    onUpdateSegmentLocks(updated);
  };

  const lockOnlyTerm2 = () => {
    onUpdateSegmentLocks({
      'PT-1': false,
      'PT-2': false,
      'HY': false,
      'PT-3': true,
      'PT-4': true,
      'AE': true,
      'attendance': false
    });
  };

  const lockOnlyTerm1 = () => {
    onUpdateSegmentLocks({
      'PT-1': true,
      'PT-2': true,
      'HY': true,
      'PT-3': false,
      'PT-4': false,
      'AE': false,
      'attendance': false
    });
  };

  // Teacher Account Handlers (Module 3A)
  const handleSaveTeacherAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherAccountDiag(null);

    const cleanId = teacherIdInput.trim().toUpperCase();
    const cleanName = teacherNameInput.trim();

    if (!cleanId) {
      setTeacherAccountDiag({
        type: 'error',
        message: '⚠️ कृपया एक मान्य Teacher ID दर्ज करें।'
      });
      return;
    }

    if (!cleanName) {
      setTeacherAccountDiag({
        type: 'error',
        message: '⚠️ कृपया शिक्षक का नाम दर्ज करें।'
      });
      return;
    }

    // Check duplicate Teacher ID (excluding current account when editing)
    if (!isTeacherIdUnique(cleanId, currentAccounts, editingAccountId || undefined)) {
      setTeacherAccountDiag({
        type: 'error',
        message: `⚠️ Teacher ID "${cleanId}" पहले से मौजूद है! डुप्लिकेट आईडी की अनुमति नहीं है।`
      });
      return;
    }

    const now = new Date().toISOString();
    const cleanPass = teacherPasswordInput.trim() || DEFAULT_TEACHER_PASSWORD;

    if (editingAccountId) {
      // Update existing account
      const updated = currentAccounts.map(acc => {
        if (acc.id === editingAccountId) {
          return {
            ...acc,
            teacherId: cleanId,
            teacherName: cleanName,
            contact: teacherContactInput.trim() || undefined,
            password: cleanPass,
            active: teacherActiveInput,
            updatedAt: now
          };
        }
        return acc;
      });
      onUpdateTeacherAccounts?.(updated);
      setEditingAccountId(null);
      setTeacherAccountDiag({
        type: 'success',
        message: `✅ शिक्षक खाता [${cleanId}] "${cleanName}" सफलतापूर्वक अपडेट हुआ!`
      });
      setTeacherNameInput('');
      setTeacherContactInput('');
      setTeacherPasswordInput(DEFAULT_TEACHER_PASSWORD);
      setTeacherActiveInput(true);
      setTeacherIdInput(generateNextTeacherId(updated));
    } else {
      // Create new account
      const newAcc: TeacherAccount = {
        id: `tch_acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        teacherId: cleanId,
        teacherName: cleanName,
        contact: teacherContactInput.trim() || undefined,
        password: cleanPass,
        mustChangePassword: cleanPass === DEFAULT_TEACHER_PASSWORD,
        active: teacherActiveInput,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null
      };
      const updated = [...currentAccounts, newAcc];
      onUpdateTeacherAccounts?.(updated);
      setTeacherAccountDiag({
        type: 'success',
        message: `✅ नया शिक्षक खाता [${cleanId}] "${cleanName}" (पासवर्ड: ${cleanPass}) सफलतापूर्वक सहेजा गया!`
      });
      setTeacherNameInput('');
      setTeacherContactInput('');
      setTeacherPasswordInput(DEFAULT_TEACHER_PASSWORD);
      setTeacherActiveInput(true);
      setTeacherIdInput(generateNextTeacherId(updated));
    }
  };

  const handleApproveResetRequest = async (teacherId: string, reqId?: string) => {
    setResettingTeacherId(teacherId);
    try {
      const res = adminResetTeacherPassword(teacherId);
      if (res.success && res.teacher) {
        const updated = currentAccounts.map(a => a.teacherId === teacherId ? res.teacher! : a);
        onUpdateTeacherAccounts?.(updated);
        if (reqId) {
          dismissPasswordResetRequest(reqId);
        }
        setResetRequests(getPendingPasswordResetRequests());
        setTeacherAccountDiag({
          type: 'success',
          message: `✅ शिक्षक [${teacherId}] का पासवर्ड डिफ़ॉल्ट (${DEFAULT_TEACHER_PASSWORD}) पर रीसेट कर दिया गया है! Google Sheet (_TEACHERS) में सिंक हो रहा है...`
        });
        
        await updateTeacherPasswordInGAS(teacherId, DEFAULT_TEACHER_PASSWORD, databaseUrl);
        setTeacherAccountDiag({
          type: 'success',
          message: `✅ शिक्षक [${teacherId}] का पासवर्ड डिफ़ॉल्ट (${DEFAULT_TEACHER_PASSWORD}) पर रीसेट होकर Google Sheet में सफलतापूर्वक सुरक्षित हो गया!`
        });
      } else {
        setTeacherAccountDiag({
          type: 'error',
          message: res.message || 'पासवर्ड रीसेट करने में त्रुटि।'
        });
      }
    } catch (err: any) {
      setTeacherAccountDiag({
        type: 'error',
        message: `⚠️ पासवर्ड रीसेट सिंक में त्रुटि: ${err?.message || err}`
      });
    } finally {
      setResettingTeacherId(null);
    }
  };

  const handleDismissReset = (reqId: string) => {
    dismissPasswordResetRequest(reqId);
    setResetRequests(getPendingPasswordResetRequests());
  };

  const handleEditAccount = (acc: TeacherAccount) => {
    setEditingAccountId(acc.id);
    setTeacherIdInput(acc.teacherId);
    setTeacherNameInput(acc.teacherName);
    setTeacherContactInput(acc.contact || '');
    setTeacherPasswordInput(acc.password || DEFAULT_TEACHER_PASSWORD);
    setTeacherActiveInput(acc.active);
    setTeacherAccountDiag(null);
  };

  const handleCancelEditAccount = () => {
    setEditingAccountId(null);
    setTeacherNameInput('');
    setTeacherContactInput('');
    setTeacherPasswordInput(DEFAULT_TEACHER_PASSWORD);
    setTeacherActiveInput(true);
    setTeacherAccountDiag(null);
    setTeacherIdInput(generateNextTeacherId(currentAccounts));
  };

  const handleToggleAccountActive = (acc: TeacherAccount) => {
    const updated = currentAccounts.map(item => {
      if (item.id === acc.id) {
        return {
          ...item,
          active: !item.active,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });
    onUpdateTeacherAccounts?.(updated);
    setTeacherAccountDiag({
      type: 'success',
      message: `खाता [${acc.teacherId}] अब ${!acc.active ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'} कर दिया गया है।`
    });
  };

  // Add Teacher Allotment (Module 3B: Teacher Permission Foundation)
  const handleAddTeacherAllotment = (e: React.FormEvent) => {
    e.preventDefault();
    setAllotmentDiag(null);

    const matchedAccount = currentAccounts.find(a => a.id === selectedTeacherAccId) ||
      currentAccounts.find(a => (a.teacherId && a.teacherId.toUpperCase() === selectedTeacherAccId.toUpperCase())) ||
      currentAccounts.find(a => a.teacherName.toLowerCase() === newTeacherName.trim().toLowerCase());

    const finalTeacherName = (matchedAccount ? matchedAccount.teacherName : newTeacherName).trim();
    const finalTeacherId = matchedAccount?.teacherId || (selectedTeacherAccId ? selectedTeacherAccId : undefined);

    if (!finalTeacherName) {
      setAllotmentDiag({
        type: 'error',
        message: '⚠️ कृपया एक शिक्षक चुनें या शिक्षक का नाम दर्ज करें।'
      });
      return;
    }

    if (newTeacherSections.length === 0) {
      setAllotmentDiag({
        type: 'error',
        message: '⚠️ कृपया कम से कम एक सेक्शन (Section A, B, etc.) चुनें।'
      });
      return;
    }

    if (newTeacherSubjects.length === 0) {
      setAllotmentDiag({
        type: 'error',
        message: '⚠️ कृपया कम से कम एक अधिकृत विषय चुनें।'
      });
      return;
    }

    // Duplicate Check: Teacher ID + Class + Section + Subject
    if (finalTeacherId) {
      const duplicatePairs = findDuplicateTeacherPermissions(
        teacherAllotments,
        finalTeacherId,
        newTeacherClass,
        newTeacherSections,
        newTeacherSubjects
      );

      if (duplicatePairs.length > 0) {
        const dupDescriptions = duplicatePairs
          .map(d => `Sec ${d.section} → ${d.subject}`)
          .slice(0, 3)
          .join(', ');
        setAllotmentDiag({
          type: 'error',
          message: `⚠️ डुप्लिकेट अनुमति अस्वीकृत: शिक्षक [${finalTeacherId}] के लिए (${dupDescriptions}) पहले से आवंटित है।`
        });
        return;
      }
    }

    const now = new Date().toISOString();
    const newAllotment: TeacherAllotment = {
      id: `allot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      teacherId: finalTeacherId,
      teacherName: finalTeacherName,
      classLevel: newTeacherClass,
      sections: [...newTeacherSections],
      subjects: [...newTeacherSubjects],
      active: true,
      createdAt: now,
      updatedAt: now
    };

    onUpdateTeacherAllotments([...teacherAllotments, newAllotment]);
    setAllotmentDiag({
      type: 'success',
      message: `✅ शिक्षक [${finalTeacherId || finalTeacherName}] के लिए Class ${newTeacherClass} (${newTeacherSections.join(', ')}) विषय आवंटन सफलतापूर्वक सहेज लिया गया!`
    });
    setNewTeacherName('');
    setSelectedTeacherAccId('');
  };

  // Remove Teacher Allotment
  const handleRemoveTeacherAllotment = (id: string) => {
    onUpdateTeacherAllotments(teacherAllotments.filter(t => t.id !== id));
    setAllotmentDiag({
      type: 'success',
      message: 'आवंटन हटा दिया गया।'
    });
  };

  // Toggle Section for Teacher Form
  const toggleTeacherSection = (sec: string) => {
    setNewTeacherSections(prev =>
      prev.includes(sec)
        ? (prev.length > 1 ? prev.filter(s => s !== sec) : prev) // keep at least 1 section
        : [...prev, sec]
    );
  };

  // Toggle Subject for Teacher Form
  const toggleTeacherSubject = (sub: string) => {
    setNewTeacherSubjects(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  // Admit Card Subject Toggle for Selected Class
  const currentAdmitSubjects = admitCardAllotments[selectedAdmitClass] || subjectAllotments[selectedAdmitClass] || SUBJECTS_BY_CLASS[selectedAdmitClass] || [];

  const handleToggleAdmitSubject = (subject: string) => {
    const updated = currentAdmitSubjects.includes(subject)
      ? currentAdmitSubjects.filter(s => s !== subject)
      : [...currentAdmitSubjects, subject];

    onUpdateAdmitCardAllotments({
      ...admitCardAllotments,
      [selectedAdmitClass]: updated
    });
  };

  const handleSelectAllAdmitSubjects = () => {
    const standard = SUBJECTS_BY_CLASS[selectedAdmitClass] || [];
    onUpdateAdmitCardAllotments({
      ...admitCardAllotments,
      [selectedAdmitClass]: [...standard]
    });
  };

  const handleClearAllAdmitSubjects = () => {
    onUpdateAdmitCardAllotments({
      ...admitCardAllotments,
      [selectedAdmitClass]: []
    });
  };

  const handleAddCustomSubjectToAdmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customSubjectInput.trim();
    if (!clean) return;

    if (!currentAdmitSubjects.includes(clean)) {
      onUpdateAdmitCardAllotments({
        ...admitCardAllotments,
        [selectedAdmitClass]: [...currentAdmitSubjects, clean]
      });
    }
    setCustomSubjectInput('');
  };

  // Destructive Clear Google Sheet Data (Admin Only with Double-Confirmation)
  const handleAdminClearSheet = async () => {
    if (!onClearSheetData) return;
    const confirm1 = window.confirm(
      `[प्रशासक चेतावनी]: क्या आप वास्तव में Google Sheet से Class ${clearTargetClass} का सारा डेटा (Marks & Attendance) हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती!`
    );
    if (!confirm1) return;

    const typed = window.prompt(
      `सुरक्षा सत्यापन: डेटा स्थायी रूप से हटाने की पुष्टि करने के लिए "DELETE" टाइप करें:`
    );
    if (typed !== 'DELETE') {
      alert('सत्यापन असफल: डेटा नहीं हटाया गया।');
      return;
    }

    setIsClearingSheet(true);
    setClearStatusMessage(null);
    try {
      await onClearSheetData(clearTargetClass);
      setClearStatusMessage(`✅ Google Sheet से Class ${clearTargetClass} का डेटा सफलतापूर्वक साफ़ कर दिया गया।`);
    } catch (e: any) {
      setClearStatusMessage(`❌ त्रुटि: ${e?.message || 'डेटा साफ़ नहीं हो सका'}`);
    } finally {
      setIsClearingSheet(false);
    }
  };

  // Cross-device Cloud Sync: Push Teacher Registry to Google Sheet (_TEACHERS)
  const handlePushTeachersToCloud = async () => {
    setIsSyncingTeachersCloud(true);
    setTeacherCloudSyncStatus(null);
    try {
      const targetUrl = databaseUrl || settings.googleSheetApiUrl;
      const res = await saveTeacherRegistryToGAS(currentAccounts, teacherAllotments, targetUrl);
      if (res.success) {
        setTeacherCloudSyncStatus(`✅ Google Sheet (_TEACHERS) में सफलतापूर्वक बैकअप सहेजा गया!`);
      } else {
        setTeacherCloudSyncStatus(`⚠️ सिंक चेतावनी: ${res.message}`);
      }
    } catch (err: any) {
      setTeacherCloudSyncStatus(`❌ सिंक त्रुटि: ${err?.message || 'नेटवर्क समस्या'}`);
    } finally {
      setIsSyncingTeachersCloud(false);
    }
  };

  // Cross-device Cloud Sync: Pull Teacher Registry from Google Sheet (_TEACHERS)
  const handlePullTeachersFromCloud = async () => {
    setIsSyncingTeachersCloud(true);
    setTeacherCloudSyncStatus(null);
    try {
      const targetUrl = databaseUrl || settings.googleSheetApiUrl;
      const res = await fetchTeacherRegistryFromGAS(targetUrl);
      if (res.success && res.accounts.length > 0) {
        if (onUpdateTeacherAccounts) {
          onUpdateTeacherAccounts(res.accounts);
        }
        onUpdateTeacherAllotments(res.allotments);
        setTeacherCloudSyncStatus(`✅ Google Sheet (_TEACHERS) से ${res.accounts.length} शिक्षक लोड हुए!`);
      } else {
        setTeacherCloudSyncStatus(`ℹ️ ${res.message || 'गूगल शीट में कोई नया शिक्षक रिकॉर्ड नहीं मिला।'}`);
      }
    } catch (err: any) {
      setTeacherCloudSyncStatus(`❌ लोड त्रुटि: ${err?.message || 'नेटवर्क समस्या'}`);
    } finally {
      setIsSyncingTeachersCloud(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden relative max-h-[90vh] flex flex-col my-auto text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
                <span>एडमिन कंट्रोल पैनल (Admin Control Panel)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                  Governance
                </span>
              </h3>
              <p className="text-xs text-indigo-200">
                PIS Data Base &bull; Segment Security &bull; Teacher Allotments &bull; Admit Cards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-3 bg-slate-100/90 border-b border-slate-200 overflow-x-auto shrink-0 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('locks')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border-t-2 ${
              activeTab === 'locks'
                ? 'bg-white text-indigo-950 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-rose-600" />
            <span>सेगमेंट लॉक/अनलॉक (Segment Locks)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border-t-2 ${
              activeTab === 'teachers'
                ? 'bg-white text-indigo-950 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>शिक्षक खाता एवं आवंटन (Teacher Accounts)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admit_card')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border-t-2 ${
              activeTab === 'admit_card'
                ? 'bg-white text-indigo-950 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>एडमिट कार्ड विषय (Admit Card Subjects)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border-t-2 ${
              activeTab === 'password'
                ? 'bg-white text-indigo-950 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
            <span>पासवर्ड प्रबंधन (Change Password)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border-t-2 ${
              activeTab === 'database'
                ? 'bg-white text-indigo-950 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-teal-600" />
            <span>PIS Data Base Link</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* ========================================================= */}
          {/* TAB 1: SEGMENT LOCKS (LOCK / UNLOCK MATRIX)               */}
          {/* ========================================================= */}
          {activeTab === 'locks' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-800">
                    परीक्षा सेगमेंट सुरक्षा एवं प्रविष्टि नियंत्रण (Exam Segment Control):
                  </p>
                  <p className="text-rose-900 leading-relaxed">
                    जिस सेगमेंट को आप यहां <strong>लॉक (LOCK)</strong> कर देंगे, वह शिक्षकों के ड्रॉपडाउन मेनू में नहीं दिखेगा। इससे शिक्षक गलत सेगमेंट में एंट्री नहीं कर पाएंगे।
                  </p>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-2 border-b border-slate-100 text-xs">
                <span className="font-bold text-slate-700">त्वरित प्रीसेट (Quick Actions):</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAllSegmentsLock(false)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold cursor-pointer"
                  >
                    🔓 सभी अनलॉक करें (Unlock All)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllSegmentsLock(true)}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold cursor-pointer"
                  >
                    🔒 सभी लॉक करें (Lock All)
                  </button>
                  <button
                    type="button"
                    onClick={lockOnlyTerm2}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold cursor-pointer"
                  >
                    टर्म 1 खोलें (Term 1 Active)
                  </button>
                  <button
                    type="button"
                    onClick={lockOnlyTerm1}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold cursor-pointer"
                  >
                    टर्म 2 खोलें (Term 2 Active)
                  </button>
                </div>
              </div>

              {/* Segment Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'PT-1', name: 'PT-1 Periodic Test', term: 'Term 1', max: '20 Marks' },
                  { key: 'PT-2', name: 'PT-2 Periodic Test', term: 'Term 1', max: '20 Marks' },
                  { key: 'HY', name: 'Term 1 Written', term: 'Term 1', max: '80 Marks' },
                  { key: 'PT-3', name: 'PT-3 Periodic Test', term: 'Term 2', max: '20 Marks' },
                  { key: 'PT-4', name: 'PT-4 Periodic Test', term: 'Term 2', max: '20 Marks' },
                  { key: 'AE', name: 'Term 2 Written', term: 'Term 2', max: '80 Marks' },
                  { key: 'attendance', name: 'Student Attendance Mode', term: 'General', max: 'Working Days' }
                ].map(seg => {
                  const isLocked = Boolean(segmentLocks[seg.key]);
                  return (
                    <div
                      key={seg.key}
                      onClick={() => handleToggleSegmentLock(seg.key)}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                        isLocked
                          ? 'bg-rose-50/70 border-rose-300 text-rose-950 shadow-xs'
                          : 'bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-xs'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{seg.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white font-mono font-bold text-slate-600 border border-slate-200">
                            {seg.term}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {seg.max} &bull; {isLocked ? 'शिक्षकों के पोर्टल से छुपा हुआ है' : 'शिक्षकों के लिए खुला हुआ है'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                            isLocked
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isLocked ? (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>LOCKED</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>UNLOCKED</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: TEACHER ACCOUNTS & SUBJECT ALLOTMENTS              */}
          {/* ========================================================= */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              {/* Informational Guidance Box */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                <Users className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-indigo-800">
                    शिक्षक खाता आधार एवं विषय आवंटन प्रणाली (Teacher Accounts & Allotments):
                  </p>
                  <p className="text-indigo-900 leading-relaxed">
                    शिक्षक की स्थायी पहचान (Unique Teacher ID जैसे <span className="font-mono font-bold">TCH-2026-001</span>) और उनके विषय अधिकारों (Allotments) को अलग-अलग प्रबंधित करें। शिक्षक का नाम बदलने या निष्क्रिय करने पर भी उनकी पहचान सुरक्षित रहती है।
                  </p>
                </div>
              </div>

              {/* Cross-Device Central Registry Cloud Sync Banner */}
              <div className="p-3.5 bg-gradient-to-r from-teal-900 via-indigo-950 to-slate-900 border border-teal-500/30 rounded-xl text-xs text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40 shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-teal-300 block text-xs">
                      सेंट्रल गूगल शीट सिंक (_TEACHERS Tab)
                    </span>
                    <span className="text-[11px] text-slate-300">
                      सभी शिक्षक व आवंटन सीधे गूगल शीट में सुरक्षित रहते हैं। शिक्षक किसी भी डिवाइस/लैपटॉप पर अपना आवंटन देख सकते हैं।
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handlePullTeachersFromCloud}
                    disabled={isSyncingTeachersCloud}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-400/40 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    title="गूगल शीट _TEACHERS से ताज़ा डेटा लोड करें"
                  >
                    <CloudDownload className={`w-3.5 h-3.5 ${isSyncingTeachersCloud ? 'animate-bounce' : ''}`} />
                    <span>शीट से लोड करें</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePushTeachersToCloud}
                    disabled={isSyncingTeachersCloud}
                    className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                    title="वर्तमान आवंटन को गूगल शीट _TEACHERS में सहेजें"
                  >
                    <CloudUpload className={`w-3.5 h-3.5 ${isSyncingTeachersCloud ? 'animate-bounce' : ''}`} />
                    <span>शीट में सहेजें</span>
                  </button>
                </div>
              </div>
              {teacherCloudSyncStatus && (
                <div className="p-2.5 rounded-lg bg-slate-900 text-xs font-semibold text-teal-200 border border-teal-500/30">
                  {teacherCloudSyncStatus}
                </div>
              )}

              {/* SECTION A: TEACHER ACCOUNTS (Module 3A) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <span>शिक्षक खाता प्रबंधन (Teacher Account Directory)</span>
                  </h4>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-white border border-slate-300 text-slate-700">
                      कुल: {currentAccounts.length}
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      सक्रिय: {currentAccounts.filter(a => a.active).length}
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      निष्क्रिय: {currentAccounts.filter(a => !a.active).length}
                    </span>
                  </div>
                </div>

                {/* Diagnostic Alert Box */}
                {teacherAccountDiag && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                      teacherAccountDiag.type === 'error'
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {teacherAccountDiag.type === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span className="font-semibold">{teacherAccountDiag.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTeacherAccountDiag(null)}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Password Reset Requests Alert Banner */}
                {resetRequests.length > 0 && (
                  <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
                        <span>लंबित पासवर्ड रीसेट अनुरोध (Password Reset Requests): {resetRequests.length}</span>
                      </div>
                      <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                        Admin Action Required
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {resetRequests.map((req) => (
                        <div
                          key={req.id}
                          className="bg-white p-2.5 rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{req.teacherName}</span>
                              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                                {req.teacherId}
                              </span>
                              {req.contact && (
                                <span className="text-slate-500 text-[11px]">({req.contact})</span>
                              )}
                            </div>
                            {req.note && (
                              <p className="text-[11px] text-slate-600 mt-0.5 italic">
                                &quot;{req.note}&quot;
                              </p>
                            )}
                            <span className="text-[10px] text-slate-400">
                              अनुरोध समय: {new Date(req.requestedAt).toLocaleString('hi-IN')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={resettingTeacherId === req.teacherId}
                              onClick={() => handleApproveResetRequest(req.teacherId, req.id)}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                            >
                              <RotateCcw className={`w-3 h-3 ${resettingTeacherId === req.teacherId ? 'animate-spin' : ''}`} />
                              <span>{resettingTeacherId === req.teacherId ? 'रीसेट हो रहा है...' : 'स्वीकार करें व 123456 पर रीसेट करें'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismissReset(req.id)}
                              className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold cursor-pointer transition-colors"
                              title="अनुरोध खारिज करें"
                            >
                              खारिज
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account Form */}
                <form onSubmit={handleSaveTeacherAccount} className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      {editingAccountId ? (
                        <>
                          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                          <span>शिक्षक खाता संपादित करें (Edit Teacher Account)</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-emerald-600" />
                          <span>नया शिक्षक खाता बनाएं (Register Teacher Account)</span>
                        </>
                      )}
                    </span>
                    {editingAccountId && (
                      <button
                        type="button"
                        onClick={handleCancelEditAccount}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                      >
                        रद्द करें (Cancel)
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Teacher ID */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Teacher ID (स्थायी आईडी) *
                      </label>
                      <input
                        type="text"
                        required
                        value={teacherIdInput}
                        onChange={(e) => setTeacherIdInput(e.target.value.toUpperCase())}
                        placeholder="उदा. TCH-2026-001"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-indigo-900 focus:outline-none focus:border-indigo-600"
                      />
                      <span className="text-[10px] text-slate-500">अद्वितीय पहचानकर्ता</span>
                    </div>

                    {/* Teacher Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        शिक्षक का नाम (Teacher Name) *
                      </label>
                      <input
                        type="text"
                        required
                        value={teacherNameInput}
                        onChange={(e) => setTeacherNameInput(e.target.value)}
                        placeholder="उदा. श्री आर. के. शर्मा"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                      <span className="text-[10px] text-slate-500">नाम बदलने पर ID वही रहेगी</span>
                    </div>

                    {/* Password / PIN */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        पासवर्ड / पिन (Password) *
                      </label>
                      <input
                        type="text"
                        required
                        value={teacherPasswordInput}
                        onChange={(e) => setTeacherPasswordInput(e.target.value)}
                        placeholder="डिफ़ॉल्ट 123456"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                      <span className="text-[10px] text-slate-500">डिफ़ॉल्ट: 123456</span>
                    </div>

                    {/* Contact & Status */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          संपर्क (Contact)
                        </label>
                        <input
                          type="text"
                          value={teacherContactInput}
                          onChange={(e) => setTeacherContactInput(e.target.value)}
                          placeholder="फोन/ईमेल"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          स्थिति (Status)
                        </label>
                        <button
                          type="button"
                          onClick={() => setTeacherActiveInput(!teacherActiveInput)}
                          className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                            teacherActiveInput
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {teacherActiveInput ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>सक्रिय</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 text-slate-500" />
                              <span>निष्क्रिय</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    {editingAccountId && (
                      <button
                        type="button"
                        onClick={handleCancelEditAccount}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        रद्द करें
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      {editingAccountId ? 'खाता अपडेट करें (Update)' : 'खाता सहेजें (Save Account)'}
                    </button>
                  </div>
                </form>

                {/* Teacher Accounts List */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    पंजीकृत शिक्षक खाते ({currentAccounts.length})
                  </span>

                  {currentAccounts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                      कोई शिक्षक खाता पंजीकृत नहीं है। नया खाता जोड़ने के लिए उपरोक्त फॉर्म भरें।
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {currentAccounts.map((acc, idx) => (
                        <div
                          key={`${acc.id || acc.teacherId}_${idx}`}
                          className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 shrink-0">
                              {acc.teacherId}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {acc.teacherName}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500">
                                {acc.contact && <span>{acc.contact}</span>}
                                <span>•</span>
                                <span className="flex items-center gap-1 font-mono font-semibold text-slate-700">
                                  <span>पासवर्ड:</span>
                                  <span>
                                    {showTeacherPasswords[acc.teacherId]
                                      ? (acc.password || DEFAULT_TEACHER_PASSWORD)
                                      : '••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowTeacherPasswords(prev => ({
                                        ...prev,
                                        [acc.teacherId]: !prev[acc.teacherId]
                                      }))
                                    }
                                    className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    title={showTeacherPasswords[acc.teacherId] ? 'छुपाएं' : 'दिखाएं'}
                                  >
                                    {showTeacherPasswords[acc.teacherId] ? (
                                      <EyeOff className="w-3 h-3" />
                                    ) : (
                                      <Eye className="w-3 h-3" />
                                    )}
                                  </button>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {/* Reset Password to 123456 button */}
                            <button
                              type="button"
                              disabled={resettingTeacherId === acc.teacherId}
                              onClick={() => handleApproveResetRequest(acc.teacherId)}
                              className="px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                              title="पासवर्ड को डिफ़ॉल्ट 123456 पर रीसेट करें"
                            >
                              <RotateCcw className={`w-3 h-3 text-amber-600 ${resettingTeacherId === acc.teacherId ? 'animate-spin' : ''}`} />
                              <span>{resettingTeacherId === acc.teacherId ? 'रीसेट...' : 'रीसेट 123456'}</span>
                            </button>

                            {/* Copy Personal Teacher URL */}
                            <button
                              type="button"
                              onClick={() => handleCopyPersonalTeacherLink(acc.teacherId)}
                              className={`px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium border ${
                                copiedTeacherId === acc.teacherId
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-50 text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 border-slate-200'
                              }`}
                              title="व्यक्तिगत टीचर पोर्टल लिंक कॉपी करें (बिना एडमिन एक्सेस के)"
                            >
                              {copiedTeacherId === acc.teacherId ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Link2 className="w-3 h-3 text-emerald-700" />
                              )}
                              <span>
                                {copiedTeacherId === acc.teacherId ? 'Copied' : 'Personal Link'}
                              </span>
                            </button>

                            {/* Active/Inactive Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleAccountActive(acc)}
                              title={acc.active ? 'निष्क्रिय करने के लिए क्लिक करें' : 'सक्रिय करने के लिए क्लिक करें'}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border cursor-pointer transition-colors ${
                                acc.active
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {acc.active ? (
                                <>
                                  <UserCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3 h-3 text-slate-500" />
                                  <span>Inactive</span>
                                </>
                              )}
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleEditAccount(acc)}
                              className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                              title="संपादित करें"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

                {/* SECTION B: TEACHER CLASS, SECTION & SUBJECT ALLOTMENTS (Module 3B) */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      <span>शिक्षक अनुमति एवं विषय आवंटन (Teacher Permissions: Class → Section → Subject)</span>
                    </h4>
                    <span className="text-[11px] font-medium text-slate-500">
                      Module 3B Foundation
                    </span>
                  </div>

                  {/* Allotment Diagnostic Notification */}
                  {allotmentDiag && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        allotmentDiag.type === 'error'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {allotmentDiag.type === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 font-semibold">{allotmentDiag.message}</div>
                      <button
                        type="button"
                        onClick={() => setAllotmentDiag(null)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Add New Teacher Allotment Form */}
                  <form onSubmit={handleAddTeacherAllotment} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3.5 shadow-2xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Teacher Selection */}
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          शिक्षक पहचान (Teacher) *
                        </label>
                        {currentAccounts.length > 0 ? (
                          <div className="space-y-1.5">
                            <select
                              value={selectedTeacherAccId}
                              onChange={(e) => {
                                setSelectedTeacherAccId(e.target.value);
                                setAllotmentDiag(null);
                                const found = currentAccounts.find(a => a.id === e.target.value);
                                if (found) {
                                  setNewTeacherName(found.teacherName);
                                }
                              }}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                            >
                              <option value="">-- पंजीकृत शिक्षक चुनें --</option>
                              {currentAccounts.map((acc, idx) => (
                                <option key={`${acc.id || acc.teacherId}_${idx}`} value={acc.id}>
                                  {acc.teacherId} — {acc.teacherName} {acc.active ? '' : '(Inactive)'}
                                </option>
                              ))}
                            </select>
                            {!selectedTeacherAccId && (
                              <input
                                type="text"
                                placeholder="या नया शिक्षक नाम..."
                                value={newTeacherName}
                                onChange={(e) => {
                                  setNewTeacherName(e.target.value);
                                  setAllotmentDiag(null);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-600"
                              />
                            )}
                          </div>
                        ) : (
                          <input
                            type="text"
                            required
                            placeholder="उदा. श्री आर. के. शर्मा"
                            value={newTeacherName}
                            onChange={(e) => {
                              setNewTeacherName(e.target.value);
                              setAllotmentDiag(null);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                          />
                        )}
                      </div>

                      {/* Class Selection */}
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          कक्षा (Allotted Class) *
                        </label>
                        <select
                          value={newTeacherClass}
                          onChange={(e) => {
                            const newCls = e.target.value as ClassLevel;
                            setNewTeacherClass(newCls);
                            setAllotmentDiag(null);
                            // Set initial valid subjects from Subject Master for this class
                            const classMasterSubjects = (subjectAllotments && subjectAllotments[newCls]) || SUBJECTS_BY_CLASS[newCls] || [];
                            if (classMasterSubjects.length > 0) {
                              setNewTeacherSubjects([classMasterSubjects[0]]);
                            } else {
                              setNewTeacherSubjects([]);
                            }
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                        >
                          {CLASS_OPTIONS.map(cls => (
                            <option key={cls} value={cls}>Class {cls}</option>
                          ))}
                        </select>
                      </div>

                      {/* Section Selection */}
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          सेक्शन (Section Allotment) *
                        </label>
                        <div className="flex items-center gap-1.5 py-0.5">
                          {['A', 'B', 'C'].map(sec => {
                            const isSelected = newTeacherSections.includes(sec);
                            return (
                              <button
                                key={sec}
                                type="button"
                                onClick={() => {
                                  toggleTeacherSection(sec);
                                  setAllotmentDiag(null);
                                }}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {isSelected ? '✓ ' : ''}Sec {sec}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Subject Choices (From Central Subject Master) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          अधिकृत विषय (Authorized Subjects from Central Master) *
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {newTeacherSubjects.length} विषय चयनित
                        </span>
                      </div>

                      {(() => {
                        const availableCurriculum = (subjectAllotments && subjectAllotments[newTeacherClass]) || SUBJECTS_BY_CLASS[newTeacherClass] || [];

                        if (availableCurriculum.length === 0) {
                          return (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                कक्षा {newTeacherClass} के लिए केंद्रीय विषय मास्टर में कोई विषय कॉन्फ़िगर नहीं है। कृपया पहले Subject Master में विषय जोड़ें।
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                            {availableCurriculum.map(sub => {
                              const isSel = newTeacherSubjects.includes(sub);
                              return (
                                <button
                                  key={sub}
                                  type="button"
                                  onClick={() => {
                                    toggleTeacherSubject(sub);
                                    setAllotmentDiag(null);
                                  }}
                                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                                    isSel
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {isSel ? '✓ ' : '+ '}{sub}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={(!selectedTeacherAccId && !newTeacherName.trim()) || newTeacherSections.length === 0 || newTeacherSubjects.length === 0}
                        className="px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        अनुमति आवंटन सहेजें (Save Permission)
                      </button>
                    </div>
                  </form>

                  {/* Current Teacher Allotments List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      वर्तमान में आवंटित शिक्षक अनुमतियाँ ({teacherAllotments.length})
                    </h4>

                    {teacherAllotments.length === 0 ? (
                      <div className="p-5 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                        कोई विशिष्ट शिक्षक आवंटन नहीं बनाया गया है।
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {teacherAllotments.map((t, idx) => {
                          const sectionsList = (t.sections && t.sections.length > 0) ? t.sections : ['A'];
                          return (
                            <div
                              key={`${t.id || t.teacherId}_${idx}`}
                              className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center flex-wrap gap-2">
                                  {t.teacherId && (
                                    <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                                      {t.teacherId}
                                    </span>
                                  )}
                                  <span className="font-bold text-xs text-slate-900">{t.teacherName}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                    Class {t.classLevel}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    Sec: {sectionsList.join(', ')}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {t.subjects.map(s => (
                                    <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveTeacherAllotment(t.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="अनुमति हटाएं"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: ADMIT CARD SUBJECT ALLOTMENTS                      */}
          {/* ========================================================= */}
          {activeTab === 'admit_card' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-800">एडमिट कार्ड विषय आवंटन (Admit Card Subject Roster):</p>
                  <p className="text-amber-900 leading-relaxed">
                    कक्षा का चयन करें और एडमिट कार्ड में शामिल किए जाने वाले विषयों का चयन करें। एडमिट कार्ड जनरेटर केवल इन्हीं आवंटित विषयों की डेटशीट तैयार करेगा।
                  </p>
                </div>
              </div>

              {/* Class Selector for Admit Card */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">कक्षा चुनें:</span>
                  <select
                    value={selectedAdmitClass}
                    onChange={(e) => setSelectedAdmitClass(e.target.value as ClassLevel)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-indigo-950 focus:outline-none"
                  >
                    {CLASS_OPTIONS.map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllAdmitSubjects}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold cursor-pointer"
                  >
                    मानक विषय भरें (Reset Standard)
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllAdmitSubjects}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold cursor-pointer"
                  >
                    खाली करें (Clear)
                  </button>
                </div>
              </div>

              {/* Subject Selection Grid for Class */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Class {selectedAdmitClass} के लिए आवंटित विषय:</span>
                  <span className="font-mono text-indigo-700">{currentAdmitSubjects.length} विषय चयनित</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
                  {/* Union of standard subjects and all unique subjects */}
                  {Array.from(new Set([
                    ...(SUBJECTS_BY_CLASS[selectedAdmitClass] || []),
                    ...ALL_SUBJECT_OPTIONS,
                    ...currentAdmitSubjects
                  ])).map(subject => {
                    const isSelected = currentAdmitSubjects.includes(subject);
                    return (
                      <label
                        key={subject}
                        className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-50 border-amber-300 text-amber-950'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleAdmitSubject(subject)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <span className="truncate">{subject}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Subject */}
              <form onSubmit={handleAddCustomSubjectToAdmit} className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="कस्टम विषय जोड़ें (उदा. Deeniyat, Urdu, Robotics)..."
                  value={customSubjectInput}
                  onChange={(e) => setCustomSubjectInput(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-600"
                />
                <button
                  type="submit"
                  disabled={!customSubjectInput.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>जोड़ें</span>
                </button>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: PASSWORD MANAGEMENT (NO DEFAULT PIN SHOWN)        */}
          {/* ========================================================= */}
          {activeTab === 'password' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">एडमिन एवं परीक्षा प्रभारी पासवर्ड प्रबंधन:</p>
                  <p className="text-slate-600 leading-relaxed">
                    गोपनीयता बनाए रखने के लिए एडमिन पासवर्ड को नियमित रूप से बदलें। यदि कोई शिक्षक 3 बार से अधिक गलत पासवर्ड दर्ज करता है तो सिस्टम सुरक्षा अलर्ट सक्रिय हो जाता है।
                  </p>
                </div>
              </div>

              {/* Critical Security Warning Banner when 3+ failed attempts */}
              {passwordFailedAttempts > 3 && (
                <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-900 space-y-1.5 animate-pulse shadow-xs">
                  <div className="flex items-center gap-2 text-rose-700">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span className="font-black text-xs uppercase tracking-wider">CRITICAL SECURITY WARNING / चेतावनी</span>
                  </div>
                  <p className="text-sm font-black text-rose-700">
                    &ldquo;Your Mark Entry Power can be locked&rdquo;
                  </p>
                  <p className="text-xs text-rose-800">
                    सिस्टम ने 3 से अधिक गलत पासवर्ड प्रयास दर्ज किए हैं। शिक्षक केवल अपनी अधिकृत कक्षाओं में मार्क्स भरें।
                  </p>
                </div>
              )}

              {passwordMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    passwordMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-rose-50 border-rose-300 text-rose-800'
                  }`}
                >
                  {passwordMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    वर्तमान एडमिन पासवर्ड (Current Password)
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    placeholder="वर्तमान पासवर्ड दर्ज करें"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 font-mono tracking-widest"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                      नया पासवर्ड (New Password)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      placeholder="नया पासवर्ड (कम से कम 4 अंक)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 font-mono tracking-widest"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                      नया पासवर्ड पुष्टि (Confirm Password)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      placeholder="पासवर्ड दोबारा दर्ज करें"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 font-mono tracking-widest"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-[#1B4D3E] to-[#24664f] hover:from-[#163f33] hover:to-[#1d5340] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-[#D4AF37]" />
                    <span>पासवर्ड अपडेट करें (Save New Password)</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: PIS DATA BASE LINK & SYSTEM SETTINGS               */}
          {/* ========================================================= */}
          {activeTab === 'database' && (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-700" />
                    <span>PIS Data Base Link / API URL</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Secure Web App Endpoint
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={databaseUrl}
                    onChange={(e) => setDatabaseUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !databaseUrl}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'जांच रहे हैं...' : 'कनेक्शन जांचें'}</span>
                  </button>
                </div>
                {testStatus && (
                  <p className="text-xs font-medium mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                    {testStatus}
                  </p>
                )}
              </div>

              {/* Students Display Batch Size */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5 text-emerald-700" />
                  <span>एक बार में प्रदर्शित छात्र संख्या (Display Batch Size)</span>
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                >
                  <option value={10}>10 Students per batch</option>
                  <option value={20}>20 Students per batch (Default)</option>
                  <option value={50}>50 Students per batch</option>
                  <option value={100}>All Students in one view</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong>PIS Data Base Sync:</strong> मार्क्स और अटेंडेंस सीधे PIS Data Base में सुरक्षित रूप से रिकॉर्ड होते हैं।
                </div>
              </div>

              {/* Technical Handover Report Download Section */}
              <div className="p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-xs">Technical Handover Report (तकनीकी हैंडओवर रिपोर्ट)</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-semibold">
                    v2.4.0 Master
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  संपूर्ण सिस्टम आर्किटेक्चर, 0.01s इंस्टेंट सिंक मैकेनिज्म, डेटा स्कीमा, Google Apps Script कोड और भविष्य में दोनों ऐप्स को अलग करने की हैंडओवर रिपोर्ट:
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href="/FINAL_TECHNICAL_HANDOVER_REPORT.fxt"
                    download="FINAL_TECHNICAL_HANDOVER_REPORT.fxt"
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-950" />
                    <span>Download Report (.fxt)</span>
                  </a>
                  <a
                    href="/FINAL_TECHNICAL_HANDOVER_REPORT.txt"
                    download="FINAL_TECHNICAL_HANDOVER_REPORT.txt"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download Report (.txt)</span>
                  </a>
                </div>
              </div>

              {/* Admin Destructive Zone: Clear Google Sheet Data */}
              {onClearSheetData && (
                <div className="p-4 bg-rose-50/90 border border-rose-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>व्यवस्थापक सुरक्षा क्षेत्र: गूगल शीट डेटा रीसेट (Clear Google Sheet Data)</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    यह फ़ंक्शन केवल व्यवस्थापक (Admin) के लिए सुरक्षित है। शिक्षक पोर्टल से यह विकल्प हटा दिया गया है। 
                    किसी विशिष्ट कक्षा का डेटा नया सत्र शुरू करते समय या टेस्ट डेटा हटाने के लिए ही इसे चलाएँ।
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-rose-900">कक्षा चुनें:</label>
                      <select
                        value={clearTargetClass}
                        onChange={(e) => setClearTargetClass(e.target.value as ClassLevel)}
                        className="bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                      >
                        {CLASS_OPTIONS.map(c => (
                          <option key={c} value={c}>Class {c}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleAdminClearSheet}
                      disabled={isClearingSheet}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isClearingSheet ? 'डेटा हटाया जा रहा है...' : 'चुनी हुई कक्षा का डेटा साफ़ करें'}</span>
                    </button>
                  </div>
                  {clearStatusMessage && (
                    <div className="text-xs font-semibold p-2.5 bg-white rounded-lg border border-rose-200 text-rose-900">
                      {clearStatusMessage}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-[#1B4D3E] to-[#24664f] hover:from-[#163f33] hover:to-[#1d5340] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  <span>सेटिंग्स सहेजें (Save PIS Data Base Settings)</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>PIS Governance Active</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            बंद करें (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
