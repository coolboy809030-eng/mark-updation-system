/**
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

var SCHOOL_CONFIG = [
  {
    "className": "Class_Nursery",
    "subjects": [
      "Drawing",
      "English",
      "General Awareness",
      "Gk",
      "Hindi",
      "Mathematics",
      "Sanskrit",
      "Urdu"
    ]
  },
  {
    "className": "Class_LKG",
    "subjects": [
      "Drawing",
      "English",
      "General Awareness",
      "Gk",
      "Hindi",
      "Mathematics",
      "Sanskrit",
      "Urdu"
    ]
  },
  {
    "className": "Class_UKG",
    "subjects": [
      "Drawing",
      "English",
      "General Awareness",
      "Gk",
      "Hindi",
      "Mathematics",
      "Table Book",
      "Sanskrit",
      "Urdu"
    ]
  },
  {
    "className": "Class_1",
    "subjects": [
      "Computer",
      "English",
      "Environmental Studies",
      "Gk",
      "Hindi",
      "Mathematics",
      "Sanskrit",
      "Urdu"
    ]
  },
  {
    "className": "Class_2",
    "subjects": [
      "Computer",
      "English",
      "Environmental Studies",
      "Gk",
      "Hindi",
      "Mathematics",
      "Sanskrit",
      "Urdu"
    ]
  },
  {
    "className": "Class_3",
    "subjects": [
      "Computer",
      "English",
      "Gk",
      "Hindi",
      "Mathematics",
      "Science",
      "Social Studies",
      "Sanskrit",
      "Urdu"
    ]
  },
  {
    "className": "Class_4",
    "subjects": [
      "Computer",
      "English",
      "Gk",
      "Hindi",
      "Mathematics",
      "Science",
      "Social Studies",
      "Sanskrit",
      "Urdu"
    ]
  },
  {
    "className": "Class_5",
    "subjects": [
      "Computer",
      "English",
      "Gk",
      "Hindi",
      "Mathematics",
      "Science",
      "Social Studies",
      "Sanskrit",
      "Urdu"
    ]
  },
  {
    "className": "Class_6",
    "subjects": [
      "Computer",
      "English",
      "Gk",
      "Hindi",
      "Mathematics",
      "Science",
      "Social Studies",
      "Sanskrit",
      "Urdu"
    ]
  },
  {
    "className": "Class_7",
    "subjects": [
      "Computer",
      "English",
      "Gk",
      "Hindi",
      "Mathematics",
      "Science",
      "Social Studies",
      "Sanskrit",
      "Urdu"
    ]
  },
  {
    "className": "Class_8",
    "subjects": [
      "Computer",
      "English",
      "Gk",
      "Hindi",
      "Mathematics",
      "Science",
      "Social Studies",
      "Sanskrit",
      "Urdu"
    ]
  },
  {
    "className": "Class_9",
    "subjects": [
      "English",
      "Hindi",
      "Mathematics",
      "Science",
      "Social Science",
      "Sanskrit",
      "Urdu"
    ]
  },
  {
    "className": "Class_10",
    "subjects": [
      "English",
      "Hindi",
      "Mathematics",
      "Science",
      "Social Science",
      "Sanskrit",
      "Urdu"
    ]
  }
];

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

  // Create or configure central _TEACHERS registry tab
  createOrSetupTeachersSheet(ss);

  SpreadsheetApp.getUi().alert("Success! All 13 Peace International School class sheets and central _TEACHERS registry tab have been generated with colored headers and centered column alignment.");
}

/**
 * Creates or formats the central _TEACHERS registry sheet
 */
