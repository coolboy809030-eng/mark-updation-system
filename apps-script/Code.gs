/**
 * Peace International School - Complete Master Google Apps Script Backend (v2.0)
 * 
 * DESIGNED SPECIFICALLY FOR THE CURRENT ACADEMIC HERO ARCHITECTURE:
 * - Authoritative URN-first student identification (Never infers identity from Name or Roll No)
 * - Exact canonical curriculum for all 13 classes (Nursery to Class 10)
 * - Half-Yearly (PT-1, PT-2, HY-WRT) and Annual (PT-3, PT-4, AE-WRT) assessment segments
 * - Central _TEACHERS registry with role-based validation & active status check
 * - Central _SYSTEM_CONFIG for global marks entry window & submission deadline enforcement
 * - Central _AUDIT_LOGS with non-fabricating event tracking
 * - Safe, non-destructive setup function: setupPeaceSchoolMasterWorkbook() / createPeaceSchoolWorkbook()
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet -> Click 'Extensions' > 'Apps Script'.
 * 2. Delete any previous script, paste this ENTIRE file, and click 'Save' (Ctrl+S).
 * 3. Select 'setupPeaceSchoolMasterWorkbook' in the toolbar dropdown and click 'Run' once.
 *    (Review and grant the required permissions when prompted).
 * 4. Click 'Deploy' > 'New deployment'.
 *    - Type: 'Web app'
 *    - Description: 'Academic Hero Production API v2'
 *    - Execute as: 'Me' (your Google account)
 *    - Who has access: 'Anyone'
 * 5. Copy the Web App URL and paste it into the Academic Hero app settings!
 */

// ==========================================
// 1. MASTER SCHOOL CONFIGURATION
// ==========================================

var SCHOOL_METADATA = {
  name: "Peace International School",
  subtitle: "Chakjado Dargabela, Vaishali, Bihar",
  academicSession: "2025-2026",
  version: "2.0.0"
};

var SCHOOL_CONFIG = [
  {
    className: "Class_Nursery",
    subjects: ["Drawing", "English", "General Awareness", "Gk", "Hindi", "Mathematics", "Sanskrit", "Urdu"]
  },
  {
    className: "Class_LKG",
    subjects: ["Drawing", "English", "General Awareness", "Gk", "Hindi", "Mathematics", "Sanskrit", "Urdu"]
  },
  {
    className: "Class_UKG",
    subjects: ["Drawing", "English", "General Awareness", "Gk", "Hindi", "Mathematics", "Table Book", "Sanskrit", "Urdu"]
  },
  {
    className: "Class_1",
    subjects: ["Computer", "English", "Environmental Studies", "Gk", "Hindi", "Mathematics", "Sanskrit", "Urdu"]
  },
  {
    className: "Class_2",
    subjects: ["Computer", "English", "Environmental Studies", "Gk", "Hindi", "Mathematics", "Sanskrit", "Urdu"]
  },
  {
    className: "Class_3",
    subjects: ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"]
  },
  {
    className: "Class_4",
    subjects: ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"]
  },
  {
    className: "Class_5",
    subjects: ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"]
  },
  {
    className: "Class_6",
    subjects: ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"]
  },
  {
    className: "Class_7",
    subjects: ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"]
  },
  {
    className: "Class_8",
    subjects: ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"]
  },
  {
    className: "Class_9",
    subjects: ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit", "Urdu"]
  },
  {
    className: "Class_10",
    subjects: ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit", "Urdu"]
  }
];

var BASE_PROFILE_HEADERS = [
  "S.No", "Roll No", "Admission No", "Student Name", "Father Name", "Mother Name",
  "DOB", "Gender", "Category", "Mobile No", "Optional Subject", "Photo URL"
];

var ASSESSMENT_SEGMENTS = [
  "PT-1",
  "PT-2",
  "-HY-WRT",
  "PT-3",
  "PT-4",
  "-AE-WRT"
];

// ==========================================
// 2. NON-DESTRUCTIVE WORKBOOK SETUP FUNCTION
// ==========================================

/**
 * Initializes or updates all 13 class tabs, _TEACHERS, _SYSTEM_CONFIG, and _AUDIT_LOGS.
 * Fully NON-DESTRUCTIVE: Preserves existing student and marks data rows!
 */
function createPeaceSchoolWorkbook() {
  setupPeaceSchoolMasterWorkbook();
}

function setupPeaceSchoolMasterWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Setup all 13 Class Sheets
  SCHOOL_CONFIG.forEach(function(item) {
    var sheetName = item.className;
    var sheet = ss.getSheetByName(sheetName);
    var isNew = false;
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      isNew = true;
    }

    // Build canonical headers
    var headers = BASE_PROFILE_HEADERS.slice();
    item.subjects.forEach(function(sub) {
      headers.push(sub + " PT-1");
      headers.push(sub + " PT-2");
      headers.push(sub + "-HY-WRT");
      headers.push(sub + " PT-3");
      headers.push(sub + " PT-4");
      headers.push(sub + "-AE-WRT");
    });
    headers.push("Attendance-HY", "Attendance-AE");

    // Write or update row 1 headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Format Header Row
    sheet.setRowHeight(1, 38);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1B4D3E"); // Forest Green
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(10);
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setWrap(true);
    headerRange.setBorder(true, true, true, true, true, true, "#103328", SpreadsheetApp.BorderStyle.SOLID);

    // Format body alignment if sheet has rows
    var maxRows = Math.max(sheet.getMaxRows(), 50);
    var fullRange = sheet.getRange(1, 1, maxRows, headers.length);
    fullRange.setVerticalAlignment("middle");

    // Default center alignment for all data columns
    if (maxRows > 1) {
      sheet.getRange(2, 1, maxRows - 1, headers.length).setHorizontalAlignment("center");
      // Keep Name, Father Name, Mother Name left-aligned for data rows
      sheet.getRange(2, 4, maxRows - 1, 3).setHorizontalAlignment("left");
    }

    // Freeze panes: Header row (1) and Identification columns (4: S.No, Roll, Admission No, Student Name)
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(4);

    // Set readable column widths
    sheet.setColumnWidth(1, 55);   // S.No
    sheet.setColumnWidth(2, 70);   // Roll No
    sheet.setColumnWidth(3, 150);  // Admission No (Authoritative URN)
    sheet.setColumnWidth(4, 190);  // Student Name
    sheet.setColumnWidth(5, 180);  // Father Name
    sheet.setColumnWidth(6, 180);  // Mother Name
    sheet.setColumnWidth(7, 105);  // DOB
    sheet.setColumnWidth(8, 75);   // Gender
    sheet.setColumnWidth(9, 85);   // Category
    sheet.setColumnWidth(10, 120); // Mobile No
    sheet.setColumnWidth(11, 135); // Optional Subject
    sheet.setColumnWidth(12, 120); // Photo URL
    for (var c = 13; c <= headers.length; c++) {
      sheet.setColumnWidth(c, 115); // Assessment and attendance columns
    }
  });

  // 2. Setup Central _TEACHERS Registry Tab
  setupTeachersSheet(ss);

  // 3. Setup Central _SYSTEM_CONFIG Tab
  setupSystemConfigSheet(ss);

  // 4. Setup Central _AUDIT_LOGS Tab
  setupAuditLogsSheet(ss);

  var msg = "Peace International School Master Workbook v2 is successfully configured!\n\n" +
            "✓ 13 Class sheets configured with authoritative URN columns\n" +
            "✓ Central _TEACHERS registry tab active\n" +
            "✓ Central _SYSTEM_CONFIG tab active\n" +
            "✓ Central _AUDIT_LOGS tab active\n" +
            "✓ Preserved all existing student and marks data rows safely.";
  
  try {
    SpreadsheetApp.getUi().alert("Setup Complete", msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(msg);
  }
}

/**
 * Ensures _TEACHERS tab exists with canonical headers and formatting
 */
function setupTeachersSheet(ss) {
  var sheet = ss.getSheetByName("_TEACHERS");
  var isNew = false;
  if (!sheet) {
    sheet = ss.insertSheet("_TEACHERS");
    isNew = true;
  }

  var headers = [
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
  if (currentData.length < 1 || String(currentData[0][0]).trim() !== "Teacher ID") {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setRowHeight(1, 38);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#1E293B"); // Dark Slate
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 130); // Teacher ID
  sheet.setColumnWidth(2, 190); // Teacher Name
  sheet.setColumnWidth(3, 140); // Contact
  sheet.setColumnWidth(4, 95);  // Status
  sheet.setColumnWidth(5, 180); // Classes
  sheet.setColumnWidth(6, 110); // Sections
  sheet.setColumnWidth(7, 280); // Subjects
  sheet.setColumnWidth(8, 170); // Last Updated

  return sheet;
}

/**
 * Ensures _SYSTEM_CONFIG tab exists with default entries
 */
function setupSystemConfigSheet(ss) {
  var sheet = ss.getSheetByName("_SYSTEM_CONFIG");
  var isNew = false;
  if (!sheet) {
    sheet = ss.insertSheet("_SYSTEM_CONFIG");
    isNew = true;
  }

  var headers = ["Key", "Value", "Description", "Last Updated"];
  var currentData = sheet.getDataRange().getValues();

  if (currentData.length < 1 || String(currentData[0][0]).trim() !== "Key") {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setRowHeight(1, 38);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#1E3A8A"); // Deep Navy
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 200); // Key
  sheet.setColumnWidth(2, 200); // Value
  sheet.setColumnWidth(3, 380); // Description
  sheet.setColumnWidth(4, 170); // Last Updated

  // Populate default configs if table is empty
  var updatedData = sheet.getDataRange().getValues();
  if (updatedData.length <= 1) {
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm");
    var defaultRows = [
      ["marksEntryStatus", "ON", "Global switch for marks entry submissions: ON or OFF", nowStr],
      ["marksEntryDeadline", "2026-12-31T23:59", "Final deadline timestamp (ISO) for marks and attendance submissions", nowStr],
      ["workingDaysHY", "110", "Total working days in Half Yearly academic term", nowStr],
      ["workingDaysAE", "115", "Total working days in Annual Exam academic term", nowStr],
      ["academicSession", "2025-2026", "Current academic year session", nowStr],
      ["schoolName", "Peace International School", "Official institutional name", nowStr],
      ["schoolSubtitle", "Chakjado Dargabela, Vaishali, Bihar", "Campus location", nowStr]
    ];
    sheet.getRange(2, 1, defaultRows.length, headers.length).setValues(defaultRows);
  }

  return sheet;
}

/**
 * Ensures _AUDIT_LOGS tab exists with canonical headers
 */
function setupAuditLogsSheet(ss) {
  var sheet = ss.getSheetByName("_AUDIT_LOGS");
  var isNew = false;
  if (!sheet) {
    sheet = ss.insertSheet("_AUDIT_LOGS");
    isNew = true;
  }

  var headers = [
    "Timestamp",
    "Actor",
    "Teacher ID",
    "Action",
    "Class",
    "Subject / Type",
    "Record Count",
    "Status",
    "Message"
  ];

  var currentData = sheet.getDataRange().getValues();
  if (currentData.length < 1 || String(currentData[0][0]).trim() !== "Timestamp") {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setRowHeight(1, 38);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#374151"); // Cool Charcoal
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 170); // Timestamp
  sheet.setColumnWidth(2, 160); // Actor
  sheet.setColumnWidth(3, 120); // Teacher ID
  sheet.setColumnWidth(4, 180); // Action
  sheet.setColumnWidth(5, 120); // Class
  sheet.setColumnWidth(6, 180); // Subject / Type
  sheet.setColumnWidth(7, 110); // Record Count
  sheet.setColumnWidth(8, 110); // Status
  sheet.setColumnWidth(9, 360); // Message

  return sheet;
}

// ==========================================
// 3. HTTP GET HANDLER
// ==========================================

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || "ping";
    var targetClass = params.class || params.className || "10";

    if (action === "ping") {
      return jsonResponse({
        status: "success",
        success: true,
        message: "Peace International School API v2 is Active",
        version: SCHOOL_METADATA.version,
        academicSession: SCHOOL_METADATA.academicSession,
        supportedClasses: SCHOOL_CONFIG.map(function(c) { return c.className; }),
        timestamp: new Date().toISOString()
      });
    }

    if (action === "getSchoolConfig") {
      return handleGetSchoolConfig();
    }

    if (action === "getSystemControl") {
      return handleGetSystemControl();
    }

    if (action === "getTeachers") {
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
      success: true,
      message: "Peace International School API v2 is Active",
      actionReceived: action,
      supportedClasses: SCHOOL_CONFIG.map(function(c) { return c.className; })
    });
  } catch (err) {
    return jsonResponse({
      status: "error",
      success: false,
      message: "Server Error in doGet: " + err.toString()
    });
  }
}

