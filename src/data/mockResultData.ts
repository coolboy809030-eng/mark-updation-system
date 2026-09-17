import { FullStudentExamRecord } from '../types/resultTypes';
import { DEFAULT_STUDENTS_BY_CLASS, SUBJECTS_BY_CLASS } from './schoolConfig';
import { ClassLevel } from '../types';
import { getStudentSubjects } from '../utils/resultCalculator';
import { detectStudentOptionalSubject } from '../utils/studentSubjectDetector';

// Generate comprehensive student exam records for a given class
export function getInitialClassExamRecords(classLevel: ClassLevel): FullStudentExamRecord[] {
  const baseStudents = DEFAULT_STUDENTS_BY_CLASS[classLevel] || [];
  const subjects = SUBJECTS_BY_CLASS[classLevel] || [];

  const mothers = [
    'PARVEEN BEGUM', 'SHABANA KHATOON', 'RUKHSANA BEGUM', 'NAZIA PARVEEN',
    'FARHANA BANO', 'ZEENAT JAHAN', 'SALMA KHATOON', 'RASHIDA BEGUM',
    'TAHIRA FATIMA', 'NOORJAHAN KHATOON'
  ];

  return baseStudents.map((st, idx) => {
    const rollNum = typeof st.roll === 'number' ? st.roll : parseInt(String(st.roll), 10) || (idx + 1);
    const admNo = `PIS-2025-${classLevel.toUpperCase().replace(/\s+/g, '')}-${String(rollNum).padStart(3, '0')}`;
    const mother = mothers[idx % mothers.length];
    const dobDay = String((rollNum * 3) % 28 + 1).padStart(2, '0');
    const dobMonth = String((rollNum * 2) % 12 + 1).padStart(2, '0');
    const dobYear = 2012 + (idx % 4);
    const dob = `${dobDay}/${dobMonth}/${dobYear}`;
    const mobile = `9835${String(100000 + rollNum * 1234).slice(0, 6)}`;

    // Determine opted optional language (Urdu or Sanskrit)
    const optedSubject = detectStudentOptionalSubject(st);

    // Get active subjects for this specific student (strictly Urdu OR Sanskrit, never both!)
    const studentSubjects = getStudentSubjects(
      { optionalSubject: optedSubject, name: st.name },
      subjects
    );

    // Generate realistic marks only for student's active subjects
    const rawMarks: Record<string, string | number> = {};
    const baseAbility = 65 + ((rollNum * 7) % 30); // 65 - 95 range

    studentSubjects.forEach((sub, sIdx) => {
      const subOffset = ((sIdx * 3) % 7) - 3;
      const pt1 = Math.min(20, Math.max(10, Math.round((baseAbility + subOffset) * 0.2)));
      const pt2 = Math.min(20, Math.max(11, Math.round((baseAbility + subOffset + 1) * 0.2)));
      const pt3 = Math.min(20, Math.max(12, Math.round((baseAbility + subOffset + 2) * 0.2)));
      const pt4 = Math.min(20, Math.max(12, Math.round((baseAbility + subOffset + 1) * 0.2)));

      const hyWrt = Math.min(80, Math.max(35, Math.round((baseAbility + subOffset) * 0.8)));
      const aeWrt = Math.min(80, Math.max(38, Math.round((baseAbility + subOffset + 3) * 0.8)));

      rawMarks[`${sub} PT-1`] = pt1;
      rawMarks[`${sub} PT-2`] = pt2;
      rawMarks[`${sub} PT-3`] = pt3;
      rawMarks[`${sub} PT-4`] = pt4;

      rawMarks[`${sub}-HY-WRT`] = hyWrt;
      rawMarks[`${sub}-AE-WRT`] = aeWrt;
    });

    const presentHY = Math.min(110, Math.max(90, 100 + ((rollNum * 3) % 10)));
    const presentAE = Math.min(115, Math.max(95, 105 + ((rollNum * 4) % 10)));

    return {
      urn: admNo,
      admNo,
      roll: rollNum,
      name: st.name,
      fatherName: st.fatherName,
      motherName: mother,
      dob,
      mobile,
      studentClass: classLevel,
      section: 'A',
      optionalSubject: optedSubject,
      photoUrl: st.photoUrl || '',
      rawMarks,
      attendanceHY: `${presentHY}/110`,
      attendanceAE: `${presentAE}/115`
    };
  });
}
