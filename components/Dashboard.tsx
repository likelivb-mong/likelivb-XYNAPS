import React, { useEffect, useState } from 'react';
import { RANK_LABEL } from '../constants';
import { BranchCode, AttendanceStatus, AttendanceRecord, Schedule, Employee } from '../types';
import { MapPin, Activity, Sparkles, TrendingUp, Sun, CalendarClock, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateWorkforceInsight } from '../services/geminiService';

interface DashboardProps {
    attendanceData: AttendanceRecord[];
    schedules: Schedule[];
    employees: Employee[];
}

const Dashboard: React.FC<DashboardProps> = ({ attendanceData, schedules, employees }) => {
  const attendance = attendanceData;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getLocalDateStr = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const selectedDateStr = getLocalDateStr(selectedDate);
  const isToday = selectedDateStr === getLocalDateStr(new Date());

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    const dailyAttendance = attendance.filter(a => a.date === selectedDateStr);
    const dailySchedules = schedules.filter(s => s.date === selectedDateStr);
    
    const result = await generateWorkforceInsight(employees, dailyAttendance, dailySchedules, `${selectedDateStr}일자 출근 현황과 특이사항을 분석해줘.`);
    setInsight(result);
    setLoadingInsight(false);
  };

  const getElapsedTimeString = (startTimeStr: string) => {
    const start = new Date(startTimeStr).getTime();
    const now = currentTime.getTime();
    const diff = Math.max(0, Math.floor((now - start) / 1000));
    
    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const selectedDateAttendance = attendance.filter(a => a.date === selectedDateStr);
  const workingCount = selectedDateAttendance.filter(a => a.status === AttendanceStatus.WORKING).length;
  const scheduledCount = schedules.filter(s => s.date === selectedDateStr).length;
  const attendanceRate = scheduledCount > 0 ? Math.round((selectedDateAttendance.length / scheduledCount) * 100) : 0;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header with Date Navigation */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-2 md:mb-6">
        <div className="flex flex-col gap-1">
            <h2 className="text-[24px] md:text-[34px] font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">대시보드</h2>
            <p className="text-zinc-500 text-[14px] md:text-[17px] font-medium">
                {selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3 bg-white dark:bg-white/5 rounded-full p-1.5 shadow-sm border border-black/5 dark:border-white/10 self-start md:self-auto w-full md:w-auto justify-between md:justify-start">
            <button onClick={handlePrevDay} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0">
                <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-300" />
            </button>
            
            <div className="relative flex-1 text-center">
                <input 
                    type="date" 
                    value={selectedDateStr}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="bg-transparent border-none text-[14px] md:text-[15px] font-semibold text-zinc-900 dark:text-white outline-none text-center w-[110px] cursor-pointer p-0"
                />
            </div>

            <button onClick={handleNextDay} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0">
                <ChevronRight size={20} className="text-zinc-600 dark:text-zinc-300" />
            </button>
        </div>
      </div>

      {/* Bento Grid Layout - Top Cards in one horizontal row (col-span-4) */}
      <div className="grid grid-cols-12 gap-2 md:gap-4">
        
        {/* Time Card */}
        <div className="col-span-4 apple-glass p-3 md:p-4 rounded-[16px] md:rounded-[20px] flex flex-col justify-between h-[100px] md:h-[120px] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
          <div className="relative z-10 flex justify-between items-start">
             <div className="flex flex-col min-w-0">
                <span className="text-[9px] md:text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide truncate">SEOUL</span>
                <span className="text-[10px] md:text-[11px] text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap hidden md:block">
                  {currentTime.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                </span>
             </div>
             <Sun className="text-orange-500 dark:text-yellow-400 w-[14px] h-[14px] md:w-[18px] md:h-[18px] shrink-0" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-end">
             <div className="text-[20px] md:text-[36px] font-medium text-zinc-900 dark:text-white leading-none tracking-tighter">
                {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
             </div>
             <div className="flex items-center gap-1 mt-1 md:mb-1">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-[9px] md:text-[10px] text-zinc-500 dark:text-zinc-400 truncate">정상</span>
             </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="col-span-4 apple-glass p-3 md:p-4 rounded-[16px] md:rounded-[20px] flex flex-col justify-between h-[100px] md:h-[120px] relative overflow-hidden">
          <div className="absolute right-3 top-3 md:right-4 md:top-4 p-1.5 bg-black/5 dark:bg-white/5 rounded-full hidden md:block">
            <Activity className="text-green-600 dark:text-green-400 w-[14px] h-[14px]" />
          </div>
          <span className="text-[10px] md:text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 truncate">
              {isToday ? '현재 근무' : '총 근무'}
          </span>
          
          <div>
            <div className="flex items-end gap-1 md:gap-2">
              <span className="text-[22px] md:text-[36px] font-semibold text-zinc-900 dark:text-white tracking-tight leading-none">
                {isToday ? workingCount : selectedDateAttendance.length}
              </span>
              <span className="text-[11px] md:text-[13px] text-zinc-500 font-medium mb-0.5 md:mb-1">
                  / {isToday ? employees.length : scheduledCount}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 rounded-full w-fit max-w-full">
              <TrendingUp className="text-green-600 dark:text-green-500 w-[10px] h-[10px] shrink-0" />
              <span className="text-[9px] md:text-[11px] font-semibold text-green-600 dark:text-green-500 truncate">
                  {isToday ? '실시간' : `${attendanceRate}%`}
              </span>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="col-span-4 apple-glass p-3 md:p-4 rounded-[16px] md:rounded-[20px] flex flex-col h-[100px] md:h-[120px] relative overflow-hidden border border-purple-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 dark:from-purple-500/10 via-transparent to-transparent opacity-50"></div>
          <div className="relative z-10 flex items-center gap-1 mb-1 md:mb-2">
             <Sparkles className="text-purple-600 dark:text-purple-400 w-[12px] h-[12px] md:w-[14px] md:h-[14px]" />
             <span className="text-[10px] md:text-[12px] font-semibold text-zinc-700 dark:text-zinc-200 truncate">AI 분석</span>
          </div>
          
          <div className="relative z-10 flex-1 flex flex-col justify-between min-h-0">
            {loadingInsight ? (
               <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-[10px] md:text-[11px] h-full">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  분석 중...
               </div>
            ) : (
              <p className="text-[10px] md:text-[12px] text-zinc-600 dark:text-zinc-300 leading-tight line-clamp-3 md:line-clamp-2">
                 {insight || "특이사항 없음"}
              </p>
            )}
            
            {!insight && (
              <button 
                onClick={handleGenerateInsight} 
                className="self-start mt-auto px-2 py-0.5 md:px-2.5 md:py-1 bg-zinc-900 dark:bg-white text-white dark:text-black text-[9px] md:text-[10px] font-bold rounded-full hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors whitespace-nowrap"
              >
                지금 분석
              </button>
            )}
          </div>
        </div>

        {/* Branch List */}
        <div className="col-span-12 mt-2 md:mt-4">
           <div className="flex justify-between items-center mb-3 md:mb-4 px-1">
               <h3 className="text-[16px] md:text-[20px] font-bold text-zinc-900 dark:text-white">지점별 현황</h3>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-5">
              {Object.values(BranchCode).map((branch) => {
                const branchEmployees = employees.filter(e => e.branch === branch);
                if (branchEmployees.length === 0) return null;
                
                const mergedData = branchEmployees.map(emp => {
                    const schedule = schedules.find(s => s.employeeId === emp.id && s.date === selectedDateStr);
                    const record = attendance.find(a => a.employeeId === emp.id && a.date === selectedDateStr);
                    return { emp, schedule, record };
                });

                mergedData.sort((a, b) => {
                    const statusWeight = (item: any) => {
                        if (item.record?.status === AttendanceStatus.WORKING) return 1;
                        if (item.record?.status === AttendanceStatus.OFF_WORK) return 2;
                        if (item.schedule) return 3;
                        return 4;
                    };
                    const weightA = statusWeight(a);
                    const weightB = statusWeight(b);
                    if (weightA !== weightB) return weightA - weightB;
                    if (weightA === 1) {
                         return (a.record?.clockIn || '').localeCompare(b.record?.clockIn || '');
                    }
                    return 0;
                });

                const branchActiveCount = mergedData.filter(d => d.record?.status === AttendanceStatus.WORKING).length;

                return (
                  <div key={branch} className="apple-glass rounded-[24px] overflow-hidden flex flex-col">
                    <div className="px-4 py-3 md:px-6 md:py-4 bg-black/[0.02] dark:bg-white/[0.03] border-b border-black/5 dark:border-white/5 flex justify-between items-center">
                      <div className="flex items-center gap-2 md:gap-3">
                         <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <MapPin size={14} className="text-zinc-600 dark:text-zinc-400" />
                         </div>
                         <h4 className="text-[14px] md:text-[15px] font-semibold text-zinc-900 dark:text-white">{branch}</h4>
                      </div>
                      <span className="text-[11px] font-medium text-zinc-500 bg-black/5 dark:bg-black/20 px-2 py-1 rounded-lg">
                        {branchActiveCount}명 근무 중
                      </span>
                    </div>

                    <div className="p-2 md:p-3">
                       {mergedData.length === 0 ? (
                           <div className="text-center py-4 text-[13px] text-zinc-400">데이터 없음</div>
                       ) : (
                           mergedData.map(({ emp, schedule, record }) => {
                              const isWorking = record?.status === AttendanceStatus.WORKING;
                              const isOff = record?.status === AttendanceStatus.OFF_WORK;
                              
                              const clockInTime = record ? new Date(record.clockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
                              const clockOutTime = record?.clockOut ? new Date(record.clockOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
                              const scheduleTime = schedule ? `${schedule.startTime} - ${schedule.endTime}` : '스케줄 없음';

                              return (
                                <div key={emp.id} className="flex items-center justify-between p-2.5 md:p-3 rounded-[16px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors group border border-transparent hover:border-black/5 dark:hover:border-white/5">
                                   
                                   {/* Name & Role */}
                                   <div className="flex items-center gap-2 md:gap-3 w-[100px] md:min-w-[100px] shrink-0">
                                      <div className={`relative w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0 ${isWorking ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : isOff ? 'bg-zinc-400 dark:bg-zinc-600' : 'bg-transparent border border-zinc-300 dark:border-zinc-600'}`}></div>
                                      <div className="truncate">
                                         <p className="text-[13px] md:text-[15px] font-bold text-zinc-900 dark:text-zinc-200 leading-tight truncate">{emp.name}</p>
                                         <p className="text-[10px] md:text-[11px] text-zinc-500 font-medium truncate">{RANK_LABEL[emp.position]}</p>
                                      </div>
                                   </div>

                                   {/* Schedule & Time */}
                                   <div className="flex flex-col flex-1 px-2 md:px-4 gap-0.5">
                                       <div className="flex items-center gap-1 text-[10px] md:text-[12px] text-zinc-400 dark:text-zinc-500">
                                           <CalendarClock size={10} className="md:w-3 md:h-3" />
                                           <span className="truncate">{scheduleTime}</span>
                                       </div>
                                       
                                       <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] md:text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                                           {record ? (
                                               <>
                                                 <div className="flex items-center gap-1">
                                                     <span className="text-zinc-400 text-[9px] md:text-[10px]">IN</span>
                                                     {clockInTime}
                                                 </div>
                                                 {isOff && (
                                                     <div className="flex items-center gap-1">
                                                         <span className="text-zinc-400 text-[9px] md:text-[10px]">OUT</span>
                                                         {clockOutTime}
                                                     </div>
                                                 )}
                                               </>
                                           ) : (
                                               <span className="text-zinc-400 text-[11px]">-</span>
                                           )}
                                       </div>
                                   </div>

                                   {/* Timer/Status */}
                                   <div className="text-right w-[70px] md:min-w-[90px] shrink-0">
                                      {isWorking ? (
                                        <div className="flex flex-col items-end">
                                           <div className="text-[13px] md:text-[16px] font-mono font-bold text-green-600 dark:text-green-400 tracking-tight leading-none">
                                              {getElapsedTimeString(record!.clockIn)}
                                           </div>
                                           <div className="text-[9px] md:text-[10px] text-green-600/70 dark:text-green-400/70 font-medium mt-0.5 flex items-center gap-1 animate-pulse">
                                               <Activity size={10} /> <span className="hidden md:inline">근무 중</span>
                                           </div>
                                        </div>
                                      ) : isOff ? (
                                        <span className="text-[10px] md:text-[11px] font-medium text-zinc-500 bg-zinc-200/50 dark:bg-zinc-800 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ml-auto">
                                          <LogOut size={10} /> 퇴근
                                        </span>
                                      ) : (
                                        <span className="text-[10px] md:text-[11px] font-medium text-zinc-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full w-fit ml-auto">
                                          미출근
                                        </span>
                                      )}
                                   </div>
                                </div>
                              );
                           })
                       )}
                    </div>
                  </div>
                );
              })}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;