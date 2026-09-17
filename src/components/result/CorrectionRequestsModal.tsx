import React from 'react';
import { Check, X } from 'lucide-react';
import { CorrectionRequest } from '../../utils/correctionRequests';
import { formatDisplayDateTime } from '../../utils/dateFormatter';

interface CorrectionRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: CorrectionRequest[];
  onReview: (id: string, status: 'Approved' | 'Rejected') => void;
}

export const CorrectionRequestsModal: React.FC<CorrectionRequestsModalProps> = ({
  isOpen,
  onClose,
  requests,
  onReview
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-indigo-950 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold">Correction Requests</h3>
            <p className="text-xs text-indigo-200">Review exact teacher and URN-scoped mark corrections.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-auto p-4">
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">No correction requests.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase">
                <tr>
                  <th className="p-2">Teacher / Student</th><th className="p-2">URN</th><th className="p-2">Scope</th>
                  <th className="p-2">Old → New</th><th className="p-2">Reason / Date</th><th className="p-2">Status</th><th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {requests.map(request => (
                  <tr key={request.id}>
                    <td className="p-2"><strong>{request.teacherName}</strong><br />{request.teacherId}</td>
                    <td className="p-2 font-mono">{request.urn}</td>
                    <td className="p-2">Class {request.className} / {request.section}<br />{request.subject} / {request.segment}</td>
                    <td className="p-2 font-bold">{request.oldValue} → {request.requestedValue || 'Blank'}</td>
                    <td className="p-2 max-w-48">{request.reason}<br /><span className="text-slate-400 font-mono text-[11px]">{formatDisplayDateTime(request.createdAt)}</span></td>
                    <td className="p-2 font-bold">{request.status}</td>
                    <td className="p-2">
                      {request.status === 'Pending' && (
                        <div className="flex gap-1">
                          <button type="button" onClick={() => onReview(request.id, 'Approved')} className="p-1.5 rounded bg-emerald-600 text-white" title="Approve"><Check className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => onReview(request.id, 'Rejected')} className="p-1.5 rounded bg-rose-600 text-white" title="Reject"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