function createOrSetupTeachersSheet(ss) {
  var sheet = ss.getSheetByName("_TEACHERS");
  if (!sheet) {
    sheet = ss.insertSheet("_TEACHERS");
  }

  var teacherHeaders = [
    "Teacher ID",
    "Teacher Name",
    "Contact / Mobile",
    "Status",
    "Classes",
    "Sections",
    "Subjects",
    "Last Updated"
  ];

  var currentData = sheet.getDataRange().getValues();
  if (currentData.length < 1 || currentData[0][0] !== "Teacher ID") {
    sheet.getRange(1, 1, 1, teacherHeaders.length).setValues([teacherHeaders]);
  }

  // Format header: Dark Slate #1e293b, white text, bold, height 36px
  sheet.setRowHeight(1, 36);
  var headerRange = sheet.getRange(1, 1, 1, teacherHeaders.length);
  headerRange.setBackground("#1e293b");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 130); // Teacher ID
  sheet.setColumnWidth(2, 180); // Teacher Name
  sheet.setColumnWidth(3, 140); // Contact
  sheet.setColumnWidth(4, 90);  // Status
  sheet.setColumnWidth(5, 140); // Classes
  sheet.setColumnWidth(6, 120); // Sections
  sheet.setColumnWidth(7, 260); // Subjects
  sheet.setColumnWidth(8, 160); // Last Updated

  return sheet;
}

function getTeachersSheet(ss) {
  var sheet = ss.getSheetByName("_TEACHERS");
  if (!sheet) {
    sheet = createOrSetupTeachersSheet(ss);
  }
  return sheet;
}

function handleGetTeachers() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getTeachersSheet(ss);
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return jsonResponse({
        status: "success",
        accounts: [],
        allotments: [],
        message: "No teachers configured yet in _TEACHERS sheet."
      });
    }

    var accounts = [];
    var allotments = [];

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var teacherId = String(row[0] || '').trim();
      var teacherName = String(row[1] || '').trim();
      if (!teacherId && !teacherName) continue;

      var contact = String(row[2] || '').trim();
      var statusStr = String(row[3] || 'ACTIVE').trim().toUpperCase();
      var active = statusStr !== 'INACTIVE' && statusStr !== 'FALSE';

      var classesRaw = String(row[4] || '').trim();
      var sectionsRaw = String(row[5] || '').trim();
      var subjectsRaw = String(row[6] || '').trim();
      var lastUpdated = String(row[7] || '').trim();

      accounts.push({
        id: 'tch_acc_' + teacherId.replace(/[^a-zA-Z0-9]/g, '_'),
        teacherId: teacherId,
        teacherName: teacherName,
        contact: contact,
        active: active,
        updatedAt: lastUpdated || new Date().toISOString()
      });

      var classList = classesRaw ? classesRaw.split(',').map(function(c) { return c.trim(); }).filter(Boolean) : [];
      var secList = sectionsRaw ? sectionsRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : ['A'];
      var subList = subjectsRaw ? subjectsRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];

      if (classList.length > 0) {
        classList.forEach(function(cls) {
          allotments.push({
            id: 'allot_' + teacherId + '_' + cls,
            teacherId: teacherId,
            teacherName: teacherName,
            classLevel: cls,
            sections: secList.length > 0 ? secList : ['A'],
            subjects: subList,
            active: active
          });
        });
      } else {
        // Fallback single entry
        allotments.push({
          id: 'allot_' + teacherId,
          teacherId: teacherId,
          teacherName: teacherName,
          classLevel: '10',
          sections: secList,
          subjects: subList,
          active: active
        });
      }
    }

    return jsonResponse({
      status: "success",
      accounts: accounts,
      allotments: allotments,
      count: accounts.length
    });
  } catch (err) {
    return jsonResponse({
      status: "error",
      message: "Failed to read _TEACHERS sheet: " + err.message
    });
  }
}