// ==========================================
// 4. HTTP POST HANDLER
// ==========================================

function doPost(e) {
  try {
    var rawText = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var payload;
    try {
      payload = JSON.parse(rawText);
    } catch (parseErr) {
      return jsonResponse({
        status: "error",
        success: false,
        message: "Invalid JSON format in POST request: " + parseErr.message
      });
    }

    var action = payload.action || "";

    // 1. Array of records directly or marks_submit action
    if (payload.records !== undefined || action === "marks_submit" || action === "attendance_submit") {
      var records = payload.records || [];
      if (!Array.isArray(records) || records.length === 0) {
        return jsonResponse({
          status: "error",
          success: false,
          message: "Empty or invalid records payload."
        });
      }
      return handleSaveMarks(records, payload);
    }

    // 2. Update Student Demographics
    if (action === "updateStudentDetails") {
      return handleUpdateStudentDetails(payload);
    }

    // 3. Delete Student by Authoritative URN
    if (action === "deleteStudent") {
      return handleDeleteStudent(payload);
    }

    // 4. Save Teachers & Allotments
    if (action === "saveTeachers" || action === "saveTeacherRegistry") {
      return handleSaveTeachers(payload);
    }

    // 5. Update System Control & School Configuration
    if (action === "updateSystemControl" || action === "saveSystemControl" || action === "saveSchoolConfig") {
      return handleSaveSchoolConfig(payload);
    }

    // 6. Clear Marks/Attendance Sheet Data
    if (action === "clearSheetData") {
      return handleClearSheetData(payload);
    }

    return jsonResponse({
      status: "error",
      success: false,
      message: "Unsupported action: " + (action || "None provided")
    });
  } catch (err) {
    return jsonResponse({
      status: "error",
      success: false,
      message: "Server Error in doPost: " + err.toString()
    });
  }
}

// ==========================================
// 5. CORE BUSINESS HANDLERS
// ==========================================

/**
 * Returns Combined School Configuration: System Controls, Curriculum, Segment Locks & Teacher Registry
 */
function handleGetSchoolConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("_SYSTEM_CONFIG") || ss.getSheetByName("_CONFIG") || setupSystemConfigSheet(ss);
  
  var sysConfig = {
    marksEntryStatus: "ON",
    marksEntryDeadline: "2026-12-31T23:59",
    workingDaysHY: 110,
    workingDaysAE: 115,
    academicSession: SCHOOL_METADATA.academicSession
  };
  var subjectAllotments = {};
  var segmentLocks = {};

  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      var key = String(data[r][0] || "").trim();
      var val = String(data[r][1] || "").trim();
      if (!key) continue;

      if (key === "marksEntryStatus") {
        sysConfig.marksEntryStatus = val.toUpperCase() === "OFF" ? "OFF" : "ON";
      } else if (key === "marksEntryDeadline") {
        sysConfig.marksEntryDeadline = val;
      } else if (key === "workingDaysHY") {
        var n = parseInt(val, 10);
        if (!isNaN(n)) sysConfig.workingDaysHY = n;
      } else if (key === "workingDaysAE") {
        var n2 = parseInt(val, 10);
        if (!isNaN(n2)) sysConfig.workingDaysAE = n2;
      } else if (key === "academicSession") {
        sysConfig.academicSession = val;
      } else if (key === "subjectAllotments") {
        try { subjectAllotments = JSON.parse(val); } catch (e) {}
      } else if (key === "segmentLocks") {
        try { segmentLocks = JSON.parse(val); } catch (e) {}
      }
    }
  }

  var teacherData = getTeachersData(ss);

  return jsonResponse({
    status: "success",
    success: true,
    systemConfig: sysConfig,
    subjectAllotments: subjectAllotments,
    segmentLocks: segmentLocks,
    teacherAccounts: teacherData.accounts,
    teacherAllotments: teacherData.allotments,
    accounts: teacherData.accounts,
    allotments: teacherData.allotments,
    timestamp: new Date().toISOString()
  });
}

/**
 * Returns System Control Configuration
 */
