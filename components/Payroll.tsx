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

  }, [activeTab, selectedMonth, attendanceData, approvalRequests]);

  const aggregates = {
    count: payrollData.length,
    totalNetPay: payrollData.reduce((acc, curr) =>
      acc + curr.stats.grandTotal, 0)
  };

  const selectedStats =
    selectedEmployee
      ? calculateStats(selectedEmployee, selectedMonth)
      : null;

  // ✅ CSV 다운로드 기능
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

  const result = await uploadPayrollToSheet(rows);

  console.log("Upload Result:", result);

  if (result.ok) {
    const written = result.written !== undefined ? result.written : "알 수 없음";
    const sheetName = result.sheet || "알 수 없음";
    
    if (result.written === 0) {
      alert(`⚠️ 서버 연결 성공, 하지만 저장된 데이터가 0건입니다.\n서버 로그를 확인해주세요.`);
    } else {
      alert(`✅ 업로드 성공!\n\n- 저장된 행 개수: ${written}\n- 저장된 시트(탭): ${sheetName}\n\n구글 시트에서 '${sheetName}' 탭을 확인해보세요.\n(Spreadsheet ID: 1IyjHHJR9nU4Lrsm0uXpTF-12Ihx2aUjm1OwhucLcTM4)`);
    }
  } else {
    alert("❌ 업로드 실패: " + (result.error || "알 수 없는 오류"));
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
        <div>
          총 인원: {aggregates.count}명
        </div>
        <div>
          예상 지급액: ₩{aggregates.totalNetPay.toLocaleString()}
        </div>
      </div>

      {/* 테이블 */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th>직원</th>
            <th>수령액</th>
          </tr>
        </thead>
        <tbody>
          {payrollData.map(({ employee, stats }) => (
            <tr key={employee.id}>
              <td>{employee.name}</td>
              <td>₩{stats.grandTotal.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
};

export default Payroll;