import { ClassLevel } from '../types';
import { ClassSubjectAllotmentMap } from '../types/resultTypes';
import { SUBJECTS_BY_CLASS } from '../data/schoolConfig';
import { detectStudentOptionalSubject } from './studentSubjectDetector';

/**
 * MODULE 2: CENTRAL SUBJECT MASTER & ALLOCATION
 *
 * Authoritative source of truth for:
 * 1. Canonical Class Subject Curriculum (what subjects are taught/evaluated per class)
 * 2. Safe LocalStorage persistence, precedence, and legacy migrations
 * 3. Subject name normalization & known alias resolution
 * 4. Validation of optional subjects against class curriculum
 * 5. Separation of Class Curriculum (full set) vs Student Evaluation Roster (filtered set)
 */

export const CANONICAL_CURRICULUM_STORAGE_KEY = 'pis_class_subject_allotments_v1';
export const LEGACY_ADMIT_CARD_ALLOTMENTS_KEY = 'pis_admit_card_allotments_v1';

// Known legitimate aliases for standard school subjects
// Do NOT perform aggressive fuzzy matching; use explicit aliases only.
export const KNOWN_SUBJECT_ALIASES: Record<string, string[]> = {
  'GK': ['gk', 'g.k.', 'general knowledge', 'general awareness', 'ga', 'g.a.'],
  'Computer': ['computer', 'computer applications', 'computer science', 'it', 'information technology', 'comp'],
  'Environmental Studies': ['environmental studies', 'evs', 'e.v.s.', 'environmental science'],
  'Social Science': ['social science', 'social studies', 'sst', 's.st.', 'social'],
  'Drawing': ['drawing', 'art', 'art & craft', 'craft'],
  'Mathematics': ['mathematics', 'maths', 'math'],
  'Table Book': ['table book', 'table'],
  'Urdu': ['urdu', 'اردو'],
  'Sanskrit': ['sanskrit', 'संस्कृत']
};

/**
 * Normalizes subject string: trims leading/trailing spaces, collapses multiple internal spaces.
 */
export function normalizeSubjectName(name: string): string {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Checks if two subject names are equivalent by exact match, case-insensitive match, or known alias.
 */
export function areSubjectsEquivalent(a: string, b: string): boolean {
  if (!a || !b) return false;
  const normA = normalizeSubjectName(a).toLowerCase();
  const normB = normalizeSubjectName(b).toLowerCase();
  if (normA === normB) return true;

  for (const [, aliases] of Object.entries(KNOWN_SUBJECT_ALIASES)) {
    const hasA = aliases.some(alias => alias.toLowerCase() === normA);
    const hasB = aliases.some(alias => alias.toLowerCase() === normB);
    if (hasA && hasB) return true;
  }

  return false;
}

/**
 * Expands a subject name into all its known naming variations (for matching Google Sheet column headers).
 */
export function expandSubjectAliases(subject: string): string[] {
  const norm = normalizeSubjectName(subject);
  if (!norm) return [];
  const results = new Set<string>([norm]);

  const normLower = norm.toLowerCase();
  for (const [canonical, aliases] of Object.entries(KNOWN_SUBJECT_ALIASES)) {
    if (canonical.toLowerCase() === normLower || aliases.some(al => al.toLowerCase() === normLower)) {
      results.add(canonical);
      aliases.forEach(al => results.add(al));
    }
  }

  return Array.from(results);
}

/**
 * Finds if candidate subject exists in a class curriculum using exact or alias match.
 * Returns the exact matched subject name from the curriculum, or undefined if not found.
 */
export function findSubjectInCurriculum(candidate: string, curriculum: string[]): string | undefined {
  if (!candidate || !curriculum || curriculum.length === 0) return undefined;
  const candidateNorm = normalizeSubjectName(candidate).toLowerCase();

  // 1. Exact case-insensitive match first
  for (const sub of curriculum) {
    if (normalizeSubjectName(sub).toLowerCase() === candidateNorm) {
      return sub;
    }
  }

  // 2. Explicit alias match
  for (const sub of curriculum) {
    if (areSubjectsEquivalent(sub, candidate)) {
      return sub;
    }
  }

  return undefined;
}

export interface CurriculumLoadResult {
  curriculum: ClassSubjectAllotmentMap;
  notices: string[];
  hasConflict: boolean;
}

/**
 * Safe Precedence Loader:
 * 1. Current explicit Admin configuration in `pis_class_subject_allotments_v1`
 * 2. Valid migrated configuration from `pis_admit_card_allotments_v1` (if primary missing or empty)
 * 3. Default application curriculum from `SUBJECTS_BY_CLASS`
 *
 * Preserves existing data, exposes diagnostics, does not silently discard configured subjects.
 */
export function loadCanonicalCurriculum(): CurriculumLoadResult {
  const notices: string[] = [];
  let hasConflict = false;
  let canonicalRaw: Record<string, any> | null = null;
  let legacyRaw: Record<string, any> | null = null;

  try {
    const saved = localStorage.getItem(CANONICAL_CURRICULUM_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        canonicalRaw = parsed;
      }
    }
  } catch (e) {
    notices.push('Warning: Could not parse canonical subject curriculum from localStorage.');
  }

  try {
    const legacy = localStorage.getItem(LEGACY_ADMIT_CARD_ALLOTMENTS_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed && typeof parsed === 'object') {
        legacyRaw = parsed;
      }
    }
  } catch (e) {
    // ignore
  }

  // Build unified curriculum map for all classes
  const merged: ClassSubjectAllotmentMap = { ...SUBJECTS_BY_CLASS };
  const allClasses = Object.keys(SUBJECTS_BY_CLASS) as ClassLevel[];

  for (const cls of allClasses) {
    const canonicalSubs = canonicalRaw && Array.isArray(canonicalRaw[cls]) && canonicalRaw[cls].length > 0 
      ? canonicalRaw[cls] 
      : null;
    const legacySubs = legacyRaw && Array.isArray(legacyRaw[cls]) && legacyRaw[cls].length > 0 
      ? legacyRaw[cls] 
      : null;

    if (canonicalSubs) {
      // Primary source exists
      merged[cls] = canonicalSubs;

      // Check if legacy had different subjects
      if (legacySubs && JSON.stringify(canonicalSubs) !== JSON.stringify(legacySubs)) {
        hasConflict = true;
        notices.push(`Class ${cls}: Preserved primary curriculum (${canonicalSubs.length} subjects) over differing legacy admit-card cache (${legacySubs.length} subjects).`);
      }
    } else if (legacySubs) {
      // Primary missing or empty, but legacy has data -> safely migrate
      merged[cls] = legacySubs;
      notices.push(`Class ${cls}: Safely migrated ${legacySubs.length} subjects from legacy admit card storage into canonical curriculum.`);
    } else {
      // Fallback to default
      merged[cls] = SUBJECTS_BY_CLASS[cls] || [];
    }
  }

  return {
    curriculum: merged,
    notices,
    hasConflict
  };
}