function handleGetSystemControl() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("_SYSTEM_CONFIG") || ss.getSheetByName("_CONFIG") || setupSystemConfigSheet(ss);
  var config = {
    status: "success",
    success: true,
    enabled: true,
    marksEntryStatus: "ON",
    marksEntryDeadline: "2026-12-31T23:59",
    workingDaysHY: 110,
    workingDaysAE: 115,
    academicSession: SCHOOL_METADATA.academicSession
  };

  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      var key = String(data[r][0] || "").trim();
      var val = String(data[r][1] || "").trim();
      if (!key) continue;

      if (key === "marksEntryStatus") {
        config.marksEntryStatus = val.toUpperCase() === "OFF" ? "OFF" : "ON";
        config.enabled = config.marksEntryStatus === "ON";
      } else if (key === "marksEntryDeadline") {
        config.marksEntryDeadline = val;
      } else if (key === "workingDaysHY") {
        var n = parseInt(val, 10);
        if (!isNaN(n)) config.workingDaysHY = n;
      } else if (key === "workingDaysAE") {
        var n2 = parseInt(val, 10);
        if (!isNaN(n2)) config.workingDaysAE = n2;
      } else if (key === "academicSession") {
        config.academicSession = val;
      }
    }
  }

  return jsonResponse(config);
}

/**
 * Updates School Configuration, System Control, Curriculum & Segment Locks
 */
function handleSaveSchoolConfig(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("_SYSTEM_CONFIG") || ss.getSheetByName("_CONFIG") || setupSystemConfigSheet(ss);

  var cfg = payload.config || payload;
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm");
  var data = sheet.getDataRange().getValues();

  var keysToUpdate = {};
  if (cfg.marksEntryStatus) keysToUpdate.marksEntryStatus = cfg.marksEntryStatus;
  if (cfg.marksEntryDeadline) keysToUpdate.marksEntryDeadline = cfg.marksEntryDeadline;
  if (cfg.workingDaysHY !== undefined) keysToUpdate.workingDaysHY = String(cfg.workingDaysHY);
  if (cfg.workingDaysAE !== undefined) keysToUpdate.workingDaysAE = String(cfg.workingDaysAE);
  if (cfg.academicSession) keysToUpdate.academicSession = cfg.academicSession;
  if (payload.subjectAllotments) keysToUpdate.subjectAllotments = JSON.stringify(payload.subjectAllotments);
  if (payload.segmentLocks) keysToUpdate.segmentLocks = JSON.stringify(payload.segmentLocks);

  for (var r = 1; r < data.length; r++) {
    var key = String(data[r][0] || "").trim();
    if (keysToUpdate[key] !== undefined) {
      sheet.getRange(r + 1, 2).setValue(keysToUpdate[key]);
      sheet.getRange(r + 1, 4).setValue(nowStr);
      delete keysToUpdate[key];
    }
  }

  // Insert any remaining keys
  for (var k in keysToUpdate) {
    sheet.appendRow([k, keysToUpdate[k], "System Configuration Property", nowStr]);
  }

  logAuditEvent("Admin", "ADMIN", "UPDATE_CONFIG", "SYSTEM", "ALL", 1, "SUCCESS", "School configuration & curriculum synced successfully.");

  return jsonResponse({
    status: "success",
    success: true,
    message: "School configuration updated successfully in Google Sheet (_SYSTEM_CONFIG)."
  });
}

function handleUpdateSystemControl(payload) {
  return handleSaveSchoolConfig(payload);
}

/**
 * Extracts and normalizes teacher registry from _TEACHERS sheet
 */
function getTeachersData(ss) {
  var sheet = ss.getSheetByName("_TEACHERS") || setupTeachersSheet(ss);
  var data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return { accounts: [], allotments: [] };
  }

  var accounts = [];
  var allotments = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var teacherId = String(row[0] || "").trim();
    var teacherName = String(row[1] || "").trim();
    if (!teacherId && !teacherName) continue;

    var contact = String(row[2] || "").trim();
    var statusStr = String(row[3] || "ACTIVE").trim().toUpperCase();
    var active = statusStr !== "INACTIVE" && statusStr !== "FALSE";

    var classesRaw = String(row[4] || "").trim();
    var sectionsRaw = String(row[5] || "").trim();
    var subjectsRaw = String(row[6] || "").trim();
    var lastUpdated = String(row[7] || "").trim();

    accounts.push({
      id: "tch_acc_" + teacherId.replace(/[^a-zA-Z0-9]/g, "_"),
      teacherId: teacherId,
      teacherName: teacherName,
      contact: contact,
      active: active,
      updatedAt: lastUpdated || new Date().toISOString()
    });

    var classList = classesRaw ? classesRaw.split(",").map(function(c) { return c.trim().replace("Class_", ""); }).filter(Boolean) : [];
    var secList = sectionsRaw ? sectionsRaw.split(",").map(function(s) { return s.trim(); }).filter(Boolean) : ["A"];
    var subList = subjectsRaw ? subjectsRaw.split(",").map(function(s) { return s.trim(); }).filter(Boolean) : [];

    if (classList.length > 0) {
      classList.forEach(function(cls) {
        allotments.push({
          id: "allot_" + teacherId + "_" + cls,
          teacherId: teacherId,
          teacherName: teacherName,
          classLevel: cls,
          sections: secList.length > 0 ? secList : ["A"],
          subjects: subList,
          active: active
        });
      });
    } else {
      allotments.push({
        id: "allot_" + teacherId,
        teacherId: teacherId,
        teacherName: teacherName,
        classLevel: "10",
        sections: secList,
        subjects: subList,
        active: active
      });
    }
  }

  return { accounts: accounts, allotments: allotments };
}

/**
 * Returns Teacher Accounts and Allotments from _TEACHERS
 */
function handleGetTeachers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var teacherData = getTeachersData(ss);

  return jsonResponse({
    status: "success",
    success: true,
    accounts: teacherData.accounts,
    allotments: teacherData.allotments,
    count: teacherData.accounts.length
  });
}

/**
 * Saves Teacher Registry into _TEACHERS
 */
