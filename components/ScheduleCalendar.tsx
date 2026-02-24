import React, { useState } from 'react';
import { RANK_LABEL, MOCK_HOLIDAYS, BRANCH_NAMES } from '../constants';
import { Schedule, BranchCode, ScheduleType, Holiday, Employee, EmployeeRank, ApprovalRequest, AttendanceRecord, AttendanceStatus } from '../types';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Edit, PartyPopper, ArrowRightLeft, Trash2, Check } from 'lucide-react';

interface ScheduleCalendarProps {
  isCrewMode?: boolean;
  currentUser?: Employee;
  employees: Employee[];
  attendanceData?: AttendanceRecord[];
  onRequestSubstitute?: (request: ApprovalRequest) => void;
  onUpdateAttendance?: (record: AttendanceRecord) => void;
  onDeleteAttendance?: (recordId: string) => void;
  schedules: Schedule[];
  onAddSchedules: (schedules: Schedule[]) => void;
  onUpdateSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ 
  isCrewMode = false, 
  currentUser,
  employees,
  attendanceData = [],
  onRequestSubstitute,
  onUpdateAttendance,
  onDeleteAttendance,
  schedules,
  onAddSchedules,
  onUpdateSchedule,
  onDeleteSchedule
}) => {
  // Permission Logic
  const isLeader = isCrewMode && currentUser?.position === EmployeeRank.LEADER;
  // If not crew mode (Master) OR is Leader, they can manage schedules
  const canManage = !isCrewMode || isLeader;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>(MOCK_HOLIDAYS);
  
  // Branch Logic: If Leader, lock to their branch. If Master, default to ALL.
  const [selectedBranch, setSelectedBranch] = useState<BranchCode | 'ALL'>(
    (isCrewMode && currentUser) ? currentUser.branch : 'ALL'
  );
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'SCHEDULE' | 'HOLIDAY'>('SCHEDULE');
  const [selectedDateDetail, setSelectedDateDetail] = useState<Date | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  
  const [substituteTarget, setSubstituteTarget] = useState<Schedule | null>(null);
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string | null>(null);

  // States for Admin Attendance Editing
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [editAttendanceForm, setEditAttendanceForm] = useState<{
      clockIn: string;
      clockOut: string;
  } | null>(null);

  // Form States
  const [newSchedule, setNewSchedule] = useState({
    employeeId: '',
    type: ScheduleType.FIXED,
    startTime: '09:00',
    endTime: '18:00',
    date: new Date().toISOString().split('T')[0],
    weekdays: [],
  });

  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    extraHourlyPay: 1000,
  });

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getSchedulesForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return schedules.filter(s => {
      const emp = employees.find(e => e.id === s.employeeId);
      // Filter by selected branch (which is locked for Leaders)
      if (selectedBranch !== 'ALL' && emp?.branch !== selectedBranch) return false;
      return s.date === dateStr;
    });
  };

  const getAttendanceForDateAndEmp = (date: Date, empId: string) => {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return attendanceData.find(a => a.date === dateStr && a.employeeId === empId);
  };

  const getHolidayForDate = (date: Date) => {
     const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
     return holidays.find(h => h.date === dateStr);
  };

  const getDaySchedules = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return getSchedulesForDate(date);
  };

  const resetForm = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setNewSchedule({
      employeeId: '',
      type: ScheduleType.FIXED,
      startTime: '09:00',
      endTime: '18:00',
      date: todayStr,
      weekdays: [],
    });
    setNewHoliday({
      name: '',
      date: todayStr,
      extraHourlyPay: 1000
    });
    setEditingScheduleId(null);
    setActiveModalTab('SCHEDULE');
  };

  const handleSaveSchedule = () => {
    // Strict Permission Check
    if (!canManage) return alert('권한이 없습니다. 관리자 또는 크루장만 가능합니다.');

    if (!newSchedule.employeeId) return alert('직원을 선택해주세요.');

    if (editingScheduleId) {
      // Update
      const scheduleToUpdate = schedules.find(s => s.id === editingScheduleId);
      if(scheduleToUpdate) {
          onUpdateSchedule({
              ...scheduleToUpdate,
              employeeId: newSchedule.employeeId,
              date: newSchedule.date,
              startTime: newSchedule.startTime,
              endTime: newSchedule.endTime,
              type: newSchedule.type
          });
      }
    } else {
      // Create
      const newSchedulesData: Schedule[] = [];
      const isRecurringMode = newSchedule.type === ScheduleType.FIXED && newSchedule.weekdays.length > 0;

      if (isRecurringMode) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

        for (let d = 1; d <= daysInCurrentMonth; d++) {
          const date = new Date(year, month, d);
          if (newSchedule.weekdays.includes(date.getDay())) {
            newSchedulesData.push({
              id: `sch-${Date.now()}-${d}`,
              employeeId: newSchedule.employeeId,
              date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
              startTime: newSchedule.startTime,
              endTime: newSchedule.endTime,
              type: ScheduleType.FIXED,
            });
          }
        }
      } else {
        newSchedulesData.push({
          id: `sch-${Date.now()}`,
          employeeId: newSchedule.employeeId,
          date: newSchedule.date,
          startTime: newSchedule.startTime,
          endTime: newSchedule.endTime,
          type: newSchedule.type, 
        });
      }
      onAddSchedules(newSchedulesData);
    }
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleDeleteCurrentSchedule = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Strict Permission Check
      if (!canManage) {
        alert('권한이 없습니다. 관리자 또는 크루장만 가능합니다.');
        return;
      }

      if (!editingScheduleId) return;

      const schedule = schedules.find(s => s.id === editingScheduleId);
      if (!schedule) return;

      // Use timeout to allow UI ripple to finish
      setTimeout(() => {
          if(window.confirm('정말 이 스케줄을 삭제하시겠습니까?\n(연관된 근무 기록이 있다면 함께 삭제됩니다)')) {
              // 1. Check if there is a linked attendance record
              const linkedRecord = attendanceData.find(a => a.date === schedule.date && a.employeeId === schedule.employeeId);
              
              // 2. If exists, delete it via parent handler
              if (linkedRecord) {
                  if (onDeleteAttendance) {
                    onDeleteAttendance(linkedRecord.id);
                  } else {
                    console.warn('onDeleteAttendance prop is missing');
                  }
              }

              // 3. Delete the schedule using parent handler
              onDeleteSchedule(editingScheduleId);
              
              setIsAddModalOpen(false);
              resetForm();
              
              // Slight delay for alert
              setTimeout(() => alert('스케줄이 삭제되었습니다.'), 100);
          }
      }, 50);
  };

  const handleSaveHoliday = () => {
    // Strict Permission Check
    if (!canManage) return alert('권한이 없습니다. 관리자 또는 크루장만 가능합니다.');

    if (!newHoliday.name) return alert('휴일 이름을 입력해주세요.');
    const holiday: Holiday = {
       id: `hol-${Date.now()}`,
       ...newHoliday
    };
    setHolidays([...holidays, holiday]);
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleEditSchedule = (schedule: Schedule) => {
    // Regular Crew Mode (Not Leader) -> Substitute Request (Default interaction)
    if (isCrewMode && !isLeader) {
        if (schedule.employeeId === currentUser?.id) {
            handleOpenSubstituteModal(schedule);
        }
        return;
    }

    // Manager or Leader Mode -> Edit Schedule
    setEditingScheduleId(schedule.id);
    setNewSchedule({
      employeeId: schedule.employeeId,
      type: schedule.type,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      date: schedule.date,
      weekdays: [], 
    });
    setSelectedDateDetail(null);
    setActiveModalTab('SCHEDULE');
    setIsAddModalOpen(true);
  };

  const handleOpenSubstituteModal = (schedule: Schedule) => {
      setSelectedDateDetail(null); 
      setSubstituteTarget(schedule);
      setSelectedSubstituteId(null);
  };

  const handleRequestSubstitute = () => {
    if (substituteTarget && currentUser) {
        if (!selectedSubstituteId) {
             alert('대타를 요청할 동료를 선택해주세요.');
             return;
        }

        const targetEmp = employees.find(e => e.id === selectedSubstituteId);

        const request: ApprovalRequest = {
            id: `req-sub-${Date.now()}`,
            employeeId: currentUser.id,
            type: 'SUBSTITUTE',
            description: `대타 요청: [${currentUser.name}] -> [${targetEmp?.name}] (${substituteTarget.startTime}~${substituteTarget.endTime})`,
            status: 'PENDING',
            requestDate: new Date().toISOString().split('T')[0],
            targetDate: substituteTarget.date,
            substituteId: selectedSubstituteId
        };

        if (onRequestSubstitute) {
            onRequestSubstitute(request);
        }
        
        alert(`[${targetEmp?.name}] 님에게 대타 요청을 보냈습니다.`);
        setSubstituteTarget(null);
        setSelectedSubstituteId(null);
    }
  };

  // --- Attendance Management Handlers ---

  const handleStartEditAttendance = (record: AttendanceRecord) => {
      setEditingAttendanceId(record.id);
      const clockInTime = new Date(record.clockIn).toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'});
      const clockOutTime = record.clockOut 
        ? new Date(record.clockOut).toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'}) 
        : '';
      setEditAttendanceForm({ clockIn: clockInTime, clockOut: clockOutTime });
  };

  const handleCancelEditAttendance = () => {
      setEditingAttendanceId(null);
      setEditAttendanceForm(null);
  };

  const handleSaveAttendance = (originalRecord: AttendanceRecord) => {
      if (!editAttendanceForm || !onUpdateAttendance) return;
      
      const datePrefix = originalRecord.date; // YYYY-MM-DD
      const newClockIn = new Date(`${datePrefix}T${editAttendanceForm.clockIn}:00`).toISOString();
      let newClockOut = undefined;
      let newMinutes = originalRecord.accumulatedMinutes;

      if (editAttendanceForm.clockOut) {
          const outDate = new Date(`${datePrefix}T${editAttendanceForm.clockOut}:00`);
          newClockOut = outDate.toISOString();
          
          const diffMs = outDate.getTime() - new Date(newClockIn).getTime();
          newMinutes = Math.max(0, Math.floor(diffMs / 60000));
      } else {
          // If clearing clock out, it becomes working
          newMinutes = 0; 
      }

      onUpdateAttendance({
          ...originalRecord,
          clockIn: newClockIn,
          clockOut: newClockOut,
          accumulatedMinutes: newMinutes,
          status: newClockOut ? AttendanceStatus.OFF_WORK : AttendanceStatus.WORKING
      });

      setEditingAttendanceId(null);
      setEditAttendanceForm(null);
  };

  const handleConfirmDeleteAttendance = (e: React.MouseEvent, recordId: string) => {
      e.stopPropagation();
      e.preventDefault();

      setTimeout(() => {
          if (window.confirm('정말 이 근무 기록을 삭제하시겠습니까? 복구할 수 없습니다.')) {
              if (onDeleteAttendance) {
                  onDeleteAttendance(recordId);
                  setTimeout(() => alert('근무 기록이 삭제되었습니다.'), 100);
              } else {
                  console.error("onDeleteAttendance function is not available");
                  alert("삭제 기능에 문제가 발생했습니다. 관리자에게 문의하세요.");
              }
          }
      }, 50);
  };


  const renderCalendarGrid = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-12 md:h-28 bg-transparent border-r border-b border-black/5 dark:border-white/[0.06] pointer-events-none min-w-0"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const daySchedules = getDaySchedules(day);
      const holiday = getHolidayForDate(dateObj);
      const isToday = new Date().toDateString() === dateObj.toDateString();
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      days.push(
        <div 
          key={day} 
          onClick={() => setSelectedDateDetail(dateObj)}
          className={`min-h-[64px] md:min-h-[120px] border-r border-b border-black/5 dark:border-white/[0.06] p-[2px] md:p-1 relative group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer min-w-0 overflow-hidden ${holiday ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
        >
          {/* Day Number Header */}
          <div className="flex justify-between items-start mb-0.5 pl-0.5 pt-0.5 md:pl-0 md:pt-0">
            <span className={`text-[10px] md:text-[14px] font-medium w-4 h-4 md:w-6 md:h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#FF453A] text-white' : (isWeekend || holiday) ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
              {day}
            </span>
            {holiday && (
              <span className="hidden md:inline text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-500/20 px-1.5 py-0.5 rounded truncate max-w-[60px]">
                {holiday.name}
              </span>
            )}
             {holiday && (
              <span className="md:hidden w-1 h-1 rounded-full bg-red-500 mt-0.5 mr-0.5 shrink-0"></span>
            )}
          </div>
          
          {/* Desktop Content: Text list */}
          <div className="hidden md:block space-y-1">
            {daySchedules.slice(0, 3).map(sch => {
              const emp = employees.find(e => e.id === sch.employeeId);
              let colorClass = 'bg-[#0A84FF] text-white'; 
              if (sch.type === ScheduleType.SUBSTITUTE) colorClass = 'bg-[#BF5AF2] text-white';
              if (sch.type === ScheduleType.TRAINING) colorClass = 'bg-[#FFCC00] text-black'; // Yellow/Orange
              
              const isMine = emp?.id === currentUser?.id;
              
              // Only gray out if in Crew mode AND NOT Leader AND not mine
              if (isCrewMode && !isLeader && !isMine) {
                  colorClass = 'bg-black/5 dark:bg-white/10 text-zinc-500 dark:text-zinc-400';
              }
              
              return (
                <div key={sch.id} className={`text-[10px] px-1.5 py-0.5 rounded-[4px] ${colorClass} truncate shadow-sm font-medium leading-tight ${isMine ? 'ring-1 ring-white/50' : ''} flex justify-between items-center group/item`}>
                  <div className="flex items-center gap-1 overflow-hidden min-w-0">
                      <span className="truncate">{emp?.name}</span>
                      <span className="opacity-80 font-normal hidden lg:inline truncate">{sch.startTime}</span>
                  </div>
                  {/* Substitute Button for Own Shift */}
                  {isMine && (
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenSubstituteModal(sch); }}
                        className="opacity-0 group-hover/item:opacity-100 transition-opacity bg-white/20 hover:bg-white/40 p-0.5 rounded ml-1 shrink-0"
                        title="대타 요청"
                      >
                          <ArrowRightLeft size={10} strokeWidth={2.5} />
                      </button>
                  )}
                </div>
              );
            })}
            {daySchedules.length > 3 && (
              <div className="text-[9px] text-zinc-400 font-medium pl-1">
                +{daySchedules.length - 3} more
              </div>
            )}
          </div>

          {/* Mobile Content: Text List for phone size */}
          <div className="md:hidden flex flex-col gap-[2px] mt-1 px-[1px]">
             {daySchedules.slice(0, 4).map((sch, idx) => {
                 const emp = employees.find(e => e.id === sch.employeeId);
                 if (!emp) return null;
                 
                 // Name: Exclude surname (first char), take next 2 chars usually, or just rest of string
                 const displayName = emp.name.length > 1 ? emp.name.substring(1) : emp.name;
                 
                 // Time Formatting for Mobile (e.g., 09:00 -> 09시, 09:30 -> 09시30)
                 const [sHour, sMin] = sch.startTime.split(':');
                 const formattedStartTime = sMin === '00' ? `${sHour}시` : `${sHour}시${sMin}`;

                 let bgClass = 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
                 if (sch.type === ScheduleType.SUBSTITUTE) bgClass = 'bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
                 if (sch.type === ScheduleType.TRAINING) bgClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300';
                 
                 const isMine = emp.id === currentUser?.id;
                 
                 if (isCrewMode && !isLeader && !isMine) {
                     // Gray out others in crew mode (unless Leader)
                     bgClass = 'bg-zinc-100/80 text-zinc-400 dark:bg-white/5 dark:text-zinc-500';
                 }
                 
                 if (isMine) {
                     bgClass = 'bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white';
                     // Training Override for My Schedule if needed, but usually Mine is Blue to highlight. 
                     // Let's keep Blue for "Me" regardless of type for clarity, or switch if strictly requested.
                     // The prompt asks for Education to be yellow. Let's make it yellow even for me to distinguish type.
                     if (sch.type === ScheduleType.TRAINING) {
                         bgClass = 'bg-[#FFCC00] text-black shadow-sm';
                     }
                 }

                 return (
                    <div key={sch.id} className={`flex items-center justify-between px-1 py-[2px] rounded-[4px] ${bgClass} overflow-hidden max-w-full`}>
                       <span className="text-[9px] font-bold leading-none tracking-tighter truncate min-w-0">{displayName}</span>
                       <div className="flex items-center shrink-0">
                           <span className="text-[8px] leading-none opacity-90 tracking-tighter ml-0.5">{formattedStartTime}</span>
                           {isMine && <ArrowRightLeft size={8} className="ml-1 opacity-70" />}
                       </div>
                    </div>
                 );
             })}
             {daySchedules.length > 4 && (
                 <span className="text-[8px] text-zinc-300 dark:text-zinc-600 leading-none pl-1">+ {daySchedules.length - 4}</span>
             )}
          </div>
        </div>
      );
    }
    return days;
  };

  // Employees to show in Add/Edit dropdown
  const visibleEmployees = isLeader
    ? employees.filter(e => e.branch === currentUser?.branch)
    : employees;

  return (
    <div className="flex flex-col h-full animate-fade-in pb-20 max-w-full overflow-hidden">
      {/* Super Compact Header for 360px */}
      <div className="flex items-center justify-between gap-1 mb-2 px-1">
        {/* Left: Title & Nav */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <h2 className="text-[17px] md:text-[24px] font-bold text-zinc-900 dark:text-white tracking-tight whitespace-nowrap">
             {currentDate.toLocaleDateString('ko-KR', { month: 'long' })} 
             <span className="text-[13px] md:text-[20px] text-zinc-500 font-medium ml-1.5">{currentDate.getFullYear()}</span>
          </h2>
          <div className="flex items-center bg-black/5 dark:bg-white/[0.08] rounded-full p-[2px] border border-black/5 dark:border-white/5 ml-1">
            <button type="button" onClick={handlePrevMonth} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform">
              <ChevronLeft size={14} className="md:w-4 md:h-4" />
            </button>
            <button type="button" onClick={handleNextMonth} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform">
              <ChevronRight size={14} className="md:w-4 md:h-4" />
            </button>
          </div>
        </div>

        {/* Right: Actions (Visible for Manager OR Leader) */}
        {canManage && (
            <button 
                type="button"
                onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                className="flex items-center justify-center gap-1 bg-[#0A84FF] hover:bg-blue-600 text-white w-8 h-8 md:w-auto md:h-auto md:px-3 md:py-2 rounded-full text-[13px] font-semibold shadow-lg transition-all active:scale-95 flex-shrink-0"
            >
                <Plus size={16} strokeWidth={3} />
                <span className="hidden md:inline">일정 추가</span>
            </button>
        )}
      </div>

      {/* Branch Tabs (Scrollable & Swipeable) */}
      {!isCrewMode && (
        <div className="w-full overflow-x-auto no-scrollbar pb-2 mb-1 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex items-center gap-2 min-w-max">
                <button
                    type="button"
                    onClick={() => setSelectedBranch('ALL')}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] md:text-[13px] font-medium transition-all border ${
                    selectedBranch === 'ALL' 
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent' 
                        : 'bg-white dark:bg-[#1c1c1e] text-zinc-500 hover:bg-black/5 border-black/5 dark:border-white/10'
                    }`}
                >
                    전체 지점
                </button>
                {Object.entries(BRANCH_NAMES).map(([code, name]) => (
                    <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedBranch(code as BranchCode)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] md:text-[13px] font-medium transition-all border ${
                        selectedBranch === code
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent' 
                        : 'bg-white dark:bg-[#1c1c1e] text-zinc-500 hover:bg-black/5 border-black/5 dark:border-white/10'
                    }`}
                    >
                    {name}
                    </button>
                ))}
            </div>
        </div>
      )}

      {/* Calendar Grid Container (Fit to Screen) */}
      <div className="apple-glass flex-1 rounded-[16px] md:rounded-[20px] overflow-hidden border border-black/5 dark:border-white/10 shadow-lg flex flex-col relative w-full max-w-full">
        <div className="flex-1 flex flex-col w-full h-full min-w-0">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] w-full">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                    <div key={day} className={`py-1.5 text-center text-[10px] md:text-[11px] font-semibold ${idx === 0 || idx === 6 ? 'text-red-500' : 'text-zinc-500'}`}>
                    {day}
                    </div>
                ))}
            </div>
            
            {/* Days Grid - Scroll vertically if needed, but fit width */}
            <div className="grid grid-cols-7 bg-transparent flex-1 auto-rows-fr w-full overflow-y-auto min-w-0">
                {renderCalendarGrid()}
            </div>
        </div>
      </div>
      
      {/* Legend & Instructions - Always Visible */}
      <div className="mt-4 px-2 space-y-3">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>
                  <span className="text-[12px] text-zinc-600 dark:text-zinc-400">고정 근무</span>
              </div>
              <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm"></div>
                  <span className="text-[12px] text-zinc-600 dark:text-zinc-400">대타 근무</span>
              </div>
              <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FFCC00] shadow-sm"></div>
                  <span className="text-[12px] text-zinc-600 dark:text-zinc-400">교육</span>
              </div>
          </div>

          {/* Instructions */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-600 font-medium py-2">
              <span>본인 일정내</span>
              <div className="bg-zinc-200 dark:bg-zinc-700 p-0.5 rounded text-zinc-500 dark:text-zinc-400">
                <ArrowRightLeft size={10} strokeWidth={2.5} />
              </div>
              <span>선택하여 사전 협의된 동료에게 대타 요청 할 수 있습니다.</span>
          </div>
      </div>

      {/* Add/Edit Modal (Visible for Manager OR Leader) */}
      {isAddModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          {/* Changed width to 92% to fit inside 360px safely */}
          <div className="apple-glass w-[92%] max-w-sm rounded-[24px] overflow-hidden shadow-2xl animate-scale-up border border-black/10 dark:border-white/10 bg-surface dark:bg-[#1c1c1e] max-h-[85vh] flex flex-col mx-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center bg-surface-highlight/[0.5] dark:bg-white/[0.03] shrink-0">
               <h2 className="text-[16px] font-bold text-zinc-900 dark:text-white">
                 {editingScheduleId ? '일정 수정' : '새 일정 추가'}
               </h2>
               <button 
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-zinc-500"
                >
                  <X size={16} strokeWidth={2.5} />
               </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 overflow-y-auto">
               {!editingScheduleId && (
                   <div className="flex p-1 bg-surface-highlight dark:bg-[#2c2c2e] rounded-[10px] mb-4">
                         <button
                            type="button"
                            onClick={() => setActiveModalTab('SCHEDULE')}
                            className={`flex-1 py-1.5 text-[13px] font-semibold rounded-[8px] transition-all ${activeModalTab === 'SCHEDULE' ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
                         >
                            근무 일정
                         </button>
                         <button
                            type="button"
                            onClick={() => setActiveModalTab('HOLIDAY')}
                            className={`flex-1 py-1.5 text-[13px] font-semibold rounded-[8px] transition-all ${activeModalTab === 'HOLIDAY' ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
                         >
                            휴일 설정
                         </button>
                   </div>
               )}
                  
                  {activeModalTab === 'SCHEDULE' ? (
                      <div className="space-y-3">
                          <div>
                              <label className="block text-[12px] text-zinc-500 mb-1 ml-1">직원</label>
                              <select 
                                    value={newSchedule.employeeId}
                                    onChange={(e) => setNewSchedule({...newSchedule, employeeId: e.target.value})}
                                    className="w-full h-[42px] px-3 rounded-[12px] bg-black/5 dark:bg-white/5 text-[14px] outline-none appearance-none"
                                >
                                    <option value="">직원 선택</option>
                                    {visibleEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({RANK_LABEL[emp.position]})</option>)}
                              </select>
                          </div>
                          
                          <div>
                            <label className="block text-[12px] text-zinc-500 mb-1 ml-1">근무 유형</label>
                            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-[12px]">
                                {[
                                    { type: ScheduleType.FIXED, label: '고정 근무', activeClass: 'bg-[#0A84FF] text-white shadow-md' },
                                    { type: ScheduleType.TRAINING, label: '교육', activeClass: 'bg-[#FFCC00] text-black shadow-md' },
                                    { type: ScheduleType.SUBSTITUTE, label: '대타', activeClass: 'bg-[#BF5AF2] text-white shadow-md' }
                                ].map((opt) => (
                                    <button
                                        type="button"
                                        key={opt.type}
                                        onClick={() => setNewSchedule({...newSchedule, type: opt.type})}
                                        className={`flex-1 py-2 text-[12px] font-semibold rounded-[10px] transition-all ${newSchedule.type === opt.type ? opt.activeClass : 'text-zinc-500 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-white/10'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="block text-[12px] text-zinc-500 mb-1 ml-1">시작</label>
                                  <input type="time" value={newSchedule.startTime} onChange={e => setNewSchedule({...newSchedule, startTime: e.target.value})} className="w-full h-[42px] px-3 rounded-[12px] bg-black/5 dark:bg-white/5 text-[14px] outline-none text-center" />
                              </div>
                              <div>
                                  <label className="block text-[12px] text-zinc-500 mb-1 ml-1">종료</label>
                                  <input type="time" value={newSchedule.endTime} onChange={e => setNewSchedule({...newSchedule, endTime: e.target.value})} className="w-full h-[42px] px-3 rounded-[12px] bg-black/5 dark:bg-white/5 text-[14px] outline-none text-center" />
                              </div>
                          </div>
                          
                          {/* Only show Date picker if not bulk adding or logic requires it */}
                          <div>
                              <label className="block text-[12px] text-zinc-500 mb-1 ml-1">날짜</label>
                              <input type="date" value={newSchedule.date} onChange={e => setNewSchedule({...newSchedule, date: e.target.value})} className="w-full h-[42px] px-3 rounded-[12px] bg-black/5 dark:bg-white/5 text-[14px] outline-none" />
                          </div>

                          <div className="flex gap-2 mt-4">
                              {editingScheduleId && (
                                  <button 
                                      type="button"
                                      onClick={handleDeleteCurrentSchedule}
                                      className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-[14px] font-bold text-[15px] transition-colors"
                                  >
                                      삭제
                                  </button>
                              )}
                              <button 
                                  type="button"
                                  onClick={handleSaveSchedule} 
                                  className={`py-3 bg-[#0A84FF] text-white rounded-[14px] font-bold text-[15px] shadow-lg active:scale-95 transition-transform ${editingScheduleId ? 'flex-[2]' : 'w-full'}`}
                              >
                                  {editingScheduleId ? '수정 완료' : '일정 등록'}
                              </button>
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <div>
                              <label className="block text-[12px] text-zinc-500 mb-1 ml-1">휴일 명칭</label>
                              <input type="text" placeholder="예: 광복절" value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} className="w-full h-[42px] px-3 rounded-[12px] bg-black/5 dark:bg-white/5 text-[14px] outline-none" />
                          </div>
                          <div>
                              <label className="block text-[12px] text-zinc-500 mb-1 ml-1">날짜</label>
                              <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="w-full h-[42px] px-3 rounded-[12px] bg-black/5 dark:bg-white/5 text-[14px] outline-none" />
                          </div>
                          <button type="button" onClick={handleSaveHoliday} className="w-full py-3 bg-red-500 text-white rounded-[14px] font-bold text-[15px] shadow-lg mt-2 active:scale-95 transition-transform">휴일 등록</button>
                      </div>
                  )}
            </div>
          </div>
        </div>
      )}

      {/* Date Detail Modal (Responsive 360px Safe) */}
      {selectedDateDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
          {/* Changed width to 92% */}
          <div className="apple-glass w-[92%] max-w-sm rounded-[24px] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-scale-up bg-surface dark:bg-[#1c1c1e] mx-auto">
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 bg-surface-highlight/[0.5] dark:bg-white/[0.03] flex justify-between items-center">
               <div>
                   <h2 className="text-[18px] font-bold text-zinc-900 dark:text-white">
                     {selectedDateDetail.getDate()}일 <span className="text-[14px] font-medium text-zinc-500">{selectedDateDetail.toLocaleDateString('ko-KR', { weekday: 'long' })}</span>
                   </h2>
               </div>
               <button 
                  type="button"
                  onClick={() => {
                      setSelectedDateDetail(null);
                      handleCancelEditAttendance(); // Reset edit state on close
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-zinc-500"
                >
                  <X size={16} strokeWidth={2.5} />
               </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-2">
               {getHolidayForDate(selectedDateDetail) && (
                   <div className="p-3 rounded-[14px] bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-500/10 flex items-center gap-3 mb-2">
                       <PartyPopper className="text-red-500" size={18} />
                       <span className="text-[14px] font-bold text-red-600 dark:text-red-400">{getHolidayForDate(selectedDateDetail)?.name}</span>
                   </div>
               )}

              {getSchedulesForDate(selectedDateDetail).length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-[13px]">
                  일정이 없습니다.
                </div>
              ) : (
                getSchedulesForDate(selectedDateDetail).map(sch => {
                  const emp = employees.find(e => e.id === sch.employeeId);
                  if (!emp) return null;
                  
                  const isMine = emp.id === currentUser?.id;
                  const attendanceRecord = getAttendanceForDateAndEmp(selectedDateDetail, emp.id);
                  const isEditingAttendance = editingAttendanceId === attendanceRecord?.id;
                  
                  return (
                    <div 
                        key={sch.id} 
                        onClick={() => (!isEditingAttendance && (isMine || canManage)) && handleEditSchedule(sch)}
                        className={`flex flex-col p-3 rounded-[14px] border transition-colors ${isMine ? 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-surface-highlight border-transparent dark:bg-[#2c2c2e]'}`}
                    >
                      <div className="flex items-center justify-between">
                          <div>
                              <div className="text-[14px] font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                  {emp.name}
                                  {isMine && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">나</span>}
                                  {sch.type === ScheduleType.TRAINING && <span className="text-[10px] bg-[#FFCC00] text-black px-1.5 py-0.5 rounded-full font-bold">교육</span>}
                                  {sch.type === ScheduleType.SUBSTITUTE && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-bold">대타</span>}
                              </div>
                              <div className="flex items-center gap-1.5 text-[12px] text-zinc-500 mt-0.5">
                                 <Clock size={12} />
                                 <span className="font-mono">{sch.startTime} - {sch.endTime}</span>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Schedule Edit (Master/Leader Only) - Delete Moved to Edit Modal */}
                            {canManage && (
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleEditSchedule(sch); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 transition-colors"
                                    title="스케줄 수정"
                                >
                                    <Edit size={16} />
                                </button>
                            )}
                            
                            {isMine && (
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleOpenSubstituteModal(sch); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 hover:bg-white text-blue-600 shadow-sm border border-blue-100 transition-colors"
                                    title="대타 요청"
                                >
                                    <ArrowRightLeft size={16} />
                                </button>
                            )}
                          </div>
                      </div>

                      {/* Actual Attendance Row */}
                      {attendanceRecord && (
                          <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                              {isEditingAttendance ? (
                                  <div className="flex items-center gap-2 w-full animate-fade-in">
                                      <div className="flex-1 flex gap-1">
                                          <input 
                                            type="time" 
                                            value={editAttendanceForm?.clockIn} 
                                            onChange={(e) => setEditAttendanceForm(prev => prev ? {...prev, clockIn: e.target.value} : null)}
                                            className="w-full h-8 px-1 text-[12px] rounded bg-white dark:bg-black/20 text-center font-mono border border-blue-500/50 outline-none"
                                          />
                                          <span className="self-center">-</span>
                                          <input 
                                            type="time" 
                                            value={editAttendanceForm?.clockOut} 
                                            onChange={(e) => setEditAttendanceForm(prev => prev ? {...prev, clockOut: e.target.value} : null)}
                                            className="w-full h-8 px-1 text-[12px] rounded bg-white dark:bg-black/20 text-center font-mono border border-blue-500/50 outline-none"
                                          />
                                      </div>
                                      <button 
                                        type="button"
                                        onClick={() => handleSaveAttendance(attendanceRecord)}
                                        className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm"
                                      >
                                          <Check size={14} />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={handleCancelEditAttendance}
                                        className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 flex items-center justify-center shrink-0"
                                      >
                                          <X size={14} />
                                      </button>
                                  </div>
                              ) : (
                                  <>
                                      <div className="flex items-center gap-1.5 text-[12px]">
                                          <div className={`w-1.5 h-1.5 rounded-full ${attendanceRecord.status === AttendanceStatus.WORKING ? 'bg-green-500 animate-pulse' : 'bg-zinc-300 dark:bg-zinc-600'}`}></div>
                                          <span className="text-zinc-500 dark:text-zinc-400 font-medium">실근무:</span>
                                          <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-200">
                                              {new Date(attendanceRecord.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: false})}
                                              {attendanceRecord.clockOut && ` - ${new Date(attendanceRecord.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: false})}`}
                                          </span>
                                      </div>
                                      
                                      {/* Admin Controls for Attendance */}
                                      {canManage && (
                                          <div className="flex items-center gap-1">
                                              <button 
                                                  type="button"
                                                  onClick={() => handleStartEditAttendance(attendanceRecord)}
                                                  className="p-1.5 rounded-md text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                  title="기록 수정"
                                              >
                                                  <Edit size={12} />
                                              </button>
                                              <button 
                                                  type="button"
                                                  onClick={(e) => handleConfirmDeleteAttendance(e, attendanceRecord.id)}
                                                  className="relative z-20 p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                  title="기록 삭제"
                                              >
                                                  <Trash2 size={12} />
                                              </button>
                                          </div>
                                      )}
                                  </>
                              )}
                          </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Footer Action (Visible for Manager OR Leader) */}
            {canManage && (
                <div className="p-4 pt-2 border-t border-black/5 dark:border-white/5">
                    <button 
                        type="button"
                        onClick={() => {
                            setNewSchedule(prev => ({...prev, date: selectedDateDetail.toISOString().split('T')[0]}));
                            setSelectedDateDetail(null);
                            setIsAddModalOpen(true);
                        }}
                        className="w-full py-3 bg-zinc-100 dark:bg-[#2c2c2e] text-zinc-900 dark:text-zinc-300 rounded-[12px] text-[14px] font-medium hover:bg-zinc-200 transition-colors"
                    >
                        이 날짜에 추가
                    </button>
                </div>
            )}
          </div>
        </div>
      )}

      {/* Substitute Request Modal (Responsive 360px Safe) */}
      {substituteTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
              {/* Changed width to 92% */}
              <div className="apple-glass w-[92%] max-w-sm rounded-[24px] p-6 bg-surface dark:bg-[#1c1c1e] shadow-2xl animate-scale-up mx-auto">
                  <h3 className="text-[18px] font-bold text-zinc-900 dark:text-white mb-1">대타 요청</h3>
                  <p className="text-[13px] text-zinc-500 mb-4">누구에게 요청하시겠습니까?</p>
                  
                  <div className="space-y-2 mb-6 max-h-[200px] overflow-y-auto pr-1">
                      {employees.filter(e => e.branch === currentUser?.branch && e.id !== currentUser?.id).map(colleague => (
                          <div 
                            key={colleague.id} 
                            onClick={() => setSelectedSubstituteId(colleague.id)} 
                            className={`flex items-center justify-between p-3 rounded-[12px] cursor-pointer border transition-all ${selectedSubstituteId === colleague.id ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20' : 'bg-transparent border-zinc-100 dark:border-zinc-800 hover:bg-black/5'}`}
                          >
                              <span className="text-[14px] font-medium text-zinc-900 dark:text-white">{colleague.name}</span>
                              <span className="text-[11px] text-zinc-500">{RANK_LABEL[colleague.position]}</span>
                          </div>
                      ))}
                  </div>
                  <div className="flex gap-3">
                      <button type="button" onClick={() => setSubstituteTarget(null)} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-[12px] text-[14px] font-medium">취소</button>
                      <button type="button" onClick={handleRequestSubstitute} className="flex-1 py-3 bg-[#0A84FF] text-white rounded-[12px] text-[14px] font-bold shadow-lg">요청 보내기</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ScheduleCalendar;