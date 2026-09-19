import React, { useState, useMemo } from 'react';
import { ClassLevel } from '../../types';
import { 
  ExamType, 
  FullStudentExamRecord, 
  ResultViewMode, 
  SystemControlConfig 
} from '../../types/resultTypes';
import { SCHOOL_NAME, ACADEMIC_SESSION } from '../../data/schoolConfig';
import { SCHOOL_LOGO_BASE64 } from '../../data/logoData';
import { getFullSubjectName } from '../../utils/resultCalculator';
import { 
  GraduationCap, 
  FileSpreadsheet, 
  BarChart2, 
  Contact, 
  RefreshCw, 
  Share2, 
  BookOpen, 
  Settings, 
  Shield, 
  LogOut, 
  Eye, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  X, 
  Layers, 
  Users,
  ExternalLink,
  Download,
  Maximize2,
  ClipboardCheck
} from 'lucide-react';

interface ResultNavigationSidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop: boolean;
  onToggleCollapsedDesktop: () => void;
  
  // Navigation & View States
  viewMode: ResultViewMode;
  onViewModeChange: (mode: ResultViewMode) => void;
  selectedClass: ClassLevel | '';
  onClassChange: (cls: ClassLevel | '') => void;
  examMode: ExamType;
  onExamModeChange: (mode: ExamType) => void;
  
  // Student selection
  classRecords: FullStudentExamRecord[];
  selectedRoll: number;
  onSelectRoll: (roll: number) => void;
  onPrevStudent: () => void;
  onNextStudent: () => void;
  currentStudent?: FullStudentExamRecord;
  onToggleOptionalSubject: (admNo: string, sub: 'Urdu' | 'Sanskrit') => void;
  
  // Subject Filter
  classAllottedSubjects: string[];
  selectedSubjectFilter: string;
  onSubjectFilterChange: (val: string) => void;
  customSelectedSubjects: string[];
  onToggleCustomSubject: (sub: string) => void;
  onSelectAllCustomSubjects: () => void;
  onClearCustomSubjects: () => void;
  
  // Graph Preference
  showBarGraph: boolean;
  onToggleBarGraph: () => void;
  
  // Modals & Action Triggers
  onOpenTeacherLinkHub: () => void;
  onOpenSheetStructure: () => void;
  onOpenSubjectAllotments: () => void;
  onOpenAdminSettings: () => void;
  onOpenCorrectionRequests?: () => void;
  onRefreshData: () => void;
  isLoading: boolean;
  lastSyncedTime: string | null;
  
  // Admin & Switcher
  systemConfig: SystemControlConfig;
  onSwitchToMarkUpdation?: () => void;
  onSignOutAdmin?: () => void;

  // Preview triggers
  isPreviewExpanded?: boolean;
  onTogglePreviewExpanded?: () => void;
  onOpenPreviewModal?: () => void;
}

type AccordionSection = 'admin' | 'print' | 'reports' | 'navigator';

