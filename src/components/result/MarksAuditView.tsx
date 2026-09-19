import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  UserCheck,
  Database
} from 'lucide-react';
import { FullStudentExamRecord } from '../../types/resultTypes';
import { ClassLevel } from '../../types';
import { buildClassMarksAuditRecords, MarksAuditRecord } from '../../utils/marksAudit';
import { exportMarksAuditToPdf, exportMarksAuditToExcel, exportMarksAuditToCsv } from '../../utils/marksAuditExport';
import { formatDisplayDate, formatDisplayTime } from '../../utils/dateFormatter';
import { instantSyncBridge } from '../../utils/instantSyncBridge';

interface MarksAuditViewProps {
  selectedClass: ClassLevel | '';
  onClassChange: (cls: ClassLevel | '') => void;
  students: FullStudentExamRecord[];
  allottedSubjects?: string[];
}

const ALL_CLASSES: ClassLevel[] = [
  'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
];

export const MarksAuditView: React.FC<MarksAuditViewProps> = ({
  selectedClass,
  onClassChange,
  students
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [segmentFilter, setSegmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Build audit records from current class students (or all classes if needed)
  const auditRecords = useMemo(() => {
    if (selectedClass) {
      return buildClassMarksAuditRecords(selectedClass, students);
    }
    // If no class selected, build across all classes from instantSyncBridge
    const allRecords: MarksAuditRecord[] = [];
    ALL_CLASSES.forEach(cls => {
      const clsStudents = instantSyncBridge.getClassRecords(cls);
      if (clsStudents && clsStudents.length > 0) {
        allRecords.push(...buildClassMarksAuditRecords(cls, clsStudents));
      }
    });
    return allRecords;
  }, [selectedClass, students]);

  // Extract distinct subjects and segments for filter dropdowns
  const availableSubjects = useMemo(() => {
    const subs = new Set<string>();
    auditRecords.forEach(r => {
      if (r.subject) subs.add(r.subject);
    });
    return Array.from(subs).sort();
  }, [auditRecords]);

  const availableSegments = useMemo(() => {
    const segs = new Set<string>();
    auditRecords.forEach(r => {
      if (r.segment) segs.add(r.segment);
    });
    return Array.from(segs).sort();
  }, [auditRecords]);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return auditRecords.filter(r => {
      if (sectionFilter !== 'ALL' && (r.section || 'A') !== sectionFilter) {
        return false;
      }
      if (subjectFilter !== 'ALL' && r.subject !== subjectFilter) {
        return false;
      }
      if (segmentFilter !== 'ALL' && r.segment !== segmentFilter) {
        return false;
      }
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PRE_EXISTING' && !r.isPreExistingSheetData) return false;
        if (statusFilter === 'LOGGED' && r.isPreExistingSheetData) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = r.studentName?.toLowerCase().includes(q);
        const matchesUrn = r.urn?.toLowerCase().includes(q);
        const matchesRoll = String(r.roll).includes(q);
        const matchesTeacher = r.teacherName?.toLowerCase().includes(q) || r.teacherId?.toLowerCase().includes(q);
        const matchesSubject = r.subject?.toLowerCase().includes(q);
        if (!matchesName && !matchesUrn && !matchesRoll && !matchesTeacher && !matchesSubject) {
          return false;
        }
      }
      return true;
    });
  }, [auditRecords, sectionFilter, subjectFilter, segmentFilter, statusFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Statistics
  const totalEntries = auditRecords.length;
  const portalLoggedCount = auditRecords.filter(r => !r.isPreExistingSheetData && r.savedAt).length;
  const sheetLegacyCount = auditRecords.filter(r => r.isPreExistingSheetData).length;

  const filtersSummary = [
    selectedClass ? `Class: ${selectedClass}` : 'All Classes',
    sectionFilter !== 'ALL' ? `Sec: ${sectionFilter}` : null,
    subjectFilter !== 'ALL' ? `Subject: ${subjectFilter}` : null,
    segmentFilter !== 'ALL' ? `Exam: ${segmentFilter}` : null,
    statusFilter !== 'ALL' ? `Type: ${statusFilter}` : null
  ].filter(Boolean).join(' | ');

  const handleExportPdf = () => {
    exportMarksAuditToPdf({
      records: filteredRecords,
      className: selectedClass || 'All_Classes',
      filtersSummary
    });
  };

  const handleExportExcel = () => {
    exportMarksAuditToExcel({
      records: filteredRecords,
      className: selectedClass || 'All_Classes',
      filtersSummary
    });
  };

  const handleExportCsvAction = () => {
    exportMarksAuditToCsv({
      records: filteredRecords,
      className: selectedClass || 'All_Classes'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Card */}
      <div className="no-print bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1B4D3E] to-emerald-800 text-white flex items-center justify-center font-bold text-lg shadow-sm border border-emerald-700/30 shrink-0">
              <ShieldCheck className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Official Marks Audit &amp; Verification Registry
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Admin Exclusive
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Exam Authority
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comprehensive marks audit trail, teacher authentication verification, and official export center
              </p>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3.5 py-2 text-xs font-bold bg-[#1B4D3E] hover:bg-[#153e32] text-white rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Download Official A4 Landscape Audit PDF"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Export Audit PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Download Excel Workbook (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsvAction}
              className="px-3 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Download CSV"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-2 border border-slate-200 transition-all shadow-xs cursor-pointer"
              title="Print Audit Table"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* 2. Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total Audited</span>
              <Database className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xl font-black text-slate-900 mt-1">{totalEntries}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Total class mark records</p>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-emerald-800 text-[11px] font-bold uppercase tracking-wider">Portal Submissions</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-950 mt-1">{portalLoggedCount}</p>
            <p className="text-[10px] text-emerald-700 mt-0.5">Exact timestamp &amp; teacher ID</p>
          </div>

          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 text-[11px] font-bold uppercase tracking-wider">Sheet Pre-existing</span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-black text-blue-950 mt-1">{sheetLegacyCount}</p>
            <p className="text-[10px] text-blue-700 mt-0.5">Imported master database marks</p>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-amber-800 text-[11px] font-bold uppercase tracking-wider">Filtered Matches</span>
              <Filter className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl font-black text-amber-950 mt-1">{filteredRecords.length}</p>
            <p className="text-[10px] text-amber-700 mt-0.5">Matching current view criteria</p>
          </div>
        </div>

        {/* 3. Official Backend Limitation & Disclosure Banner */}
        <div className="mt-4 bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-900">
              System Audit Disclosure &amp; Timestamp Notice
            </p>
            <p className="text-amber-800 text-[11.5px] leading-relaxed">
              <strong>Portal Entries:</strong> Marks entered and submitted via the application portal record exact date, time, and authenticated teacher credentials in the system audit trail.
              <br />
              <strong>Google Sheet Master Entries:</strong> Pre-existing marks imported directly from the Google Sheet represent authoritative marks and student URN identity. Because standard Google Sheet rows do not record historical cell-level edit timestamps, these entries are faithfully audited as <em>&quot;Pre-existing in Sheet&quot;</em> without fabricating hypothetical historical dates.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Controls & Filters Bar */}
      <div className="no-print bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Class Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={e => {
                onClassChange(e.target.value as ClassLevel);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
            >
              <option value="">All Classes</option>
              {ALL_CLASSES.map(cls => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Section
            </label>
            <select
              value={sectionFilter}
              onChange={e => {
                setSectionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
            >
              <option value="ALL">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Subject
            </label>
            <select
              value={subjectFilter}
              onChange={e => {
                setSubjectFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
            >
              <option value="ALL">All Subjects</option>
              {availableSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* Segment Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Exam / Segment
            </label>
            <select
              value={segmentFilter}
              onChange={e => {
                setSegmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
            >
              <option value="ALL">All Segments</option>
              {availableSegments.map(seg => (
                <option key={seg} value={seg}>{seg}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Data Source
            </label>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
            >
              <option value="ALL">All Sources</option>
              <option value="LOGGED">Portal Saved (With Timestamp)</option>
              <option value="PRE_EXISTING">Sheet Pre-existing</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Search Student / URN
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Name, URN, Roll..."
                className="w-full text-xs pl-8 pr-2.5 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Official Marks Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-xs uppercase tracking-wider">
              Audited Marks Register ({filteredRecords.length} records)
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {selectedClass ? `Class ${selectedClass}` : 'Multi-Class View'} &bull; Session 2025-26
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-3 text-center w-10">#</th>
                <th className="py-3 px-3">Student URN</th>
                <th className="py-3 px-2 text-center w-12">Roll</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-3 text-center">Class-Sec</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-3 text-center">Segment</th>
                <th className="py-3 px-3 text-center">Mark</th>
                <th className="py-3 px-3">Teacher ID</th>
                <th className="py-3 px-3">Teacher Name</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Saved Date</th>
                <th className="py-3 px-3 text-center">Saved Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 text-xs">
                    No matching marks audit entries found for the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, index) => {
                  const globalIdx = (currentPage - 1) * pageSize + index + 1;
                  const isLogged = Boolean(record.savedAt);
                  const dateDisplay = record.savedAt
                    ? formatDisplayDate(record.savedAt)
                    : 'Pre-existing';
                  const timeDisplay = record.savedAt
                    ? formatDisplayTime(record.savedAt)
                    : '—';

                  return (
                    <tr
                      key={record.id || `${record.urn}_${record.subject}_${record.segment}_${index}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                        {globalIdx}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {record.urn || record.admNo || '—'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                        {record.roll || '—'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {record.studentName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                        {record.className}-{record.section || 'A'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 font-semibold">
                        {record.subject}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px]">
                          {record.segment}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-slate-950 text-sm">
                        <span
                          className={`px-2 py-0.5 rounded-lg ${
                            record.mark === 'AB' || record.mark === 'Absent'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                          }`}
                        >
                          {record.mark}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {record.teacherId || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {record.teacherName || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLogged
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isLogged ? 'Verified Portal Save' : 'Sheet Master Record'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-800">
                        {dateDisplay}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">
                        {timeDisplay}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Pagination & Summary */}
        <div className="no-print bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <strong>{Math.min(filteredRecords.length, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
            <strong>{Math.min(filteredRecords.length, currentPage * pageSize)}</strong> of{' '}
            <strong>{filteredRecords.length}</strong> audited records
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 px-2 font-mono">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