function handleSaveTeachers(payload) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getTeachersSheet(ss);

    var accounts = payload.accounts || [];
    var allotments = payload.allotments || [];

    // Clear old data rows (keep header row 1)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
    }

    if (accounts.length === 0) {
      return jsonResponse({
        status: "success",
        message: "Teacher registry cleared in Google Sheet."
      });
    }

    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+5:30", "dd-MMM-yyyy hh:mm a");
    var rowsToWrite = [];

    accounts.forEach(function(acc) {
      var tId = (acc.teacherId || '').trim();
      var tName = (acc.teacherName || '').trim();
      if (!tId && !tName) return;

      var teacherAllots = allotments.filter(function(a) {
        return (a.teacherId && a.teacherId.trim().toUpperCase() === tId.toUpperCase()) ||
               (!a.teacherId && a.teacherName && a.teacherName.trim().toLowerCase() === tName.toLowerCase());
      });

      var classesSet = {};
      var sectionsSet = {};
      var subjectsSet = {};

      teacherAllots.forEach(function(a) {
        if (a.classLevel) classesSet[a.classLevel] = true;
        if (Array.isArray(a.sections)) {
          a.sections.forEach(function(s) { sectionsSet[s] = true; });
        }
        if (Array.isArray(a.subjects)) {
          a.subjects.forEach(function(sub) { subjectsSet[sub] = true; });
        }
      });

      var classesStr = Object.keys(classesSet).join(', ');
      var sectionsStr = Object.keys(sectionsSet).join(', ');
      var subjectsStr = Object.keys(subjectsSet).join(', ');

      rowsToWrite.push([
        tId,
        tName,
        acc.contact || '',
        acc.active !== false ? 'ACTIVE' : 'INACTIVE',
        classesStr,
        sectionsStr,
        subjectsStr,
        nowStr
      ]);
    });

    if (rowsToWrite.length > 0) {
      sheet.getRange(2, 1, rowsToWrite.length, 8).setValues(rowsToWrite);
      // Center-align columns 1, 3, 4, 5, 6, 8; Left-align Name & Subjects
      sheet.getRange(2, 1, rowsToWrite.length, 8).setHorizontalAlignment("center");
      sheet.getRange(2, 2, rowsToWrite.length, 1).setHorizontalAlignment("left"); // Name
      sheet.getRange(2, 7, rowsToWrite.length, 1).setHorizontalAlignment("left"); // Subjects
    }

    return jsonResponse({
      status: "success",
      savedCount: rowsToWrite.length,
      message: "Successfully synchronized " + rowsToWrite.length + " teacher accounts & allotments to Google Sheet (_TEACHERS)."
    });
  } catch (err) {
    return jsonResponse({
      status: "error",
      message: "Failed to save teachers to _TEACHERS sheet: " + err.message
    });
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "ping";
  var targetClass = (e && e.parameter && e.parameter.class) || "10";
  
  if (action === "getTeachers" || action === "getSchoolConfig") {
    return handleGetTeachers();
  }

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

    if (payload.records !== undefined) {
      if (!Array.isArray(payload.records) || payload.records.length === 0) {
        return jsonResponse({ status: "error", message: "Invalid or empty records payload." });
      }
      return handleSaveMarks(payload.records);
    }

    if (payload.action === "saveTeachers") {
      return handleSaveTeachers(payload);
    }

    if (payload.action === "updateStudentDetails") {
      return handleUpdateStudentDetails(payload.class, payload.student);
    }

    if (payload.action === "clearSheetData") {
      return handleClearSheetData(payload);
    }

    return jsonResponse({ status: "error", message: "Unsupported or malformed request." });
  } catch (err) {
    return jsonResponse({ status: "error", message: "Malformed request payload: " + err.message });
  }
}