export const ResultNavigationSidebar: React.FC<ResultNavigationSidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop,
  onToggleCollapsedDesktop,
  viewMode,
  onViewModeChange,
  selectedClass,
  onClassChange,
  examMode,
  onExamModeChange,
  classRecords,
  selectedRoll,
  onSelectRoll,
  onPrevStudent,
  onNextStudent,
  currentStudent,
  onToggleOptionalSubject,
  classAllottedSubjects,
  selectedSubjectFilter,
  onSubjectFilterChange,
  customSelectedSubjects,
  onToggleCustomSubject,
  onSelectAllCustomSubjects,
  onClearCustomSubjects,
  showBarGraph,
  onToggleBarGraph,
  onOpenTeacherLinkHub,
  onOpenSheetStructure,
  onOpenSubjectAllotments,
  onOpenAdminSettings,
  onOpenCorrectionRequests,
  onRefreshData,
  isLoading,
  lastSyncedTime,
  systemConfig,
  onSwitchToMarkUpdation,
  onSignOutAdmin,
  isPreviewExpanded,
  onTogglePreviewExpanded,
  onOpenPreviewModal
}) => {
  // Tree Structure Accordions: Keep primary Navigator & Reports expanded by default, Admin and Print collapsed for compact height
  const [openSections, setOpenSections] = useState<Record<AccordionSection, boolean>>({
    reports: true,
    print: false,
    admin: false,
    navigator: true
  });

  const [sidebarSearch, setSidebarSearch] = useState('');

  const toggleSection = (sec: AccordionSection) => {
    setOpenSections(prev => ({
      ...prev,
      [sec]: !prev[sec]
    }));
  };

  const classesList: ClassLevel[] = [
    'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
  ];

  // Filter student dropdown by search
  const filteredStudents = useMemo(() => {
    if (!sidebarSearch) return classRecords;
    const q = sidebarSearch.toLowerCase();
    return classRecords.filter(st => 
      st.name.toLowerCase().includes(q) ||
      String(st.roll).includes(q) ||
      st.admNo.toLowerCase().includes(q)
    );
  }, [classRecords, sidebarSearch]);

  const reportItems = [
    { id: 'student_management' as ResultViewMode, label: 'Student Management', desc: 'Edit, Update & Delete Records', icon: Users, badge: 'Manage' },
    { id: 'report_card' as ResultViewMode, label: 'Single Report Card', desc: 'Individual A4 Student Card', icon: GraduationCap, badge: 'Main' },
    { id: 'tabulation_sheet' as ResultViewMode, label: 'Tabulation Register', desc: 'CBSE Full Mark Register', icon: FileSpreadsheet, badge: 'CBSE' },
    { id: 'marks_audit' as ResultViewMode, label: 'Official Marks Audit', desc: 'Audit Log, Teacher Sign & Export', icon: ClipboardCheck, badge: 'Audit' },
    { id: 'dashboard' as ResultViewMode, label: 'Class Progress Tracker', desc: 'Analytics & Pass Metrics', icon: BarChart2, badge: 'Stats' },
    { id: 'admit_card' as ResultViewMode, label: 'Admit Card Generator', desc: 'Desk & Exam Hall Slips', icon: Contact, badge: 'Desk' },
    { id: 'bulk_cards' as ResultViewMode, label: 'Batch Cards (All Class)', desc: `All ${classRecords.length} Class Students`, icon: Layers, badge: `${classRecords.length}` }
  ];

  const examModesList = [
    { id: 'HY' as ExamType, label: 'Term 1 (PT1+PT2+HY)', desc: 'Term 1' },
    { id: 'AE' as ExamType, label: 'Term 2 (PT3+PT4+AE)', desc: 'Term 2' },
    { id: 'BOTH' as ExamType, label: 'Final Result (Both Terms)', desc: 'Full Year Dual' },
    { id: 'PT-1' as ExamType, label: 'Periodic Test 1 (20)', desc: 'Unit 1' },
    { id: 'PT-2' as ExamType, label: 'Periodic Test 2 (20)', desc: 'Unit 2' },
    { id: 'PT-3' as ExamType, label: 'Periodic Test 3 (20)', desc: 'Unit 3' },
    { id: 'PT-4' as ExamType, label: 'Periodic Test 4 (20)', desc: 'Unit 4' }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Left Sidebar Navigation Container - Auto-height up to Admin Logout instead of extending all the way down */}
      <aside 
        id="result-navigation-sidebar"
        className={`fixed top-0 left-0 z-50 bg-[#0B1329] text-slate-200 border-r border-b border-slate-800/90 rounded-br-2xl flex flex-col transition-all duration-300 shadow-2xl max-h-[96vh] ${
          isOpenMobile 
            ? 'translate-x-0 w-80 sm:w-88' 
            : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsedDesktop ? 'lg:w-18' : 'lg:w-76 xl:w-82'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 shrink-0 bg-slate-950/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-white p-1 shrink-0 flex items-center justify-center shadow-xs border border-amber-400/40">
              <img 
                src={SCHOOL_LOGO_BASE64} 
                alt="School Crest" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            {!isCollapsedDesktop && (
              <div className="min-w-0">
                <h2 className="text-xs font-black tracking-wider text-white uppercase truncate font-serif">
                  {SCHOOL_NAME}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-amber-400 font-bold tracking-wide uppercase">
                    Office Master
                  </span>
                  <span className="text-slate-600 text-[9px]">&bull;</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {ACADEMIC_SESSION}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Close for Mobile / Toggle for Desktop */}
          <div className="flex items-center gap-1">
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleCollapsedDesktop}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title={isCollapsedDesktop ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsedDesktop ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search / Quick Jump inside Sidebar */}
        {!isCollapsedDesktop && (
          <div className="p-3 border-b border-slate-800/60 bg-slate-900/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search candidate, roll or tool..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 font-medium transition-all"
              />
              {sidebarSearch && (
                <button
                  onClick={() => setSidebarSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Body - natural fit up to max-h so sidebar terminates directly after admin logout */}
        <div className="overflow-y-auto max-h-[calc(96vh-4rem)] px-2.5 py-3 space-y-2.5 custom-scrollbar">

          {/* Collapsed Desktop Quick Icons */}
          {isCollapsedDesktop && (
            <div className="flex flex-col items-center space-y-2 pt-1">
              <button
                onClick={() => onViewModeChange('student_management')}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                  viewMode === 'student_management'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Student Management"
              >
                <Users className="w-5 h-5" />
                <span className="absolute left-14 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg border border-slate-700 whitespace-nowrap hidden group-hover:block z-50 pointer-events-none">
                  Student Management
                </span>
              </button>

              <button
                onClick={() => onViewModeChange('report_card')}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                  viewMode === 'report_card'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Single Report Card"
              >
                <GraduationCap className="w-5 h-5" />
                <span className="absolute left-14 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg border border-slate-700 whitespace-nowrap hidden group-hover:block z-50 pointer-events-none">
                  Single Report Card
                </span>
              </button>

              <button
                onClick={() => onViewModeChange('tabulation_sheet')}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                  viewMode === 'tabulation_sheet'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Tabulation Register"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span className="absolute left-14 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg border border-slate-700 whitespace-nowrap hidden group-hover:block z-50 pointer-events-none">
                  Tabulation Register
                </span>
              </button>

              <button
                onClick={() => onViewModeChange('marks_audit')}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                  viewMode === 'marks_audit'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Official Marks Audit"
              >
                <ClipboardCheck className="w-5 h-5" />
                <span className="absolute left-14 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg border border-slate-700 whitespace-nowrap hidden group-hover:block z-50 pointer-events-none">
                  Official Marks Audit
                </span>
              </button>

              <button
                onClick={() => onViewModeChange('dashboard')}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                  viewMode === 'dashboard'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Class Progress"
              >
                <BarChart2 className="w-5 h-5" />
                <span className="absolute left-14 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg border border-slate-700 whitespace-nowrap hidden group-hover:block z-50 pointer-events-none">
                  Class Progress
                </span>
              </button>

              <button
                onClick={() => onViewModeChange('admit_card')}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                  viewMode === 'admit_card'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Admit Card"
              >
                <Contact className="w-5 h-5" />
                <span className="absolute left-14 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg border border-slate-700 whitespace-nowrap hidden group-hover:block z-50 pointer-events-none">
                  Admit Card
                </span>
              </button>

              <div className="w-8 h-px bg-slate-800 my-1" />

              <button
                onClick={() => onViewModeChange('bulk_cards')}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-emerald-400 hover:bg-emerald-950/50 hover:text-emerald-300 transition-all relative group cursor-pointer"
                title="Batch Report Cards"
              >
                <Layers className="w-5 h-5" />
                <span className="absolute left-14 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg border border-slate-700 whitespace-nowrap hidden group-hover:block z-50 pointer-events-none">
                  Batch Cards ({classRecords.length})
                </span>
              </button>

              <button
                onClick={onOpenSheetStructure}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-teal-400 hover:bg-teal-950/50 hover:text-teal-300 transition-all relative group cursor-pointer"
                title="Sheet & Excel Import"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span className="absolute left-14 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg border border-slate-700 whitespace-nowrap hidden group-hover:block z-50 pointer-events-none">
                  Sheet & Excel Import
                </span>
              </button>

              <button
                onClick={onOpenTeacherLinkHub}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-amber-400 hover:bg-amber-950/50 hover:text-amber-300 transition-all relative group cursor-pointer"
                title="Teacher Link & Sync Hub"
              >
                <Share2 className="w-5 h-5" />
                <span className="absolute left-14 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg border border-slate-700 whitespace-nowrap hidden group-hover:block z-50 pointer-events-none">
                  Teacher Link & Sync Hub
                </span>
              </button>

              <button
                onClick={onRefreshData}
                disabled={isLoading}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-indigo-400 hover:bg-indigo-950/50 hover:text-indigo-300 transition-all relative group cursor-pointer"
                title="Sync Google Sheets"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
                <span className="absolute left-14 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg border border-slate-700 whitespace-nowrap hidden group-hover:block z-50 pointer-events-none">
                  Sync Google Sheets
                </span>
              </button>
            </div>
          )}

          {/* GROUPED BRANCHING MENU (TREE STRUCTURE) */}
          {!isCollapsedDesktop && (
            <>
              {/* 1. 📊 SECTION: REPORTS & ANALYTICS */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection('reports')}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                      <GraduationCap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold tracking-wide text-slate-100 uppercase block">
                        Results &amp; Analytics
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.reports ? 'rotate-180' : ''}`} />
                </button>

                {openSections.reports && (
                  <div className="p-2 pt-0 space-y-1 border-t border-slate-800/40">
                    {reportItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = viewMode === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onViewModeChange(item.id);
                            if (window.innerWidth < 1024) onCloseMobile();
                          }}
                          className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                            isActive
                              ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                            isActive 
                              ? 'bg-slate-950 text-amber-300' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.badge}
                          </span>
                        </button>
                      );
                    })}

                    {/* Preview toggles if in report card or bulk cards mode */}
                    {(viewMode === 'report_card' || viewMode === 'bulk_cards') && (
                      <div className="pt-1.5 mt-1 border-t border-slate-800/60 flex items-center gap-1.5">
                        {onTogglePreviewExpanded && (
                          <button
                            type="button"
                            onClick={onTogglePreviewExpanded}
                            className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                              isPreviewExpanded
                                ? 'bg-slate-800 text-amber-300 border border-slate-700'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isPreviewExpanded ? 'Hide Preview' : 'View Preview'}</span>
                          </button>
                        )}
                        {onOpenPreviewModal && (
                          <button
                            type="button"
                            onClick={onOpenPreviewModal}
                            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Open Full Screen Modal"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Modal</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. 🖨️ SECTION: PRINT CENTER */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection('print')}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold tracking-wide text-slate-100 uppercase block">
                        PDF &amp; Report Center
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.print ? 'rotate-180' : ''}`} />
                </button>

                {openSections.print && (
                  <div className="p-2 pt-0 space-y-1.5 border-t border-slate-800/40 text-xs">
                    {/* View Batch Cards */}
                    <button
                      type="button"
                      onClick={() => {
                        onViewModeChange('bulk_cards');
                        if (window.innerWidth < 1024) onCloseMobile();
                      }}
                      className="w-full px-2.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Batch Cards (Class)</span>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">
                        {classRecords.length}
                      </span>
                    </button>

                    {/* Performance Bar Graph Toggle */}
                    <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>Include Graph in PDF</span>
                      </span>
                      <button
                        type="button"
                        onClick={onToggleBarGraph}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                          showBarGraph 
                            ? 'bg-emerald-500 text-slate-950' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {showBarGraph ? 'YES' : 'NO'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. 🛡️ SECTION: ADMIN PANEL */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection('admin')}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold tracking-wide text-slate-100 uppercase block">
                        Office Master Controls
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.admin ? 'rotate-180' : ''}`} />
                </button>

                {openSections.admin && (
                  <div className="p-2 pt-0 space-y-1.5 border-t border-slate-800/40 text-xs">
                    {/* Teacher Link & Sync Hub */}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenTeacherLinkHub();
                        if (window.innerWidth < 1024) onCloseMobile();
                      }}
                      className="w-full px-2.5 py-2 bg-gradient-to-r from-emerald-950/60 to-teal-950/60 hover:from-emerald-900/80 hover:to-teal-900/80 border border-emerald-700/60 text-emerald-100 rounded-lg flex items-center justify-between font-bold transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Share2 className="w-3.5 h-3.5 text-amber-300" />
                        <span>Teacher Link &amp; Sync Hub</span>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                        systemConfig.marksEntryStatus === 'OFF'
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-500 text-slate-950'
                      }`}>
                        {systemConfig.marksEntryStatus === 'OFF' ? 'LOCKED' : 'ACTIVE'}
                      </span>
                    </button>

                    {/* Sheet Structure & Excel Import */}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSheetStructure();
                        if (window.innerWidth < 1024) onCloseMobile();
                      }}
                      className="w-full px-2.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-lg flex items-center justify-between font-semibold transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                        <span>Sheet Structure &amp; Excel Import</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>

                    {/* Allot Subjects */}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSubjectAllotments();
                        if (window.innerWidth < 1024) onCloseMobile();
                      }}
                      className="w-full px-2.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-lg flex items-center justify-between font-semibold transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>Allot Subjects</span>
                      </div>
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 bg-slate-900 text-amber-300 rounded">
                        {classAllottedSubjects.length} Subs
                      </span>
                    </button>

                    {/* Admin Control Center / Settings */}
                    {onOpenCorrectionRequests && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenCorrectionRequests();
                          if (window.innerWidth < 1024) onCloseMobile();
                        }}
                        className="w-full px-2.5 py-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 text-amber-100 rounded-lg flex items-center justify-between font-bold transition-all cursor-pointer"
                      >
                        <span>Correction Requests</span>
                        <span className="text-[10px] text-amber-300">Review</span>
                      </button>
                    )}

                    {/* Admin Control Center / Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAdminSettings();
                        if (window.innerWidth < 1024) onCloseMobile();
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-lg flex items-center justify-between font-medium transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                        <span>Admin Settings (PIN)</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold font-mono">Admin</span>
                    </button>

                    {/* Preview Teacher Portal (if present) */}
                    {onSwitchToMarkUpdation && (
                      <button
                        type="button"
                        onClick={onSwitchToMarkUpdation}
                        className="w-full px-2.5 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 text-indigo-200 rounded-lg flex items-center justify-between font-medium transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Switch to Marks Portal</span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-300">&rarr;</span>
                      </button>
                    )}

                    {/* Sync Google Sheets */}
                    <button
                      type="button"
                      onClick={onRefreshData}
                      disabled={isLoading}
                      className="w-full px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-lg flex items-center justify-between font-semibold transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{isLoading ? 'Syncing...' : 'Sync PIS Data Base'}</span>
                      </div>
                      {lastSyncedTime && (
                        <span className="text-[9px] text-slate-400 font-mono truncate max-w-[90px]">
                          {lastSyncedTime}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* 4. 🧭 SECTION: CLASS & CANDIDATE NAVIGATOR */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection('navigator')}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold tracking-wide text-slate-100 uppercase block">
                        Candidate &amp; Filters
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.navigator ? 'rotate-180' : ''}`} />
                </button>

                {openSections.navigator && (
                  <div className="p-2.5 pt-1 space-y-2.5 border-t border-slate-800/40 text-xs">
                    {/* Class Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Active Class ({classRecords.length} Students)
                      </label>
                      <select
                        value={selectedClass}
                        onChange={(e) => onClassChange(e.target.value as ClassLevel | '')}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-2xs"
                      >
                        <option value="">-- कक्षा चुनें (Select Class) --</option>
                        {classesList.map(c => (
                          <option key={c} value={c}>Class {c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Candidate Selector */}
                    {viewMode === 'report_card' && (
                      <div className="space-y-1.5 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Candidate Select
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={onPrevStudent}
                              disabled={classRecords.findIndex(s => s.roll === selectedRoll) <= 0}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Previous Student"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono font-bold text-amber-400">
                              #{selectedRoll}
                            </span>
                            <button
                              onClick={onNextStudent}
                              disabled={classRecords.findIndex(s => s.roll === selectedRoll) >= classRecords.length - 1}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Next Student"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <select
                          value={selectedRoll}
                          onChange={(e) => onSelectRoll(parseInt(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-2xs truncate"
                        >
                          {filteredStudents.map(st => (
                            <option key={st.admNo} value={st.roll}>
                              Roll {st.roll}: {st.name}
                            </option>
                          ))}
                        </select>

                        {/* Optional Subject Quick Toggle */}
                        {currentStudent && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                            <span className="text-slate-400">2nd Language:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onToggleOptionalSubject(currentStudent.admNo, 'Urdu')}
                                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-all ${
                                  currentStudent.optionalSubject === 'Urdu'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                Urdu
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggleOptionalSubject(currentStudent.admNo, 'Sanskrit')}
                                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-all ${
                                  currentStudent.optionalSubject === 'Sanskrit'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                Sanskrit
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Exam Evaluation Mode */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Exam Evaluation Scheme
                      </label>
                      <select
                        value={examMode}
                        onChange={(e) => onExamModeChange(e.target.value as ExamType)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-xs font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-2xs"
                      >
                        {examModesList.map(em => (
                          <option key={em.id} value={em.id}>
                            {em.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Included Subjects Filter */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Included Subjects Filter
                      </label>
                      <select
                        value={selectedSubjectFilter}
                        onChange={(e) => onSubjectFilterChange(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-2xs"
                      >
                        <option value="ALL">
                          ★ All {classAllottedSubjects.length} Subjects
                        </option>
                        <optgroup label="Single Subject Only">
                          {classAllottedSubjects.map(sub => (
                            <option key={sub} value={sub}>
                              {getFullSubjectName(sub)}
                            </option>
                          ))}
                        </optgroup>
                        <option value="CUSTOM">
                          ⚙️ Custom Multi-Select Filter...
                        </option>
                      </select>
                    </div>

                    {/* Custom Multi-Select Checklist */}
                    {selectedSubjectFilter === 'CUSTOM' && (
                      <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-bold">Pick Subjects:</span>
                          <div className="flex items-center gap-2">
                            <button 
                              type="button" 
                              onClick={onSelectAllCustomSubjects}
                              className="text-amber-400 hover:underline"
                            >
                              All
                            </button>
                            <span className="text-slate-600">|</span>
                            <button 
                              type="button" 
                              onClick={onClearCustomSubjects}
                              className="text-rose-400 hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1 pt-1">
                          {classAllottedSubjects.map(sub => {
                            const isChecked = customSelectedSubjects.includes(sub);
                            return (
                              <label 
                                key={sub}
                                className="flex items-center gap-2 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                              >
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => onToggleCustomSubject(sub)}
                                  className="rounded border-slate-700 text-amber-400 focus:ring-0"
                                />
                                <span className="truncate">{getFullSubjectName(sub)}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 🔴 Admin Logout Section (Sidebar terminates cleanly here) */}
              {onSignOutAdmin && (
                <div className="pt-2 pb-1 border-t border-slate-800/80 space-y-2">
                  <button
                    id="btn-sidebar-immediate-logout"
                    type="button"
                    onClick={onSignOutAdmin}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-rose-900/90 to-rose-800/90 hover:from-rose-800 hover:to-rose-700 border border-rose-600/90 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-98"
                    title="एडमिन सत्र से बाहर निकलें (Logout Admin)"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-200" />
                    <span>एडमिन लॉगआउट (Logout Admin)</span>
                  </button>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="font-semibold text-slate-300">PIS System v2026.3</span>
                    </div>
                    {onSwitchToMarkUpdation && (
                      <button
                        type="button"
                        onClick={onSwitchToMarkUpdation}
                        className="text-[10px] text-indigo-300 hover:text-indigo-200 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>मार्क्स पोर्टल</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Collapsed desktop quick logout icon */}
        {isCollapsedDesktop && onSignOutAdmin && (
          <div className="p-2 border-t border-slate-800 bg-slate-950/95 flex flex-col items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 block animate-pulse" title="Admin Active" />
            <button
              id="btn-sidebar-collapsed-logout"
              type="button"
              onClick={onSignOutAdmin}
              className="p-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/90 text-rose-300 rounded-lg transition-colors cursor-pointer"
              title="लॉगआउट (Logout Admin)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
