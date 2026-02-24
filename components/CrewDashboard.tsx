import React, { useState, useEffect, useMemo } from 'react';
import { Employee, AttendanceStatus, AttendanceTag, ApprovalRequest, AttendanceRecord, ScheduleType, Schedule } from '../types';
import { Play, Square, MapPin, CalendarClock, AlertTriangle, CheckCircle2, Timer, PartyPopper, Calendar, Clock, ChevronRight, UserCheck, X } from 'lucide-react';
import { BRANCH_NAMES } from '../constants';
import AttendancePanel from './AttendancePanel';

interface CrewDashboardProps {
  currentUser: Employee;
  attendanceData: AttendanceRecord[];
  approvalRequests: ApprovalRequest[];
  onRequestClockIn: (req: ApprovalRequest) => void;
  onDirectClockIn: (rec: AttendanceRecord) => void;
  onDirectClockOut: (recordId: string, endTime: string) => void;
  onNavigateToSchedule: () => void;
  schedules: Schedule[];
}

const CrewDashboard: React.FC<CrewDashboardProps> = ({ 
    currentUser, 
    attendanceData, 
    approvalRequests,
    onRequestClockIn,
    onDirectClockIn,
    onDirectClockOut,
    onNavigateToSchedule,
    schedules
}) => {
  // Real-time state for timer
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Logic Helpers ---

  const getLocalDateStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const todayStr = getLocalDateStr();
  
  // 1. Active Record Detection
  const userRecords = attendanceData
    .filter(r => r.employeeId === currentUser.id)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
  const lastRecord = userRecords[0];
  const activeRecord = lastRecord?.status === AttendanceStatus.WORKING ? lastRecord : undefined;

  // 2. Work Completion Detection (Disabled to allow re-clock in)
  // We want to return to "Clock In" state even after work is done for the day.
  const isTodayWorkDone = false; 
  
  // 3. Today's Stats
  const todayRecords = attendanceData.filter(a => a.employeeId === currentUser.id && a.date === todayStr);
  const todayMinutes = todayRecords.reduce((sum, rec) => sum + (rec.accumulatedMinutes || 0), 0);
  
  // 4. Pending Requests
  const pendingClockInRequest = approvalRequests.find(r => r.employeeId === currentUser.id && r.type === 'CLOCK_IN' && r.status === 'PENDING' && r.targetDate === todayStr);

  // 5. Next Schedule Logic (Detailed)
  const nextSchedule = useMemo(() => {
    const nowTime = new Date().getTime();
    const upcoming = schedules
        .filter(s => s.employeeId === currentUser.id)
        .map(s => {
            const startDateTime = new Date(`${s.date}T${s.startTime}`);
            return { ...s, startDateTime };
        })
        .filter(s => s.startDateTime.getTime() > nowTime - (60 * 60 * 1000)) // Show schedules that started 1 hour ago or are in future
        .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());
    
    return upcoming[0]; // The very next one
  }, [currentUser.id, now, schedules]); // Update when time passes significantly (re-render triggers)

  // --- Modal States ---
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestType, setRequestType] = useState<'EARLY' | 'LATE_OVER_15' | 'NO_SCHEDULE'>('NO_SCHEDULE');
  
  // Clock Out Confirmation Modal
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);

  // --- Handlers ---

  const handleClockInClick = () => {
    // Check against *Today's* schedule specifically for clocking in
    const todaySchedule = schedules.find(s => s.employeeId === currentUser.id && s.date === todayStr);
    const currentClickTime = new Date();
    
    if (!todaySchedule) {
        setRequestType('NO_SCHEDULE');
        setIsRequestModalOpen(true);
        return;
    }

    const [schedHour, schedMin] = todaySchedule.startTime.split(':').map(Number);
    const scheduleDate = new Date(currentClickTime);
    scheduleDate.setHours(schedHour, schedMin, 0, 0);

    const diffMs = scheduleDate.getTime() - currentClickTime.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes > 15) {
        setRequestType('EARLY');
        setIsRequestModalOpen(true);
        return;
    }

    if (diffMinutes >= 0 && diffMinutes <= 15) {
        // Normal Clock In
        const newRecord: AttendanceRecord = {
            id: `att-${Date.now()}`,
            employeeId: currentUser.id,
            date: todayStr,
            clockIn: currentClickTime.toISOString(),
            accumulatedMinutes: 0,
            status: AttendanceStatus.WORKING,
            tag: AttendanceTag.NORMAL
        };
        onDirectClockIn(newRecord);
        return;
    }

    if (diffMinutes < 0 && diffMinutes >= -15) {
        // Late but allowed
        if (confirm(`현재 스케줄(${todaySchedule.startTime})보다 늦었습니다.\n'지각' 상태로 출근하시겠습니까?`)) {
            const newRecord: AttendanceRecord = {
                id: `att-${Date.now()}`,
                employeeId: currentUser.id,
                date: todayStr,
                clockIn: currentClickTime.toISOString(),
                accumulatedMinutes: 0,
                status: AttendanceStatus.WORKING,
                tag: AttendanceTag.LATE
            };
            onDirectClockIn(newRecord);
        }
        return;
    }

    if (diffMinutes < -15) {
        setRequestType('LATE_OVER_15');
        setIsRequestModalOpen(true);
        return;
    }
  };

  const handleClockOutClick = () => {
      setIsClockOutModalOpen(true);
  };

  const confirmClockOut = () => {
    if (activeRecord) {
        const endTime = new Date().toISOString();
        onDirectClockOut(activeRecord.id, endTime);
        setIsClockOutModalOpen(false);
    }
  };

  const submitRequest = () => {
      if (!requestReason.trim()) return alert('사유를 입력해주세요.');
      const currentClickTime = new Date();
      const newRequest: ApprovalRequest = {
        id: `req-${Date.now()}`,
        employeeId: currentUser.id,
        type: 'CLOCK_IN',
        description: `[${requestType === 'EARLY' ? '조기 출근' : requestType === 'LATE_OVER_15' ? '15분 이상 지각' : '스케줄 외 근무'}] ${requestReason}`,
        status: 'PENDING',
        requestDate: todayStr,
        targetDate: todayStr,
        startTime: currentClickTime.toISOString(),
      };
      onRequestClockIn(newRequest);
      setIsRequestModalOpen(false);
      setRequestReason('');
      alert('승인 요청이 전송되었습니다.');
  };

  const getTimerDisplay = () => {
    if (!activeRecord) return "00:00:00";
    const start = new Date(activeRecord.clockIn).getTime();
    const current = now.getTime();
    const diff = Math.max(0, Math.floor((current - start) / 1000));
    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // View Determination
  const isWorking = !!activeRecord;
  const isPending = !!pendingClockInRequest;
  const displayTag = activeRecord?.tag || (lastRecord?.tag);

  // Time formatting for next schedule
  const formatScheduleDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      return `${date.getMonth() + 1}.${date.getDate()} (${days[date.getDay()]})`;
  };

  const getRelativeTime = (startDateTime: Date) => {
      const diffMs = startDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMs < 0) return "진행 중";
      if (diffHours < 1) return "곧 시작";
      if (diffHours < 24) return `${Math.floor(diffHours)}시간 후 시작`;
      if (diffDays === 1) return "내일";
      return `${diffDays}일 후`;
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in max-w-5xl mx-auto pb-24">
      
      {/* 1. Header Area */}
      <div className="flex justify-between items-end px-1">
        <div className="flex flex-col gap-1">
            <h2 className="text-[20px] md:text-[28px] font-bold text-zinc-900 dark:text-white tracking-tight">
                {currentUser.name}님, 안녕하세요 👋
            </h2>
            <p className="text-[13px] text-zinc-500 font-medium">
                {BRANCH_NAMES[currentUser.branch]} • {isWorking ? '🔥 오늘도 화이팅!' : '좋은 하루 되세요!'}
            </p>
        </div>
        <div className="text-right hidden md:block">
            <div className="text-[24px] font-mono font-bold text-zinc-900 dark:text-white leading-none">
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[12px] text-zinc-500 mt-1">
                {now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
        </div>
      </div>

      {/* 2. Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
          
          {/* Card A: Clock In/Out (Hero) */}
          <div className="col-span-1 md:row-span-2 apple-glass rounded-[24px] p-5 md:p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-xl border border-white/20 min-h-[280px]">
                {/* Status Indicator Pulse */}
                {isWorking && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse"></div>
                )}
                
                <div className="flex-1 flex flex-col items-center justify-center w-full text-center z-10">
                    {isWorking ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 relative">
                                <div className="absolute inset-0 rounded-full border-4 border-green-500/20 border-t-green-500 animate-spin"></div>
                                <Timer className="text-green-600 dark:text-green-400 w-7 h-7" />
                            </div>
                            <div className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">Work Time</div>
                            <div className="text-[38px] md:text-[48px] font-bold text-zinc-900 dark:text-white leading-none tracking-tighter font-mono mb-3 tabular-nums">
                                {getTimerDisplay()}
                            </div>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-[12px] font-medium text-zinc-600 dark:text-zinc-300">
                                    {new Date(activeRecord.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 시작
                                </span>
                                {displayTag === AttendanceTag.LATE && (
                                    <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-[11px] font-bold">지각</span>
                                )}
                            </div>
                        </>
                    ) : isPending ? (
                        <>
                            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                <AlertTriangle className="text-orange-500 w-7 h-7" />
                            </div>
                            <div className="text-[18px] font-bold text-zinc-900 dark:text-white mb-2">승인 대기 중</div>
                            <div className="text-[13px] text-zinc-500 px-8 leading-relaxed mb-4">
                                관리자가 근무 요청을 확인하고 있습니다.<br/>잠시만 기다려주세요.
                            </div>
                        </>
                    ) : (
                        <>
                             <div className="w-20 h-20 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <UserCheck className="text-zinc-400 dark:text-zinc-500 w-8 h-8" strokeWidth={1.5} />
                             </div>
                             <div className="text-[16px] font-bold text-zinc-900 dark:text-white mb-1">출근 전입니다</div>
                             <div className="text-[12px] text-zinc-500 mb-6">오늘도 안전하게 근무하세요!</div>
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="w-full z-10 mt-2 px-4">
                    {!isWorking ? (
                        <button 
                            onClick={handleClockInClick}
                            disabled={isPending}
                            className={`w-full py-4 rounded-[16px] font-bold text-[16px] shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                isPending 
                                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-white/5 dark:text-zinc-600'
                                : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200'
                            }`}
                        >
                            {isPending ? (
                                <>
                                    <Clock size={20} className="animate-pulse" /> 승인 대기 중...
                                </>
                            ) : (
                                <>
                                    <Play size={20} fill="currentColor" /> 출근하기
                                </>
                            )}
                        </button>
                    ) : (
                        <button 
                            onClick={handleClockOutClick}
                            className="w-full py-4 rounded-[16px] bg-[#FF453A] hover:bg-red-600 text-white font-bold text-[16px] shadow-lg shadow-red-500/30 transform transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Square size={20} fill="currentColor" /> 퇴근하기
                        </button>
                    )}
                </div>
          </div>

          {/* Card B: Next Schedule (Redesigned & Compact) */}
          <div className="col-span-1 apple-glass rounded-[24px] p-4 relative overflow-hidden flex flex-col justify-between min-h-[130px] group border border-white/20">
             <div>
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                             <CalendarClock size={13} />
                        </div>
                        <span className="text-[12px] font-bold text-zinc-500 tracking-tight">다음 근무</span>
                    </div>
                    {nextSchedule && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            getRelativeTime(nextSchedule.startDateTime) === '곧 시작' ? 'bg-red-100 text-red-600 animate-pulse' : 
                            getRelativeTime(nextSchedule.startDateTime) === '진행 중' ? 'bg-green-100 text-green-600' :
                            'bg-blue-100 text-blue-600'
                        }`}>
                            {getRelativeTime(nextSchedule.startDateTime)}
                        </span>
                    )}
                </div>
                
                {nextSchedule ? (
                    <div>
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-baseline gap-2">
                                <div className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 leading-none">
                                    {formatScheduleDate(nextSchedule.date)}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                                 <div className="text-[20px] font-bold text-zinc-900 dark:text-white leading-none tracking-tight">
                                     {nextSchedule.startTime}
                                 </div>
                                 <span className="text-[12px] text-zinc-400 font-medium">~ {nextSchedule.endTime}</span>
                            </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[6px] border ${
                                 nextSchedule.type === ScheduleType.SUBSTITUTE ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-white/5 dark:border-white/10 dark:text-zinc-400'
                             }`}>
                                 {nextSchedule.type === ScheduleType.FIXED ? '고정 근무' : '대타 근무'}
                             </span>
                             <span className="text-[10px] font-medium px-2 py-0.5 rounded-[6px] bg-zinc-50 text-zinc-500 border border-zinc-100 dark:bg-white/5 dark:border-white/10">
                                 9시간 예정
                             </span>
                        </div>
                    </div>
                ) : (
                    <div className="mt-2 flex flex-col items-center justify-center text-center h-full pb-2 opacity-60">
                        <Calendar className="text-zinc-300 w-6 h-6 mb-1" />
                        <div className="text-[12px] font-medium text-zinc-400">예정된 스케줄이 없습니다.</div>
                    </div>
                )}
             </div>
          </div>

          {/* Card C: View Schedule Link (New & Compact) */}
          <div 
            onClick={onNavigateToSchedule}
            className="col-span-1 apple-glass rounded-[24px] p-4 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-white/40 dark:hover:bg-white/10 transition-all group border border-white/20 relative overflow-hidden min-h-[130px]"
          >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm">
                  <Calendar className="text-zinc-600 dark:text-zinc-300 w-5 h-5" />
              </div>
              <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                  전체 스케줄 보기 <ChevronRight size={14} className="text-zinc-400" />
              </h3>
              <p className="text-[12px] text-zinc-500 mt-1">이번 달 근무 일정 확인하기</p>
          </div>
      </div>

      {/* Clock Out Confirmation Modal */}
      {isClockOutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-fade-in">
             <div className="apple-glass w-full max-w-[320px] rounded-[24px] shadow-2xl overflow-hidden animate-scale-up border border-black/10 dark:border-white/10 p-6 bg-surface dark:bg-[#1c1c1e] text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4">
                    <LogOutIcon size={24} />
                </div>
                <h3 className="text-[16px] font-bold text-zinc-900 dark:text-white mb-2">
                    퇴근하시겠습니까?
                </h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed mb-6">
                    퇴근을 완료하면 오늘 근무가 종료됩니다.<br/>
                    계속하시겠습니까?
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsClockOutModalOpen(false)}
                        className="flex-1 py-3 rounded-[14px] bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 font-medium text-[14px]"
                    >
                        취소
                    </button>
                    <button 
                        onClick={confirmClockOut}
                        className="flex-1 py-3 rounded-[14px] bg-[#FF453A] hover:bg-red-600 text-white font-bold text-[14px] shadow-lg shadow-red-500/20"
                    >
                        확인
                    </button>
                </div>
             </div>
          </div>
      )}

      {/* Request Approval Modal */}
      {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-fade-in">
             <div className="apple-glass w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden animate-scale-up border border-black/10 dark:border-white/10 p-6 bg-surface dark:bg-[#1c1c1e]">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-3">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-[16px] font-bold text-zinc-900 dark:text-white">
                        {requestType === 'NO_SCHEDULE' && '스케줄 외 근무 요청'}
                        {requestType === 'EARLY' && '조기 출근 승인 요청'}
                        {requestType === 'LATE_OVER_15' && '지각 사유서 제출'}
                    </h3>
                    <p className="text-[13px] text-zinc-500 mt-2 leading-relaxed">
                        {requestType === 'NO_SCHEDULE' && '오늘은 예정된 근무 스케줄이 없습니다.\n근무를 진행하려면 관리자 승인이 필요합니다.'}
                        {requestType === 'EARLY' && '근무 시작 15분 전입니다.\n조기 출근 승인이 필요합니다.'}
                        {requestType === 'LATE_OVER_15' && '15분 이상 지각하여 스케줄 외 근무로 처리됩니다.\n관리자 승인이 필요합니다.'}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 ml-1 block mb-1.5">
                            사유 입력 <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                            value={requestReason}
                            onChange={(e) => setRequestReason(e.target.value)}
                            placeholder={requestType === 'LATE_OVER_15' ? "늦은 사유를 구체적으로 입력해주세요." : "근무가 필요한 사유를 입력해주세요."}
                            className="w-full h-24 p-3 rounded-[12px] bg-zinc-100 dark:bg-black/20 resize-none text-[13px] focus:ring-2 focus:ring-orange-500/50 outline-none"
                        />
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsRequestModalOpen(false)}
                            className="flex-1 py-3 rounded-[14px] bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 font-medium text-[14px]"
                        >
                            취소
                        </button>
                        <button 
                            onClick={submitRequest}
                            className="flex-1 py-3 rounded-[14px] bg-[#0A84FF] hover:bg-blue-600 text-white font-bold text-[14px] shadow-lg shadow-blue-500/20"
                        >
                            요청 보내기
                        </button>
                    </div>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};

// Helper Icon Component for Modal
const LogOutIcon = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
);

export default CrewDashboard;