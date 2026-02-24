import React, { useState } from 'react';
import { BRANCH_NAMES } from '../constants';
import { ApprovalRequest, BranchCode, Employee } from '../types';
import { Check, X, Clock, AlertTriangle, CalendarCheck, RotateCcw, Archive, Info, ArrowRightLeft, UserCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface ApprovalRequestsProps {
    requests: ApprovalRequest[];
    onAction: (id: string, action: 'APPROVED' | 'REJECTED' | 'PENDING') => void;
    employees: Employee[];
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
    CORRECTION: '근무 정정',
    LEAVE: '휴가 신청',
    OVERTIME: '연장 근무',
    EXPENSE: '비용 청구',
    CLOCK_IN: '출근/근무 요청',
    SUBSTITUTE: '대타 요청'
};

const ApprovalRequests: React.FC<ApprovalRequestsProps> = ({ requests, onAction, employees }) => {
  const [selectedBranch, setSelectedBranch] = useState<BranchCode | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');

  const filteredRequests = requests.filter(req => {
    if (selectedBranch !== 'ALL') {
         const emp = employees.find(e => e.id === req.employeeId);
         if (emp?.branch !== selectedBranch) return false;
    }
    return activeTab === 'PENDING' ? req.status === 'PENDING' : req.status !== 'PENDING';
  });

  return (
    <div className="space-y-3 md:space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
      {/* Header - Compact */}
      <div className="flex flex-col gap-3 pb-2 md:pb-4 border-b border-black/5 dark:border-white/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
                <h2 className="text-[20px] md:text-[34px] font-bold text-zinc-900 dark:text-white tracking-tight leading-none">승인 요청</h2>
            </div>
            
            {/* Compact Tabs */}
            <div className="flex bg-black/5 dark:bg-white/10 p-1 rounded-full w-full md:w-auto">
                <button 
                    onClick={() => setActiveTab('PENDING')}
                    className={`flex-1 md:flex-none px-4 py-1.5 md:px-5 md:py-2 rounded-full text-[12px] md:text-[13px] font-semibold transition-all ${activeTab === 'PENDING' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                    대기 중
                </button>
                <button 
                    onClick={() => setActiveTab('HISTORY')}
                    className={`flex-1 md:flex-none px-4 py-1.5 md:px-5 md:py-2 rounded-full text-[12px] md:text-[13px] font-semibold transition-all ${activeTab === 'HISTORY' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                    처리 내역
                </button>
            </div>
        </div>
      </div>

      {/* Branch Filter - Compact */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        <button onClick={() => setSelectedBranch('ALL')} className={`flex-shrink-0 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[12px] md:text-[13px] font-medium whitespace-nowrap border ${selectedBranch === 'ALL' ? 'bg-white dark:bg-zinc-700 border-white dark:border-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10'}`}>전체</button>
        {Object.entries(BRANCH_NAMES).map(([code, name]) => (
            <button key={code} onClick={() => setSelectedBranch(code as BranchCode)} className={`flex-shrink-0 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[12px] md:text-[13px] font-medium whitespace-nowrap border ${selectedBranch === code ? 'bg-white dark:bg-zinc-700 border-white dark:border-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10'}`}>{name}</button>
        ))}
      </div>
      
      <div className="space-y-2 md:space-y-4">
        {filteredRequests.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 font-light text-[13px] md:text-[14px]">요청 내역이 없습니다.</div>
        ) : (
            filteredRequests.map(req => {
            const emp = employees.find(e => e.id === req.employeeId);
            if (!emp) return null;

            // Substitute Logic
            const isSubstitute = req.type === 'SUBSTITUTE';
            const isSubPending = isSubstitute && (!req.substituteStatus || req.substituteStatus === 'PENDING');
            const isSubAccepted = isSubstitute && req.substituteStatus === 'ACCEPTED';

            return (
                <div key={req.id} className="apple-glass p-3 md:p-5 rounded-[16px] md:rounded-[20px] flex flex-col gap-3 md:gap-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1 w-full">
                            {/* Card Header */}
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <h3 className="text-[14px] md:text-[17px] font-semibold text-zinc-900 dark:text-white">{emp.name}</h3>
                                <span className="text-[10px] bg-black/5 px-1.5 py-0.5 rounded text-zinc-500">{BRANCH_NAMES[emp.branch]}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                    req.type === 'CORRECTION' ? 'bg-purple-100 text-purple-600' : 
                                    req.type === 'SUBSTITUTE' ? 'bg-orange-100 text-orange-600' :
                                    'bg-blue-100 text-blue-600'
                                }`}>
                                    {REQUEST_TYPE_LABELS[req.type]}
                                </span>
                            </div>
                            {/* Description */}
                            <p className="text-[13px] md:text-[14px] text-zinc-600 dark:text-zinc-300 leading-snug break-words">
                                {isSubAccepted ? <span className="text-blue-600 font-bold mr-1">[동료수락완료]</span> : ''}
                                {req.description}
                            </p>
                            
                            {/* Date */}
                            <div className="flex items-center gap-1.5 text-[11px] md:text-[12px] text-zinc-500 mt-1">
                                <CalendarCheck size={11} className="md:w-3 md:h-3" />
                                <span>{req.targetDate}</span>
                            </div>
                        </div>
                    </div>

                    {activeTab === 'PENDING' ? (
                        <div className="flex gap-2 w-full pt-2 border-t border-black/5 dark:border-white/10">
                            {isSubstitute && isSubPending ? (
                                <div className="flex-1 py-2.5 rounded-[10px] bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 font-semibold text-[13px] flex items-center justify-center gap-2 cursor-default">
                                    <ArrowRightLeft size={14} /> 동료 수락 대기 중
                                </div>
                            ) : (
                                <>
                                    <button onClick={() => onAction(req.id, 'REJECTED')} className="flex-1 py-2.5 rounded-[10px] bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-semibold text-[13px] hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">반려</button>
                                    <button onClick={() => onAction(req.id, 'APPROVED')} className="flex-1 py-2.5 rounded-[10px] bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold text-[13px] hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-lg shadow-black/10">
                                        {isSubstitute && isSubAccepted ? '최종 승인' : '승인'}
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex justify-end pt-2 border-t border-black/5 dark:border-white/10">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${req.status === 'APPROVED' ? 'text-green-600 bg-green-50 dark:bg-green-500/20 dark:text-green-400' : 'text-red-600 bg-red-50 dark:bg-red-500/20 dark:text-red-400'}`}>
                                {req.status === 'APPROVED' ? '승인됨' : '반려됨'}
                            </span>
                        </div>
                    )}
                </div>
            );
            })
        )}
      </div>
    </div>
  );
};

export default ApprovalRequests;