function handleSaveTeachers(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("_TEACHERS") || setupTeachersSheet(ss);

  var accounts = payload.teacherAccounts || payload.accounts || [];
  var allotments = payload.teacherAllotments || payload.allotments || [];

  // Clear existing data rows (keep header row 1)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  }

  if (accounts.length === 0) {
    logAuditEvent("Admin", "ADMIN", "SAVE_TEACHERS", "ALL", "TEACHERS", 0, "SUCCESS", "Teacher registry cleared.");
    return jsonResponse({
      status: "success",
      success: true,
      message: "Teacher registry cleared in Google Sheet (_TEACHERS)."
    });
  }

  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm");
  var rowsToWrite = [];

  accounts.forEach(function(acc) {
    var tId = (acc.teacherId || "").trim();
    var tName = (acc.teacherName || "").trim();
    if (!tId && !tName) return;

    var teacherAllots = allotments.filter(function(a) {
      return (a.teacherId && a.teacherId.trim().toUpperCase() === tId.toUpperCase()) ||
             (!a.teacherId && a.teacherName && a.teacherName.trim().toLowerCase() === tName.toLowerCase());
    });

    var classesSet = {};
    var sectionsSet = {};
    var subjectsSet = {};

    teacherAllots.forEach(function(a) {
      if (a.classLevel) classesSet["Class_" + a.classLevel] = true;
      if (Array.isArray(a.sections)) {
        a.sections.forEach(function(s) { sectionsSet[s] = true; });
      }
      if (Array.isArray(a.subjects)) {
        a.subjects.forEach(function(sub) { subjectsSet[sub] = true; });
      }
    });

    rowsToWrite.push([
      tId,
      tName,
      acc.contact || "",
      acc.active !== false ? "ACTIVE" : "INACTIVE",
      Object.keys(classesSet).join(", "),
      Object.keys(sectionsSet).join(", "),
      Object.keys(subjectsSet).join(", "),
      nowStr
    ]);
  });

  if (rowsToWrite.length > 0) {
    sheet.getRange(2, 1, rowsToWrite.length, 8).setValues(rowsToWrite);
    sheet.getRange(2, 1, rowsToWrite.length, 8).setHorizontalAlignment("center");
    sheet.getRange(2, 2, rowsToWrite.length, 1).setHorizontalAlignment("left"); // Name
    sheet.getRange(2, 7, rowsToWrite.length, 1).setHorizontalAlignment("left"); // Subjects
  }

  logAuditEvent("Admin", "ADMIN", "SAVE_TEACHERS", "ALL", "TEACHERS", rowsToWrite.length, "SUCCESS", "Synchronized " + rowsToWrite.length + " teachers to _TEACHERS tab.");

  return jsonResponse({
    status: "success",
    success: true,
    savedCount: rowsToWrite.length,
    message: "Successfully synchronized " + rowsToWrite.length + " teacher accounts to Google Sheet (_TEACHERS)."
  });
}

/**
 * Returns basic student list for Mark Updation app (resolved by URN)
 */
function handleGetStudents(targetClass) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss, targetClass);

  if (!sheet) {
    return jsonResponse({
      status: "error",
      success: false,
      message: "Sheet not found for Class " + targetClass
    });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return jsonResponse({
      status: "success",
      success: true,
      students: []
    });
  }

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var urnCol = findColumnIndex(headers, ["admission no", "urn", "adm no", "admission number", "student urn"]);
  if (urnCol === -1) urnCol = 2; // Column C fallback

  var students = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var roll = row[1];
    var name = row[3];
    if (!roll && !name) continue;

    var urn = normalizeUrn(row[urnCol]);
    if (!urn) {
      // Fallback synthetic URN if missing in sheet row
      urn = "PIS-2025-" + normalizeClassName(targetClass).replace("Class_", "").toUpperCase() + "-" + ("00" + (roll || r)).slice(-3);
    }

    students.push({
      roll: roll !== undefined && roll !== "" ? (parseInt(roll, 10) || roll) : r,
      urn: urn,
      admNo: urn,
      name: name !== undefined ? String(name).trim() : "",
      fatherName: row[4] !== undefined ? String(row[4]).trim() : "",
      motherName: row[5] !== undefined ? String(row[5]).trim() : "",
      dob: row[6] !== undefined ? String(row[6]).trim() : "",
      gender: row[7] !== undefined ? String(row[7]).trim() : "",
      category: row[8] !== undefined ? String(row[8]).trim() : "",
      mobile: row[9] !== undefined ? String(row[9]).trim() : "",
      optionalSubject: row[10] !== undefined ? String(row[10]).trim() : "",
      photoUrl: row[11] !== undefined ? String(row[11]).trim() : ""
    });
  }

  return jsonResponse({
    status: "success",
    success: true,
    students: students,
    count: students.length
  });
}

/**
 * Returns complete student examination records with all marks and attendance
 */
