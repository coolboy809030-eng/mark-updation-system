import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Layers, 
  Table, 
  HelpCircle,
  ArrowRight,
  Database,
  Users,
  Code,
  BookOpen,
  Sparkles,
  Info
} from 'lucide-react';
import { ClassLevel } from '../../types';
import { SUBJECTS_BY_CLASS, DEFAULT_STUDENTS_BY_CLASS } from '../../data/schoolConfig';
import { ClassSubjectAllotmentMap } from '../../types/resultTypes';
import { formatDisplayDate } from '../../utils/dateFormatter';
import { getCompleteAppsScript } from '../../data/newAppsScriptTemplate';

const ALL_CLASSES: ClassLevel[] = [
  'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
];

interface GoogleSheetStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: ClassLevel;
  onClassChange: (cls: ClassLevel) => void;
  subjectAllotments: ClassSubjectAllotmentMap;
  onImportStudentsToClass: (cls: ClassLevel, students: any[]) => void;
  googleSheetApiUrl?: string;
}

export const GoogleSheetStructureModal: React.FC<GoogleSheetStructureModalProps> = ({
  isOpen,
  onClose,
  selectedClass,
  onClassChange,
  subjectAllotments,
  onImportStudentsToClass,
  googleSheetApiUrl
}) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'workbook' | 'import'>('structure');
  const [copiedHeaders, setCopiedHeaders] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  // Active subjects for target class from allotments or default
  const activeSubjects = useMemo(() => {
    return subjectAllotments[selectedClass] || SUBJECTS_BY_CLASS[selectedClass] || [];
  }, [selectedClass, subjectAllotments]);

  // Base profile columns
  const baseProfileColumns = useMemo(() => [
    { key: 'sno', label: 'S.No', example: '1', desc: 'Serial Index' },
    { key: 'roll', label: 'Roll No', example: '1', desc: 'Candidate Roll Number' },
    { key: 'admNo', label: 'Admission No', example: `PIS-2025-${selectedClass}-001`, desc: 'Unique Registration ID' },
    { key: 'name', label: 'Student Name', example: 'Aadil Khan', desc: 'Full Name' },
    { key: 'fatherName', label: 'Father Name', example: 'MOHD KHAN', desc: "Father's Full Name" },
    { key: 'motherName', label: 'Mother Name', example: 'PARVEEN BEGUM', desc: "Mother's Full Name" },
    { key: 'dob', label: 'DOB', example: '15/08/2014', desc: 'Date of Birth (DD/MM/YYYY)' },
    { key: 'gender', label: 'Gender', example: 'M', desc: 'M / F' },
    { key: 'category', label: 'Category', example: 'GEN', desc: 'GEN / OBC / SC / ST' },
    { key: 'mobile', label: 'Mobile No', example: '9835123456', desc: 'Contact Mobile Number' },
    { key: 'optionalSubject', label: 'Optional Subject', example: 'Urdu', desc: 'Urdu or Sanskrit' },
    { key: 'photoUrl', label: 'Photo URL', example: 'https://...', desc: 'Optional Google Drive/Web Photo URL' }
  ], [selectedClass]);

  // Exam marks columns for class
  const marksColumns = useMemo(() => {
    const list: { key: string; label: string; example: string; desc: string }[] = [];
    activeSubjects.forEach(sub => {
      list.push({ key: `${sub}_PT1`, label: `${sub} PT-1`, example: '18', desc: `Periodic Test 1 (Max 20)` });
      list.push({ key: `${sub}_PT2`, label: `${sub} PT-2`, example: '19', desc: `Periodic Test 2 (Max 20)` });
      list.push({ key: `${sub}_HY`, label: `${sub}-HY-WRT`, example: '72', desc: `Term 1 Written (Max 80)` });
      list.push({ key: `${sub}_PT3`, label: `${sub} PT-3`, example: '17', desc: `Periodic Test 3 (Max 20)` });
      list.push({ key: `${sub}_PT4`, label: `${sub} PT-4`, example: '18', desc: `Periodic Test 4 (Max 20)` });
      list.push({ key: `${sub}_AE`, label: `${sub}-AE-WRT`, example: '74', desc: `Term 2 Written (Max 80)` });
    });
    return list;
  }, [activeSubjects]);

  const attendanceColumns = useMemo(() => [
    { key: 'att_hy', label: 'Attendance-HY', example: '98/110', desc: 'Present / Working Days (Term 1)' },
    { key: 'att_ae', label: 'Attendance-AE', example: '102/115', desc: 'Present / Working Days (Term 2)' }
  ], []);

  const allColumns = useMemo(() => {
    return [...baseProfileColumns, ...marksColumns, ...attendanceColumns];
  }, [baseProfileColumns, marksColumns, attendanceColumns]);

  // Copy Headers for Selected Class
  const handleCopyHeaders = () => {
    const tsvString = allColumns.map(c => c.label).join('\t');
    navigator.clipboard.writeText(tsvString);
    setCopiedHeaders(true);
    setTimeout(() => setCopiedHeaders(false), 2500);
  };

  // Download Class CSV Template
  const handleDownloadClassCsv = (cls: ClassLevel) => {
    const subs = subjectAllotments[cls] || SUBJECTS_BY_CLASS[cls] || [];
    const cols = [
      'S.No', 'Roll No', 'Admission No', 'Student Name', 'Father Name', 'Mother Name',
      'DOB', 'Gender', 'Category', 'Mobile No', 'Optional Subject', 'Photo URL'
    ];
    subs.forEach(s => {
      cols.push(`${s} PT-1`, `${s} PT-2`, `${s}-HY-WRT`, `${s} PT-3`, `${s} PT-4`, `${s}-AE-WRT`);
    });
    cols.push('Attendance-HY', 'Attendance-AE');

    const headerRow = cols.map(c => `"${c}"`).join(',');
    
    // Sample rows from default students
    const sampleStudents = DEFAULT_STUDENTS_BY_CLASS[cls] || [
      { roll: '1', name: 'Sample Student 1', fatherName: 'FATHER NAME 1', optionalSubject: 'Urdu' },
      { roll: '2', name: 'Sample Student 2', fatherName: 'FATHER NAME 2', optionalSubject: 'Sanskrit' }
    ];

    const sampleRows = sampleStudents.slice(0, 5).map((st, idx) => {
      const rollNum = st.roll || (idx + 1);
      const rowValues = [
        idx + 1,
        rollNum,
        `PIS-2025-${cls}-${String(rollNum).padStart(3, '0')}`,
        `"${st.name}"`,
        `"${st.fatherName || 'GUARDIAN'}"`,
        `"MOTHER NAME"`,
        `"15/07/2014"`,
        `"M"`,
        `"GEN"`,
        `"983510000${idx}"`,
        `"${st.optionalSubject || 'Urdu'}"`,
        `""`
      ];
      subs.forEach(() => {
        rowValues.push('18', '19', '72', '17', '18', '74');
      });
      rowValues.push('"95/110"', '"102/115"');
      return rowValues.join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...sampleRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Peace_School_Class_${cls}_Master_Structure.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Complete 13-Class Master Multi-Tab Excel Workbook (.xlsx)
  const handleDownloadAllClassesXlsx = () => {
    try {
      const wb = XLSX.utils.book_new();

      ALL_CLASSES.forEach(cls => {
        const subs = subjectAllotments[cls] || SUBJECTS_BY_CLASS[cls] || [];
        const cols = [
          'S.No', 'Roll No', 'Admission No', 'Student Name', 'Father Name', 'Mother Name',
          'DOB', 'Gender', 'Category', 'Mobile No', 'Optional Subject', 'Photo URL'
        ];
        subs.forEach(s => {
          cols.push(`${s} PT-1`, `${s} PT-2`, `${s}-HY-WRT`, `${s} PT-3`, `${s} PT-4`, `${s}-AE-WRT`);
        });
        cols.push('Attendance-HY', 'Attendance-AE');

        const sampleStudents = DEFAULT_STUDENTS_BY_CLASS[cls] || [
          { roll: 1, name: 'Sample Student 1', fatherName: 'FATHER NAME 1', optionalSubject: 'Urdu' },
          { roll: 2, name: 'Sample Student 2', fatherName: 'FATHER NAME 2', optionalSubject: 'Sanskrit' }
        ];

        const sheetData: any[][] = [cols];

        sampleStudents.slice(0, 10).forEach((st, idx) => {
          const rollNum = st.roll || (idx + 1);
          const row: any[] = [
            idx + 1,
            rollNum,
            `PIS-2025-${cls}-${String(rollNum).padStart(3, '0')}`,
            st.name,
            st.fatherName || 'GUARDIAN',
            'PARVEEN BEGUM',
            '15/07/2014',
            'M',
            'GEN',
            `983510000${idx % 10}`,
            st.optionalSubject || (idx % 2 === 0 ? 'Urdu' : 'Sanskrit'),
            ''
          ];

          subs.forEach(() => {
            row.push(18, 19, 72, 17, 18, 74);
          });

          row.push('95/110', '102/115');
          sheetData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        // Set row heights: Row 1 (Header) is prominent and spacious (30pt)
        ws['!rows'] = [{ hpt: 30 }];

        // Column widths for optimal visibility
        ws['!cols'] = cols.map((_, cIdx) => {
          if (cIdx === 0) return { wch: 6 };
          if (cIdx === 1) return { wch: 9 };
          if (cIdx === 2) return { wch: 20 };
          if (cIdx === 3) return { wch: 24 };
          if (cIdx === 4 || cIdx === 5) return { wch: 22 };
          if (cIdx === 6) return { wch: 13 };
          if (cIdx === 7) return { wch: 9 };
          if (cIdx === 8) return { wch: 10 };
          if (cIdx === 9) return { wch: 14 };
          if (cIdx === 10) return { wch: 16 };
          if (cIdx === 11) return { wch: 14 };
          return { wch: 15 };
        });

        // Set cell styling: Colored Forest Green (#1B4D3E) Header and Center Alignment for all columns
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellRef]) continue;

            if (R === 0) {
              // Header Row: Forest Dark Green, bold white text, centered
              ws[cellRef].s = {
                fill: { fgColor: { rgb: "1B4D3E" } },
                font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
                alignment: { horizontal: "center", vertical: "center", wrapText: true },
                border: {
                  top: { style: "thin", color: { rgb: "103328" } },
                  bottom: { style: "medium", color: { rgb: "103328" } },
                  left: { style: "thin", color: { rgb: "103328" } },
                  right: { style: "thin", color: { rgb: "103328" } }
                }
              };
            } else {
              // Data Rows: Center alignment for all numeric/roll/admission/marks/attendance columns
              const isNameCol = (C === 3 || C === 4 || C === 5);
              ws[cellRef].s = {
                font: { name: "Arial", sz: 10 },
                alignment: {
                  horizontal: isNameCol ? "left" : "center",
                  vertical: "center"
                }
              };
            }
          }
        }

        XLSX.utils.book_append_sheet(wb, ws, `Class_${cls}`);
      });

      // Tab 14: _TEACHERS Registry
      const teachersHeaders = ["Teacher ID", "Teacher Name", "Contact / Mobile", "Status", "Classes", "Sections", "Subjects", "Last Updated"];
      const sampleTeachers = [
        ["TCH-001", "Mohammad Tarique", "9835100001", "ACTIVE", "Class_9, Class_10", "A", "Mathematics, Science", "2025-04-01 10:00"],
        ["TCH-002", "Ayesha Siddiqua", "9835100002", "ACTIVE", "Class_6, Class_7, Class_8", "A", "English, Social Studies", "2025-04-01 10:00"],
        ["TCH-003", "Zubair Ahmad", "9835100003", "ACTIVE", "Class_1, Class_2, Class_3, Class_4, Class_5", "A", "Hindi, Urdu, Sanskrit", "2025-04-01 10:00"]
      ];
      const wsTeachers = XLSX.utils.aoa_to_sheet([teachersHeaders, ...sampleTeachers]);
      wsTeachers['!rows'] = [{ hpt: 30 }];
      wsTeachers['!cols'] = [
        { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 32 }, { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(wb, wsTeachers, "_TEACHERS");

      // Tab 15: _SYSTEM_CONFIG Central Configuration
      const configHeaders = ["Key", "Value", "Description", "Last Updated"];
      const configData = [
        ["marksEntryStatus", "ON", "Global switch for marks entry submissions: ON or OFF", "2025-04-01 10:00"],
        ["marksEntryDeadline", "2026-12-31T23:59", "Final deadline timestamp (ISO) for marks and attendance submissions", "2025-04-01 10:00"],
        ["workingDaysHY", "110", "Total working days in Half Yearly academic term", "2025-04-01 10:00"],
        ["workingDaysAE", "115", "Total working days in Annual Exam academic term", "2025-04-01 10:00"],
        ["academicSession", "2025-2026", "Current academic year session", "2025-04-01 10:00"],
        ["schoolName", "Peace International School", "Official institutional name", "2025-04-01 10:00"],
        ["schoolSubtitle", "Chakjado Dargabela, Vaishali, Bihar", "Campus location", "2025-04-01 10:00"]
      ];
      const wsConfig = XLSX.utils.aoa_to_sheet([configHeaders, ...configData]);
      wsConfig['!rows'] = [{ hpt: 30 }];
      wsConfig['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 45 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsConfig, "_SYSTEM_CONFIG");

      // Tab 16: _AUDIT_LOGS Real-Time Audit Trail
      const auditHeaders = ["Timestamp", "Actor", "Teacher ID", "Action", "Class", "Subject / Type", "Record Count", "Status", "Message"];
      const sampleAudit = [
        ["2025-04-01 10:00:00", "System Initializer", "SYSTEM", "INIT_WORKBOOK", "ALL", "SETUP", 13, "SUCCESS", "Master workbook initialized with 13 class tabs and central registry tabs."]
      ];
      const wsAudit = XLSX.utils.aoa_to_sheet([auditHeaders, ...sampleAudit]);
      wsAudit['!rows'] = [{ hpt: 30 }];
      wsAudit['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 45 }
      ];
      XLSX.utils.book_append_sheet(wb, wsAudit, "_AUDIT_LOGS");

      XLSX.writeFile(wb, 'Peace_International_School_Master_Workbook_v2.xlsx');
    } catch (err) {
      console.error('Error generating multi-tab Excel workbook', err);
    }
  };

  // Google Apps Script Auto-Setup & API Code Generator (v2.0)
  const fullWorkbookScript = useMemo(() => {
    const classConfigs = ALL_CLASSES.map(c => {
      const subs = subjectAllotments[c] || SUBJECTS_BY_CLASS[c] || [];
      return {
        className: `Class_${c}`,
        subjects: subs
      };
    });

    return getCompleteAppsScript(classConfigs);
  }, [subjectAllotments]);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(fullWorkbookScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Parse MS Excel pasted data (supports tab-separated or comma-separated Ctrl+C / Ctrl+V)
  const parsedExcelStudents = useMemo(() => {
    if (!pasteData.trim()) return [];

    const lines = pasteData.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const students: any[] = [];
    
    // Check if first row is a header
    const firstLine = lines[0];
    const isFirstRowHeader = /roll|name|student|admission|father|s\.no/i.test(firstLine);
    const dataLines = isFirstRowHeader ? lines.slice(1) : lines;

    dataLines.forEach((line, idx) => {
      let cols = line.includes('\t') ? line.split('\t') : line.split(',');
      cols = cols.map(c => c.replace(/^["']|["']$/g, '').trim());

      if (cols.length < 2) return;

      let roll = '';
      let admNo = '';
      let name = '';
      let fatherName = '';
      let motherName = '';
      let dob = '';
      let mobile = '';
      let optionalSubject = '';
      let photoUrl = '';
      const rawMarks: Record<string, any> = {};

      if (cols.length >= 4) {
        const isCol0Sno = !isNaN(Number(cols[0])) && cols[0].length <= 3;
        const isCol1Roll = !isNaN(Number(cols[1])) && cols[1].length <= 3;

        if (isCol0Sno && isCol1Roll && cols.length >= 4) {
          roll = cols[1];
          admNo = cols[2];
          name = cols[3];
          fatherName = cols[4] || '';
          motherName = cols[5] || '';
          dob = cols[6] || '';
          mobile = cols[9] || '';
          optionalSubject = cols[10] || '';
          photoUrl = cols[11] || '';

          // Parse extra mark columns if pasted
          let colIdx = 12;
          activeSubjects.forEach(sub => {
            if (cols[colIdx] !== undefined) rawMarks[`${sub}_PT1`] = cols[colIdx];
            if (cols[colIdx + 1] !== undefined) rawMarks[`${sub}_PT2`] = cols[colIdx + 1];
            if (cols[colIdx + 2] !== undefined) rawMarks[`${sub}_HY`] = cols[colIdx + 2];
            if (cols[colIdx + 3] !== undefined) rawMarks[`${sub}_PT3`] = cols[colIdx + 3];
            if (cols[colIdx + 4] !== undefined) rawMarks[`${sub}_PT4`] = cols[colIdx + 4];
            if (cols[colIdx + 5] !== undefined) rawMarks[`${sub}_AE`] = cols[colIdx + 5];
            colIdx += 6;
          });
        } else if (!isNaN(Number(cols[0]))) {
          roll = cols[0];
          admNo = cols[1].includes('-') ? cols[1] : '';
          name = cols[1].includes('-') ? cols[2] : cols[1];
          fatherName = cols[1].includes('-') ? cols[3] : cols[2];
          motherName = cols[1].includes('-') ? cols[4] : cols[3];
          dob = cols[1].includes('-') ? cols[5] : cols[4];
        } else {
          name = cols[0];
          roll = cols[1] || String(idx + 1);
          fatherName = cols[2] || '';
        }
      } else {
        roll = String(idx + 1);
        name = cols[0];
        fatherName = cols[1] || '';
      }

      if (name) {
        if (!optionalSubject) {
          optionalSubject = name.match(/Kumar|Singh|Sharma|Raj|Prasad|Verma|Roy|Pandey|Gupta|Paswan|Sinha|Thakur|Ray|Anand/i) 
            ? 'Sanskrit' 
            : 'Urdu';
        }

        students.push({
          roll: roll || String(idx + 1),
          admNo: admNo || `PIS-2025-${selectedClass}-${String(roll || idx + 1).padStart(3, '0')}`,
          name,
          fatherName: fatherName || 'GUARDIAN',
          motherName: motherName || 'MOTHER',
          dob: dob || '15/07/2014',
          mobile: mobile || '9835100000',
          optionalSubject,
          photoUrl: photoUrl || '',
          rawMarks
        });
      }
    });

    return students;
  }, [pasteData, selectedClass, activeSubjects]);

  const handleApplyImport = () => {
    if (parsedExcelStudents.length === 0) {
      setImportStatus({
        success: false,
        message: 'No valid student rows found. Please copy rows from MS Excel and paste them here.'
      });
      return;
    }

    onImportStudentsToClass(selectedClass, parsedExcelStudents);
    setImportStatus({
      success: true,
      message: `Successfully imported ${parsedExcelStudents.length} students into Class ${selectedClass}! Changes applied to the active register.`,
      count: parsedExcelStudents.length
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#1B4D3E] via-[#236350] to-[#1B4D3E] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>Google Sheets &amp; MS Excel Structure Center</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Workbook Generator
                </span>
              </h3>
              <p className="text-xs text-emerald-100">
                Generate exact column architecture for Google Sheets/Excel and copy-paste student records directly
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Target Class Bar */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-full overflow-x-auto flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => {
                setActiveTab('structure');
                setImportStatus(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'structure'
                  ? 'bg-[#1B4D3E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Class Columns (Class {selectedClass})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('workbook');
                setImportStatus(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'workbook'
                  ? 'bg-[#1B4D3E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Full School Workbook (All Classes)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('import');
                setImportStatus(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-[#1B4D3E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Paste from Excel (Ctrl+V)</span>
              {parsedExcelStudents.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-indigo-950 text-[10px] font-bold flex items-center justify-center">
                  {parsedExcelStudents.length}
                </span>
              )}
            </button>
          </div>

          {/* Class Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => onClassChange(e.target.value as ClassLevel)}
              className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {ALL_CLASSES.map(c => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: SINGLE CLASS STRUCTURE */}
          {activeTab === 'structure' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Exact Column Architecture for Class {selectedClass}</span>
                  </h4>
                  <p className="text-xs text-emerald-800">
                    Total {allColumns.length} matching columns ({baseProfileColumns.length} Student Profile + {marksColumns.length} Allotted Exam Marks + 2 Attendance).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCopyHeaders}
                    className="px-3.5 py-2 bg-[#1B4D3E] hover:bg-[#163e32] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    title="Click here, then open Google Sheets or MS Excel, select Cell A1, and press Ctrl+V"
                  >
                    {copiedHeaders ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4 text-amber-300" />}
                    <span>{copiedHeaders ? 'Headers Copied!' : 'Copy Columns (TSV)'}</span>
                  </button>

                  <button
                    onClick={() => handleDownloadClassCsv(selectedClass)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    title="Download ready-to-use CSV template with sample student rows"
                  >
                    <Download className="w-4 h-4 text-emerald-700" />
                    <span>Download Excel Template (.CSV)</span>
                  </button>
                </div>
              </div>

              {/* Step Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-[#1B4D3E] text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Copy or Download</span>
                  </span>
                  <p className="text-slate-600">
                    Click <strong>Copy Columns (TSV)</strong> or download the pre-formatted <strong>.CSV</strong> file.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-[#1B4D3E] text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Paste in Excel / Sheets</span>
                  </span>
                  <p className="text-slate-600">
                    In MS Excel or Google Sheets on PC, select Cell A1 and press <strong>Ctrl+V</strong> to paste columns.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-[#1B4D3E] text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Direct Excel Paste</span>
                  </span>
                  <p className="text-slate-600">
                    Use the <strong>Paste from Excel</strong> tab above to import your student records instantly.
                  </p>
                </div>
              </div>

              {/* Column Architecture Reference Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Matching Columns Reference (Class {selectedClass})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {activeSubjects.length} subjects: {activeSubjects.join(', ')}
                  </span>
                </div>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 border-r border-slate-200 w-12 text-center">#</th>
                        <th className="px-3 py-2 border-r border-slate-200 font-mono">Column Header</th>
                        <th className="px-3 py-2 border-r border-slate-200">Category</th>
                        <th className="px-3 py-2 border-r border-slate-200 font-mono">Sample Data</th>
                        <th className="px-3 py-2">Field Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allColumns.map((col, idx) => (
                        <tr key={col.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="px-3 py-1.5 border-r border-slate-200 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-1.5 border-r border-slate-200 font-bold font-mono text-slate-900">
                            {col.label}
                          </td>
                          <td className="px-3 py-1.5 border-r border-slate-200">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              col.label.includes('PT') || col.label.includes('WRT') 
                                ? 'bg-amber-100 text-amber-900'
                                : col.label.includes('Attendance')
                                ? 'bg-indigo-100 text-indigo-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {col.label.includes('PT') || col.label.includes('WRT') 
                                ? 'Exam Marks' 
                                : col.label.includes('Attendance') 
                                ? 'Attendance' 
                                : 'Student Profile'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 border-r border-slate-200 font-mono text-slate-600">
                            {col.example}
                          </td>
                          <td className="px-3 py-1.5 text-slate-600">
                            {col.desc}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FULL SCHOOL WORKBOOK GENERATOR */}
          {activeTab === 'workbook' && (
            <div className="space-y-4">
              {/* Primary 1-Click Multi-Tab Master Excel Download */}
              <div className="bg-gradient-to-r from-emerald-900 via-[#1B4D3E] to-teal-950 text-white rounded-2xl p-5 shadow-lg border border-emerald-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[11px] font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Master File with 16 Normalized Tabs (13 Classes + _TEACHERS + _SYSTEM_CONFIG + _AUDIT_LOGS)</span>
                  </div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>1-Click Download Master School Workbook v2 (.XLSX)</span>
                  </h4>
                  <p className="text-xs text-emerald-100/90 leading-relaxed">
                    इस मास्टर Excel फाइल में सभी 13 क्लासों की अलग-अलग Tabs (<code className="text-amber-300">Class_Nursery</code> से <code className="text-amber-300">Class_10</code>) के साथ-साथ केंद्रीय <code className="text-amber-300">_TEACHERS</code>, <code className="text-amber-300">_SYSTEM_CONFIG</code> और <code className="text-amber-300">_AUDIT_LOGS</code> शीट्स भी तैयार हैं। इसे सीधे Google Drive में अपलोड करके Apps Script से कनेक्ट करें!
                  </p>
                </div>

                <button
                  onClick={handleDownloadAllClassesXlsx}
                  className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-105 shrink-0"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Download Master Workbook v2 (.XLSX)</span>
                </button>
              </div>

              {/* Hindi / English Guidance Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-950">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs">A</span>
                    <span>Columns A to L (1 to 12): स्टूडेंट प्रोफाइल डेटा</span>
                  </div>
                  <p className="text-emerald-900 leading-relaxed">
                    यह 12 कॉलम आपके कंप्यूटर वाली Excel Sheet से <strong>Copy & Paste</strong> होंगे:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-emerald-900 bg-white p-2.5 rounded-lg border border-emerald-100">
                    <div>1. S.No</div>
                    <div>2. Roll No</div>
                    <div className="font-bold text-emerald-950">3. Admission No (URN) ⭐</div>
                    <div>4. Student Name ⭐</div>
                    <div>5. Father Name</div>
                    <div>6. Mother Name</div>
                    <div>7. DOB (DD/MM/YYYY)</div>
                    <div>8. Gender (M/F)</div>
                    <div>9. Category (GEN/OBC)</div>
                    <div>10. Mobile No</div>
                    <div>11. Optional Subject (Urdu/Sanskrit)</div>
                    <div>12. Photo URL (Optional)</div>
                  </div>
                  <p className="text-[11px] text-emerald-700 italic">
                    * <strong>Admission No (Column C / URN)</strong> छात्र की आधिकारिक विशिष्ट पहचान (Authoritative Unique Identifier) है।
                  </p>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs">B</span>
                    <span>Columns M onwards: मार्क्स और अटेंडेंस</span>
                  </div>
                  <p className="text-amber-900 leading-relaxed">
                    यह कॉलम <strong>मार्क अपडेशन पोर्टल</strong> (Teacher Portal) से ऑटोमैटिक अपडेट होते हैं, या फिर आप सीधे शीट में भी टाइप कर सकते हैं:
                  </p>
                  <div className="text-[11px] font-mono text-amber-950 bg-white p-2.5 rounded-lg border border-amber-100 space-y-1">
                    <div>• <strong>PT-1, PT-2:</strong> Periodic Tests (Max 20)</div>
                    <div>• <strong>HY-WRT:</strong> Term 1 Written Exam (Max 80)</div>
                    <div>• <strong>PT-3, PT-4:</strong> Periodic Tests (Max 20)</div>
                    <div>• <strong>AE-WRT:</strong> Term 2 Written Exam (Max 80)</div>
                    <div>• <strong>Attendance-HY:</strong> Term 1 Attendance (e.g. 98/110)</div>
                    <div>• <strong>Attendance-AE:</strong> Term 2 Attendance (e.g. 102/115)</div>
                  </div>
                  <p className="text-[11px] text-amber-800 italic">
                    * जब टीचर ऐप में सेव करते हैं, तो ऐप अपने आप संबंधित रोल नंबर की रो और सब्जेक्ट कॉलम में मार्क्स लिख देती है!
                  </p>
                </div>
              </div>

              {/* Formatting & Center Alignment Highlight Strip */}
              <div className="bg-white border border-emerald-300/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1B4D3E] text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs shrink-0">
                    Center
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 flex items-center gap-2">
                      <span>हेडिंग्स डार्क ग्रीन कलर (#1B4D3E) एवं सभी कॉलम्स सेंटर-अलाइन्ड</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    </span>
                    <span className="text-[11px] text-slate-600">
                      सभी 13 शीट्स की हेडिंग रो 1 को डार्क ग्रीन कलर और व्हाइट टेक्स्ट दिया गया है, तथा रोल नंबर, एडमिशन नंबर, मार्क्स और अटेंडेंस समेत सभी कॉलम्स को सेंटर-अलाइनमेंट पर सेट किया गया है।
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded-lg uppercase tracking-wider shrink-0">
                  Ready Formatted
                </span>
              </div>

              {/* Class Template Download Cards */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#1B4D3E]" />
                    <span>Or Download Individual Class Templates (.CSV)</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    किसी भी क्लास की अलग फाइल डाउनलोड करने के लिए क्लिक करें
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {ALL_CLASSES.map(cls => (
                    <button
                      key={cls}
                      onClick={() => handleDownloadClassCsv(cls)}
                      className="p-2.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-center group transition-all shadow-2xs cursor-pointer"
                    >
                      <span className="block text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                        {cls.startsWith('Nursery') || cls.startsWith('L') || cls.startsWith('U') ? cls : `Class ${cls}`}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        Download .CSV
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Google Apps Script Code Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-indigo-700" />
                    <span>Complete Google Apps Script (Auto-Creator & Web App API)</span>
                  </span>
                  <button
                    onClick={handleCopyScript}
                    className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedScript ? 'Copied' : 'Copy Full Script'}</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-72 leading-relaxed">
                  {fullWorkbookScript}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: PASTE FROM MS EXCEL */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-4 flex items-start gap-3 text-indigo-950">
                <Upload className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-sm block">
                    Copy from MS Excel on PC and Paste Directly Here
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    Open your class roster in Microsoft Excel or Google Sheets, select student rows (Roll, Name, Father Name, Mother Name, DOB, etc.), press <strong>Ctrl+C</strong>, then paste (<strong>Ctrl+V</strong>) into the box below.
                  </p>
                </div>
              </div>

              {/* Text Area Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Paste Excel Rows for Class {selectedClass}:
                  </label>
                  {pasteData && (
                    <button
                      type="button"
                      onClick={() => setPasteData('')}
                      className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Clear Input
                    </button>
                  )}
                </div>

                <textarea
                  rows={6}
                  value={pasteData}
                  onChange={(e) => {
                    setPasteData(e.target.value);
                    setImportStatus(null);
                  }}
                  placeholder={`1\tPIS-2025-${selectedClass}-001\tAadil Khan\tMOHD KHAN\tPARVEEN BEGUM\t15/08/2014\tM\tGEN\t9835123456\tUrdu\n2\tPIS-2025-${selectedClass}-002\tAbhishek Kumar\tSURESH PRASAD\tGEETA DEVI\t20/03/2014\tM\tGEN\t9835123457\tSanskrit`}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all text-slate-800"
                />
              </div>

              {/* Status Message */}
              {importStatus && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                  importStatus.success 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                    : 'bg-rose-50 border-rose-300 text-rose-900 font-medium'
                }`}>
                  {importStatus.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">{importStatus.message}</span>
                  </div>
                </div>
              )}

              {/* Live Parsed Preview */}
              {parsedExcelStudents.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-700" />
                      <span>Parsed {parsedExcelStudents.length} Students for Class {selectedClass}</span>
                    </span>
                    <span className="text-[11px] text-emerald-800 font-semibold">
                      Ready to apply to the active Result Generator
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 border-r border-slate-200 w-12 text-center">Roll</th>
                          <th className="px-3 py-2 border-r border-slate-200">Admission No</th>
                          <th className="px-3 py-2 border-r border-slate-200">Student Name</th>
                          <th className="px-3 py-2 border-r border-slate-200">Father's Name</th>
                          <th className="px-3 py-2 border-r border-slate-200">Mother's Name</th>
                          <th className="px-3 py-2 border-r border-slate-200">DOB</th>
                          <th className="px-3 py-2">Language</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedExcelStudents.map((st, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="px-3 py-1.5 border-r border-slate-200 text-center font-bold font-mono">
                              {st.roll}
                            </td>
                            <td className="px-3 py-1.5 border-r border-slate-200 font-mono text-slate-600">
                              {st.admNo}
                            </td>
                            <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-slate-900">
                              {st.name}
                            </td>
                            <td className="px-3 py-1.5 border-r border-slate-200 text-slate-700">
                              {st.fatherName}
                            </td>
                            <td className="px-3 py-1.5 border-r border-slate-200 text-slate-700">
                              {st.motherName}
                            </td>
                            <td className="px-3 py-1.5 border-r border-slate-200 text-slate-600 font-mono">
                              {formatDisplayDate(st.dob) || st.dob}
                            </td>
                            <td className="px-3 py-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                st.optionalSubject === 'Sanskrit' 
                                  ? 'bg-amber-100 text-amber-900' 
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}>
                                {st.optionalSubject}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Current Target: <strong className="text-slate-800">Class {selectedClass}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>

            {activeTab === 'import' && (
              <button
                type="button"
                onClick={handleApplyImport}
                disabled={parsedExcelStudents.length === 0}
                className="px-5 py-2 bg-gradient-to-r from-[#1B4D3E] to-[#24664f] hover:from-[#163f33] hover:to-[#1d5340] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-amber-300" />
                <span>Apply to Class {selectedClass}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
