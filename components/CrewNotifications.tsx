import React, { useState } from 'react';
import { Employee, ApprovalRequest } from '../types';
import { Bell, ArrowRightLeft, CheckCircle, XCircle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface CrewNotificationsProps {
  currentUser: Employee;
  requests: ApprovalRequest[];
  onSubstituteAction: (id: string, accepted: boolean) => void;
  employees: Employee[];
}

const CrewNotifications: React.FC<CrewNotificationsProps> = ({ currentUser, requests, onSubstituteAction, employees }) => {
  const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');

  // Requests sent BY the current user
  const sentRequests = requests
    .filter(r => r.employeeId === currentUser.id)
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  // Requests received BY the current user (Substitute requests)
  const receivedRequests = requests
    .filter(r => r.type === 'SUBSTITUTE' && r.substituteId === currentUser.id)
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  const getStatusBadge = (req: ApprovalRequest) => {
      if (req.type === 'SUBSTITUTE' && req.substituteId === currentUser.id) {
          // Logic for Received Substitute Requests
          if (req.substituteStatus === 'REJECTED') {
              return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">거절함</span>;
          }
          if (req.substituteStatus === 'ACCEPTED') {
               if (req.status === 'APPROVED') return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">최종 승인됨</span>;
               if (req.status === 'REJECTED') return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">관리자 반려</span>;
               return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">관리자 승인 대기</span>;
          }
          return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">수락 대기중</span>;
      }

      // Logic for Sent Requests
      if (req.status === 'APPROVED') return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">승인됨</span>;
      if (req.status === 'REJECTED') return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">반려됨</span>;
      
      // If it's a sub request sent by me
      if (req.type === 'SUBSTITUTE' && req.substituteStatus === 'ACCEPTED') {
          return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">동료 수락완료</span>;
      }

      return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">대기중</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20">
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-[16px] font-bold text-zinc-900 dark:text-white tracking-tight leading-none">알림 기록</h2>
        <p className="text-[13px] text-zinc-500 mt-1 font-medium">최근 7일간의 알림 내역입니다.</p>
      </div>

      <div className="flex p-1 bg-zinc-100 dark:bg-white/10 rounded-[12px] mb-4">
        <button
            onClick={() => setActiveTab('RECEIVED')}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-[10px] transition-all flex items-center justify-center gap-2 ${activeTab === 'RECEIVED' ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
        >
            <ArrowRightLeft size={14} /> 받은 대타 요청
            {receivedRequests.filter(r => !r.substituteStatus).length > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {receivedRequests.filter(r => !r.substituteStatus).length}
                </span>
            )}
        </button>
        <button
            onClick={() => setActiveTab('SENT')}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-[10px] transition-all flex items-center justify-center gap-2 ${activeTab === 'SENT' ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
        >
            <Bell size={14} /> 내가 보낸 요청
        </button>
      </div>

      <div className="space-y-3">
          {activeTab === 'RECEIVED' ? (
              receivedRequests.length === 0 ? (
                  <div className="text-center py-16 text-zinc-400 text-[13px] apple-glass rounded-[20px]">
                      받은 대타 요청이 없습니다.
                  </div>
              ) : (
                  receivedRequests.map(req => {
                      const sender = employees.find(e => e.id === req.employeeId);
                      const isPendingAction = !req.substituteStatus || req.substituteStatus === 'PENDING';

                      return (
                          <div key={req.id} className="apple-glass p-4 rounded-[16px] border border-black/5 dark:border-white/5 flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2">
                                      <span className="text-[14px] font-bold text-zinc-900 dark:text-white">{sender?.name || '알 수 없음'}</span>
                                      <span className="text-[12px] text-zinc-500">님의 대타 요청</span>
                                  </div>
                                  {getStatusBadge(req)}
                              </div>
                              
                              <div className="p-3 bg-zinc-50 dark:bg-white/5 rounded-[12px] text-[13px] text-zinc-700 dark:text-zinc-300">
                                  {req.description}
                                  <div className="mt-2 text-[12px] font-semibold text-zinc-500 flex items-center gap-1.5">
                                      <Clock size={12} /> {req.targetDate}
                                  </div>
                              </div>

                              {isPendingAction && req.status !== 'REJECTED' && (
                                  <div className="flex gap-2 mt-1">
                                      <button 
                                        onClick={() => onSubstituteAction(req.id, false)}
                                        className="flex-1 py-2.5 rounded-[10px] bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 font-semibold text-[13px] hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors"
                                      >
                                          거절
                                      </button>
                                      <button 
                                        onClick={() => onSubstituteAction(req.id, true)}
                                        className="flex-1 py-2.5 rounded-[10px] bg-blue-500 text-white font-semibold text-[13px] hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                                      >
                                          수락
                                      </button>
                                  </div>
                              )}
                          </div>
                      );
                  })
              )
          ) : (
              sentRequests.length === 0 ? (
                <div className="text-center py-16 text-zinc-400 text-[13px] apple-glass rounded-[20px]">
                    보낸 요청 내역이 없습니다.
                </div>
              ) : (
                  sentRequests.map(req => (
                      <div key={req.id} className="apple-glass p-4 rounded-[16px] border border-black/5 dark:border-white/5 flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                              <span className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                                  {req.type === 'CLOCK_IN' ? '근무 인정 요청' : 
                                   req.type === 'CORRECTION' ? '근무 기록 수정' :
                                   req.type === 'EXPENSE' ? '비용 청구' :
                                   req.type === 'SUBSTITUTE' ? '대타 요청' : '기타 요청'}
                              </span>
                              {getStatusBadge(req)}
                          </div>
                          <p className="text-[13px] text-zinc-600 dark:text-zinc-300 line-clamp-2">{req.description}</p>
                          <div className="text-[11px] text-zinc-400 flex justify-end">
                              {req.requestDate}
                          </div>
                      </div>
                  ))
              )
          )}
      </div>
    </div>
  );
};

export default CrewNotifications;