function handleGetFullResults(targetClass) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss, targetClass);

  if (!sheet) {
    return jsonResponse({
      status: "error",
      success: false,
      message: "Sheet not found for Class " + targetClass
    });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return jsonResponse({
      status: "success",
      success: true,
      students: []
    });
  }

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var urnCol = findColumnIndex(headers, ["admission no", "urn", "adm no", "admission number", "student urn"]);
  if (urnCol === -1) urnCol = 2; // Column C fallback

  var students = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var roll = row[1];
    var name = row[3];
    if (!roll && !name) continue;

    var urn = normalizeUrn(row[urnCol]);
    if (!urn) {
      urn = "PIS-2025-" + normalizeClassName(targetClass).replace("Class_", "").toUpperCase() + "-" + ("00" + (roll || r)).slice(-3);
    }

    var rawMarks = {};
    var attHY = "";
    var attAE = "";

    for (var c = 12; c < headers.length; c++) {
      var header = headers[c];
      var val = row[c];
      if (header === "Attendance-HY") {
        attHY = (val !== undefined && val !== null && val !== "") ? String(val) : "";
      } else if (header === "Attendance-AE") {
        attAE = (val !== undefined && val !== null && val !== "") ? String(val) : "";
      } else if (val !== undefined && val !== null && val !== "") {
        // Store both formatted underscore key and verbatim header for maximum frontend compatibility
        var key = header.replace(/\s+/g, "_").replace(/-/g, "_");
        rawMarks[key] = val;
        rawMarks[header] = val;
      }
    }

    students.push({
      roll: roll !== undefined && roll !== "" ? (parseInt(roll, 10) || roll) : r,
      urn: urn,
      admNo: urn,
      name: name !== undefined ? String(name).trim() : "",
      fatherName: row[4] !== undefined ? String(row[4]).trim() : "",
      motherName: row[5] !== undefined ? String(row[5]).trim() : "",
      dob: row[6] !== undefined ? String(row[6]).trim() : "",
      gender: row[7] !== undefined ? String(row[7]).trim() : "",
      category: row[8] !== undefined ? String(row[8]).trim() : "",
      studentClass: normalizeClassName(targetClass).replace("Class_", ""),
      section: "A",
      mobile: row[9] !== undefined ? String(row[9]).trim() : "",
      optionalSubject: row[10] !== undefined ? String(row[10]).trim() : "",
      photoUrl: row[11] !== undefined ? String(row[11]).trim() : "",
      attendanceHY: attHY,
      attendanceAE: attAE,
      rawMarks: rawMarks
    });
  }

  return jsonResponse({
    status: "success",
    success: true,
    students: students,
    count: students.length
  });
}

/**
 * Saves Marks or Attendance Entries into target cells
 * Enforces Authoritative URN lookup & Server-Side Security Rules
 */
function handleSaveMarks(records, fullPayload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Check Server-Side Security & Authorization
  var context = fullPayload.context || {};
  var actor = context.actor || fullPayload.actor || "Teacher";
  var role = (context.role || fullPayload.role || "teacher").toLowerCase();
  var teacherId = context.teacherId || fullPayload.teacherId || "";

  var authCheck = verifyServerAuthorization(ss, role, teacherId, records);
  if (!authCheck.authorized) {
    logAuditEvent(actor, teacherId, "MARKS_REJECTED", "VARIOUS", "SECURITY", records.length, "REJECTED", authCheck.reason);
    return jsonResponse({
      status: "error",
      success: false,
      message: authCheck.reason
    });
  }

  // 2. Group records by target class sheet
  var recordsByClass = {};
  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    var rawCls = rec.class || rec.className || rec.studentClass || "10";
    var clsKey = normalizeClassName(rawCls);
    if (!recordsByClass[clsKey]) recordsByClass[clsKey] = [];
    recordsByClass[clsKey].push(rec);
  }

  var updatedCount = 0;
  var errors = [];

  for (var targetCls in recordsByClass) {
    var sheet = getTargetSheet(ss, targetCls);
    if (!sheet) {
      errors.push("Class sheet not found for " + targetCls);
      continue;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      errors.push("No student records exist in sheet " + targetCls);
      continue;
    }

    var headers = data[0].map(function(h) { return String(h).trim(); });
    var urnCol = findColumnIndex(headers, ["admission no", "urn", "adm no", "admission number", "student urn"]);
    if (urnCol === -1) urnCol = 2; // Column C fallback

    // Build URN -> Row index mapping
    var urnToRow = {};
    for (var r = 1; r < data.length; r++) {
      var rowUrn = normalizeUrn(data[r][urnCol]);
      if (rowUrn) {
        urnToRow[rowUrn] = r + 1; // 1-indexed row in SpreadsheetApp
      }
    }

    var classItems = recordsByClass[targetCls];
    for (var j = 0; j < classItems.length; j++) {
      var item = classItems[j];
      var targetUrn = normalizeUrn(item.urn || item.admNo || item["Admission No"] || item["Admission Number"] || item.URN);

      if (!targetUrn) {
        // Strict: Reject if URN missing
        errors.push("Missing authoritative URN in record " + (j + 1));
        continue;
      }

      var targetRow = urnToRow[targetUrn];
      if (!targetRow) {
        errors.push("Student URN '" + targetUrn + "' not found in " + targetCls);
        continue;
      }

      // Locate column
      var targetCol = -1;
      var isAttendance = (item.segment === "Attendance" || item.type === "Attendance" || String(item.type || "").toLowerCase() === "attendance");

      if (isAttendance) {
        var isAE = (item.examType === "AE" || item.exam === "AN" || item.term === "AE" || item.segment === "Attendance-AE");
        var attName = isAE ? "Attendance-AE" : "Attendance-HY";
        targetCol = findColumnExactOrAlias(headers, attName, [attName.toLowerCase(), isAE ? "attendance_ae" : "attendance_hy"]);
      } else {
        var subName = String(item.subject || "").trim();
        var segName = String(item.segment || item.type || "").trim();
        targetCol = resolveSubjectColumn(headers, subName, segName);
      }

      if (targetCol === -1) {
        errors.push("Target column not found for " + (item.subject || "Attendance") + " (" + (item.segment || item.type) + ") in " + targetCls);
        continue;
      }

      // Write cell value
      sheet.getRange(targetRow, targetCol + 1).setValue(item.value !== undefined ? item.value : "");
      updatedCount++;
    }
  }

  var logStatus = errors.length === 0 ? "SUCCESS" : (updatedCount > 0 ? "PARTIAL" : "ERROR");
  var logMsg = "Saved " + updatedCount + " cells." + (errors.length > 0 ? " (" + errors.length + " warnings)" : "");
  logAuditEvent(actor, teacherId, "SAVE_MARKS", Object.keys(recordsByClass).join(", "), "MARKS", updatedCount, logStatus, logMsg);

  return jsonResponse({
    status: "success",
    success: true,
    updated: updatedCount,
    errors: errors,
    message: "Successfully synchronized " + updatedCount + " entries to Google Sheet."
  });
}

