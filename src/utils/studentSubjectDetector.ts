/**
 * Clean & Unbiased Optional Subject & Student Identification Utility
 *
 * CRITICAL RULES:
 * 1. Optional subject is determined ONLY from explicit designated fields/columns in data/sheets.
 * 2. NEVER infer optional subject from student name, father name, caste, religion, or community.
 * 3. If the optional subject field is blank or unknown -> DO NOT GUESS. Return empty string ('').
 * 4. Students are uniquely identified by URN / Admission Number / Registration Number.
 */

// Designated keys for optional subject in student object or Google Sheet row
const EXPLICIT_OPTIONAL_SUBJECT_KEYS = [
  'optionalSubject',
  'optional_subject',
  'Optional Subject',
  'OptionalSubject',
  'OPTIONAL SUBJECT',
  'Optional',
  'optional',
  'OPTIONAL',
  '2nd Language',
  '2nd_Language',
  '2nd language',
  'Second Language',
  'second_language',
  'Language',
  'language',
  'Elective',
  'elective',
  'Opted Subject',
  'opted_subject',
  'Opt Subject',
  'opt_subject',
  'Opt. Subject'
];

/**
 * Extracts student's unique identifier (URN / Admission Number / Registration Number / Roll).
 * Never relies on student name alone as a unique key.
 */
export function getStudentUniqueId(st: any): string {
  if (!st) return '';
  const candidate = 
    st.urn || 
    st.admNo || 
    st.admissionNo || 
    st.regNo || 
    st.registrationNo || 
    st.studentId || 
    st.id;
    
  if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
    return String(candidate).trim();
  }

  // Fallback to class + roll number if available
  const roll = st.roll !== undefined && st.roll !== null ? String(st.roll).trim() : '';
  const cls = st.studentClass || st.class || '';
  if (cls && roll) {
    return `${cls}-${roll}`;
  }
  if (roll) return roll;

  // Fallback to name only if no identifier exists at all
  return String(st.name || '').trim();
}

/**
 * Detects optional subject ONLY from explicit fields in student data or Google Sheet.
 * Absolutely NO demographic, cultural, religion, or name-based guessing.
 * If blank or unspecified, returns '' (empty string).
 */
export function detectStudentOptionalSubject(st: any): string {
  if (!st || typeof st !== 'object') return '';

  // Check explicit keys on the student object
  for (const k of EXPLICIT_OPTIONAL_SUBJECT_KEYS) {
    const val = st[k];
    if (val !== undefined && val !== null) {
      const sVal = String(val).trim();
      if (sVal !== '') {
        const lower = sVal.toLowerCase();
        if (lower === 'sanskrit' || lower.includes('sanskrit') || sVal === 'संस्कृत') {
          return 'Sanskrit';
        }
        if (lower === 'urdu' || lower.includes('urdu') || sVal === 'اردو') {
          return 'Urdu';
        }
        // Return other explicit language/elective (e.g. "Computer", "Arabic", "Maithili")
        return sVal;
      }
    }
  }

  // Check rawMarks if explicitly keyed as "Optional Subject" or "2nd Language"
  if (st.rawMarks && typeof st.rawMarks === 'object') {
    for (const k of EXPLICIT_OPTIONAL_SUBJECT_KEYS) {
      const val = st.rawMarks[k];
      if (val !== undefined && val !== null) {
        const sVal = String(val).trim();
        if (sVal !== '') {
          const lower = sVal.toLowerCase();
          if (lower === 'sanskrit' || lower.includes('sanskrit') || sVal === 'संस्कृत') {
            return 'Sanskrit';
          }
          if (lower === 'urdu' || lower.includes('urdu') || sVal === 'اردو') {
            return 'Urdu';
          }
          return sVal;
        }
      }
    }
  }

  // If blank or not present in designated column, DO NOT GUESS.
  return '';
}

/**
 * Helper to test whether a student should be displayed for the active subject entry.
 * Core compulsory subjects apply to all students.
 * Optional subjects (e.g. Urdu, Sanskrit) apply ONLY if the student has explicitly opted for them.
 */
export function isStudentOptedForSubject(st: any, subjectName: string): boolean {
  if (!subjectName) return true;
  const sub = subjectName.toLowerCase().trim();
  const isUrdu = sub === 'urdu' || sub.includes('urdu');
  const isSanskrit = sub === 'sanskrit' || sub.includes('sanskrit');

  const studentOpted = detectStudentOptionalSubject(st).toLowerCase().trim();

  // If entering marks for Sanskrit: student must have opted for Sanskrit
  if (isSanskrit) {
    return studentOpted === 'sanskrit';
  }

  // If entering marks for Urdu: student must have opted for Urdu
  if (isUrdu) {
    return studentOpted === 'urdu';
  }

  // If student has an optional subject specified and it matches the subject name
  if (studentOpted && (studentOpted === sub || sub.includes(studentOpted))) {
    return true;
  }

  // All other core compulsory subjects apply to all students in the class
  return true;
}

