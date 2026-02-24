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
    month: selectedMonth,
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

    // ✅ 콘솔에 서버 응답 출력
    console.log("=== 업로드 서버 응답 ===");
    console.log(result);

    if (result?.ok) {
      alert("업로드 요청은 성공했습니다. 콘솔(F12)에서 응답을 확인하세요.");
    } else {
      alert("❌ 서버 응답 오류. 콘솔(F12)을 확인하세요.");
    }

  } catch (e) {
    console.error("업로드 오류:", e);
    alert("❌ 업로드 중 에러 발생. 콘솔(F12)을 확인하세요.");
  } finally {
    setIsUploading(false);
  }
};

  return (
    <div className="space-y-6 pb-20">

      {/* 헤더 */}
      <div className="flex justify-between items-end border-b pb-6">

        <div>
          <h2 className="text-3xl font-bold">
            {isCrewMode ? '내 급여 정산' : '급여 정산'}
          </h2>

          <div className="mt-2 flex items-center gap-2">
            <Calendar size={16} />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>

        {!isCrewMode && (
          <div className="flex gap-2">

            <button
              onClick={handleCSVDownload}
              className="flex items-center gap-2 px-4 h-10 rounded-lg border bg-white hover:bg-gray-50"
            >
              <Download size={16} />
              CSV 다운로드
            </button>

            <button
              onClick={handleGoogleSheetUpload}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 h-10 rounded-lg bg-green-600 text-white hover:bg-green-700"
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
        <div className="p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Building2 size={16} />
            총 인원
          </div>
          <div className="text-2xl font-bold mt-1">
            {aggregates.count}명
          </div>
        </div>

        <div className="p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Wallet size={16} />
            예상 지급액(세후)
          </div>
          <div className="text-2xl font-bold mt-1">
            ₩{aggregates.totalNetPay.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left text-sm text-gray-600">직원</th>
              <th className="p-3 text-right text-sm text-gray-600">수령액</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {payrollData.map(({ employee, stats }) => (
              <tr
                key={employee.id}
                className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedEmployee(employee)}
              >
                <td className="p-3">
                  <div className="font-bold">{employee.name}</div>
                  <div className="text-xs text-gray-500">{BRANCH_NAMES[employee.branch]}</div>
                </td>
                <td className="p-3 text-right font-bold">
                  ₩{stats.grandTotal.toLocaleString()}
                  <div className="text-xs text-gray-500 font-normal">
                    {formatDuration(stats.totalMinutes)} 근무
                  </div>
                </td>
                <td className="p-3 text-right">
                  <ChevronRight size={16} className="text-gray-300" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 상세 모달 (간단 버전) */}
      {selectedEmployee && selectedStats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xl font-bold">{selectedEmployee.name}</div>
                <div className="text-sm text-gray-500">{selectedMonth} 급여 상세</div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>총 근무</span><b>{formatDuration(selectedStats.totalMinutes)}</b></div>
              <div className="flex justify-between"><span>기본급</span><b>₩{selectedStats.totalBasePay.toLocaleString()}</b></div>
              <div className="flex justify-between"><span>휴일수당</span><b>₩{selectedStats.totalHolidayPay.toLocaleString()}</b></div>
              <div className="flex justify-between"><span>비용청구</span><b>₩{selectedStats.totalExpenses.toLocaleString()}</b></div>
              <div className="flex justify-between"><span>과세총액</span><b>₩{selectedStats.grossTotal.toLocaleString()}</b></div>
              <div className="flex justify-between text-red-600"><span>세금(3.3%)</span><b>- ₩{selectedStats.taxAmount.toLocaleString()}</b></div>
              <div className="flex justify-between text-green-700 text-base border-t pt-2"><span>실수령액</span><b>₩{selectedStats.grandTotal.toLocaleString()}</b></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Payroll;