import { Student, EntryType } from '../types';

export function exportMarksToCsv({
  students,
  values,
  className,
  entryType,
  subject,
  segment,
  workingDays
}: {
  students: Student[];
  values: Record<string, string>;
  className: string;
  entryType: EntryType;
  subject: string;
  segment: string;
  workingDays: string;
}) {
  const isAttendance = entryType === 'attendance';
  const headers = isAttendance
    ? ['Roll No', 'Student Name', "Father's Name", 'Working Days', 'Present Days', 'Attendance %', 'Status']
    : ['Roll No', 'Student Name', "Father's Name", 'Optional Subject', 'Subject', 'Segment', 'Marks', 'Status'];

  const rows = students.map((s) => {
    const rollStr = String(s.roll);
    const val = values[rollStr] || '';
    const isAbsent = val === 'AB';

    if (isAttendance) {
      const wd = parseInt(workingDays) || 0;
      let pct = '';
      if (!isAbsent && val !== '' && wd > 0) {
        pct = `${Math.min(100, Math.round((parseInt(val) / wd) * 100))}%`;
      }
      const status = isAbsent ? 'Absent' : val ? 'Entered' : 'Pending';
      return [
        s.roll,
        `"${s.name.replace(/"/g, '""')}"`,
        `"${(s.fatherName || '').replace(/"/g, '""')}"`,
        wd,
        isAbsent ? 'AB' : val,
        pct,
        status
      ];
    } else {
      const status = isAbsent ? 'Absent' : val ? 'Entered' : 'Pending';
      return [
        s.roll,
        `"${s.name.replace(/"/g, '""')}"`,
        `"${(s.fatherName || '').replace(/"/g, '""')}"`,
        s.optionalSubject || 'N/A',
        subject,
        segment,
        isAbsent ? 'AB' : val,
        status
      ];
    }
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = isAttendance
    ? `PIS_Class${className}_Attendance_${segment || 'Term'}.csv`
    : `PIS_Class${className}_${subject}_${segment}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
