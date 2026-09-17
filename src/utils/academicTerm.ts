export type AcademicTerm = 'TERM_1' | 'TERM_2' | 'BOTH' | 'SEGMENT';

/** Maps legacy internal values without changing stored marks or sheet columns. */
export const getAcademicTerm = (value: string): AcademicTerm => {
  if (value === 'HY') return 'TERM_1';
  if (value === 'AN' || value === 'AE') return 'TERM_2';
  if (value === 'BOTH') return 'BOTH';
  return 'SEGMENT';
};

export const getAcademicTermLabel = (value: string): string => {
  switch (getAcademicTerm(value)) {
    case 'TERM_1':
      return 'Term 1';
    case 'TERM_2':
      return 'Term 2';
    case 'BOTH':
      return 'Term 1 + Term 2';
    default:
      return value;
  }
};
