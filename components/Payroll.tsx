import React, { useState, useMemo } from 'react';
import { MOCK_EMPLOYEES, BRANCH_NAMES, MOCK_HOLIDAYS } from '../constants';
import { Employee, EmployeeRank, AttendanceRecord, AttendanceStatus, AttendanceTag, ApprovalRequest } from '../types';
import { ChevronRight, X, Building2, Wallet, Calendar, AlertCircle, PartyPopper, Receipt, FileSpreadsheet, Loader2 } from 'lucide-react';

interface DailyWageRecord {
  date: string;
  dayOfWeek: string;
  accumulatedMinutes: number;
  basePay: number;
  holidayPay: number;
  totalDailyPay: number;
  isHoliday: boolean;
  holidayName?: string;
  tags: AttendanceTag[];
}

interface MonthlyStats {
  records: DailyWageRecord[];
  totalMinutes: number;
  totalBasePay: number;
  totalHolidayPay: number;
  totalExpenses: number; 
  grossTotal: number;
  taxAmount: number;
  grandTotal: number;
}

const formatDuration = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const getDayOfWeek = (dateStr: string) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(dateStr).getDay()];
};

const Payroll: React.FC<{ isCrewMode?: boolean; currentUser?: Employee; attendanceData?: AttendanceRecord[]; approvalRequests?: ApprovalRequest[] }> = ({ isCrewMode = false, currentUser, attendanceData = [], approvalRequests = [] }) => {
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);

  // Calculate Monthly Stats based on real attendanceData AND expenses
  const calculateStats = (emp: Employee, monthStr: string): MonthlyStats => {
      // Filter records for this employee and month
      const monthlyRecords = attendanceData.filter(r => 
          r.employeeId === emp.id && 
          r.date.startsWith(monthStr) &&
          r.status !== AttendanceStatus.PENDING_APPROVAL
      );

      // Filter approved expenses
      const monthlyExpenses = approvalRequests.filter(req => 
          req.employeeId === emp.id &&
          req.type === 'EXPENSE' &&
          req.status === 'APPROVED' &&
          req.targetDate.startsWith(monthStr)
      ).reduce((sum, req) => sum + (req.expenseAmount || 0), 0);

      // Sort by date descending
      monthlyRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let totalMinutes = 0;
      let totalBasePay = 0;
      let totalHolidayPay = 0;

      // Calculate Composite Hourly Wage (Basic + Allowances)
      const hourlyWage = emp.wage.basic + emp.wage.responsibility + emp.wage.incentive + emp.wage.special;

      const records: DailyWageRecord[] = monthlyRecords.map(record => {
          const minutes = record.accumulatedMinutes || 0;
          const hours = minutes / 60;
          
          // Basic Pay (using Composite Hourly Wage)
          const basePay = Math.floor(hours * hourlyWage);

          // Holiday Logic
          const holiday = MOCK_HOLIDAYS.find(h => h.date === record.date);
          let holidayAllowance = 0;
          
          if (holiday) {
              holidayAllowance = Math.floor(hours * holiday.extraHourlyPay);
          }

          // Tags
          const tags: AttendanceTag[] = [];
          if (record.tag) tags.push(record.tag);

          totalMinutes += minutes;
          totalBasePay += basePay;
          totalHolidayPay += holidayAllowance;

          return {
              date: record.date,
              dayOfWeek: getDayOfWeek(record.date),
              accumulatedMinutes: minutes,
              basePay: basePay,
              holidayPay: holidayAllowance,
              totalDailyPay: basePay + holidayAllowance,
              isHoliday: !!holiday,
              holidayName: holiday?.name,
              tags: tags
          };
      });

      // Total Taxable Income = Work Pay + Holiday Pay + Expenses
      // Expenses are considered taxable as per request
      const totalTaxableIncome = totalBasePay + totalHolidayPay + monthlyExpenses;
      
      // Tax (3.3%) on Total Taxable Income
      const taxAmount = Math.floor(totalTaxableIncome * 0.033); 
      
      // Grand Total
      const grandTotal = Math.floor(totalTaxableIncome - taxAmount);

      return {
          records,
          totalMinutes,
          totalBasePay,
          totalHolidayPay,
          totalExpenses: monthlyExpenses,
          grossTotal: totalTaxableIncome, 
          taxAmount,
          grandTotal 
      };
  };

  const payrollData = useMemo(() => {
      if (isCrewMode && currentUser) return []; // Not used in Crew Mode direct view

      const targetEmployees = MOCK_EMPLOYEES.filter(e => activeTab === 'ALL' || e.branch === activeTab);
      return targetEmployees.map(emp => ({
          employee: emp,
          stats: calculateStats(emp, selectedMonth)
      }));
  }, [activeTab, isCrewMode, currentUser, selectedMonth, attendanceData, approvalRequests]);

  const aggregates = {
      count: payrollData.length,
      totalNetPay: payrollData.reduce((acc, curr) => acc + curr.stats.grandTotal, 0)
  };

  const selectedStats = selectedEmployee ? calculateStats(selectedEmployee, selectedMonth) : null;

  const handleGoogleSheetUpload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUploading) return;

    if (!selectedMonth) {
        alert("정산 월이 선택되지 않았습니다.");
        return;
    }
    
    const parts = selectedMonth.split('-');
    if (parts.length < 2) return;

    const [year, month] = parts;
    const formattedDate = `${year}년 ${month}월`;

    // Use a slight timeout to allow UI ripple/click effect to show before confirm blocks thread
    setTimeout(async () => {
        if (window.confirm(`${formattedDate} 전지점 급여 정산 기록을 G드라이브에 업로드 하시겠습니까?`)) {
            setIsUploading(true);

            // Simulate API Upload Delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            setIsUploading(false);
            
            // Allow state update to reflect before alerting
            setTimeout(() => {
                alert(`[완료] ${formattedDate} 급여 정산 내역(지점, 이름, 수령액)이 Google Drive에 구글 시트로 업로드되었습니다.`);
            }, 100);
        }
    }, 50);
  };
  
  // Reusable Detail View Renderer
  const renderDetailContent = (emp: Employee, stats: MonthlyStats) => {
      const hourlyWage = emp.wage.basic + emp.wage.responsibility + emp.wage.incentive + emp.wage.special;
      
      return (
        <div className="space-y-4 animate-fade-in">
           {/* 1. Net Pay Highlight */}
           <div className="text-center py-6 bg-green-500/5 dark:bg-green-500/10 rounded-[20px] border border-green-500/10">
              <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">실수령액</span>
              <div className="text-[36px] font-bold text-green-600 dark:text-green-400 leading-none mt-2 tracking-tight">
                  ₩{stats.grandTotal.toLocaleString()}
              </div>
           </div>

           {/* 2. Calculation Summary */}
           <div className="p-4 bg-zinc-50 dark:bg-black/30 rounded-[16px] border border-black/5 dark:border-white/5 space-y-2">
              <h4 className="text-[12px] font-bold text-zinc-400 uppercase mb-2">정산 상세 내역</h4>
              
              <div className="flex justify-between text-[13px]">
                  <span className="text-zinc-600 dark:text-zinc-300">총 시급 (기본 + 수당)</span>
                  <span className="font-medium text-zinc-900 dark:text-white">₩{hourlyWage.toLocaleString()} / 시간</span>
              </div>

              <div className="h-px bg-black/5 dark:bg-white/5 my-1 border-dashed"></div>

              <div className="flex justify-between text-[13px]">
                  <span className="text-zinc-600 dark:text-zinc-300">총 근무 급여 ({formatDuration(stats.totalMinutes)})</span>
                  <span className="font-medium text-zinc-900 dark:text-white">₩{stats.totalBasePay.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between text-[13px]">
                  <span className="text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                      <PartyPopper size={12} className={stats.totalHolidayPay > 0 ? "text-red-500" : "text-zinc-400"} /> 휴일 수당
                  </span>
                  <span className={`font-medium ${stats.totalHolidayPay > 0 ? "text-red-500" : "text-zinc-400"}`}>
                      {stats.totalHolidayPay > 0 ? `+ ₩${stats.totalHolidayPay.toLocaleString()}` : '₩0'}
                  </span>
              </div>

              <div className="flex justify-between text-[13px]">
                  <span className="text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                      <Receipt size={12} className={stats.totalExpenses > 0 ? "text-blue-500" : "text-zinc-400"} /> 비용 청구
                  </span>
                  <span className={`font-medium ${stats.totalExpenses > 0 ? "text-blue-500" : "text-zinc-400"}`}>
                      {stats.totalExpenses > 0 ? `+ ₩${stats.totalExpenses.toLocaleString()}` : '₩0'}
                  </span>
              </div>
              
              <div className="flex justify-between text-[13px]">
                  <span className="text-zinc-500">소득세 (3.3%)</span>
                  <span className="text-red-500">- ₩{stats.taxAmount.toLocaleString()}</span>
              </div>

              <div className="h-px bg-black/10 dark:bg-white/10 my-1"></div>
              
              {/* Formula Display */}
              <div className="text-[11px] text-zinc-400 text-right">
                  (총 근무 급여 + 휴일 수당 + 비용 청구 - 세금) = 실수령액
              </div>
           </div>

           {/* 3. Daily Detailed Records */}
           <div className="space-y-3">
              <h4 className="text-[12px] font-bold text-zinc-400 uppercase px-1">일자별 근무 상세</h4>
              {stats.records.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400 text-[13px] bg-zinc-50 dark:bg-white/5 rounded-[12px]">
                      해당 월의 근무 기록이 없습니다.
                  </div>
              ) : (
                  stats.records.map((record, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-[14px] border border-black/5 dark:border-white/5 bg-white dark:bg-white/5">
                          {/* Left: Date & Badges */}
                          <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-bold text-zinc-900 dark:text-white">
                                    {new Date(record.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                                    <span className={`text-[12px] font-normal ml-1 ${['토', '일'].includes(record.dayOfWeek) || record.isHoliday ? 'text-red-500' : 'text-zinc-500'}`}>
                                        ({record.dayOfWeek})
                                    </span>
                                </span>
                                {/* Badges */}
                                {record.tags.includes(AttendanceTag.LATE) && (
                                    <span className="text-[10px] font-bold text-orange-600 bg-orange-100 dark:bg-orange-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <AlertCircle size={10} /> 지각
                                    </span>
                                )}
                                {record.tags.includes(AttendanceTag.OUTSIDE_SCHEDULE) && (
                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-100 dark:bg-purple-500/20 px-1.5 py-0.5 rounded">
                                        스케줄외
                                    </span>
                                )}
                                {record.isHoliday && (
                                    <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <PartyPopper size={10} /> {record.holidayName || '휴일'}
                                    </span>
                                )}
                              </div>
                              <div className="text-[12px] text-zinc-400 font-mono">
                                  {formatDuration(record.accumulatedMinutes)} 근무
                              </div>
                          </div>

                          {/* Right: Pay */}
                          <div className="text-right">
                              <div className="text-[14px] font-bold text-zinc-900 dark:text-white">
                                  ₩{record.totalDailyPay.toLocaleString()}
                              </div>
                              {record.holidayPay > 0 && (
                                  <div className="text-[10px] text-red-500">
                                      (+휴일 ₩{record.holidayPay.toLocaleString()})
                                  </div>
                              )}
                          </div>
                      </div>
                  ))
              )}
           </div>
        </div>
      );
  };

  return (
    <div className="space-y-3 md:space-y-6 animate-fade-in mx-auto pb-20 max-w-full overflow-hidden">
      {/* Header - Common */}
      <div className="flex flex-col gap-2.5 md:gap-4 pb-2 md:pb-6 border-b border-black/5 dark:border-white/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-[18px] md:text-[34px] font-bold text-zinc-900 dark:text-white tracking-tight leading-none">
                        {isCrewMode ? '내 급여 정산' : '급여 정산'}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5 md:mt-2">
                        <div className="relative group flex items-center bg-black/5 dark:bg-white/10 rounded-[8px] px-2.5 py-1 md:px-3 md:py-1.5 transition-colors">
                            <Calendar className="text-zinc-500 dark:text-zinc-400 mr-1.5 w-3.5 h-3.5 md:w-4 md:h-4" />
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent text-[13px] md:text-[15px] font-semibold text-zinc-900 dark:text-white border-none outline-none p-0 cursor-pointer w-auto"
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Manager Controls - Only show in Manager Mode */}
            {!isCrewMode && (
                <div className="flex gap-2 w-full md:w-auto mt-1 md:mt-0">
                    <button 
                        onClick={handleGoogleSheetUpload}
                        disabled={isUploading}
                        className={`flex-1 md:flex-none h-[38px] flex items-center justify-center gap-1.5 px-4 ${isUploading ? 'bg-green-600/70' : 'bg-[#1D6F42] hover:bg-[#185c37]'} text-white rounded-[10px] text-[12px] md:text-[13px] font-semibold shadow-lg shadow-green-900/20 active:scale-95 transition-all cursor-pointer`}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 size={13} className="md:w-4 md:h-4 animate-spin" />
                                <span>업로드 중...</span>
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet size={13} className="md:w-4 md:h-4" />
                                <span>구글 시트 업로드</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
      </div>

      {isCrewMode && currentUser ? (
          // CREW MODE: Direct Detail View
          renderDetailContent(currentUser, calculateStats(currentUser, selectedMonth))
      ) : (
          // MANAGER MODE: List View & Modal
          <>
            {/* Branch Tabs (Scrollable) */}
            <div className="w-full overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex items-center gap-2 min-w-max">
                    <button 
                        onClick={() => setActiveTab('ALL')} 
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] md:text-[13px] font-medium transition-all border ${
                            activeTab === 'ALL' 
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent' 
                            : 'bg-white dark:bg-[#1c1c1e] text-zinc-500 hover:bg-black/5 border-black/5 dark:border-white/10'
                        }`}
                    >
                        전체 보기
                    </button>
                    {Object.entries(BRANCH_NAMES).map(([code, name]) => (
                        <button 
                            key={code} 
                            onClick={() => setActiveTab(code)} 
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] md:text-[13px] font-medium transition-all border ${
                                activeTab === code 
                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent' 
                                : 'bg-white dark:bg-[#1c1c1e] text-zinc-500 hover:bg-black/5 border-black/5 dark:border-white/10'
                            }`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-2.5 md:gap-4 w-full">
                <div className="col-span-2 md:col-span-1 apple-glass p-3 md:p-4 rounded-[16px] md:rounded-[20px] flex flex-col justify-between h-[80px] md:h-[100px] relative overflow-hidden">
                    <div className="flex justify-between items-start z-10">
                        <span className="text-[11px] md:text-[12px] font-medium text-zinc-500">총 인원</span>
                        <Building2 size={14} className="text-blue-500 md:w-4 md:h-4" />
                    </div>
                    <div className="text-[20px] md:text-[24px] font-semibold text-zinc-900 dark:text-white z-10 leading-none">
                        {aggregates.count} <span className="text-[12px] md:text-[14px] text-zinc-500 font-normal">명</span>
                    </div>
                </div>

                <div className="col-span-2 md:col-span-1 apple-glass p-3.5 md:p-4 rounded-[16px] md:rounded-[20px] flex flex-col justify-between h-[80px] md:h-[100px] relative overflow-hidden border border-green-500/20">
                    <div className="flex justify-between items-start z-10">
                        <span className="text-[11px] md:text-[12px] font-medium text-zinc-500">예상 지급액 (세후)</span>
                        <Wallet size={14} className="text-green-500 md:w-4 md:h-4" />
                    </div>
                    <div className="text-[24px] md:text-[28px] font-bold text-green-600 dark:text-green-400 z-10 truncate tracking-tight leading-none mt-1">
                        ₩{aggregates.totalNetPay.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Payroll Table */}
            <div className="apple-glass rounded-[16px] md:rounded-[24px] overflow-hidden border border-black/5 dark:border-white/10 shadow-xl w-full">
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-full">
                    <thead className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5">
                    <tr>
                        <th className="px-3 py-2.5 md:px-6 md:py-5 text-[10px] md:text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">직원 정보 / 계좌</th>
                        <th className="px-3 py-2.5 md:px-6 md:py-5 text-[10px] md:text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right">수령액</th>
                        <th className="px-2 py-2.5 md:px-4 md:py-4 w-[24px] md:w-[40px]"></th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                    {payrollData.map(({ employee: emp, stats }) => (
                        <tr key={emp.id} onClick={() => setSelectedEmployee(emp)} className="hover:bg-black/[0.04] transition-colors cursor-pointer active:bg-black/[0.06]">
                        <td className="px-3 py-2.5 md:px-6 md:py-4">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[13px] md:text-[14px] text-zinc-900 dark:text-white leading-none">{emp.name}</span>
                                    <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-[4px] bg-black/5 dark:bg-white/10 w-fit text-zinc-500 dark:text-zinc-400 font-normal leading-none">{BRANCH_NAMES[emp.branch]}</span>
                                </div>
                                <div className="text-[11px] md:text-[12px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 flex-wrap">
                                    <span className="opacity-80">{emp.bankName}</span>
                                    <span className="font-mono text-zinc-600 dark:text-zinc-300 tracking-tight font-medium">{emp.accountNumber}</span>
                                </div>
                            </div>
                        </td>
                        <td className="px-3 py-2.5 md:px-6 md:py-4 text-right">
                            <div className="text-[13px] md:text-[15px] font-bold text-zinc-900 dark:text-white leading-tight">₩{stats.grandTotal.toLocaleString()}</div>
                            <div className="text-[9px] md:text-[10px] text-zinc-400 mt-0.5">{formatDuration(stats.totalMinutes)} 근무</div>
                        </td>
                        <td className="px-2 py-2.5 md:px-4 md:py-3 text-right">
                            <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-600 md:w-4 md:h-4 ml-auto" />
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
            
            {/* Detailed Salary Modal (Manager Only) */}
            {selectedEmployee && selectedStats && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="apple-glass w-[94%] md:w-full md:max-w-lg max-h-[90vh] flex flex-col rounded-[24px] shadow-2xl relative animate-scale-up bg-surface dark:bg-[#1c1c1e]">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start p-5 pb-3 border-b border-black/5 dark:border-white/5 shrink-0">
                            <div>
                                <h3 className="text-[20px] font-bold text-zinc-900 dark:text-white leading-tight">
                                    {selectedEmployee.name}
                                </h3>
                                <p className="text-[13px] text-zinc-500 mt-0.5">{selectedMonth.replace('-', '년 ')}월 급여 명세서</p>
                            </div>
                            <button onClick={() => setSelectedEmployee(null)} className="p-1.5 bg-black/5 dark:bg-white/10 rounded-full text-zinc-500"><X size={16} /></button>
                        </div>
                        
                        <div className="overflow-y-auto p-5 pt-3">
                            {renderDetailContent(selectedEmployee, selectedStats)}
                        </div>
                    </div>
                </div>
            )}
          </>
      )}
    </div>
  );
};

export default Payroll;