/**
 * Saves the canonical class subject curriculum.
 * Writes to `CANONICAL_CURRICULUM_STORAGE_KEY` and syncs `LEGACY_ADMIT_CARD_ALLOTMENTS_KEY`
 * so backward-compatible consumers remain synchronized.
 */
export function saveCanonicalCurriculum(curriculum: ClassSubjectAllotmentMap): void {
  try {
    const serialized = JSON.stringify(curriculum);
    localStorage.setItem(CANONICAL_CURRICULUM_STORAGE_KEY, serialized);
    // Sync legacy key so Admit Card and old tools never diverge
    localStorage.setItem(LEGACY_ADMIT_CARD_ALLOTMENTS_KEY, serialized);

    // Dispatch global event for instant reactive synchronization
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('school_curriculum_updated', {
        detail: { curriculum }
      }));
    }
  } catch (err) {
    console.error('Failed to save canonical subject curriculum', err);
  }
}

/**
 * Retrieves the full canonical curriculum for a specific class.
 * Never reduces the list for student-specific choices.
 */
export function getClassCurriculum(
  allotments?: ClassSubjectAllotmentMap | null,
  classLevel?: ClassLevel | string
): string[] {
  if (!classLevel) return [];
  const clsKey = classLevel as ClassLevel;

  if (allotments && allotments[clsKey] && Array.isArray(allotments[clsKey]) && allotments[clsKey].length > 0) {
    return allotments[clsKey];
  }

  return SUBJECTS_BY_CLASS[clsKey] || [];
}

export interface OptionalSubjectValidation {
  isValid: boolean;
  applicableOptionalSubject?: string;
  warning?: string;
  requiresChoiceWarning?: boolean;
}

/**
 * Validates a student's explicit optional subject against the Class Curriculum.
 *
 * Rules:
 * 1. When student has 'optionalSubject = Urdu' and curriculum contains Urdu: -> Urdu is applicable.
 * 2. When 'optionalSubject = Sanskrit' and curriculum contains Sanskrit: -> Sanskrit is applicable.
 * 3. When 'optionalSubject = Computer Applications' and curriculum contains Computer: -> Computer is applicable.
 * 4. If student has an optional subject NOT present in the class curriculum:
 *    -> Returns warning. Does NOT automatically add that subject to class curriculum. Does NOT infer a replacement.
 * 5. If curriculum offers elective choices (e.g. Urdu & Sanskrit) and student has no optional subject:
 *    -> Returns warning that choice is required. Does NOT guess based on demographics!
 */
