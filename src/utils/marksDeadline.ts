export type MarksDeadlineState = 'none' | 'before' | 'passed';

export const getMarksDeadlineState = (deadline: string): MarksDeadlineState => {
  if (!deadline || !deadline.trim()) return 'none';
  const timestamp = new Date(deadline).getTime();
  if (Number.isNaN(timestamp)) return 'none';
  return Date.now() > timestamp ? 'passed' : 'before';
};

export const isMarksDeadlinePassed = (deadline: string): boolean =>
  getMarksDeadlineState(deadline) === 'passed';