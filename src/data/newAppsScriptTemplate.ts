/**
 * Generates the complete, production-ready Google Apps Script backend code (v2.0)
 * designed specifically for the current Academic Hero system.
 */
export function getCompleteAppsScript(classConfigs?: Array<{ className: string; subjects: string[] }>): string {
  const configJson = classConfigs ? JSON.stringify(classConfigs, null, 2) : `[
  {
    "className": "Class_Nursery",
    "subjects": ["Drawing", "English", "General Awareness", "Gk", "Hindi", "Mathematics", "Sanskrit", "Urdu"]
  },
  {
    "className": "Class_LKG",
    "subjects": ["Drawing", "English", "General Awareness", "Gk", "Hindi", "Mathematics", "Sanskrit", "Urdu"]
  },
  {
    "className": "Class_UKG",
    "subjects": ["Drawing", "English", "General Awareness", "Gk", "Hindi", "Mathematics", "Table Book", "Sanskrit", "Urdu"]
  },
  {
    "className": "Class_1",
    "subjects": ["Computer", "English", "Environmental Studies", "Gk", "Hindi", "Mathematics", "Sanskrit", "Urdu"]
  },
  {
    "className": "Class_2",
    "subjects": ["Computer", "English", "Environmental Studies", "Gk", "Hindi", "Mathematics", "Sanskrit", "Urdu"]
  },
  {
    "className": "Class_3",
    "subjects": ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"]
  },
  {
    "className": "Class_4",
    "subjects": ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"]
  },
  {
    "className": "Class_5",
    "subjects": ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"]
  },
  {
    "className": "Class_6",
    "subjects": ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"]
  },
  {
    "className": "Class_7",
    "subjects": ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"]
  },
  {
    "className": "Class_8",
    "subjects": ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"]
  },
  {
    "className": "Class_9",
    "subjects": ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit", "Urdu"]
  },
  {
    "className": "Class_10",
    "subjects": ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit", "Urdu"]
  }
]`;

  return `/**
 * Peace International School - Complete Master Google Apps Script Backend (v2.0)
 * 
 * FEATURES:
 * - Authoritative URN lookup (Column C / Admission No)
 * - 13 Class tabs (Class_Nursery to Class_10)
 * - Half-Yearly (PT-1, PT-2, HY-WRT) and Annual (PT-3, PT-4, AE-WRT) assessment segments
 * - Central _TEACHERS registry with active status and allotment validation
 * - Central _SYSTEM_CONFIG for lock status and submission deadlines
 * - Central _AUDIT_LOGS for real-time mutation logging
 * - Non-destructive setupPeaceSchoolMasterWorkbook()
 * 
 * SETUP STEPS:
 * 1. Open Google Sheet > Extensions > Apps Script.
 * 2. Delete existing code, paste this entire script and save (Ctrl+S).
 * 3. Select 'setupPeaceSchoolMasterWorkbook' from dropdown and click 'Run' once.
 * 4. Click 'Deploy' > 'New deployment' > Web app.
 *    - Execute as: 'Me'
 *    - Who has access: 'Anyone'
 * 5. Copy the Web App URL and paste it into Academic Hero Settings!
 */

var SCHOOL_METADATA = {
  name: "Peace International School",
  subtitle: "Chakjado Dargabela, Vaishali, Bihar",
  academicSession: "2025-2026",
  version: "2.0.0"
};

var SCHOOL_CONFIG = ${configJson};

var BASE_PROFILE_HEADERS = [
  "S.No", "Roll No", "Admission No", "Student Name", "Father Name", "Mother Name",
  "DOB", "Gender", "Category", "Mobile No", "Optional Subject", "Photo URL"
];

function createPeaceSchoolWorkbook() {
  setupPeaceSchoolMasterWorkbook();
}

function setupPeaceSchoolMasterWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  SCHOOL_CONFIG.forEach(function(item) {
    var sheetName = item.className;
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

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

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
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

    var maxRows = Math.max(sheet.getMaxRows(), 50);
    var fullRange = sheet.getRange(1, 1, maxRows, headers.length);
    fullRange.setVerticalAlignment("middle");

    if (maxRows > 1) {
      sheet.getRange(2, 1, maxRows - 1, headers.length).setHorizontalAlignment("center");
      sheet.getRange(2, 4, maxRows - 1, 3).setHorizontalAlignment("left");
    }

    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(4);

    sheet.setColumnWidth(1, 55);   // S.No
    sheet.setColumnWidth(2, 70);   // Roll No
    sheet.setColumnWidth(3, 150);  // Admission No (URN)
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
      sheet.setColumnWidth(c, 115);
    }
  });

  setupTeachersSheet(ss);
  setupSystemConfigSheet(ss);
  setupAuditLogsSheet(ss);

  var msg = "Peace International School Master Workbook v2 is successfully configured!\\n\\n" +
            "✓ 13 Class sheets configured with authoritative URN columns\\n" +
            "✓ Central _TEACHERS registry tab active\\n" +
            "✓ Central _SYSTEM_CONFIG tab active\\n" +
            "✓ Central _AUDIT_LOGS tab active\\n" +
            "✓ Preserved all existing student and marks data rows safely.";
  
  try {
    SpreadsheetApp.getUi().alert("Setup Complete", msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(msg);
  }
}

function setupTeachersSheet(ss) {
  var sheet = ss.getSheetByName("_TEACHERS");
  if (!sheet) {
    sheet = ss.insertSheet("_TEACHERS");
  }

  var headers = [
    "Teacher ID", "Password", "Teacher Name", "Contact / Mobile", "Status",
    "Classes", "Sections", "Subjects", "Last Updated"
  ];

  var currentData = sheet.getDataRange().getValues();
  if (currentData.length < 1 || !currentData[0][0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var headerRow = currentData[0].map(function(h) { return String(h || "").trim().toLowerCase(); });
    var hasPassword = headerRow.some(function(h) { return h.indexOf("password") !== -1 || h.indexOf("pin") !== -1; });
    if (!hasPassword) {
      sheet.insertColumnAfter(1);
      sheet.getRange(1, 2).setValue("Password");
      if (currentData.length > 1) {
        var defaultVals = [];
        for (var p = 1; p < currentData.length; p++) {
          defaultVals.push(["123456"]);
        }
        sheet.getRange(2, 2, defaultVals.length, 1).setValues(defaultVals);
      }
    }
  }

  sheet.setRowHeight(1, 38);
  var colCount = sheet.getLastColumn() >= headers.length ? sheet.getLastColumn() : headers.length;
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setBackground("#1E293B");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 110); // Password
  sheet.setColumnWidth(3, 190);
  sheet.setColumnWidth(4, 140);
  sheet.setColumnWidth(5, 95);
  sheet.setColumnWidth(6, 180);
  sheet.setColumnWidth(7, 110);
  sheet.setColumnWidth(8, 280);
  sheet.setColumnWidth(9, 170);

  return sheet;
}

function setupSystemConfigSheet(ss) {
  var sheet = ss.getSheetByName("_SYSTEM_CONFIG");
  if (!sheet) {
    sheet = ss.insertSheet("_SYSTEM_CONFIG");
  }

  var headers = ["Key", "Value", "Description", "Last Updated"];
  var currentData = sheet.getDataRange().getValues();

  if (currentData.length < 1 || String(currentData[0][0]).trim() !== "Key") {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setRowHeight(1, 38);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#1E3A8A");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 380);
  sheet.setColumnWidth(4, 170);

  var updatedData = sheet.getDataRange().getValues();
  if (updatedData.length <= 1) {
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm");
    var defaultRows = [
      ["marksEntryStatus", "ON", "Global switch for marks entry submissions: ON or OFF", nowStr],
      ["marksEntryDeadline", "2026-12-31T23:59", "Final deadline timestamp (ISO) for marks and attendance submissions", nowStr],
      ["workingDaysHY", "110", "Total working days in Half Yearly academic term", nowStr],
      ["workingDaysAE", "115", "Total working days in Annual Exam academic term", nowStr],
      ["academicSession", "2025-2026", "Current academic year session", nowStr],
      ["adminPin", "9889", "Master Admin PIN synchronized across devices and browsers", nowStr],
      ["schoolName", "Peace International School", "Official institutional name", nowStr],
      ["schoolSubtitle", "Chakjado Dargabela, Vaishali, Bihar", "Campus location", nowStr]
    ];
    sheet.getRange(2, 1, defaultRows.length, headers.length).setValues(defaultRows);
  }

  return sheet;
}

function setupAuditLogsSheet(ss) {
  var sheet = ss.getSheetByName("_AUDIT_LOGS");
  if (!sheet) {
    sheet = ss.insertSheet("_AUDIT_LOGS");
  }

  var headers = [
    "Timestamp", "Actor", "Teacher ID", "Action", "Class",
    "Subject / Type", "Record Count", "Status", "Message"
  ];

  var currentData = sheet.getDataRange().getValues();
  if (currentData.length < 1 || String(currentData[0][0]).trim() !== "Timestamp") {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setRowHeight(1, 38);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#374151");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 170);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 180);
  sheet.setColumnWidth(7, 110);
  sheet.setColumnWidth(8, 110);
  sheet.setColumnWidth(9, 360);

  return sheet;
}

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

    if (action === "updateStudentDetails") {
      return handleUpdateStudentDetails(payload);
    }

    if (action === "deleteStudent") {
      return handleDeleteStudent(payload);
    }

    if (action === "saveTeachers" || action === "saveTeacherRegistry") {
      return handleSaveTeachers(payload);
    }

    if (action === "updateTeacherPassword") {
      return handleUpdateTeacherPassword(payload);
    }

    if (action === "updateSystemControl" || action === "saveSystemControl" || action === "saveSchoolConfig") {
      return handleSaveSchoolConfig(payload);
    }

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
      } else if (key === "adminPin") {
        sysConfig.adminPin = val;
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
  if (cfg.adminPin) keysToUpdate.adminPin = String(cfg.adminPin).trim();
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

function getTeachersData(ss) {
  var sheet = ss.getSheetByName("_TEACHERS") || setupTeachersSheet(ss);
  var data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return { accounts: [], allotments: [] };
  }

  var headerRow = data[0].map(function(h) { return String(h || "").trim().toLowerCase(); });
  var idCol = headerRow.indexOf("teacher id");
  if (idCol === -1) idCol = 0;

  var passCol = -1;
  for (var h = 0; h < headerRow.length; h++) {
    if (headerRow[h].indexOf("password") !== -1 || headerRow[h].indexOf("pin") !== -1) {
      passCol = h;
      break;
    }
  }

  var nameCol = -1;
  for (var h = 0; h < headerRow.length; h++) {
    if (headerRow[h].indexOf("teacher name") !== -1 || headerRow[h] === "name") {
      nameCol = h;
      break;
    }
  }
  if (nameCol === -1) nameCol = (passCol === 1 ? 2 : 1);

  var contactCol = -1;
  for (var h = 0; h < headerRow.length; h++) {
    if (headerRow[h].indexOf("contact") !== -1 || headerRow[h].indexOf("mobile") !== -1 || headerRow[h].indexOf("phone") !== -1) {
      contactCol = h;
      break;
    }
  }
  if (contactCol === -1) contactCol = (passCol === 1 ? 3 : 2);

  var statusCol = -1;
  for (var h = 0; h < headerRow.length; h++) {
    if (headerRow[h].indexOf("status") !== -1) {
      statusCol = h;
      break;
    }
  }
  if (statusCol === -1) statusCol = (passCol === 1 ? 4 : 3);

  var classesCol = -1;
  for (var h = 0; h < headerRow.length; h++) {
    if (headerRow[h].indexOf("class") !== -1) {
      classesCol = h;
      break;
    }
  }
  if (classesCol === -1) classesCol = (passCol === 1 ? 5 : 4);

  var sectionsCol = -1;
  for (var h = 0; h < headerRow.length; h++) {
    if (headerRow[h].indexOf("section") !== -1) {
      sectionsCol = h;
      break;
    }
  }
  if (sectionsCol === -1) sectionsCol = (passCol === 1 ? 6 : 5);

  var subjectsCol = -1;
  for (var h = 0; h < headerRow.length; h++) {
    if (headerRow[h].indexOf("subject") !== -1) {
      subjectsCol = h;
      break;
    }
  }
  if (subjectsCol === -1) subjectsCol = (passCol === 1 ? 7 : 6);

  var updatedCol = -1;
  for (var h = 0; h < headerRow.length; h++) {
    if (headerRow[h].indexOf("updated") !== -1 || headerRow[h].indexOf("date") !== -1) {
      updatedCol = h;
      break;
    }
  }
  if (updatedCol === -1) updatedCol = (passCol === 1 ? 8 : 7);

  var seenTeacherIds = {};
  var accounts = [];
  var allotments = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var teacherId = String(row[idCol] || "").trim();
    var teacherName = String(row[nameCol] || "").trim();
    if (!teacherId && !teacherName) continue;

    var cleanId = teacherId || ("TCH_" + r);
    var password = (passCol !== -1 && String(row[passCol] || "").trim()) ? String(row[passCol]).trim() : "123456";
    var contact = String(row[contactCol] || "").trim();
    var statusStr = String(row[statusCol] || "ACTIVE").trim().toUpperCase();
    var active = statusStr !== "INACTIVE" && statusStr !== "FALSE";

    var classesRaw = String(row[classesCol] || "").trim();
    var sectionsRaw = String(row[sectionsCol] || "").trim();
    var subjectsRaw = String(row[subjectsCol] || "").trim();
    var lastUpdated = String(row[updatedCol] || "").trim();

    if (!seenTeacherIds[cleanId]) {
      seenTeacherIds[cleanId] = true;
      accounts.push({
        id: "tch_acc_" + cleanId.replace(/[^a-zA-Z0-9]/g, "_"),
        teacherId: cleanId,
        teacherName: teacherName,
        password: password,
        contact: contact,
        active: active,
        updatedAt: lastUpdated || new Date().toISOString()
      });
    }

    var classList = classesRaw ? classesRaw.split(",").map(function(c) { return c.trim().replace("Class_", ""); }).filter(Boolean) : [];
    var secList = sectionsRaw ? sectionsRaw.split(",").map(function(s) { return s.trim(); }).filter(Boolean) : ["A"];
    var subList = subjectsRaw ? subjectsRaw.split(",").map(function(s) { return s.trim(); }).filter(Boolean) : [];

    if (classList.length > 0) {
      classList.forEach(function(cls, idx) {
        allotments.push({
          id: "allot_" + cleanId + "_" + cls + "_" + allotments.length,
          teacherId: cleanId,
          teacherName: teacherName,
          classLevel: cls,
          sections: secList.length > 0 ? secList : ["A"],
          subjects: subList,
          active: active
        });
      });
    } else {
      allotments.push({
        id: "allot_" + cleanId + "_" + allotments.length,
        teacherId: cleanId,
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

function handleSaveTeachers(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("_TEACHERS") || setupTeachersSheet(ss);

  var accounts = payload.teacherAccounts || payload.accounts || [];
  var allotments = payload.teacherAllotments || payload.allotments || [];

  var data = sheet.getDataRange().getValues();
  if (data.length > 0) {
    var headerRow = data[0].map(function(h) { return String(h || "").trim().toLowerCase(); });
    var hasPassword = headerRow.some(function(h) { return h.indexOf("password") !== -1 || h.indexOf("pin") !== -1; });
    if (!hasPassword) {
      sheet.insertColumnAfter(1);
      sheet.getRange(1, 2).setValue("Password");
    }
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn() >= 9 ? sheet.getLastColumn() : 9;
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
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

    var password = (acc.password && String(acc.password).trim()) ? String(acc.password).trim() : "123456";

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
      password,
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
    sheet.getRange(2, 1, rowsToWrite.length, 9).setValues(rowsToWrite);
    sheet.getRange(2, 1, rowsToWrite.length, 9).setHorizontalAlignment("center");
    sheet.getRange(2, 3, rowsToWrite.length, 1).setHorizontalAlignment("left");
    sheet.getRange(2, 8, rowsToWrite.length, 1).setHorizontalAlignment("left");
  }

  logAuditEvent("Admin", "ADMIN", "SAVE_TEACHERS", "ALL", "TEACHERS", rowsToWrite.length, "SUCCESS", "Synchronized " + rowsToWrite.length + " teachers to _TEACHERS tab.");

  return jsonResponse({
    status: "success",
    success: true,
    savedCount: rowsToWrite.length,
    message: "Successfully synchronized " + rowsToWrite.length + " teacher accounts to Google Sheet (_TEACHERS)."
  });
}

function handleUpdateTeacherPassword(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("_TEACHERS") || setupTeachersSheet(ss);

  var targetId = String(payload.teacherId || "").trim().toUpperCase();
  var newPassword = String(payload.newPassword || "").trim();

  if (!targetId || !newPassword) {
    return jsonResponse({
      status: "error",
      success: false,
      message: "Teacher ID and New Password are required."
    });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return jsonResponse({
      status: "error",
      success: false,
      message: "No teachers found in _TEACHERS sheet."
    });
  }

  var headerRow = data[0].map(function(h) { return String(h || "").trim().toLowerCase(); });
  var idCol = headerRow.indexOf("teacher id");
  if (idCol === -1) idCol = 0;

  var passCol = -1;
  for (var h = 0; h < headerRow.length; h++) {
    if (headerRow[h].indexOf("password") !== -1 || headerRow[h].indexOf("pin") !== -1) {
      passCol = h;
      break;
    }
  }

  if (passCol === -1) {
    sheet.insertColumnAfter(1);
    sheet.getRange(1, 2).setValue("Password");
    passCol = 1;
  }

  var updated = false;
  for (var r = 1; r < data.length; r++) {
    var curId = String(data[r][idCol] || "").trim().toUpperCase();
    if (curId === targetId) {
      sheet.getRange(r + 1, passCol + 1).setValue(newPassword);
      var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm");
      var updatedCol = -1;
      for (var u = 0; u < headerRow.length; u++) {
        if (headerRow[u].indexOf("updated") !== -1) {
          updatedCol = u;
          break;
        }
      }
      if (updatedCol !== -1) {
        sheet.getRange(r + 1, updatedCol + 1).setValue(nowStr);
      }
      updated = true;
      break;
    }
  }

  if (updated) {
    logAuditEvent("Teacher", targetId, "UPDATE_PASSWORD", "TEACHERS", targetId, 1, "SUCCESS", "Teacher " + targetId + " updated their password.");
    return jsonResponse({
      status: "success",
      success: true,
      message: "Password for Teacher " + targetId + " updated successfully in Google Sheet (_TEACHERS)."
    });
  } else {
    return jsonResponse({
      status: "error",
      success: false,
      message: "Teacher ID " + targetId + " not found in _TEACHERS sheet."
    });
  }
}

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
  if (urnCol === -1) urnCol = 2;

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
  if (urnCol === -1) urnCol = 2;

  var rollCol = findColumnIndex(headers, ["roll", "roll no", "roll number", "sr", "sl", "rollno"]);
  if (rollCol === -1) rollCol = 1;

  var nameCol = findColumnIndex(headers, ["student name", "name", "student_name", "candidate name"]);
  if (nameCol === -1) nameCol = 3;

  var fatherCol = findColumnIndex(headers, ["father name", "father's name", "father"]);
  if (fatherCol === -1) fatherCol = 4;

  var motherCol = findColumnIndex(headers, ["mother name", "mother's name", "mother"]);
  if (motherCol === -1) motherCol = 5;

  var dobCol = findColumnIndex(headers, ["dob", "date of birth", "birth date"]);
  if (dobCol === -1) dobCol = 6;

  var genderCol = findColumnIndex(headers, ["gender", "sex"]);
  if (genderCol === -1) genderCol = 7;

  var categoryCol = findColumnIndex(headers, ["category", "caste"]);
  if (categoryCol === -1) categoryCol = 8;

  var mobileCol = findColumnIndex(headers, ["mobile", "phone", "contact"]);
  if (mobileCol === -1) mobileCol = 9;

  var optCol = findColumnIndex(headers, ["optional subject", "optional", "3rd language", "third language", "2nd language"]);
  if (optCol === -1) optCol = 10;

  var photoCol = findColumnIndex(headers, ["photo url", "photo", "photo link", "drive link", "student photo", "picture"]);
  if (photoCol === -1) photoCol = 11;

  var metaIndices = [urnCol, rollCol, nameCol, fatherCol, motherCol, dobCol, genderCol, categoryCol, mobileCol, optCol, photoCol];
  if (headers[0] && headers[0].toLowerCase().indexOf("sl") !== -1) {
    metaIndices.push(0);
  }

  var students = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var roll = row[rollCol];
    var name = row[nameCol];
    if (!roll && !name) continue;

    var urn = normalizeUrn(row[urnCol]);
    if (!urn) {
      urn = "PIS-2025-" + normalizeClassName(targetClass).replace("Class_", "").toUpperCase() + "-" + ("00" + (roll || r)).slice(-3);
    }

    var rawMarks = {};
    var attHY = "";
    var attAE = "";

    for (var c = 0; c < headers.length; c++) {
      var header = headers[c];
      if (!header) continue;
      var hLower = header.toLowerCase();

      if (hLower === "attendance-hy" || hLower === "attendance_hy" || hLower === "hy attendance") {
        attHY = (row[c] !== undefined && row[c] !== null && row[c] !== "") ? String(row[c]) : "";
      } else if (hLower === "attendance-ae" || hLower === "attendance_ae" || hLower === "ae attendance") {
        attAE = (row[c] !== undefined && row[c] !== null && row[c] !== "") ? String(row[c]) : "";
      } else if (metaIndices.indexOf(c) === -1) {
        var val = row[c];
        if (val !== undefined && val !== null && val !== "") {
          var key = header.replace(/\\s+/g, "_").replace(/-/g, "_");
          rawMarks[key] = val;
          rawMarks[header] = val;
        }
      }
    }

    students.push({
      roll: roll !== undefined && roll !== "" ? (parseInt(roll, 10) || roll) : r,
      urn: urn,
      admNo: urn,
      name: name !== undefined ? String(name).trim() : "",
      fatherName: (fatherCol !== -1 && row[fatherCol] !== undefined) ? String(row[fatherCol]).trim() : "",
      motherName: (motherCol !== -1 && row[motherCol] !== undefined) ? String(row[motherCol]).trim() : "",
      dob: (dobCol !== -1 && row[dobCol] !== undefined) ? String(row[dobCol]).trim() : "",
      gender: (genderCol !== -1 && row[genderCol] !== undefined) ? String(row[genderCol]).trim() : "",
      category: (categoryCol !== -1 && row[categoryCol] !== undefined) ? String(row[categoryCol]).trim() : "",
      studentClass: normalizeClassName(targetClass).replace("Class_", ""),
      section: "A",
      mobile: (mobileCol !== -1 && row[mobileCol] !== undefined) ? String(row[mobileCol]).trim() : "",
      optionalSubject: (optCol !== -1 && row[optCol] !== undefined) ? String(row[optCol]).trim() : "",
      photoUrl: (photoCol !== -1 && row[photoCol] !== undefined) ? String(row[photoCol]).trim() : "",
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

function handleSaveMarks(records, fullPayload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

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
    if (urnCol === -1) urnCol = 2;

    var urnToRow = {};
    for (var r = 1; r < data.length; r++) {
      var rowUrn = normalizeUrn(data[r][urnCol]);
      if (rowUrn) {
        urnToRow[rowUrn] = r + 1;
      }
    }

    var classItems = recordsByClass[targetCls];
    for (var j = 0; j < classItems.length; j++) {
      var item = classItems[j];
      var targetUrn = normalizeUrn(item.urn || item.admNo || item["Admission No"] || item["Admission Number"] || item.URN);

      if (!targetUrn) {
        errors.push("Missing authoritative URN in record " + (j + 1));
        continue;
      }

      var targetRow = urnToRow[targetUrn];
      if (!targetRow) {
        errors.push("Student URN '" + targetUrn + "' not found in " + targetCls);
        continue;
      }

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

function verifyServerAuthorization(ss, role, teacherId, records) {
  if (role === "admin") {
    return { authorized: true };
  }

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
`;
}