export function validateStudentOptionalSubject(
  student: any,
  classCurriculum: string[],
  classLevel?: string
): OptionalSubjectValidation {
  const explicitOpted = detectStudentOptionalSubject(student);
  const studentName = student?.name || 'Student';

  // Check what elective languages are offered in the class curriculum
  const hasUrduInCurriculum = classCurriculum.some(s => s.toLowerCase() === 'urdu' || s.toLowerCase().includes('urdu'));
  const hasSanskritInCurriculum = classCurriculum.some(s => s.toLowerCase() === 'sanskrit' || s.toLowerCase().includes('sanskrit'));
  const offersElectiveLanguageChoice = hasUrduInCurriculum && hasSanskritInCurriculum;

  // Case A: Student has an explicit optional subject
  if (explicitOpted) {
    const matchedCurriculumSubject = findSubjectInCurriculum(explicitOpted, classCurriculum);
    if (matchedCurriculumSubject) {
      return {
        isValid: true,
        applicableOptionalSubject: matchedCurriculumSubject
      };
    } else {
      // Optional subject NOT in curriculum!
      return {
        isValid: false,
        warning: `Optional subject "${explicitOpted}" opted by ${studentName} is NOT present in the Class ${classLevel || ''} curriculum. Curriculum will not be altered.`
      };
    }
  }

  // Case B: Student has no optional subject
  if (offersElectiveLanguageChoice) {
    return {
      isValid: true,
      requiresChoiceWarning: true,
      warning: `Student ${studentName} has no optional language (Urdu/Sanskrit) designated. Class curriculum offers both choices.`
    };
  }

  return {
    isValid: true
  };
}

export interface StudentEvaluationRoster {
  subjects: string[];
  warnings: string[];
}

/**
 * Builds the Student Evaluation Subject Roster.
 *
 * CRITICAL ARCHITECTURAL DISTINCTION:
 * - Class Curriculum: The complete list of subjects configured by Admin for this class (e.g. 5, 6, or 7 subjects).
 * - Student Evaluation Subjects: The subjects applicable to this particular student.
 *
 * When Class VIII curriculum contains:
 * [English, Hindi, Mathematics, Science, Social Science, Urdu, Sanskrit] (7 subjects)
 * - Student with Urdu gets: [English, Hindi, Mathematics, Science, Social Science, Urdu] (6 subjects)
 * - Student with Sanskrit gets: [English, Hindi, Mathematics, Science, Social Science, Sanskrit] (6 subjects)
 *
 * When Class VIII curriculum contains 5 subjects:
 * [English, Hindi, Mathematics, Science, Social Science]
 * - Student gets all 5 subjects! Never reduced to 4!
 *
 * The Class Curriculum remains completely UNTOUCHED and full.
 */
export function getStudentEvaluationCurriculum(
  student: any,
  classCurriculum: string[],
  classLevel?: string
): StudentEvaluationRoster {
  if (!classCurriculum || classCurriculum.length === 0) {
    return { subjects: [], warnings: [] };
  }

  const warnings: string[] = [];
  const validation = validateStudentOptionalSubject(student, classCurriculum, classLevel);
  if (validation.warning) {
    warnings.push(validation.warning);
  }

  const explicitOpted = detectStudentOptionalSubject(student).toLowerCase().trim();
  const hasUrdu = classCurriculum.some(s => s.toLowerCase() === 'urdu' || s.toLowerCase().includes('urdu'));
  const hasSanskrit = classCurriculum.some(s => s.toLowerCase() === 'sanskrit' || s.toLowerCase().includes('sanskrit'));

  // If the curriculum does NOT have both Urdu and Sanskrit, there is no elective conflict to filter
  if (!(hasUrdu && hasSanskrit)) {
    // Return all class curriculum subjects, preserving order
    return {
      subjects: [...classCurriculum],
      warnings
    };
  }

  // Curriculum offers both Urdu and Sanskrit as alternative electives
  let roster: string[] = [];

  if (explicitOpted === 'urdu') {
    // Include Urdu, exclude Sanskrit
    roster = classCurriculum.filter(s => s.toLowerCase() !== 'sanskrit' && !s.toLowerCase().includes('sanskrit'));
  } else if (explicitOpted === 'sanskrit') {
    // Include Sanskrit, exclude Urdu
    roster = classCurriculum.filter(s => s.toLowerCase() !== 'urdu' && !s.toLowerCase().includes('urdu'));
  } else if (explicitOpted) {
    // Opted for an elective other than Urdu or Sanskrit
    const matched = findSubjectInCurriculum(explicitOpted, classCurriculum);
    if (matched) {
      roster = classCurriculum.filter(s => {
        const lower = s.toLowerCase();
        return lower !== 'urdu' && lower !== 'sanskrit';
      });
      if (!roster.includes(matched)) {
        roster.push(matched);
      }
    } else {
      // Invalid optional subject: do NOT add it to roster, keep core subjects without elective languages
      roster = classCurriculum.filter(s => {
        const lower = s.toLowerCase();
        return lower !== 'urdu' && lower !== 'sanskrit';
      });
    }
  } else {
    // No explicit optional subject: DO NOT GUESS!
    // Keep core compulsory subjects
    roster = classCurriculum.filter(s => {
      const lower = s.toLowerCase();
      return lower !== 'urdu' && lower !== 'sanskrit';
    });
  }

  return {
    subjects: roster,
    warnings
  };
}
