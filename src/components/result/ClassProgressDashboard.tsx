import React from 'react';
import { ClassLevel } from '../../types';
import { SUBJECTS_BY_CLASS } from '../../data/schoolConfig';
import { SystemControlConfig } from '../../types/resultTypes';
import { Users, CheckCircle2, Clock, BarChart3, AlertCircle, ArrowRight } from 'lucide-react';

interface ClassProgressDashboardProps {
  onSelectClass: (cls: ClassLevel) => void;
  systemConfig: SystemControlConfig;
  activeClass: ClassLevel;
  subjectAllotments?: Record<ClassLevel, string[]>;
}

export const ClassProgressDashboard: React.FC<ClassProgressDashboardProps> = ({
  onSelectClass,
  systemConfig,
  activeClass,
  subjectAllotments
}) => {
  const classes: ClassLevel[] = [
    'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
  ];

  // Realistic mock progress calculations
  const getClassProgress = (cls: ClassLevel) => {
    const subjects = (subjectAllotments && subjectAllotments[cls]) || SUBJECTS_BY_CLASS[cls] || [];
    // Deterministic progress for demo
    const seed = cls.charCodeAt(0) + cls.length;
    const completedSubs = Math.min(subjects.length, Math.floor((seed % 6) + 3));
    const percent = Math.round((completedSubs / subjects.length) * 100);
    return {
      totalSubjects: subjects.length,
      completedSubjects: completedSubs,
      percent: Math.min(100, Math.max(65, percent)),
      pendingSubjects: subjects.length - completedSubs
    };
  };

  return (
    <div className="space-y-6 my-4">
      {/* System Status Banner */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            systemConfig.marksEntryStatus === 'ON' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
          }`}>
            {systemConfig.marksEntryStatus === 'ON' ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Marks Submission Portal Status: {systemConfig.marksEntryStatus === 'ON' ? 'ACTIVE & OPEN' : 'LOCKED BY ADMIN'}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                systemConfig.marksEntryStatus === 'ON' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {systemConfig.marksEntryStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Submission Deadline: <strong>{systemConfig.marksEntryDeadline ? new Date(systemConfig.marksEntryDeadline).toLocaleString('en-IN') : 'No deadline set'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-right">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Classes</span>
            <strong className="text-slate-800 font-bold text-sm">13 Grades (NUR - X)</strong>
          </div>
          <div className="bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200 text-right">
            <span className="text-indigo-600 block text-[10px] uppercase font-semibold">Avg Readiness</span>
            <strong className="text-indigo-950 font-bold text-sm">88.5% Completed</strong>
          </div>
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {classes.map((cls) => {
          const { totalSubjects, completedSubjects, percent } = getClassProgress(cls);
          const isSelected = activeClass === cls;

          return (
            <div
              key={cls}
              onClick={() => onSelectClass(cls)}
              className={`bg-white rounded-xl p-4 border transition-all cursor-pointer hover:shadow-md relative overflow-hidden ${
                isSelected 
                  ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-sm' 
                  : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Class Grade</span>
                  <h4 className="text-base font-bold text-slate-900">Class {cls}</h4>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  percent === 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  percent >= 80 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                  'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {percent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${percent}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                  {completedSubjects}/{totalSubjects} Subjects
                </span>
                <span className="text-indigo-600 font-semibold flex items-center gap-0.5 hover:underline text-[11px]">
                  View Results <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
