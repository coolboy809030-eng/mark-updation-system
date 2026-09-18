import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Complete subject specifications matching current frontend
const SUBJECTS_BY_CLASS: Record<string, string[]> = {
  'Nursery': ["Drawing", "English", "General Awareness", "Gk", "Hindi", "Mathematics", "Sanskrit", "Urdu"],
  'LKG': ["Drawing", "English", "General Awareness", "Gk", "Hindi", "Mathematics", "Sanskrit", "Urdu"],
  'UKG': ["Drawing", "English", "General Awareness", "Gk", "Hindi", "Mathematics", "Table Book", "Sanskrit", "Urdu"],
  '1': ["Computer", "English", "Environmental Studies", "Gk", "Hindi", "Mathematics", "Sanskrit", "Urdu"],
  '2': ["Computer", "English", "Environmental Studies", "Gk", "Hindi", "Mathematics", "Sanskrit", "Urdu"],
  '3': ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"],
  '4': ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"],
  '5': ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"],
  '6': ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"],
  '7': ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"],
  '8': ["Computer", "English", "Gk", "Hindi", "Mathematics", "Science", "Social Studies", "Sanskrit", "Urdu"],
  '9': ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit", "Urdu"],
  '10': ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit", "Urdu"]
};

const ALL_CLASSES = [
  'Nursery', 'LKG', 'UKG',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
];

const BASE_PROFILE_HEADERS = [
  "S.No", "Roll No", "Admission No", "Student Name", "Father Name", "Mother Name",
  "DOB", "Gender", "Category", "Mobile No", "Optional Subject", "Photo URL"
];

