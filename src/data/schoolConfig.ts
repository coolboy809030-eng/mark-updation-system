import { ClassLevel, Student } from '../types';
import { getAcademicSession } from '../utils/resultCalculator';

export const SCHOOL_NAME = 'Peace International School';
export const SCHOOL_SUBTITLE = 'Chakjado Dargabela, Vaishali, Bihar';
export const ACADEMIC_SESSION = getAcademicSession();

// Universal Master Admin PIN for Peace International School
export const MASTER_ADMIN_PIN = '9889';

export const SUBJECTS_BY_CLASS: Record<ClassLevel, string[]> = {
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

export const SEGMENTS_BY_EXAM_TYPE = {
  'HY': ['PT-1', 'PT-2', 'HY'] as const,
  'AN': ['PT-3', 'PT-4', 'AE'] as const
};

export const DEFAULT_STUDENTS_BY_CLASS: Record<ClassLevel, Student[]> = {
  'Nursery': [
    { roll: '1', name: 'Ayaan Ali', fatherName: 'MD SULTAN', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Fatima Zohra', fatherName: 'MOHD TARIQUE', optionalSubject: 'Urdu' },
    { roll: '3', name: 'Mohammad Zaid', fatherName: 'NASIR ALAM', optionalSubject: 'Urdu' },
    { roll: '4', name: 'Ayesha Siddiqua', fatherName: 'FAROOQUE AZAM', optionalSubject: 'Urdu' },
    { roll: '5', name: 'Rayyan Khan', fatherName: 'ARIF KHAN', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Zoya Parveen', fatherName: 'SHAHID HUSSAIN', optionalSubject: 'Urdu' },
    { roll: '7', name: 'Arham Raza', fatherName: 'SALMAN RAZA', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Inaya Fatima', fatherName: 'WAHEED AKHTAR', optionalSubject: 'Urdu' },
    { roll: '9', name: 'Kabir Ahmad', fatherName: 'IQBAL AHMAD', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Sara Noori', fatherName: 'NOOR HASSAN', optionalSubject: 'Urdu' }
  ],
  'LKG': [
    { roll: '1', name: 'Arshlan Haider', fatherName: 'HAIDER ALI', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Anabia Fatima', fatherName: 'SHABBIR ALAM', optionalSubject: 'Urdu' },
    { roll: '3', name: 'Zainab Bano', fatherName: 'MUMTAZ ANSARI', optionalSubject: 'Urdu' },
    { roll: '4', name: 'Sameer Abbas', fatherName: 'ASIF ABBAS', optionalSubject: 'Urdu' },
    { roll: '5', name: 'Hafsa Rahman', fatherName: 'ABDUR RAHMAN', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Rehan Qureshi', fatherName: 'JAMEEL QURESHI', optionalSubject: 'Urdu' },
    { roll: '7', name: 'Areeba Noor', fatherName: 'NOOR MOHAMMAD', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Taha Mustafa', fatherName: 'MUSTAFA KAMAL', optionalSubject: 'Urdu' },
    { roll: '9', name: 'Aliza Khan', fatherName: 'SHAMSHER KHAN', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Danish Reza', fatherName: 'SHAKIL REZA', optionalSubject: 'Urdu' }
  ],
  'UKG': [
    { roll: '1', name: 'Afnan Farooqi', fatherName: 'FAROOQUE ALAM', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Bushra Khatoon', fatherName: 'MANZOOR ALAM', optionalSubject: 'Urdu' },
    { roll: '3', name: 'Hamza Bilal', fatherName: 'BILAL AHMAD', optionalSubject: 'Urdu' },
    { roll: '4', name: 'Khadija Tul Kubra', fatherName: 'SOHAIL AKHTAR', optionalSubject: 'Urdu' },
    { roll: '5', name: 'Mustafa Kamal', fatherName: 'KAMALUDDIN', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Nabila Parveen', fatherName: 'NAEEM HUSSAIN', optionalSubject: 'Urdu' },
    { roll: '7', name: 'Umar Farooq', fatherName: 'FAROOQ AZAM', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Zohaib Hassan', fatherName: 'HASSAN RAZA', optionalSubject: 'Urdu' },
    { roll: '9', name: 'Sumaiya Bano', fatherName: 'SULTAN AHMAD', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Zeeshan Ali', fatherName: 'ALI ASGHAR', optionalSubject: 'Urdu' }
  ],
  '1': [
    { roll: '1', name: 'Adil Hussain', fatherName: 'ZAKIR HUSSAIN', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Aman Kumar', fatherName: 'RAMESHWAR PRASAD', optionalSubject: 'Sanskrit' },
    { roll: '3', name: 'Anaya Sharma', fatherName: 'SANJAY SHARMA', optionalSubject: 'Sanskrit' },
    { roll: '4', name: 'Arbaaz Khan', fatherName: 'JAVED KHAN', optionalSubject: 'Urdu' },
    { roll: '5', name: 'Gulafsha Parween', fatherName: 'MOIZUDDIN', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Priya Kumari', fatherName: 'RAKESH KUMAR', optionalSubject: 'Sanskrit' },
    { roll: '7', name: 'Saif Ali', fatherName: 'SHOUKAT ALI', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Shivam Singh', fatherName: 'ANIL SINGH', optionalSubject: 'Sanskrit' },
    { roll: '9', name: 'Tasneem Kausar', fatherName: 'ALIMUDDIN', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Vivek Raj', fatherName: 'MANOJ PRASAD', optionalSubject: 'Sanskrit' },
    { roll: '11', name: 'Yusuf Jamal', fatherName: 'JAMAL AKHTAR', optionalSubject: 'Urdu' },
    { roll: '12', name: 'Zoya Fatima', fatherName: 'NAUSHAD ALAM', optionalSubject: 'Urdu' }
  ],
  '2': [
    { roll: '1', name: 'Alina Siddiqui', fatherName: 'AFROZ SIDDIQUI', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Anmol Kumar', fatherName: 'DINESH RAY', optionalSubject: 'Sanskrit' },
    { roll: '3', name: 'Arman Ansari', fatherName: 'IMTIYAZ ANSARI', optionalSubject: 'Urdu' },
    { roll: '4', name: 'Divya Kumari', fatherName: 'VINOD SINGH', optionalSubject: 'Sanskrit' },
    { roll: '5', name: 'Faizan Raza', fatherName: 'GULAM RAZA', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Kavita Roy', fatherName: 'RAJESH ROY', optionalSubject: 'Sanskrit' },
    { roll: '7', name: 'Mohsin Khan', fatherName: 'ASLAM KHAN', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Neha Gupta', fatherName: 'SUNIL GUPTA', optionalSubject: 'Sanskrit' },
    { roll: '9', name: 'Rayan Hashmi', fatherName: 'HASHIM RAZA', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Sana Parveen', fatherName: 'KALIMUDDIN', optionalSubject: 'Urdu' }
  ],
  '3': [
    { roll: '1', name: 'Abdul Samad', fatherName: 'ABDUL JABBAR', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Abhishek Kumar', fatherName: 'SURESH PRASAD', optionalSubject: 'Sanskrit' },
    { roll: '3', name: 'Alfiya Tabassum', fatherName: 'MUKHTAR ALAM', optionalSubject: 'Urdu' },
    { roll: '4', name: 'Aryan Raj', fatherName: 'KISHORE KUMAR', optionalSubject: 'Sanskrit' },
    { roll: '5', name: 'Farhan Akhtar', fatherName: 'JAVED AKHTAR', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Khushi Kumari', fatherName: 'PRADEEP PASWAN', optionalSubject: 'Sanskrit' },
    { roll: '7', name: 'Md Kaif', fatherName: 'MAQSOOD ALAM', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Roshni Verma', fatherName: 'SATISH VERMA', optionalSubject: 'Sanskrit' },
    { roll: '9', name: 'Suhana Khatoon', fatherName: 'WASIM AKRAM', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Zubair Ahmad', fatherName: 'NISAR AHMAD', optionalSubject: 'Urdu' }
  ],
  '4': [
    { roll: '1', name: 'Akib Javed', fatherName: 'JAVED IQBAL', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Anjali Sharma', fatherName: 'VIJAY SHARMA', optionalSubject: 'Sanskrit' },
    { roll: '3', name: 'Danish Khan', fatherName: 'SHAHNAWAZ KHAN', optionalSubject: 'Urdu' },
    { roll: '4', name: 'Harsh Vardhan', fatherName: 'SANJAY SINGH', optionalSubject: 'Sanskrit' },
    { roll: '5', name: 'Iqra Perween', fatherName: 'IRSHAD ALAM', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Manish Pandey', fatherName: 'DILIP PANDEY', optionalSubject: 'Sanskrit' },
    { roll: '7', name: 'Noman Raza', fatherName: 'RAZAUL HAQUE', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Pooja Kumari', fatherName: 'SUBHASH RAY', optionalSubject: 'Sanskrit' },
    { roll: '9', name: 'Samiullah', fatherName: 'ASGAR ALI', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Tanveer Alam', fatherName: 'ALTAF ALAM', optionalSubject: 'Urdu' }
  ],
  '5': [
    { roll: '1', name: 'Aamir Sohail', fatherName: 'SOHAIL KHAN', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Aditya Kumar', fatherName: 'NANDKISHOR RAY', optionalSubject: 'Sanskrit' },
    { roll: '3', name: 'Falak Naz', fatherName: 'GULZAR AHMAD', optionalSubject: 'Urdu' },
    { roll: '4', name: 'Himanshu Raj', fatherName: 'AJAY KUMAR', optionalSubject: 'Sanskrit' },
    { roll: '5', name: 'Muddassir Ali', fatherName: 'LIAQAT ALI', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Pallavi Kumari', fatherName: 'SANTOSH SINGH', optionalSubject: 'Sanskrit' },
    { roll: '7', name: 'Salman Farsi', fatherName: 'FARIDUDDIN', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Swati Anand', fatherName: 'ANAND MOHAN', optionalSubject: 'Sanskrit' },
    { roll: '9', name: 'Tarannum Bano', fatherName: 'BABULAL ANSARI', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Zaidur Rahman', fatherName: 'ABDUL BARI', optionalSubject: 'Urdu' }
  ],
  '6': [
    { roll: '1', name: 'Altamash Raza', fatherName: 'NASIM REZA', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Anushka Roy', fatherName: 'ASHOK ROY', optionalSubject: 'Sanskrit' },
    { roll: '3', name: 'Fuzail Ahmad', fatherName: 'JAMSHED AHMAD', optionalSubject: 'Urdu' },
    { roll: '4', name: 'Kunal Kumar', fatherName: 'BINOD KUMAR', optionalSubject: 'Sanskrit' },
    { roll: '5', name: 'Mehwish Fatima', fatherName: 'FIROZ ALAM', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Rahul Sharma', fatherName: 'NARENDRA SHARMA', optionalSubject: 'Sanskrit' },
    { roll: '7', name: 'Shahid Anwar', fatherName: 'ANWARUL HAQUE', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Shreya Sinha', fatherName: 'DEVENDRA SINHA', optionalSubject: 'Sanskrit' },
    { roll: '9', name: 'Usman Ghani', fatherName: 'GHULAM NABI', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Zainab Khatoon', fatherName: 'SHAMS TABREZ', optionalSubject: 'Urdu' }
  ],
  '7': [
    { roll: '1', name: 'Adeeba Noori', fatherName: 'NOORUL HODA', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Aman Raj', fatherName: 'KRISHNA MURARI', optionalSubject: 'Sanskrit' },
    { roll: '3', name: 'Bilal Khan', fatherName: 'SHAHID KHAN', optionalSubject: 'Urdu' },
    { roll: '4', name: 'Deepak Kumar', fatherName: 'RAM BILAS', optionalSubject: 'Sanskrit' },
    { roll: '5', name: 'Hasnain Raza', fatherName: 'MUMTAZ ALI', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Kareena Kumari', fatherName: 'BIRENDRA RAY', optionalSubject: 'Sanskrit' },
    { roll: '7', name: 'Nawaz Sharif', fatherName: 'SHARIFUDDIN', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Ritu Raj', fatherName: 'VIKRAM SINGH', optionalSubject: 'Sanskrit' },
    { roll: '9', name: 'Shabana Azmi', fatherName: 'AZMAT HUSSAIN', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Yasir Arafat', fatherName: 'SALIM JAHANGIR', optionalSubject: 'Urdu' }
  ],
  '8': [
    { roll: '1', name: 'Aamir Hussain', fatherName: 'ABID HUSSAIN', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Avinash Kumar', fatherName: 'SHIV KUMAR', optionalSubject: 'Sanskrit' },
    { roll: '3', name: 'Darakhshan Anjum', fatherName: 'SAMIULLAH', optionalSubject: 'Urdu' },
    { roll: '4', name: 'Gautam Pandey', fatherName: 'MAHESH PANDEY', optionalSubject: 'Sanskrit' },
    { roll: '5', name: 'Irfan Habib', fatherName: 'HABIBUR RAHMAN', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Megha Kumari', fatherName: 'JITENDRA THAKUR', optionalSubject: 'Sanskrit' },
    { roll: '7', name: 'Owais Qadri', fatherName: 'ABDUL QADIR', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Rohit Verma', fatherName: 'MUKESH VERMA', optionalSubject: 'Sanskrit' },
    { roll: '9', name: 'Samreen Bano', fatherName: 'AFZAL HUSSAIN', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Zafar Iqbal', fatherName: 'IQBAL HUSSAIN', optionalSubject: 'Urdu' }
  ],
  '9': [
    { roll: '1', name: 'Arif Raza Khan', fatherName: 'ARSHAD KHAN', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Chandan Kumar', fatherName: 'UPENDRA RAY', optionalSubject: 'Sanskrit' },
    { roll: '3', name: 'Danish Alam', fatherName: 'MANSUR ALAM', optionalSubject: 'Urdu' },
    { roll: '4', name: 'Komal Kumari', fatherName: 'SHAMBHU NATH', optionalSubject: 'Sanskrit' },
    { roll: '5', name: 'Md Shadab', fatherName: 'JAMALUDDIN', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Nisha Singh', fatherName: 'HARENDRA SINGH', optionalSubject: 'Sanskrit' },
    { roll: '7', name: 'Rizwan Haider', fatherName: 'ASGHAR ALI', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Saurabh Pandey', fatherName: 'RAMESH PANDEY', optionalSubject: 'Sanskrit' },
    { roll: '9', name: 'Tarannum Parween', fatherName: 'TARIQ AZIZ', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Waseem Akram', fatherName: 'NAUSHAD AKRAM', optionalSubject: 'Urdu' }
  ],
  '10': [
    { roll: '1', name: 'Abdur Rahim', fatherName: 'ABDUL KARIM', optionalSubject: 'Urdu' },
    { roll: '2', name: 'Alok Kumar', fatherName: 'VIJAY PRASAD', optionalSubject: 'Sanskrit' },
    { roll: '3', name: 'Farheen Naz', fatherName: 'ASRAR AHMAD', optionalSubject: 'Urdu' },
    { roll: '4', name: 'Gaurav Anand', fatherName: 'PARMANAND SINGH', optionalSubject: 'Sanskrit' },
    { roll: '5', name: 'Junaid Khan', fatherName: 'SHAHID KHAN', optionalSubject: 'Urdu' },
    { roll: '6', name: 'Monika Kumari', fatherName: 'RAMESHWAR SAH', optionalSubject: 'Sanskrit' },
    { roll: '7', name: 'Nasiruddin', fatherName: 'ALAUDDIN', optionalSubject: 'Urdu' },
    { roll: '8', name: 'Pankaj Kumar', fatherName: 'BHARAT RAY', optionalSubject: 'Sanskrit' },
    { roll: '9', name: 'Sumbul Parveen', fatherName: 'SULTAN ALAM', optionalSubject: 'Urdu' },
    { roll: '10', name: 'Zeeshan Haider', fatherName: 'HAIDER ALI', optionalSubject: 'Urdu' }
  ]
};

export const ALL_SUBJECT_OPTIONS = [
  "English",
  "Hindi",
  "Mathematics",
  "Science",
  "Social Science",
  "Social Studies",
  "Computer",
  "Drawing",
  "General Awareness",
  "Gk",
  "Table Book",
  "Environmental Studies",
  "Sanskrit",
  "Urdu"
];