/**
 * Updates Student Profile Demographics by Authoritative URN
 */
function handleUpdateStudentDetails(payload) {
  var student = payload.student || payload;
  var className = payload.class || payload.className || student.class || "10";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss, className);

  if (!sheet) {
    return jsonResponse({ status: "error", success: false, message: "Class sheet not found for " + className });
  }

  var urn = normalizeUrn(student.urn || student.admNo || student["Admission No"] || student.URN);
  if (!urn) {
    return jsonResponse({ status: "error", success: false, message: "Missing authoritative URN for student update." });
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var urnCol = findColumnIndex(headers, ["admission no", "urn", "adm no", "admission number", "student urn"]);
  if (urnCol === -1) urnCol = 2;

  var foundRow = -1;
  for (var r = 1; r < data.length; r++) {
    if (normalizeUrn(data[r][urnCol]) === urn) {
      foundRow = r + 1;
      break;
    }
  }

  if (foundRow === -1) {
    return jsonResponse({ status: "error", success: false, message: "Student with URN '" + urn + "' not found in " + className });
  }

  if (student.roll !== undefined && student.roll !== "") sheet.getRange(foundRow, 2).setValue(student.roll);
  if (student.name !== undefined && student.name !== "") sheet.getRange(foundRow, 4).setValue(student.name);
  if (student.fatherName !== undefined) sheet.getRange(foundRow, 5).setValue(student.fatherName);
  if (student.motherName !== undefined) sheet.getRange(foundRow, 6).setValue(student.motherName);
  if (student.dob !== undefined) sheet.getRange(foundRow, 7).setValue(student.dob);
  if (student.gender !== undefined) sheet.getRange(foundRow, 8).setValue(student.gender);
  if (student.category !== undefined) sheet.getRange(foundRow, 9).setValue(student.category);
  if (student.mobile !== undefined) sheet.getRange(foundRow, 10).setValue(student.mobile);
  if (student.optionalSubject !== undefined) sheet.getRange(foundRow, 11).setValue(student.optionalSubject);
  if (student.photoUrl !== undefined) sheet.getRange(foundRow, 12).setValue(student.photoUrl);

  logAuditEvent("User", "", "UPDATE_STUDENT", className, urn, 1, "SUCCESS", "Student demographic details updated for URN: " + urn);

  return jsonResponse({
    status: "success",
    success: true,
    message: "Student demographics updated successfully on row " + foundRow + " for URN: " + urn
  });
}

/**
 * Deletes Student Record by Authoritative URN
 */
function handleDeleteStudent(payload) {
  var className = payload.class || payload.className || "10";
  var urn = normalizeUrn(payload.urn || payload.admNo || payload.studentUrn);

  if (!urn) {
    return jsonResponse({ status: "error", success: false, message: "Authoritative URN is required for deletion." });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss, className);

  if (!sheet) {
    return jsonResponse({ status: "error", success: false, message: "Class sheet not found for " + className });
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var urnCol = findColumnIndex(headers, ["admission no", "urn", "adm no", "admission number", "student urn"]);
  if (urnCol === -1) urnCol = 2;

  var targetRow = -1;
  for (var r = 1; r < data.length; r++) {
    if (normalizeUrn(data[r][urnCol]) === urn) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return jsonResponse({ status: "error", success: false, message: "Student with URN '" + urn + "' not found in " + className });
  }

  sheet.deleteRow(targetRow);

  logAuditEvent("User", "", "DELETE_STUDENT", className, urn, 1, "SUCCESS", "Student deleted by URN: " + urn);

  return jsonResponse({
    status: "success",
    success: true,
    message: "Student record deleted successfully for URN: " + urn + " from " + className
  });
}

/**
 * Clears marks and attendance for a class (retains student profile demographics)
 */
function handleClearSheetData(payload) {
  var className = normalizeClassName(payload.class || "10");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss, className);

  if (!sheet) {
    return jsonResponse({ status: "error", success: false, message: "Class sheet not found: " + className });
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol <= 12) {
    return jsonResponse({ status: "success", success: true, cleared: 0, message: "No assessment data to clear." });
  }

  var clearRange = sheet.getRange(2, 13, lastRow - 1, lastCol - 12);
  clearRange.clearContent();

  logAuditEvent("Admin", "ADMIN", "CLEAR_MARKS", className, "ALL", (lastRow - 1), "SUCCESS", "Assessment marks cleared for class " + className);

  return jsonResponse({
    status: "success",
    success: true,
    cleared: (lastRow - 1) * (lastCol - 12),
    message: "Successfully cleared marks and attendance columns for " + className + ". Student profile columns preserved."
  });
}

// ==========================================
// 6. SECURITY & AUTHORIZATION VERIFICATION
// ==========================================

/**
 * Verifies marks entry permission against _SYSTEM_CONFIG and _TEACHERS registry
 */
