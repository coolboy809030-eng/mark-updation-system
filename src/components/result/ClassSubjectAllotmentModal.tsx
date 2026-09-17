import React, { useState, useEffect, useMemo } from 'react';
import { ClassLevel } from '../../types';
import { ClassSubjectAllotmentMap } from '../../types/resultTypes';
import { SUBJECTS_BY_CLASS } from '../../data/schoolConfig';
import { getFullSubjectName } from '../../utils/resultCalculator';
import {
  BookOpen,
  Check,
  X,
  Save,
  Plus,
  RotateCcw,
  Copy,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { saveCanonicalCurriculum, normalizeSubjectName } from '../../utils/subjectCurriculum';

interface ClassSubjectAllotmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectAllotments: ClassSubjectAllotmentMap;
  onSaveSubjectAllotments: (newMap: ClassSubjectAllotmentMap) => void;
  initialClass?: ClassLevel;
  onSwitchToMarkUpdation?: () => void;
}

const ALL_CLASSES: ClassLevel[] = [
  'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
];

// Comprehensive Master Subject Catalog for CBSE / School Curriculum
const MASTER_SUBJECT_CATALOG: { category: string; subjects: string[] }[] = [
  {
    category: 'Languages',
    subjects: ['English', 'Hindi', 'Urdu', 'Sanskrit', 'Arabic']
  },
  {
    category: 'STEM & Sciences',
    subjects: ['Mathematics', 'Science', 'Environmental Studies', 'Computer', 'Information Technology']
  },
  {
    category: 'Social Studies & Humanities',
    subjects: ['Social Studies', 'Social Science', 'History', 'Geography']
  },
  {
    category: 'Early Primary & General Studies',
    subjects: ['General Knowledge (GK)', 'General Awareness', 'Drawing', 'Table Book', 'Rhymes', 'Moral Science']
  }
];