function handleClearSheetData(payload) {
  var className = normalizeClassName(payload && payload.class ? payload.class : '10');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss, className);

  if (!sheet) {
    return jsonResponse({ status: "error", message: "Class sheet not found for " + (payload && payload.class ? payload.class : 'selected class') });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return jsonResponse({ status: "success", cleared: 0, message: "No student rows found in the class sheet." });
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastCol <= 12) {
    return jsonResponse({ status: "success", cleared: 0, message: "No marks or attendance columns are present in this class sheet." });
  }

  var clearRange = sheet.getRange(2, 13, Math.max(1, lastRow - 1), Math.max(1, lastCol - 12));
  clearRange.clearContent();

  return jsonResponse({
    status: "success",
    cleared: (Math.max(1, lastRow - 1) * Math.max(1, lastCol - 12)),
    message: "Cleared all marks and attendance values for Class " + className + ". You can now re-enter fresh data."
  });
}

function normalizeClassName(className) {
  var raw = String(className || '').trim();
  if (!raw) return null;
  if (raw.indexOf('Class_') === 0 || raw.indexOf('Class ') === 0) {
    return raw;
  }
  if (/^\d+$/.test(raw)) {
    return 'Class_' + raw;
  }
  return raw;
}

function isAllowedClassName(className) {
  var normalized = normalizeClassName(className);
  if (!normalized) return false;
  return SCHOOL_CONFIG.some(function(item) {
    return item.className === normalized;
  });
}

function normalizeUrn(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function findStudentRowByURN(sheet, urn) {
  if (!sheet) {
    return { status: 'NOT_FOUND', row: -1, message: 'Sheet missing.' };
  }

  var safeUrn = normalizeUrn(urn);
  if (!safeUrn) {
    return { status: 'NOT_FOUND', row: -1, message: 'Missing URN.' };
  }

  var data = sheet.getDataRange().getValues();
  var matches = [];

  for (var r = 1; r < data.length; r++) {
    var sheetUrn = normalizeUrn(data[r][2]);
    if (sheetUrn === safeUrn) {
      matches.push(r + 1);
    }
  }

  if (matches.length === 0) {
    return { status: 'NOT_FOUND', row: -1, message: 'Unknown URN.' };
  }

  if (matches.length > 1) {
    return { status: 'DUPLICATE', rows: matches, message: 'Duplicate URN detected.' };
  }

  return { status: 'FOUND', row: matches[0], message: 'URN match found.' };
}

function getTargetSheet(ss, className) {
  var normalized = normalizeClassName(className);
  if (!normalized || !isAllowedClassName(normalized)) {
    return null;
  }

  return ss.getSheetByName(normalized) ||
         ss.getSheetByName("Class " + normalized.replace('Class_', '')) ||
      ss.getSheetByName(normalized.replace('Class_', ''));
}

function handleGetStudents(targetClass) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var normalized = normalizeClassName(targetClass);
  var sheet = getTargetSheet(ss, normalized);

  if (!sheet) {
    return jsonResponse({ status: "error", message: "Sheet not found for Class " + (targetClass || '') });
  }

  var data = sheet.getDataRange().getValues();
  var students = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[1] && !row[3]) continue;

    var roll = row[1];
    var urn = normalizeUrn(row[2]);
    var name = row[3];
    var fatherName = row[4];
    var motherName = row[5];
    var dob = row[6];
    var mobile = row[9];
    var optionalSubject = row[10];
    var photoUrl = row[11];

    students.push({
      roll: roll !== undefined && roll !== '' ? roll : r,
      urn: urn,
      admNo: urn,
      name: name !== undefined && name !== '' ? name : "",
      fatherName: fatherName !== undefined ? fatherName : "",
      motherName: motherName !== undefined ? motherName : "",
      dob: dob !== undefined ? dob : "",
      mobile: mobile !== undefined ? mobile : "",
      optionalSubject: optionalSubject !== undefined ? optionalSubject : "",
      photoUrl: photoUrl !== undefined ? photoUrl : ""
    });
  }

  return jsonResponse({ status: "success", students: students });
}

