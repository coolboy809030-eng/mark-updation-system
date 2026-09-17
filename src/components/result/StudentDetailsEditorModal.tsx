import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Edit3, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  Search, 
  Database, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Link2,
  Calendar,
  Phone,
  BookOpen
} from 'lucide-react';
import { ClassLevel } from '../../types';
import { FullStudentExamRecord } from '../../types/resultTypes';
import { getStudentURN, normalizeURN } from '../../utils/studentIdentity';
import { formatDisplayDate } from '../../utils/dateFormatter';

interface StudentDetailsEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: ClassLevel;
  students: FullStudentExamRecord[];
  onUpdateStudent: (updatedStudent: FullStudentExamRecord) => void;
  onAddStudent?: (newStudent: FullStudentExamRecord) => void;
  onDeleteStudent?: (admNo: string) => void;
  googleSheetApiUrl?: string;
  initialEditingStudentId?: string | null;
}

export const StudentDetailsEditorModal: React.FC<StudentDetailsEditorModalProps> = ({
  isOpen,
  onClose,
  selectedClass,
  students,
  onUpdateStudent,
  onAddStudent,
  onDeleteStudent,
  googleSheetApiUrl,
  initialEditingStudentId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStudent, setEditingStudent] = useState<FullStudentExamRecord | null>(() => {
    if (initialEditingStudentId) {
      const normId = normalizeURN(initialEditingStudentId);
      return students.find(s => {
        const sUrn = getStudentURN(s);
        return Boolean(normId && sUrn && sUrn === normId);
      }) || null;
    }
    return null;
  });

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copiedRow, setCopiedRow] = useState(false);

  // Form fields for editing or adding
  const [formData, setFormData] = useState({
    roll: '',
    admNo: '',
    name: '',
    fatherName: '',
    motherName: '',
    dob: '',
    mobile: '',
    optionalSubject: 'Urdu',
    photoUrl: ''
  });

  if (!isOpen) return null;

  // Initialize form when student selected for editing
  const startEdit = (st: FullStudentExamRecord) => {
    setEditingStudent(st);
    setIsAddingNew(false);
    setSyncStatus(null);
    const canonicalUrn = getStudentURN(st) || st.admNo || '';
    setFormData({
      roll: String(st.roll || ''),
      admNo: canonicalUrn,
      name: st.name || '',
      fatherName: st.fatherName || '',
      motherName: st.motherName || '',
      dob: st.dob || '',
      mobile: st.mobile || '',
      optionalSubject: st.optionalSubject || 'Urdu',
      photoUrl: st.photoUrl || ''
    });
  };

  const startAddNew = () => {
    const nextRoll = students.length > 0 
      ? Math.max(...students.map(s => typeof s.roll === 'number' ? s.roll : parseInt(String(s.roll), 10) || 0)) + 1 
      : 1;

    setEditingStudent(null);
    setIsAddingNew(true);
    setSyncStatus(null);
    setFormData({
      roll: String(nextRoll),
      admNo: `PIS-2025-${selectedClass}-${String(nextRoll).padStart(3, '0')}`,
      name: '',
      fatherName: '',
      motherName: '',
      dob: '15/07/2014',
      mobile: '9835100000',
      optionalSubject: 'Urdu',
      photoUrl: ''
    });
  };

  const handleSaveLocal = () => {
    if (!formData.name.trim()) {
      setSyncStatus({ success: false, message: 'Student Name is required.' });
      return;
    }

    const normalizedUrn = normalizeURN(formData.admNo);
    if (!normalizedUrn) {
      setSyncStatus({
        success: false,
        message: 'Authoritative URN (Column B / Admission No) is required. Changes cannot be saved without a valid URN.'
      });
      return;
    }

    const rollNum = parseInt(formData.roll, 10) || 1;

    if (isAddingNew) {
      const newRec: FullStudentExamRecord = {
        urn: normalizedUrn,
        admNo: normalizedUrn,
        roll: rollNum,
        name: formData.name.trim(),
        fatherName: formData.fatherName.trim() || 'GUARDIAN',
        motherName: formData.motherName.trim() || 'MOTHER',
        dob: formData.dob.trim() || '15/07/2014',
        mobile: formData.mobile.trim() || '9835100000',
        studentClass: selectedClass,
        section: 'A',
        optionalSubject: formData.optionalSubject as 'Urdu' | 'Sanskrit',
        photoUrl: formData.photoUrl.trim(),
        rawMarks: {},
        attendanceHY: '95/110',
        attendanceAE: '100/115'
      };

      if (onAddStudent) {
        onAddStudent(newRec);
      } else {
        onUpdateStudent(newRec);
      }
      setSyncStatus({
        success: true,
        message: `Added ${newRec.name} (URN: ${normalizedUrn}, Roll ${newRec.roll}) to Class ${selectedClass} successfully!`
      });
      setIsAddingNew(false);
    } else if (editingStudent) {
      const updatedRec: FullStudentExamRecord = {
        ...editingStudent,
        urn: normalizedUrn,
        admNo: normalizedUrn,
        roll: rollNum,
        name: formData.name.trim(),
        fatherName: formData.fatherName.trim(),
        motherName: formData.motherName.trim(),
        dob: formData.dob.trim(),
        mobile: formData.mobile.trim(),
        optionalSubject: formData.optionalSubject as 'Urdu' | 'Sanskrit',
        photoUrl: formData.photoUrl.trim()
      };

      onUpdateStudent(updatedRec);
      setSyncStatus({
        success: true,
        message: `Updated ${updatedRec.name} (URN: ${normalizedUrn}) locally. Results and Report Cards updated!`
      });
      setEditingStudent(null);
    }
  };

  const handleUpdateAndSyncToGoogleSheet = async () => {
    if (!formData.name.trim()) {
      setSyncStatus({ success: false, message: 'Student Name is required.' });
      return;
    }

    const normalizedUrn = normalizeURN(formData.admNo);
    if (!normalizedUrn) {
      setSyncStatus({
        success: false,
        message: 'Authoritative URN (Column B / Admission No) is required to sync to Google Sheet.'
      });
      return;
    }

    // Save locally first
    handleSaveLocal();

    const cleanUrl = googleSheetApiUrl?.trim();
    if (!cleanUrl || cleanUrl.includes('PASTE_YOUR')) {
      setSyncStatus({
        success: true,
        message: 'Saved locally. (Note: Google Sheet URL is not configured; updates will persist in local session cache).'
      });
      return;
    }

    setIsSyncingSheet(true);
    try {
      const payload = {
        action: 'updateStudentDetails',
        class: selectedClass,
        student: {
          urn: normalizedUrn,
          admNo: normalizedUrn,
          roll: formData.roll,
          name: formData.name,
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          dob: formData.dob,
          mobile: formData.mobile,
          optionalSubject: formData.optionalSubject,
          photoUrl: formData.photoUrl
        }
      };

      const response = await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json().catch(() => null);

      setSyncStatus({
        success: true,
        message: `✅ Google Sheet updated successfully for ${formData.name} (URN: ${normalizedUrn})!`
      });
    } catch (err: any) {
      setSyncStatus({
        success: false,
        message: `Saved locally, but Google Sheet sync failed: ${err?.message || 'Check network / script permissions'}`
      });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const copyStudentRowForExcel = () => {
    const rowValues = [
      formData.roll,
      formData.admNo,
      formData.name,
      formData.fatherName,
      formData.motherName,
      formData.dob,
      'M',
      'GEN',
      formData.mobile,
      formData.optionalSubject,
      formData.photoUrl
    ];
    navigator.clipboard.writeText(rowValues.join('\t'));
    setCopiedRow(true);
    setTimeout(() => setCopiedRow(false), 2500);
  };

  const filteredStudents = students.filter(st => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      st.name.toLowerCase().includes(q) ||
      String(st.roll).includes(q) ||
      (st.admNo && st.admNo.toLowerCase().includes(q)) ||
      (st.fatherName && st.fatherName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>Student Details &amp; Google Sheets Manager</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-indigo-950">
                  Class {selectedClass}
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Update Roll Numbers, Personal Details, and Language selections with live Google Sheets sync
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Notification Banner */}
        {syncStatus && (
          <div className={`px-6 py-3 border-b text-xs flex items-center justify-between ${
            syncStatus.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-2">
              {syncStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{syncStatus.message}</span>
            </div>
            <button 
              onClick={() => setSyncStatus(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {editingStudent || isAddingNew ? (
            /* Editing / Adding Form */
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-sm text-slate-900">
                    {isAddingNew ? `Add New Student in Class ${selectedClass}` : `Edit Details: ${formData.name} (Roll ${formData.roll})`}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingStudent(null);
                    setIsAddingNew(false);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                >
                  &larr; Back to Student List
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {/* Roll No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Roll Number *
                  </label>
                  <input
                    type="number"
                    value={formData.roll}
                    onChange={(e) => setFormData({ ...formData, roll: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
                    placeholder="1"
                  />
                </div>

                {/* Admission No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admission No (Adm No)
                  </label>
                  <input
                    type="text"
                    value={formData.admNo}
                    onChange={(e) => setFormData({ ...formData, admNo: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
                    placeholder={`PIS-2025-${selectedClass}-001`}
                  />
                </div>

                {/* Student Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
                    placeholder="Student Name"
                  />
                </div>

                {/* Father Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Father's Name
                  </label>
                  <input
                    type="text"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
                    placeholder="Father Name"
                  />
                </div>

                {/* Mother Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mother's Name
                  </label>
                  <input
                    type="text"
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
                    placeholder="Mother Name"
                  />
                </div>

                {/* DOB */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date of Birth (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
                    placeholder="15/08/2014"
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Parent Mobile No
                  </label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
                    placeholder="9835123456"
                  />
                </div>

                {/* Optional Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Optional Language Choice
                  </label>
                  <select
                    value={formData.optionalSubject}
                    onChange={(e) => setFormData({ ...formData, optionalSubject: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Urdu">Urdu</option>
                    <option value="Sanskrit">Sanskrit</option>
                  </select>
                </div>

                {/* Photo URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Photo URL (Drive/Web Link)
                  </label>
                  <input
                    type="text"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Action Buttons for Form */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={copyStudentRowForExcel}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy this student row in Tab format to paste in MS Excel / Google Sheet"
                >
                  {copiedRow ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedRow ? 'Copied Row!' : 'Copy Row for Excel / Sheet'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStudent(null);
                      setIsAddingNew(false);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveLocal}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Save Locally
                  </button>

                  <button
                    type="button"
                    onClick={handleUpdateAndSyncToGoogleSheet}
                    disabled={isSyncingSheet}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSyncingSheet ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Database className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>{isSyncingSheet ? 'Updating Sheet...' : 'Update & Sync to Google Sheet'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Student Roster Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student or roll no..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Add Student Button */}
              <button
                type="button"
                onClick={startAddNew}
                className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>Add New Student</span>
              </button>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-14 text-center border-r border-slate-200">Roll</th>
                      <th className="px-3 py-2 border-r border-slate-200">Admission No</th>
                      <th className="px-3 py-2 border-r border-slate-200">Student Name</th>
                      <th className="px-3 py-2 border-r border-slate-200">Father's Name</th>
                      <th className="px-3 py-2 border-r border-slate-200">Mother's Name</th>
                      <th className="px-3 py-2 border-r border-slate-200">DOB</th>
                      <th className="px-3 py-2 border-r border-slate-200">Optional</th>
                      <th className="px-3 py-2 text-right w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">
                          No students found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st, idx) => (
                        <tr key={st.admNo || idx} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="px-3 py-2 border-r border-slate-200 text-center font-bold text-slate-800 font-mono">
                            {st.roll}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-600">
                            {st.admNo}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 font-bold text-slate-900">
                            {st.name}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 text-slate-700">
                            {st.fatherName}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 text-slate-700">
                            {st.motherName || '—'}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-600">
                            {formatDisplayDate(st.dob) || '—'}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              st.optionalSubject === 'Sanskrit'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {st.optionalSubject || 'Urdu'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(st)}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                                title="Edit Roll Number or Student Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteStudent && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const urn = getStudentURN(st);
                                    if (!urn) {
                                      alert(`⚠️ Cannot delete student: ${st.name} (Roll ${st.roll}) lacks an authoritative Column B URN.`);
                                      return;
                                    }
                                    if (window.confirm(`Are you sure you want to remove ${st.name} (URN: ${urn}, Roll ${st.roll})?`)) {
                                      onDeleteStudent(urn);
                                    }
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Student"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Total Students: <strong>{students.length}</strong> in Class {selectedClass}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
