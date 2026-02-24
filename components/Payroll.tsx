console.log("🔥 새 코드 실행됨");
import React, { useState, useMemo } from 'react';
import { MOCK_EMPLOYEES, BRANCH_NAMES, MOCK_HOLIDAYS } from '../constants';
import { Employee, AttendanceRecord, AttendanceStatus, AttendanceTag, ApprovalRequest } from '../types';
import { ChevronRight, X, Building2, Wallet, Calendar, AlertCircle, PartyPopper, Receipt, FileSpreadsheet, Loader2, Download } from 'lucide-react';
import { downloadCSV } from "../services/csvExport";
import { uploadPayrollToSheet } from "../services/googleUpload";

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

const Payroll: React.FC<{
  isCrewMode?: boolean;
  currentUser?: Employee;
  attendanceData?: AttendanceRecord[];
  approvalRequests?: ApprovalRequest[];
}> = ({ isCrewMode = false, currentUser, attendanceData = [], approvalRequests = [] }) => {

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const calculateStats = (emp: Employee, monthStr: string): MonthlyStats => {

    const monthlyRecords = attendanceData.filter(r =>
      r.employeeId === emp.id &&
      r.date.startsWith(monthStr) &&
      r.status !== AttendanceStatus.PENDING_APPROVAL
    );

    const monthlyExpenses = approvalRequests
      .filter(req =>
        req.employeeId === emp.id &&
        req.type === 'EXPENSE' &&
        req.status === 'APPROVED' &&
        req.targetDate.startsWith(monthStr)
      )
      .reduce((sum, req) => sum + (req.expenseAmount || 0), 0);

    monthlyRecords.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let totalMinutes = 0;
    let totalBasePay = 0;
    let totalHolidayPay = 0;

    const hourlyWage =
      emp.wage.basic +
      emp.wage.responsibility +
      emp.wage.incentive +
      emp.wage.special;

    const records: DailyWageRecord[] = monthlyRecords.map(record => {

      const minutes = record.accumulatedMinutes || 0;
      const hours = minutes / 60;

      const basePay = Math.floor(hours * hourlyWage);

      const holiday = MOCK_HOLIDAYS.find(h => h.date === record.date);
      let holidayAllowance = 0;

      if (holiday) {
        holidayAllowance = Math.floor(hours * holiday.extraHourlyPay);
      }

      const tags: AttendanceTag[] = [];
      if (record.tag) tags.push(record.tag);

      totalMinutes += minutes;
      totalBasePay += basePay;
      totalHolidayPay += holidayAllowance;

      return {
        date: record.date,
        dayOfWeek: getDayOfWeek(record.date),
        accumulatedMinutes: minutes,
        basePay,
        holidayPay: holidayAllowance,
        totalDailyPay: basePay + holidayAllowance,
        isHoliday: !!holiday,
        holidayName: holiday?.name,
        tags
      };
    });

    const totalTaxableIncome = totalBasePay + totalHolidayPay + monthlyExpenses;
    const taxAmount = Math.floor(totalTaxableIncome * 0.033);
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

    if (isCrewMode && currentUser) return [];

    const targetEmployees =
      MOCK_EMPLOYEES.filter(e =>
        activeTab === 'ALL' || e.branch === activeTab
      );

    return targetEmployees.map(emp => ({
      employee: emp,
      stats: calculateStats(emp, selectedMonth)
    }));

  }, [activeTab, selectedMonth, attendanceData, approvalRequests, isCrewMode, currentUser]);

  const aggregates = {
    count: payrollData.length,
    totalNetPay: payrollData.reduce((acc, curr) =>
      acc + curr.stats.grandTotal, 0)
  };

  const selectedStats =
    selectedEmployee
      ? calculateStats(selectedEmployee, selectedMonth)
      : null;

  const handleCSVDownload = () => {
    if (!selectedMonth) {
      alert("정산 월이 선택되지 않았습니다.");
      return;
    }

    const rows = payrollData.map(p => ({
      month: selectedMonth,
      branch: BRANCH_NAMES[p.employee.branch],
      name: p.employee.name,
      totalMinutes: p.stats.totalMinutes,
      basePay: p.stats.totalBasePay,
      holidayPay: p.stats.totalHolidayPay,
      expenses: p.stats.totalExpenses,
      taxAmount: p.stats.taxAmount,
      netPay: p.stats.grandTotal
    }));

    downloadCSV(`payroll_${selectedMonth}`, rows);
  };

  const handleGoogleSheetUpload = async () => {
    if (isUploading) return;

    if (!selectedMonth) {
      alert("정산 월이 선택되지 않았습니다.");
      return;
    }

    const rows = payrollData.map(p => ({
      month: selectedMonth, // ✅ 덮어쓰기 키
      branch: BRANCH_NAMES[p.employee.branch],
      name: p.employee.name,
      totalMinutes: p.stats.totalMinutes,
      basePay: p.stats.totalBasePay,
      holidayPay: p.stats.totalHolidayPay,
      expenses: p.stats.totalExpenses,
      grossTotal: p.stats.grossTotal,
      taxAmount: p.stats.taxAmount,
      netPay: p.stats.grandTotal
    }));

    if (rows.length === 0) {
      alert("업로드할 데이터가 없습니다.");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadPayrollToSheet(rows);
      if (result?.ok) {
        alert(`✅ 급여 업로드 완료\n- 삭제: ${result.deleted}행\n- 추가: ${result.written}행\n(월: ${result.month})`);
      } else {
        alert("❌ 급여 업로드 실패: " + (result?.error || "알 수 없는 오류"));
      }
    } catch (e) {
      alert("❌ 급여 업로드 오류: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">

      {/* 헤더 */}
      <div className="flex justify-between items-end border-b border-zinc-200 dark:border-white/10 pb-6">

        <div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {isCrewMode ? '내 급여 정산' : '급여 정산'}
          </h2>

          <div className="mt-2 flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <Calendar size={16} />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent outline-none cursor-pointer font-medium text-zinc-900 dark:text-white"
            />
          </div>
        </div>

        {!isCrewMode && (
          <div className="flex gap-2">

            <button
              onClick={handleCSVDownload}
              className="flex items-center gap-2 px-4 h-10 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-zinc-900 dark:text-white transition-colors"
            >
              <Download size={16} />
              CSV 다운로드
            </button>

            <button
              onClick={handleGoogleSheetUpload}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 h-10 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} />
                  구글 시트 업로드
                </>
              )}
            </button>

          </div>
        )}
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Building2 size={16} />
            총 인원
          </div>
          <div className="text-2xl font-bold mt-1 text-zinc-900 dark:text-white">
            {aggregates.count}명
          </div>
        </div>

        <div className="p-4 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Wallet size={16} />
            예상 지급액(세후)
          </div>
          <div className="text-2xl font-bold mt-1 text-zinc-900 dark:text-white">
            ₩{aggregates.totalNetPay.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border border-zinc-200 dark:border-white/10 overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-white/5 border-b border-zinc-200 dark:border-white/10">
            <tr>
              <th className="p-3 text-left text-sm text-gray-600 dark:text-gray-400">직원</th>
              <th className="p-3 text-right text-sm text-gray-600 dark:text-gray-400">수령액</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-white/10">
            {payrollData.map(({ employee, stats }) => (
              <tr
                key={employee.id}
                className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => setSelectedEmployee(employee)}
              >
                <td className="p-3">
                  <div className="font-bold text-zinc-900 dark:text-white">{employee.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{BRANCH_NAMES[employee.branch]}</div>
                </td>
                <td className="p-3 text-right font-bold text-zinc-900 dark:text-white">
                  ₩{stats.grandTotal.toLocaleString()}
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    {formatDuration(stats.totalMinutes)} 근무
                  </div>
                </td>
                <td className="p-3 text-right">
                  <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 상세 모달 (상세 버전) */}
      {selectedEmployee && selectedStats && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-white/10">
            
            {/* 모달 헤더 */}
            <div className="p-6 border-b border-zinc-200 dark:border-white/10 flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  {selectedEmployee.name}
                  <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10">
                    {BRANCH_NAMES[selectedEmployee.branch]}
                  </span>
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">{selectedMonth} 급여 상세 내역</p>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* 모달 본문 (스크롤 가능) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* 1. 요약 정보 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">총 근무시간</div>
                  <div className="text-lg font-bold text-zinc-900 dark:text-white">{formatDuration(selectedStats.totalMinutes)}</div>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">기본급</div>
                  <div className="text-lg font-bold text-zinc-900 dark:text-white">₩{selectedStats.totalBasePay.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">휴일수당</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">₩{selectedStats.totalHolidayPay.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">실수령액</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">₩{selectedStats.grandTotal.toLocaleString()}</div>
                </div>
              </div>

              {/* 2. 일자별 상세 내역 */}
              <div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <Calendar size={18} />
                  일자별 근무 내역
                </h4>
                <div className="border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-50 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 font-medium border-b border-zinc-200 dark:border-white/10">
                      <tr>
                        <th className="px-4 py-3">날짜</th>
                        <th className="px-4 py-3">근무시간</th>
                        <th className="px-4 py-3 text-right">일급</th>
                        <th className="px-4 py-3 text-center">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-white/10">
                      {selectedStats.records.map((record, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${
                                record.dayOfWeek === '일' ? 'text-red-500' : 
                                record.dayOfWeek === '토' ? 'text-blue-500' : 
                                'text-zinc-900 dark:text-white'
                              }`}>
                                {record.date.slice(5)} ({record.dayOfWeek})
                              </span>
                              {record.isHoliday && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 font-bold">
                                  {record.holidayName || '휴일'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                            {formatDuration(record.accumulatedMinutes)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-white">
                            ₩{record.totalDailyPay.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {record.tags.length > 0 ? (
                                record.tags.map(tag => (
                                  <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                    tag === 'LATE' ? 'bg-yellow-100 border-yellow-200 text-yellow-700 dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-400' :
                                    tag === 'EARLY_LEAVE' ? 'bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400' :
                                    tag === 'OVERTIME' ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400' :
                                    tag === 'HOLIDAY_WORK' ? 'bg-red-100 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400' :
                                    'bg-zinc-100 border-zinc-200 text-zinc-600 dark:bg-white/10 dark:border-white/10 dark:text-zinc-400'
                                  }`}>
                                    {tag === 'LATE' ? '지각' :
                                     tag === 'EARLY_LEAVE' ? '조퇴' :
                                     tag === 'OVERTIME' ? '연장' :
                                     tag === 'HOLIDAY_WORK' ? '특근' : tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-600">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {selectedStats.records.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-zinc-400 dark:text-zinc-600">
                            근무 내역이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. 최종 정산 내역 */}
              <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-5 space-y-3 border border-zinc-100 dark:border-white/5">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">과세총액 (기본급+수당+비용)</span>
                  <span className="font-medium text-zinc-900 dark:text-white">₩{selectedStats.grossTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-red-500 dark:text-red-400">
                  <span>세금 (3.3%)</span>
                  <span>- ₩{selectedStats.taxAmount.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-zinc-200 dark:border-white/10 flex justify-between items-center">
                  <span className="font-bold text-zinc-900 dark:text-white">최종 지급액</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">₩{selectedStats.grandTotal.toLocaleString()}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Payroll;