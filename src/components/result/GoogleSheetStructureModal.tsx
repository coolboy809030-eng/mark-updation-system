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

      XLSX.writeFile(wb, 'Peace_International_School_Complete_Master_Workbook.xlsx');
    } catch (err) {
      console.error('Error generating multi-tab Excel workbook', err);
    }
  };

  // Google Apps Script Auto-Setup & API Code Generator
  const fullWorkbookScript = useMemo(() => {
    const classConfigs = ALL_CLASSES.map(c => {
      const subs = subjectAllotments[c] || SUBJECTS_BY_CLASS[c] || [];
      return {
        className: `Class_${c}`,
        subjects: subs
      };
    });

    return `/**
 * Peace International School - Complete Google Spreadsheet Engine
 * 
 * 1. createPeaceSchoolWorkbook() -> Generates all 13 class sheets with formatted headers
 * 2. doGet(e) -> Returns student names (for Mark Updation app) and full results (for Result Generator)
 * 3. doPost(e) -> Receives and updates marks & attendance directly into Google Sheet cells!
 * 
 * SETUP STEPS:
 * 1. Open your Google Sheet, click 'Extensions' > 'Apps Script'.
 * 2. Delete existing code, paste this entire file and save (Ctrl+S).
 * 3. Select 'createPeaceSchoolWorkbook' in the top toolbar dropdown and click 'Run' once.
 * 4. Click 'Deploy' > 'New deployment' > Select type: 'Web app'.
 * 5. Execute as: 'Me' | Who has access: 'Anyone'.
 * 6. Copy the Web App URL and paste it into the School App settings!
 */

var SCHOOL_CONFIG = ${JSON.stringify(classConfigs, null, 2)};

var BASE_PROFILE_COLUMNS = [
  "S.No", "Roll No", "Admission No", "Student Name", "Father Name", "Mother Name",
  "DOB", "Gender", "Category", "Mobile No", "Optional Subject", "Photo URL"
];

function createPeaceSchoolWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  SCHOOL_CONFIG.forEach(function(item) {
    var sheetName = item.className;
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    var headers = BASE_PROFILE_COLUMNS.slice();
    item.subjects.forEach(function(sub) {
      headers.push(sub + " PT-1");
      headers.push(sub + " PT-2");
      headers.push(sub + "-HY-WRT");
      headers.push(sub + " PT-3");
      headers.push(sub + " PT-4");
      headers.push(sub + "-AE-WRT");
    });
    headers.push("Attendance-HY", "Attendance-AE");

    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // 1. Center alignment across ALL columns in the sheet
    var maxRows = Math.max(sheet.getMaxRows(), 100);
    var fullRange = sheet.getRange(1, 1, maxRows, headers.length);
    fullRange.setHorizontalAlignment("center");
    fullRange.setVerticalAlignment("middle");

    // 2. Format Header Row 1: Forest Green (#1B4D3E), bold white text, centered, height 38px
    sheet.setRowHeight(1, 38);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1B4D3E");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(10);
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setWrap(true);
    headerRange.setBorder(true, true, true, true, true, true, "#103328", SpreadsheetApp.BorderStyle.SOLID);

    // 3. Keep text columns (Student Name, Father Name, Mother Name) left-aligned for data rows 2+
    sheet.getRange(2, 4, maxRows - 1, 3).setHorizontalAlignment("left");

    // 4. Freeze Header Row and Key Identifier Columns (S.No, Roll, Adm, Name)
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(4);

    // 5. Set readable column widths for all columns
    sheet.setColumnWidth(1, 55);  // S.No
    sheet.setColumnWidth(2, 70);  // Roll No
    sheet.setColumnWidth(3, 140); // Admission No
    sheet.setColumnWidth(4, 180); // Student Name
    sheet.setColumnWidth(5, 170); // Father Name
    sheet.setColumnWidth(6, 170); // Mother Name
    sheet.setColumnWidth(7, 100); // DOB
    sheet.setColumnWidth(8, 70);  // Gender
    sheet.setColumnWidth(9, 80);  // Category
    sheet.setColumnWidth(10, 115);// Mobile
    sheet.setColumnWidth(11, 130);// Optional Subject
    sheet.setColumnWidth(12, 110);// Photo URL
    for (var c = 13; c <= headers.length; c++) {
      sheet.setColumnWidth(c, 115); // Marks & Attendance columns
    }
  });

  SpreadsheetApp.getUi().alert("Success! All 13 Peace International School class sheets have been generated with colored headers and centered column alignment.");
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "ping";
  var targetClass = (e && e.parameter && e.parameter.class) || "10";
  
  if (action === "getStudents") {
    return handleGetStudents(targetClass);
  }
  
  if (action === "getFullResults") {
    return handleGetFullResults(targetClass);
  }
  
  return jsonResponse({
    status: "success",
    message: "Peace International School API is Active",
    supportedClasses: SCHOOL_CONFIG.map(function(c) { return c.className; })
  });
}

function doPost(e) {
  try {
    var rawText = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var payload = JSON.parse(rawText);

    if (payload.records && payload.records.length > 0) {
      return handleSaveMarks(payload.records);
    }

    if (payload.action === "updateStudentDetails") {
      return handleUpdateStudentDetails(payload.class, payload.student);
    }

    return jsonResponse({ status: "success", saved: 0 });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function getTargetSheet(ss, className) {
  return ss.getSheetByName("Class_" + className) || 
         ss.getSheetByName("Class " + className) || 
         ss.getSheetByName(className) || 
         ss.getSheetByName("Students");
}

function resolveOptionalSubject(row, headers, name) {
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c].toLowerCase();
    if (h.indexOf("optional") !== -1 || h.indexOf("2nd lang") !== -1 || h.indexOf("second lang") !== -1 || h.indexOf("opted") !== -1 || h === "opt" || h === "language") {
      var val = String(row[c] || "").trim();
      if (val) {
        if (val.toLowerCase() === "sanskrit" || val.toLowerCase().indexOf("sanskrit") !== -1) return "Sanskrit";
        if (val.toLowerCase() === "urdu" || val.toLowerCase().indexOf("urdu") !== -1) return "Urdu";
        return val;
      }
    }
  }

  for (var i = 0; i < row.length; i++) {
    var cell = String(row[i] || "").trim().toLowerCase();
    if (cell === "sanskrit" || cell === "संस्कृत") return "Sanskrit";
    if (cell === "urdu" || cell === "اردو") return "Urdu";
  }

  // Strict: No demographic guessing from student name or surname!
  // Return empty string if no explicit optional subject is declared.
  return "";
}

function handleGetStudents(targetClass) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss, targetClass);
  if (!sheet) {
    return jsonResponse({ status: "error", message: "Sheet not found for Class " + targetClass });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return jsonResponse({ status: "success", students: [] });
  }

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var students = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[1] && !row[3]) continue;

    var roll = row[1] || r;
    var name = row[3] || ("Student " + roll);
    var optionalSubject = resolveOptionalSubject(row, headers, name);

    students.push({
      roll: roll,
      admNo: row[2] || ("PIS-2025-" + targetClass + "-" + ("00" + roll).slice(-3)),
      name: name,
      fatherName: row[4] || "GUARDIAN",
      motherName: row[5] || "MOTHER",
      dob: row[6] || "15/07/2014",
      mobile: row[9] || "9835100000",
      optionalSubject: optionalSubject,
      photoUrl: row[11] || ""
    });
  }

  return jsonResponse({ status: "success", students: students });
}

function handleSaveMarks(records) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var updatedCount = 0;

  var recordsByClass = {};
  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    var c = rec.class || "10";
    if (!recordsByClass[c]) recordsByClass[c] = [];
    recordsByClass[c].push(rec);
  }

  for (var clsKey in recordsByClass) {
    var sheet = getTargetSheet(ss, clsKey);
    if (!sheet) continue;

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) continue;

    var headers = data[0].map(function(h) { return String(h).trim(); });
    var classRecs = recordsByClass[clsKey];

    var rollToRow = {};
    for (var r = 1; r < data.length; r++) {
      var rollVal = String(data[r][1]).trim();
      if (rollVal) rollToRow[rollVal] = r + 1;
    }

    for (var j = 0; j < classRecs.length; j++) {
      var item = classRecs[j];
      var targetRow = rollToRow[String(item.roll).trim()];
      if (!targetRow) continue;

      var targetCol = -1;

      if (item.segment === "Attendance" || item.type === "Attendance") {
        var attColName = (item.examType === "AE") ? "Attendance-AE" : "Attendance-HY";
        for (var h = 0; h < headers.length; h++) {
          if (headers[h].toLowerCase() === attColName.toLowerCase()) {
            targetCol = h;
            break;
          }
        }
      } else {
        var subAliases = [item.subject];
        var subLower = item.subject.toLowerCase();
        if (subLower === 'gk' || subLower === 'g.k.') {
          subAliases.push('General Knowledge', 'General Awareness');
        } else if (subLower === 'general knowledge') {
          subAliases.push('GK', 'G.K.');
        } else if (subLower === 'computer') {
          subAliases.push('Computer Applications', 'Computer Science', 'IT');
        } else if (subLower === 'environmental studies' || subLower === 'evs') {
          subAliases.push('EVS', 'Environmental Studies');
        } else if (subLower === 'social science' || subLower === 'social studies') {
          subAliases.push('Social Science', 'Social Studies', 'SST');
        }

        var segType = item.type || item.segment || "";
        var matchKeys = [];
        for (var a = 0; a < subAliases.length; a++) {
          var alias = subAliases[a];
          matchKeys.push(alias + " " + segType);
          matchKeys.push(alias + "-" + segType);
          matchKeys.push(alias + " " + item.segment);
          matchKeys.push(alias + "-" + item.segment);
        }

        for (var k = 0; k < matchKeys.length; k++) {
          var keyLower = matchKeys[k].trim().toLowerCase();
          for (var h = 0; h < headers.length; h++) {
            if (headers[h].toLowerCase() === keyLower) {
              targetCol = h;
              break;
            }
          }
          if (targetCol !== -1) break;
        }
      }

      if (targetCol !== -1) {
        sheet.getRange(targetRow, targetCol + 1).setValue(item.value);
        updatedCount++;
      }
    }
  }

  return jsonResponse({
    status: "success",
    updated: updatedCount,
    message: "Successfully updated " + updatedCount + " cells in Google Sheet"
  });
}

function handleGetFullResults(targetClass) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss, targetClass);
  if (!sheet) {
    return jsonResponse({ success: false, message: "Sheet not found for Class " + targetClass });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return jsonResponse({ success: true, students: [] });
  }

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var students = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[1] && !row[3]) continue;

    var roll = row[1] || r;
    var admNo = row[2] || ("PIS-2025-" + targetClass + "-" + ("00" + roll).slice(-3));
    var name = row[3] || ("Student " + roll);
    var fatherName = row[4] || "GUARDIAN";
    var motherName = row[5] || "MOTHER";
    var dob = row[6] || "15/07/2014";
    var mobile = row[9] || "9835100000";
    var optionalSubject = resolveOptionalSubject(row, headers, name);
    var photoUrl = row[11] || "";

    var rawMarks = {};
    var attHY = "95/110";
    var attAE = "102/115";

    for (var c = 12; c < headers.length; c++) {
      var header = headers[c];
      var val = row[c];
      if (header === "Attendance-HY") {
        attHY = val ? String(val) : attHY;
      } else if (header === "Attendance-AE") {
        attAE = val ? String(val) : attAE;
      } else if (val !== undefined && val !== "") {
        var key = header.replace(/\\s+/g, "_").replace(/-/g, "_");
        rawMarks[key] = val;
        rawMarks[header] = val;
      }
    }

    students.push({
      roll: parseInt(roll) || roll,
      admNo: String(admNo),
      name: String(name),
      fatherName: String(fatherName),
      motherName: String(motherName),
      dob: String(dob),
      studentClass: String(targetClass),
      section: "A",
      mobile: String(mobile),
      optionalSubject: String(optionalSubject),
      photoUrl: String(photoUrl),
      attendanceHY: String(attHY),
      attendanceAE: String(attAE),
      rawMarks: rawMarks
    });
  }

  return jsonResponse({ success: true, students: students });
}

function handleUpdateStudentDetails(className, student) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss, className);
  if (!sheet) return jsonResponse({ status: "error", message: "Class sheet not found" });

  var data = sheet.getDataRange().getValues();
  var foundRow = -1;

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][1]) == String(student.roll) || (student.admNo && String(data[r][2]) == String(student.admNo))) {
      foundRow = r + 1;
      break;
    }
  }

  if (foundRow > 0) {
    if (student.roll) sheet.getRange(foundRow, 2).setValue(student.roll);
    if (student.admNo) sheet.getRange(foundRow, 3).setValue(student.admNo);
    if (student.name) sheet.getRange(foundRow, 4).setValue(student.name);
    if (student.fatherName) sheet.getRange(foundRow, 5).setValue(student.fatherName);
    if (student.motherName) sheet.getRange(foundRow, 6).setValue(student.motherName);
    if (student.dob) sheet.getRange(foundRow, 7).setValue(student.dob);
    if (student.mobile) sheet.getRange(foundRow, 10).setValue(student.mobile);
    if (student.optionalSubject) sheet.getRange(foundRow, 11).setValue(student.optionalSubject);
    if (student.photoUrl) sheet.getRange(foundRow, 12).setValue(student.photoUrl);
    return jsonResponse({ status: "success", message: "Student updated on row " + foundRow });
  }

  return jsonResponse({ status: "error", message: "Student not found" });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;
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
                    <span>One Master File with 13 Tabs</span>
                  </div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>1-Click Download Master School Workbook (.XLSX)</span>
                  </h4>
                  <p className="text-xs text-emerald-100/90 leading-relaxed">
                    इस एक Excel फाइल में सभी 13 क्लासों की अलग-अलग Tabs (<code className="text-amber-300">Class_Nursery</code> से <code className="text-amber-300">Class_10</code>) बनी हुई हैं। अपने कंप्यूटर में मौजूद Excel शीट से स्टूडेंट्स का पर्सनल डेटा कॉपी करें और इन Tabs के Columns A से L में पेस्ट करके इसे Google Drive में अपलोड कर दें!
                  </p>
                </div>

                <button
                  onClick={handleDownloadAllClassesXlsx}
                  className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-105 shrink-0"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Download Complete 13-Tab Excel (.XLSX)</span>
                </button>
              </div>

              {/* Hindi / English Guidance Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-950">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs">A</span>
                    <span>Columns A to L (1 to 12): स्टूडेंट पर्सनल डेटा</span>
                  </div>
                  <p className="text-emerald-900 leading-relaxed">
                    यह 12 कॉलम आपके कंप्यूटर वाली Excel Sheet से <strong>Copy & Paste</strong> होंगे:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-emerald-900 bg-white p-2.5 rounded-lg border border-emerald-100">
                    <div>1. S.No</div>
                    <div>2. Roll No ⭐</div>
                    <div>3. Admission No ⭐</div>
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
                    * Roll No और Student Name सबसे मुख्य हैं, जिनके आधार पर मार्क अपडेशन पोर्टल और रिजल्ट जनरेटर डेटा मैप करते हैं।
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
                              {st.dob}
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