// Sample students per class
const SAMPLE_STUDENTS: Record<string, Array<{ roll: number; name: string; father: string; opt: string; gender: string }>> = {
  'Nursery': [
    { roll: 1, name: 'Ayaan Ali', father: 'MD SULTAN', opt: 'Urdu', gender: 'Male' },
    { roll: 2, name: 'Fatima Zohra', father: 'MOHD TARIQUE', opt: 'Urdu', gender: 'Female' },
    { roll: 3, name: 'Mohammad Zaid', father: 'NASIR ALAM', opt: 'Urdu', gender: 'Male' },
    { roll: 4, name: 'Ayesha Siddiqua', father: 'FAROOQUE AZAM', opt: 'Urdu', gender: 'Female' },
    { roll: 5, name: 'Rayyan Khan', father: 'ARIF KHAN', opt: 'Urdu', gender: 'Male' }
  ],
  'LKG': [
    { roll: 1, name: 'Arshlan Haider', father: 'HAIDER ALI', opt: 'Urdu', gender: 'Male' },
    { roll: 2, name: 'Anabia Fatima', father: 'SHABBIR ALAM', opt: 'Urdu', gender: 'Female' },
    { roll: 3, name: 'Zainab Bano', father: 'MUMTAZ ANSARI', opt: 'Urdu', gender: 'Female' },
    { roll: 4, name: 'Sameer Abbas', father: 'ASIF ABBAS', opt: 'Urdu', gender: 'Male' },
    { roll: 5, name: 'Hafsa Rahman', father: 'ABDUR RAHMAN', opt: 'Urdu', gender: 'Female' }
  ],
  'UKG': [
    { roll: 1, name: 'Afnan Farooqi', father: 'FAROOQUE ALAM', opt: 'Urdu', gender: 'Male' },
    { roll: 2, name: 'Bushra Khatoon', father: 'MANZOOR ALAM', opt: 'Urdu', gender: 'Female' },
    { roll: 3, name: 'Hamza Bilal', father: 'BILAL AHMAD', opt: 'Urdu', gender: 'Male' },
    { roll: 4, name: 'Khadija Tul Kubra', father: 'SOHAIL AKHTAR', opt: 'Urdu', gender: 'Female' },
    { roll: 5, name: 'Mustafa Kamal', father: 'KAMALUDDIN', opt: 'Urdu', gender: 'Male' }
  ],
  '1': [
    { roll: 1, name: 'Adil Hussain', father: 'ZAKIR HUSSAIN', opt: 'Urdu', gender: 'Male' },
    { roll: 2, name: 'Aman Kumar', father: 'RAMESHWAR PRASAD', opt: 'Sanskrit', gender: 'Male' },
    { roll: 3, name: 'Anaya Sharma', father: 'SANJAY SHARMA', opt: 'Sanskrit', gender: 'Female' },
    { roll: 4, name: 'Arbaaz Khan', father: 'JAVED KHAN', opt: 'Urdu', gender: 'Male' },
    { roll: 5, name: 'Gulafsha Parween', father: 'MOIZUDDIN', opt: 'Urdu', gender: 'Female' }
  ],
  '2': [
    { roll: 1, name: 'Alina Siddiqui', father: 'AFROZ SIDDIQUI', opt: 'Urdu', gender: 'Female' },
    { roll: 2, name: 'Anmol Kumar', father: 'DINESH RAY', opt: 'Sanskrit', gender: 'Male' },
    { roll: 3, name: 'Arman Ansari', father: 'IMTIYAZ ANSARI', opt: 'Urdu', gender: 'Male' },
    { roll: 4, name: 'Divya Kumari', father: 'VINOD SINGH', opt: 'Sanskrit', gender: 'Female' },
    { roll: 5, name: 'Faizan Raza', father: 'GULAM RAZA', opt: 'Urdu', gender: 'Male' }
  ],
  '3': [
    { roll: 1, name: 'Abdul Samad', father: 'ABDUL JABBAR', opt: 'Urdu', gender: 'Male' },
    { roll: 2, name: 'Abhishek Kumar', father: 'SURESH PRASAD', opt: 'Sanskrit', gender: 'Male' },
    { roll: 3, name: 'Alfiya Tabassum', father: 'MUKHTAR ALAM', opt: 'Urdu', gender: 'Female' },
    { roll: 4, name: 'Aryan Raj', father: 'KISHORE KUMAR', opt: 'Sanskrit', gender: 'Male' },
    { roll: 5, name: 'Farhan Akhtar', father: 'JAVED AKHTAR', opt: 'Urdu', gender: 'Male' }
  ],
  '4': [
    { roll: 1, name: 'Akib Javed', father: 'JAVED IQBAL', opt: 'Urdu', gender: 'Male' },
    { roll: 2, name: 'Anjali Sharma', father: 'VIJAY SHARMA', opt: 'Sanskrit', gender: 'Female' },
    { roll: 3, name: 'Danish Khan', father: 'SHAHNAWAZ KHAN', opt: 'Urdu', gender: 'Male' },
    { roll: 4, name: 'Harsh Vardhan', father: 'SANJAY SINGH', opt: 'Sanskrit', gender: 'Male' },
    { roll: 5, name: 'Iqra Perween', father: 'IRSHAD ALAM', opt: 'Urdu', gender: 'Female' }
  ],
  '5': [
    { roll: 1, name: 'Aamir Sohail', father: 'SOHAIL KHAN', opt: 'Urdu', gender: 'Male' },
    { roll: 2, name: 'Aditya Kumar', father: 'NANDKISHOR RAY', opt: 'Sanskrit', gender: 'Male' },
    { roll: 3, name: 'Falak Naz', father: 'GULZAR AHMAD', opt: 'Urdu', gender: 'Female' },
    { roll: 4, name: 'Himanshu Raj', father: 'AJAY KUMAR', opt: 'Sanskrit', gender: 'Male' },
    { roll: 5, name: 'Muddassir Ali', father: 'LIAQAT ALI', opt: 'Urdu', gender: 'Male' }
  ],
  '6': [
    { roll: 1, name: 'Altamash Raza', father: 'NASIM REZA', opt: 'Urdu', gender: 'Male' },
    { roll: 2, name: 'Anushka Roy', father: 'ASHOK ROY', opt: 'Sanskrit', gender: 'Female' },
    { roll: 3, name: 'Fuzail Ahmad', father: 'JAMSHED AHMAD', opt: 'Urdu', gender: 'Male' },
    { roll: 4, name: 'Kunal Kumar', father: 'BINOD KUMAR', opt: 'Sanskrit', gender: 'Male' },
    { roll: 5, name: 'Mehwish Fatima', father: 'FIROZ ALAM', opt: 'Urdu', gender: 'Female' }
  ],
  '7': [
    { roll: 1, name: 'Adeeba Noori', father: 'NOORUL HODA', opt: 'Urdu', gender: 'Female' },
    { roll: 2, name: 'Aman Raj', father: 'KRISHNA MURARI', opt: 'Sanskrit', gender: 'Male' },
    { roll: 3, name: 'Bilal Khan', father: 'SHAHID KHAN', opt: 'Urdu', gender: 'Male' },
    { roll: 4, name: 'Deepak Kumar', father: 'RAM BILAS', opt: 'Sanskrit', gender: 'Male' },
    { roll: 5, name: 'Hasnain Raza', father: 'MUMTAZ ALI', opt: 'Urdu', gender: 'Male' }
  ],
  '8': [
    { roll: 1, name: 'Aamir Hussain', father: 'ABID HUSSAIN', opt: 'Urdu', gender: 'Male' },
    { roll: 2, name: 'Avinash Kumar', father: 'SHIV KUMAR', opt: 'Sanskrit', gender: 'Male' },
    { roll: 3, name: 'Darakhshan Anjum', father: 'SAMIULLAH', opt: 'Urdu', gender: 'Female' },
    { roll: 4, name: 'Gautam Pandey', father: 'MAHESH PANDEY', opt: 'Sanskrit', gender: 'Male' },
    { roll: 5, name: 'Irfan Habib', father: 'HABIBUR RAHMAN', opt: 'Urdu', gender: 'Male' }
  ],
  '9': [
    { roll: 1, name: 'Arif Raza Khan', father: 'ARSHAD KHAN', opt: 'Urdu', gender: 'Male' },
    { roll: 2, name: 'Chandan Kumar', father: 'UPENDRA RAY', opt: 'Sanskrit', gender: 'Male' },
    { roll: 3, name: 'Danish Alam', father: 'MANSUR ALAM', opt: 'Urdu', gender: 'Male' },
    { roll: 4, name: 'Komal Kumari', father: 'SHAMBHU NATH', opt: 'Sanskrit', gender: 'Female' },
    { roll: 5, name: 'Md Shadab', father: 'JAMALUDDIN', opt: 'Urdu', gender: 'Male' }
  ],
  '10': [
    { roll: 1, name: 'Abdur Rahim', father: 'ABDUL KARIM', opt: 'Urdu', gender: 'Male' },
    { roll: 2, name: 'Alok Kumar', father: 'VIJAY PRASAD', opt: 'Sanskrit', gender: 'Male' },
    { roll: 3, name: 'Farheen Naz', father: 'ASRAR AHMAD', opt: 'Urdu', gender: 'Female' },
    { roll: 4, name: 'Gaurav Anand', father: 'PARMANAND SINGH', opt: 'Sanskrit', gender: 'Male' },
    { roll: 5, name: 'Junaid Khan', father: 'SHAHID KHAN', opt: 'Urdu', gender: 'Male' }
  ]
};