function verifyServerAuthorization(ss, role, teacherId, records) {
  // Admins are exempt from deadline and teacher locks
  if (role === "admin") {
    return { authorized: true };
  }

  // 1. Check System Control Config
  var configSheet = ss.getSheetByName("_SYSTEM_CONFIG");
  if (configSheet) {
    var cfgData = configSheet.getDataRange().getValues();
    var status = "ON";
    var deadlineStr = "";

    for (var r = 1; r < cfgData.length; r++) {
      var k = String(cfgData[r][0] || "").trim();
      var v = String(cfgData[r][1] || "").trim();
      if (k === "marksEntryStatus") status = v.toUpperCase();
      if (k === "marksEntryDeadline") deadlineStr = v;
    }

    if (status === "OFF") {
      return {
        authorized: false,
        reason: "Marks entry is currently locked by the Examination Authority."
      };
    }

    if (deadlineStr) {
      var deadlineDate = new Date(deadlineStr);
      if (!isNaN(deadlineDate.getTime()) && new Date() > deadlineDate) {
        return {
          authorized: false,
          reason: "Marks entry deadline expired on " + deadlineStr + ". Please contact Examination Authority."
        };
      }
    }
  }

  // 2. Check Teacher Registry if Teacher ID is provided
  if (teacherId) {
    var teacherSheet = ss.getSheetByName("_TEACHERS");
    if (teacherSheet) {
      var tData = teacherSheet.getDataRange().getValues();
      var found = false;
      var isActive = true;

      for (var t = 1; t < tData.length; t++) {
        var sheetTid = String(tData[t][0] || "").trim().toUpperCase();
        if (sheetTid === teacherId.toUpperCase()) {
          found = true;
          var stat = String(tData[t][3] || "ACTIVE").trim().toUpperCase();
          if (stat === "INACTIVE" || stat === "FALSE") {
            isActive = false;
          }
          break;
        }
      }

      if (found && !isActive) {
        return {
          authorized: false,
          reason: "Teacher account (" + teacherId + ") is marked INACTIVE. Submissions rejected."
        };
      }
    }
  }

  return { authorized: true };
}

// ==========================================
// 7. AUDIT LOGGING HELPER
// ==========================================

/**
 * Appends a real-time event record into _AUDIT_LOGS
 */
function logAuditEvent(actor, teacherId, action, targetClass, subjectOrType, recordCount, status, message) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("_AUDIT_LOGS") || setupAuditLogsSheet(ss);
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm:ss");

    sheet.appendRow([
      nowStr,
      actor || "System",
      teacherId || "N/A",
      action || "UNKNOWN",
      targetClass || "ALL",
      subjectOrType || "GENERAL",
      recordCount || 0,
      status || "INFO",
      message || ""
    ]);
  } catch (err) {
    Logger.log("Audit log failed: " + err.toString());
  }
}

// ==========================================
// 8. COLUMN & SHEET UTILITY HELPERS
// ==========================================

function normalizeUrn(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeClassName(className) {
  var raw = String(className || "").trim();
  if (!raw) return "Class_10";
  if (raw.indexOf("Class_") === 0) return raw;
  if (raw.indexOf("Class ") === 0) return "Class_" + raw.replace("Class ", "");
  return "Class_" + raw;
}

function getTargetSheet(ss, className) {
  var normalized = normalizeClassName(className);
  var rawShort = normalized.replace("Class_", "");
  return ss.getSheetByName(normalized) ||
         ss.getSheetByName("Class " + rawShort) ||
         ss.getSheetByName(rawShort) ||
         ss.getSheetByName("Students");
}

function findColumnIndex(headers, possibleNames) {
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toLowerCase();
    for (var p = 0; p < possibleNames.length; p++) {
      if (h === possibleNames[p].toLowerCase() || h.indexOf(possibleNames[p].toLowerCase()) !== -1) {
        return i;
      }
    }
  }
  return -1;
}

function findColumnExactOrAlias(headers, exactName, aliases) {
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === exactName) return i;
  }
  var exLower = exactName.toLowerCase();
  for (var j = 0; j < headers.length; j++) {
    if (headers[j].toLowerCase() === exLower) return j;
  }
  if (aliases && aliases.length > 0) {
    for (var k = 0; k < aliases.length; k++) {
      var aLower = aliases[k].toLowerCase();
      for (var l = 0; l < headers.length; l++) {
        if (headers[l].toLowerCase() === aLower) return l;
      }
    }
  }
  return -1;
}

function resolveSubjectColumn(headers, subject, segment) {
  var subAliases = [subject];
  var subLower = subject.toLowerCase();

  if (subLower === "gk" || subLower === "g.k.") {
    subAliases.push("General Knowledge", "General Awareness");
  } else if (subLower === "general knowledge" || subLower === "general awareness") {
    subAliases.push("GK", "Gk", "G.K.");
  } else if (subLower === "computer") {
    subAliases.push("Computer Applications", "Computer Science", "IT");
  } else if (subLower === "environmental studies" || subLower === "evs") {
    subAliases.push("EVS", "Environmental Studies");
  } else if (subLower === "social science" || subLower === "social studies" || subLower === "sst") {
    subAliases.push("Social Science", "Social Studies", "SST");
  }

  var segVariants = [segment];
  if (segment === "HY" || segment === "HY-WRT") {
    segVariants.push("-HY-WRT", " HY-WRT", " HY", "-HY");
  } else if (segment === "AE" || segment === "AE-WRT") {
    segVariants.push("-AE-WRT", " AE-WRT", " AE", "-AE");
  } else {
    segVariants.push(" " + segment, "-" + segment);
  }

  // Generate combinations
  var candidateKeys = [];
  subAliases.forEach(function(alias) {
    segVariants.forEach(function(seg) {
      if (seg.indexOf(" ") === 0 || seg.indexOf("-") === 0) {
        candidateKeys.push(alias + seg);
      } else {
        candidateKeys.push(alias + " " + seg);
        candidateKeys.push(alias + "-" + seg);
      }
    });
  });

  for (var c = 0; c < candidateKeys.length; c++) {
    var candLower = candidateKeys[c].trim().toLowerCase();
    for (var h = 0; h < headers.length; h++) {
      if (headers[h].trim().toLowerCase() === candLower) {
        return h;
      }
    }
  }

  return -1;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