function handleSaveMarks(records) {
  if (!records || !Array.isArray(records) || records.length === 0) {
    return jsonResponse({ status: "error", message: "Invalid or empty records payload." });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var updatedCount = 0;

  for (var i = 0; i < records.length; i++) {
    var item = records[i];
    if (!item || typeof item !== 'object') {
      return jsonResponse({ status: "error", message: "Invalid record payload." });
    }

    var className = normalizeClassName(item.class);
    if (!className || !isAllowedClassName(className)) {
      return jsonResponse({ status: "error", message: "Invalid class requested for marks update." });
    }

    var sheet = getTargetSheet(ss, className);
    if (!sheet) {
      return jsonResponse({ status: "error", message: "Class sheet not found for " + className });
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse({ status: "error", message: "No student rows found in class sheet." });
    }

    var headers = data[0].map(function(h) { return String(h).trim(); });
    var urn = normalizeUrn(item.urn || item.admNo || item['Admission No'] || item['Admission Number'] || item.URN);
    if (!urn) {
      return jsonResponse({ status: "error", message: "Invalid or missing URN." });
    }

    var identity = findStudentRowByURN(sheet, urn);
    if (identity.status !== 'FOUND') {
      return jsonResponse({ status: "error", message: identity.message || "Student identity could not be resolved by URN." });
    }

    var targetRow = identity.row;
    var targetCol = -1;
    var isAttendanceWrite = (item.segment === "Attendance" || item.type === "Attendance" || String(item.type || '').toLowerCase() === 'attendance');

    if (isAttendanceWrite) {
      var attColName = (item.examType === "AE") ? "Attendance-AE" : "Attendance-HY";
      targetCol = headers.indexOf(attColName);
      if (targetCol === -1) {
        return jsonResponse({ status: "error", message: "Invalid attendance target column for class " + className + "." });
      }
    } else {
      var subject = String(item.subject || '').trim();
      var segment = String(item.segment || '').trim();
      var typeName = String(item.type || '').trim();
      var candidates = [];

      if (subject) {
        if (segment) {
          candidates.push(subject + " " + segment);
          candidates.push(subject + "-" + segment);
          candidates.push(subject + " " + segment + "-WRT");
          candidates.push(subject + "-" + segment + "-WRT");
        }
        if (typeName) {
          candidates.push(subject + " " + typeName);
          candidates.push(subject + "-" + typeName);
        }
      }

      if (segment === 'HY' || segment === 'AE') {
        candidates.push(subject + "-" + segment + "-WRT");
        candidates.push(subject + " " + segment + "-WRT");
      }

      for (var k = 0; k < candidates.length; k++) {
        var candidate = candidates[k];
        if (!candidate) continue;
        var idx = headers.indexOf(candidate);
        if (idx !== -1) {
          targetCol = idx;
          break;
        }
      }

      if (targetCol === -1) {
        return jsonResponse({ status: "error", message: "Invalid subject/segment target column for subject " + subject + "." });
      }
    }

    var cellValue = item.value;
    sheet.getRange(targetRow, targetCol + 1).setValue(cellValue);
    updatedCount++;
  }

  return jsonResponse({
    status: "success",
    updated: updatedCount,
    message: "Successfully updated " + updatedCount + " cells in Google Sheet"
  });
}

function handleGetFullResults(targetClass) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var normalizedClass = normalizeClassName(targetClass);
  var sheet = getTargetSheet(ss, normalizedClass);
  if (!sheet) {
    return jsonResponse({ success: false, message: "Sheet not found for Class " + (targetClass || '') });
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

    var urn = normalizeUrn(row[2]);
    var roll = row[1];
    var name = row[3];
    var fatherName = row[4];
    var motherName = row[5];
    var dob = row[6];
    var mobile = row[9];
    var optionalSubject = row[10];
    var photoUrl = row[11];

    var rawMarks = {};
    var attHY = "";
    var attAE = "";

    for (var c = 12; c < headers.length; c++) {
      var header = headers[c];
      var val = row[c];
      if (header === "Attendance-HY") {
        attHY = (val !== undefined && val !== null && val !== '') ? String(val) : "";
      } else if (header === "Attendance-AE") {
        attAE = (val !== undefined && val !== null && val !== '') ? String(val) : "";
      } else if (val !== undefined && val !== "") {
        var key = header.replace(/\s+/g, "_").replace(/-/g, "_");
        rawMarks[key] = val;
        rawMarks[header] = val;
      }
    }

    students.push({
      roll: roll !== undefined && roll !== '' ? parseInt(roll) || roll : r,
      urn: urn,
      admNo: urn,
      name: name !== undefined ? String(name) : "",
      fatherName: fatherName !== undefined ? String(fatherName) : "",
      motherName: motherName !== undefined ? String(motherName) : "",
      dob: dob !== undefined ? String(dob) : "",
      studentClass: String(normalizedClass || targetClass || ''),
      section: "A",
      mobile: mobile !== undefined ? String(mobile) : "",
      optionalSubject: optionalSubject !== undefined ? String(optionalSubject) : "",
      photoUrl: photoUrl !== undefined ? String(photoUrl) : "",
      attendanceHY: String(attHY),
      attendanceAE: String(attAE),
      rawMarks: rawMarks
    });
  }

  return jsonResponse({ success: true, students: students });
}