export const ClassSubjectAllotmentModal: React.FC<ClassSubjectAllotmentModalProps> = ({
  isOpen,
  onClose,
  subjectAllotments,
  onSaveSubjectAllotments,
  initialClass = '5',
  onSwitchToMarkUpdation
}) => {
  const [selectedClass, setSelectedClass] = useState<ClassLevel>(initialClass);
  const [localAllotments, setLocalAllotments] = useState<ClassSubjectAllotmentMap>(() => ({
    ...SUBJECTS_BY_CLASS,
    ...subjectAllotments
  }));
  const [newSubjectName, setNewSubjectName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Sync state whenever modal opens or subjectAllotments change
  useEffect(() => {
    if (isOpen) {
      setLocalAllotments({
        ...SUBJECTS_BY_CLASS,
        ...subjectAllotments
      });
      if (initialClass) {
        setSelectedClass(initialClass);
      }
    }
  }, [isOpen, subjectAllotments, initialClass]);

  // Current allotted subjects for selected class
  const currentClassSubjects = useMemo(() => {
    if (Array.isArray(localAllotments[selectedClass])) {
      return localAllotments[selectedClass];
    }
    return SUBJECTS_BY_CLASS[selectedClass] || [];
  }, [localAllotments, selectedClass]);

  if (!isOpen) return null;

  // Reorder subject within current class
  const handleMoveSubject = (subject: string, direction: 'up' | 'down') => {
    setLocalAllotments(prev => {
      const currentList = Array.isArray(prev[selectedClass]) 
        ? [...prev[selectedClass]] 
        : [...(SUBJECTS_BY_CLASS[selectedClass] || [])];
      
      const index = currentList.findIndex(s => s.toLowerCase() === subject.toLowerCase());
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === currentList.length - 1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = currentList[index];
      currentList[index] = currentList[targetIndex];
      currentList[targetIndex] = temp;

      return {
        ...prev,
        [selectedClass]: currentList
      };
    });
  };

  // Toggle subject for current class
  const handleToggleSubject = (subject: string) => {
    setLocalAllotments(prev => {
      const currentList = Array.isArray(prev[selectedClass]) 
        ? [...prev[selectedClass]] 
        : [...(SUBJECTS_BY_CLASS[selectedClass] || [])];
      
      const exists = currentList.some(s => s.toLowerCase() === subject.toLowerCase());
      
      let updatedList: string[];
      if (exists) {
        updatedList = currentList.filter(s => s.toLowerCase() !== subject.toLowerCase());
      } else {
        updatedList = [...currentList, subject];
      }

      return {
        ...prev,
        [selectedClass]: updatedList
      };
    });
  };

  // Add custom subject
  const handleAddCustomSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeSubjectName(newSubjectName);
    if (!clean) return;

    setLocalAllotments(prev => {
      const currentList = Array.isArray(prev[selectedClass]) 
        ? [...prev[selectedClass]] 
        : [...(SUBJECTS_BY_CLASS[selectedClass] || [])];
      
      if (currentList.some(s => s.toLowerCase() === clean.toLowerCase())) {
        setNotification({ type: 'info', message: `"${clean}" is already allotted to Class ${selectedClass}.` });
        return prev;
      }
      return {
        ...prev,
        [selectedClass]: [...currentList, clean]
      };
    });

    setNotification({
      type: 'success',
      message: `Added and allotted "${clean}" to Class ${selectedClass} successfully!`
    });
    setNewSubjectName('');
  };

  // Remove a subject specifically
  const handleRemoveSubject = (subject: string) => {
    setLocalAllotments(prev => {
      const currentList = Array.isArray(prev[selectedClass]) ? prev[selectedClass] : (SUBJECTS_BY_CLASS[selectedClass] || []);
      return {
        ...prev,
        [selectedClass]: currentList.filter(s => s.toLowerCase() !== subject.toLowerCase())
      };
    });
  };

  // Reset current class to CBSE default
  const handleResetToDefault = () => {
    const defaultSubs = SUBJECTS_BY_CLASS[selectedClass] || [];
    setLocalAllotments(prev => ({
      ...prev,
      [selectedClass]: [...defaultSubs]
    }));
    setNotification({
      type: 'info',
      message: `Reset Class ${selectedClass} to CBSE school default (${defaultSubs.length} subjects).`
    });
  };

  // Copy current class subject allotment to target classes
  const handleCopyAllotment = (targetGroup: 'junior' | 'primary' | 'middle' | 'secondary' | 'all') => {
    let targetClasses: ClassLevel[] = [];
    if (targetGroup === 'junior') targetClasses = ['Nursery', 'LKG', 'UKG'];
    else if (targetGroup === 'primary') targetClasses = ['1', '2', '3', '4', '5'];
    else if (targetGroup === 'middle') targetClasses = ['6', '7', '8'];
    else if (targetGroup === 'secondary') targetClasses = ['9', '10'];
    else targetClasses = ALL_CLASSES;

    const sourceSubjects = [...currentClassSubjects];

    setLocalAllotments(prev => {
      const next = { ...prev };
      targetClasses.forEach(cls => {
        next[cls] = [...sourceSubjects];
      });
      return next;
    });

    setNotification({
      type: 'success',
      message: `Copied ${sourceSubjects.length} subjects from Class ${selectedClass} to ${targetClasses.length} classes!`
    });
  };

  // Save changes to parent state and canonical localStorage immediately
  const handleSaveAndApply = () => {
    saveCanonicalCurriculum(localAllotments);
    onSaveSubjectAllotments(localAllotments);
    setNotification({
      type: 'success',
      message: 'Class subject curriculum saved! Academic Hero, Admit Cards, and Tabulation are now updated.'
    });
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Gather all unique subjects across master catalog and currently allotted
  const allKnownSubjects: string[] = Array.from(
    new Set<string>([
      ...MASTER_SUBJECT_CATALOG.flatMap(c => c.subjects),
      ...Object.keys(localAllotments).flatMap(k => localAllotments[k as ClassLevel] || []),
      ...Object.keys(SUBJECTS_BY_CLASS).flatMap(k => SUBJECTS_BY_CLASS[k as ClassLevel] || [])
    ])
  );

  // Filtered subjects based on search
  const filteredCatalog: string[] = allKnownSubjects.filter((sub: string) =>
    sub.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getFullSubjectName(sub).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden my-auto text-left"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#1b4332] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Layers className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Class-wise Subject Allotment Control</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                  Exam Authority
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Kis class me kaun se subject allot karne hain aur kis me marks entry hogi, uska central control yahan se manage hota hai.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className={`px-4 py-2 text-xs font-semibold flex items-center justify-between border-b ${
            notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {notification.message}
            </span>
            <button 
              onClick={() => setNotification(null)}
              className="p-0.5 hover:opacity-75 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Class Selection Strip */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">
              Select Class to Configure Allotments:
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {ALL_CLASSES.map(cls => {
                const count = (localAllotments[cls] || SUBJECTS_BY_CLASS[cls] || []).length;
                const isSelected = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-sm ring-2 ring-[#1b4332]/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>Class {cls}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Class Allotment Summary Card */}
          <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1b4332]" />
                <h4 className="font-bold text-sm text-slate-900">
                  Class {selectedClass} Allotted Subjects: <span className="text-[#1b4332] font-mono">({currentClassSubjects.length} Subjects Active)</span>
                </h4>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Academic Hero me jab teacher Class {selectedClass} select karenge, unhe drop-down me <strong>keval yahi {currentClassSubjects.length} subjects</strong> milenge.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset Class to CBSE standard subjects"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reset Default
              </button>
            </div>
          </div>

          {/* Current Allotted Badges for Active Class */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-700 block mb-2">
              Currently Allotted to Class {selectedClass} ({currentClassSubjects.length}):
            </span>
            {currentClassSubjects.length === 0 ? (
              <p className="text-xs text-amber-700 italic">
                No subjects allotted yet. Please check subjects below to allot them.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {currentClassSubjects.map((sub, idx) => (
                  <span
                    key={sub}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1b4332]/10 text-[#1b4332] border border-[#1b4332]/30 group"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#1b4332] text-white text-[10px] flex items-center justify-center font-mono shrink-0">
                      {idx + 1}
                    </span>
                    <span>{getFullSubjectName(sub)}</span>
                    <div className="flex items-center gap-0.5 ml-1 border-l border-[#1b4332]/20 pl-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSubject(sub, 'up')}
                        className={`p-0.5 rounded transition-colors ${idx === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-[#1b4332]/20 hover:text-[#1b4332] cursor-pointer'}`}
                        title="Move Left / Earlier"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === currentClassSubjects.length - 1}
                        onClick={() => handleMoveSubject(sub, 'down')}
                        className={`p-0.5 rounded transition-colors ${idx === currentClassSubjects.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-[#1b4332]/20 hover:text-[#1b4332] cursor-pointer'}`}
                        title="Move Right / Later"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(sub)}
                        className="p-0.5 hover:bg-rose-100 rounded text-rose-600 transition-colors cursor-pointer ml-0.5"
                        title={`Remove ${sub} from Class ${selectedClass}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Search & Add Subject Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject in catalog..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:bg-white"
              />
            </div>

            {/* Add Custom Subject Form */}
            <form onSubmit={handleAddCustomSubject} className="flex gap-2">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Add custom subject (e.g. Robotics, EVS)..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:bg-white"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> Allot New
              </button>
            </form>
          </div>

          {/* Master Subject Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Click Subject to Toggle Allotment for Class {selectedClass}:
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Green = Allotted & Active in Teacher Portal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {filteredCatalog.map(sub => {
                const isAllotted = currentClassSubjects.some(
                  s => s.toLowerCase() === sub.toLowerCase()
                );
                const isOptionalLang = sub.toLowerCase() === 'urdu' || sub.toLowerCase() === 'sanskrit';

                return (
                  <div
                    key={sub}
                    onClick={() => handleToggleSubject(sub)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-2 ${
                      isAllotted
                        ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs hover:bg-emerald-100/70'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 opacity-80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                        isAllotted ? 'bg-[#1b4332] text-white' : 'border border-slate-300 bg-white text-transparent'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 leading-snug">
                          {getFullSubjectName(sub)}
                        </div>
                        <div className="text-[10px] mt-0.5 font-medium flex items-center gap-1.5">
                          {isAllotted ? (
                            <span className="text-emerald-700 font-bold">Marks Entry Active</span>
                          ) : (
                            <span className="text-slate-400">Not Allotted</span>
                          )}
                          {isOptionalLang && (
                            <span className="text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 text-[9px]">
                              2nd Language
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batch Copy Options */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2 mb-2 font-bold text-slate-800">
              <Copy className="w-4 h-4 text-slate-600" />
              <span>Copy Class {selectedClass} Subject Setup to Other Classes:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCopyAllotment('junior')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 cursor-pointer transition-colors"
              >
                Copy to Junior (Nursery, LKG, UKG)
              </button>
              <button
                type="button"
                onClick={() => handleCopyAllotment('primary')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 cursor-pointer transition-colors"
              >
                Copy to Primary (1 to 5)
              </button>
              <button
                type="button"
                onClick={() => handleCopyAllotment('middle')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 cursor-pointer transition-colors"
              >
                Copy to Middle (6 to 8)
              </button>
              <button
                type="button"
                onClick={() => handleCopyAllotment('secondary')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 cursor-pointer transition-colors"
              >
                Copy to Secondary (9, 10)
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Changes immediately sync to Academic Hero dropdown, Admit Card & Report Cards.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1b4332] hover:bg-[#143326] text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
            >
              <Save className="w-4 h-4 text-amber-300" /> Save & Apply Allotments
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