function generateWorkbook() {
  const wb = XLSX.utils.book_new();

  // 1. Generate 13 Class sheets
  ALL_CLASSES.forEach((cls) => {
    const subs = SUBJECTS_BY_CLASS[cls] || [];
    const headers = [...BASE_PROFILE_HEADERS];

    // Append 6 segments for each subject
    subs.forEach((sub) => {
      headers.push(`${sub} PT-1`);
      headers.push(`${sub} PT-2`);
      headers.push(`${sub}-HY-WRT`);
      headers.push(`${sub} PT-3`);
      headers.push(`${sub} PT-4`);
      headers.push(`${sub}-AE-WRT`);
    });

    // Attendance columns
    headers.push("Attendance-HY");
    headers.push("Attendance-AE");

    const data: any[][] = [headers];

    // Add 5 sample students
    const sampleList = SAMPLE_STUDENTS[cls] || [];
    sampleList.forEach((st) => {
      const urnCode = String(st.roll).padStart(3, '0');
      const urn = `PIS-2025-${cls.toUpperCase()}-${urnCode}`;
      const row: any[] = [
        st.roll, // S.No
        st.roll, // Roll No
        urn,     // Admission No (Authoritative URN)
        st.name, // Student Name
        st.father, // Father Name
        'MOTHER',  // Mother Name
        '15/07/2014', // DOB
        st.gender,    // Gender
        'General',    // Category
        '9835100000', // Mobile No
        st.opt,       // Optional Subject (Urdu or Sanskrit)
        ''            // Photo URL
      ];

      // Sample marks: realistic values (e.g. 18/20, 19/20, 68/80)
      subs.forEach((sub) => {
        // If optional subject is not chosen for this student, leave blank
        const isOpt = (sub === 'Sanskrit' || sub === 'Urdu');
        if (isOpt && sub !== st.opt) {
          row.push('', '', '', '', '', '');
        } else {
          row.push('18', '19', '68', '17', '18', '72');
        }
      });

      // Attendance sample
      row.push('98/110', '104/115');

      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    const colWidths: { wch: number }[] = [
      { wch: 8 },  // S.No
      { wch: 10 }, // Roll No
      { wch: 24 }, // Admission No (URN)
      { wch: 22 }, // Student Name
      { wch: 22 }, // Father Name
      { wch: 20 }, // Mother Name
      { wch: 14 }, // DOB
      { wch: 10 }, // Gender
      { wch: 12 }, // Category
      { wch: 14 }, // Mobile No
      { wch: 18 }, // Optional Subject
      { wch: 16 }  // Photo URL
    ];
    for (let c = 12; c < headers.length; c++) {
      colWidths.push({ wch: 18 });
    }
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, `Class_${cls}`);
  });

  // 2. Central _TEACHERS Sheet
  const teacherHeaders = [
    "Teacher ID",
    "Teacher Name",
    "Contact / Mobile",
    "Status",
    "Classes",
    "Sections",
    "Subjects",
    "Last Updated"
  ];
  const teacherRows = [
    teacherHeaders,
    ["TCH001", "Mohammad Zaid", "9835100001", "ACTIVE", "Class_9, Class_10", "A", "Mathematics, Science", "2025-04-01 10:00 AM"],
    ["TCH002", "Aisha Siddiqua", "9835100002", "ACTIVE", "Class_6, Class_7, Class_8", "A", "English, Social Studies", "2025-04-01 10:00 AM"],
    ["TCH003", "Rameshwar Prasad", "9835100003", "ACTIVE", "Class_1, Class_2, Class_3, Class_4, Class_5", "A", "Hindi, Sanskrit", "2025-04-01 10:00 AM"],
    ["TCH004", "Farhan Akhtar", "9835100004", "ACTIVE", "Class_Nursery, Class_LKG, Class_UKG, Class_1, Class_2", "A", "Urdu", "2025-04-01 10:00 AM"],
    ["TCH005", "Nasir Alam", "9835100005", "ACTIVE", "Class_3, Class_4, Class_5, Class_6, Class_7, Class_8", "A", "Computer", "2025-04-01 10:00 AM"],
    ["TCH006", "Sultana Begum", "9835100006", "INACTIVE", "Class_1", "A", "Drawing", "2025-04-01 10:00 AM"]
  ];
  const wsTeachers = XLSX.utils.aoa_to_sheet(teacherRows);
  wsTeachers['!cols'] = [
    { wch: 14 }, // Teacher ID
    { wch: 22 }, // Teacher Name
    { wch: 18 }, // Contact
    { wch: 12 }, // Status
    { wch: 26 }, // Classes
    { wch: 12 }, // Sections
    { wch: 30 }, // Subjects
    { wch: 22 }  // Last Updated
  ];
  XLSX.utils.book_append_sheet(wb, wsTeachers, "_TEACHERS");

  // 3. Central _SYSTEM_CONFIG Sheet
  const configHeaders = ["Key", "Value", "Description", "Last Updated"];
  const configRows = [
    configHeaders,
    ["marksEntryStatus", "ON", "Global switch for marks entry submissions: ON or OFF", "2025-04-01 10:00 AM"],
    ["marksEntryDeadline", "2026-12-31T23:59", "Final deadline timestamp (ISO) for marks and attendance submissions", "2025-04-01 10:00 AM"],
    ["workingDaysHY", "110", "Total working days in Half Yearly academic term", "2025-04-01 10:00 AM"],
    ["workingDaysAE", "115", "Total working days in Annual Exam academic term", "2025-04-01 10:00 AM"],
    ["academicSession", "2025-2026", "Current academic year session", "2025-04-01 10:00 AM"],
    ["schoolName", "Peace International School", "Official institutional name", "2025-04-01 10:00 AM"],
    ["schoolSubtitle", "Chakjado Dargabela, Vaishali, Bihar", "Campus location", "2025-04-01 10:00 AM"]
  ];
  const wsConfig = XLSX.utils.aoa_to_sheet(configRows);
  wsConfig['!cols'] = [
    { wch: 24 }, // Key
    { wch: 26 }, // Value
    { wch: 45 }, // Description
    { wch: 22 }  // Last Updated
  ];
  XLSX.utils.book_append_sheet(wb, wsConfig, "_SYSTEM_CONFIG");

  // 4. Central _AUDIT_LOGS Sheet
  const auditHeaders = [
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
  const auditRows = [
    auditHeaders,
    [
      "2025-04-01 10:00 AM",
      "System Admin",
      "ADMIN",
      "SYSTEM_INIT",
      "ALL",
      "ALL",
      0,
      "SUCCESS",
      "Peace International School Master Workbook v2 initialized successfully."
    ]
  ];
  const wsAudit = XLSX.utils.aoa_to_sheet(auditRows);
  wsAudit['!cols'] = [
    { wch: 22 }, // Timestamp
    { wch: 18 }, // Actor
    { wch: 14 }, // Teacher ID
    { wch: 20 }, // Action
    { wch: 14 }, // Class
    { wch: 22 }, // Subject / Type
    { wch: 14 }, // Record Count
    { wch: 14 }, // Status
    { wch: 45 }  // Message
  ];
  XLSX.utils.book_append_sheet(wb, wsAudit, "_AUDIT_LOGS");

  // Ensure public directory exists
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write file
  const outPath1 = path.join(publicDir, 'Peace_International_School_Master_Workbook_v2.xlsx');
  const outPath2 = path.join(publicDir, 'Peace_International_School_Complete_Master_Workbook.xlsx');
  XLSX.writeFile(wb, outPath1);
  XLSX.writeFile(wb, outPath2);

  console.log(`Generated master workbook at ${outPath1} and ${outPath2}`);
}

generateWorkbook();