function handleUpdateStudentDetails(className, student) {
  if (!student || typeof student !== 'object') {
    return jsonResponse({ status: "error", message: "Missing student payload." });
  }

  var normalizedClass = normalizeClassName(className);
  if (!normalizedClass || !isAllowedClassName(normalizedClass)) {
    return jsonResponse({ status: "error", message: "Invalid class requested for student update." });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss, normalizedClass);
  if (!sheet) return jsonResponse({ status: "error", message: "Class sheet not found" });

  var urn = normalizeUrn(student.urn || student.admNo || student['Admission No'] || student['Admission Number'] || student.URN);
  if (!urn) {
    return jsonResponse({ status: "error", message: "Invalid or missing URN." });
  }

  var identity = findStudentRowByURN(sheet, urn);
  if (identity.status !== 'FOUND') {
    return jsonResponse({ status: "error", message: identity.message || "Student not found by URN." });
  }

  var foundRow = identity.row;

  if (student.roll !== undefined && student.roll !== null && student.roll !== '') {
    sheet.getRange(foundRow, 2).setValue(student.roll);
  }
  if (student.name !== undefined && student.name !== null && student.name !== '') {
    sheet.getRange(foundRow, 4).setValue(student.name);
  }
  if (student.fatherName !== undefined && student.fatherName !== null && student.fatherName !== '') {
    sheet.getRange(foundRow, 5).setValue(student.fatherName);
  }
  if (student.motherName !== undefined && student.motherName !== null && student.motherName !== '') {
    sheet.getRange(foundRow, 6).setValue(student.motherName);
  }
  if (student.dob !== undefined && student.dob !== null && student.dob !== '') {
    sheet.getRange(foundRow, 7).setValue(student.dob);
  }
  if (student.gender !== undefined && student.gender !== null && student.gender !== '') {
    sheet.getRange(foundRow, 8).setValue(student.gender);
  }
  if (student.category !== undefined && student.category !== null && student.category !== '') {
    sheet.getRange(foundRow, 9).setValue(student.category);
  }
  if (student.mobile !== undefined && student.mobile !== null && student.mobile !== '') {
    sheet.getRange(foundRow, 10).setValue(student.mobile);
  }
  if (student.optionalSubject !== undefined && student.optionalSubject !== null && student.optionalSubject !== '') {
    sheet.getRange(foundRow, 11).setValue(student.optionalSubject);
  }
  if (student.photoUrl !== undefined && student.photoUrl !== null && student.photoUrl !== '') {
    sheet.getRange(foundRow, 12).setValue(student.photoUrl);
  }

  return jsonResponse({ status: "success", message: "Student updated on row " + foundRow + " by authoritative URN." });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function myFunction() {
  
}
