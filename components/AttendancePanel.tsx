import React, { useMemo, useState } from "react";
import {
  KeyRound,
  Phone,
  LogIn,
  LogOut,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Calendar,
} from "lucide-react";

import { Employee, AttendanceRecord } from "../types";
import { MOCK_EMPLOYEES, BRANCH_NAMES } from "../constants";
import { downloadAttendanceCSV } from "../services/attendanceCsvExport";
import { uploadAttendanceToSheet } from "../services/googleUpload";

// 출퇴근 체크(전화번호뒷자리+PIN) 용 API (기존 그대로 유지)
const API_URL =
  "https://script.google.com/macros/s/AKfycbw9hI__EYVf9BCcdzO2VSKUBO9pulIhgEUyTHgJIx7UHYunEbWB_11amDamp0cMPazP/exec";

interface AttendancePanelProps {
  user?: Employee;
  className?: string;
  hideHeader?: boolean;
  attendanceData?: AttendanceRecord[];
}

type Msg = { text: string; type: "success" | "error" | "info" } | null;

const AttendancePanel: React.FC<AttendancePanelProps> = ({
  user,
  className,
  hideHeader,
  attendanceData = [],
}) => {
  // 출퇴근 체크 입력값
  const [phoneSuffix, setPhoneSuffix] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  // 화면 메시지
  const [message, setMessage] = useState<Msg>(null);

  // 근태 업로드/CSV용 월 선택
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [uploading, setUploading] = useState(false);

  // employeeId -> 직원정보 매핑
  const employeeMap = useMemo(() => {
    const map = new Map<string, any>();
    (MOCK_EMPLOYEES || []).forEach((e: any) => map.set(e.id, e));
    return map;
  }, []);

  // 출퇴근 체크 API 호출 (기존 로직 유지)
  const callApi = async (action: "checkin" | "checkout" | "status") => {
    const targetPhoneSuffix = user ? (user.phone || "").slice(-4) : phoneSuffix;
    const targetPin = user ? (user.pin || "") : pin;

    if (targetPhoneSuffix.length !== 4 || targetPin.length !== 4) {
      setMessage({
        text: "전화번호 뒷자리 4자리와 PIN 4자리를 입력해주세요.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const params = new URLSearchParams({
        action,
        phoneSuffix: targetPhoneSuffix,
        pin: targetPin,
      });

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        method: "GET",
        redirect: "follow",
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data = await response.json();

      if (data.result === "success") {
        setMessage({
          text: data.message || "성공적으로 처리되었습니다.",
          type: "success",
        });
      } else {
        setMessage({
          text: data.message || "오류가 발생했습니다.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("API Error:", error);
      setMessage({ text: "서버 통신 중 오류가 발생했습니다.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ 근태 데이터 -> 업로드/CSV rows 변환
   * - 월 필터
   * - 승인완료만 업로드: PENDING_APPROVAL 제외
   * - 컬럼: month, branchCode, branchName, employeeName, date, status, minutes
   * - 정렬: 지점코드 > 이름 > 날짜
   */
  const buildAttendanceRows = (month: string) => {
    const rows = (attendanceData || [])
      .filter((r) => (r.date || "").startsWith(month))
      // ✅ 승인 완료만 업로드 (승인대기 제외)
      .filter((r) => String(r.status || "") !== "PENDING_APPROVAL")
      .map((r) => {
        const emp: any = employeeMap.get(r.employeeId);

        const branchCode = emp?.branch || ""; // 예: GDXC
        const branchName =
          BRANCH_NAMES?.[branchCode as keyof typeof BRANCH_NAMES] ||
          branchCode ||
          "";

        return {
          month, // ✅ 덮어쓰기 키
          branchCode,
          branchName,
          employeeName: emp?.name || r.employeeId,
          date: r.date,
          status: String(r.status || ""),
          minutes: Number(r.accumulatedMinutes || 0),
        };
      });

    // ✅ 지점별 > 이름별 > 날짜순 정렬
    rows.sort((a, b) => {
      const bc = (a.branchCode || "").localeCompare(b.branchCode || "");
      if (bc !== 0) return bc;

      const nm = (a.employeeName || "").localeCompare(b.employeeName || "");
      if (nm !== 0) return nm;

      return (a.date || "").localeCompare(b.date || "");
    });

    return rows;
  };

  /** ✅ 근태 CSV 다운로드 (위 rows 그대로 사용: 필터/정렬/컬럼 동일) */
  const handleAttendanceCSVDownload = () => {
    if (!selectedMonth) {
      alert("월이 선택되지 않았습니다.");
      return;
    }
    const rows = buildAttendanceRows(selectedMonth);
    if (rows.length === 0) {
      alert("해당 월에 다운로드할 근태(승인완료) 데이터가 없습니다.");
      return;
    }
    downloadAttendanceCSV(`attendance_${selectedMonth}`, rows);
  };

  /** ✅ 근태 구글시트 업로드(월 덮어쓰기) */
  const handleAttendanceUpload = async () => {
    if (uploading) return;

    if (!selectedMonth) {
      alert("월이 선택되지 않았습니다.");
      return;
    }

    const rows = buildAttendanceRows(selectedMonth);

    if (rows.length === 0) {
      alert("해당 월에 업로드할 근태(승인완료) 데이터가 없습니다.");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadAttendanceToSheet(rows);

      if (result?.ok) {
        alert(
          `✅ 근태 업로드 완료\n- 삭제: ${result.deleted ?? 0}행\n- 추가: ${
            result.written ?? 0
          }행\n(월: ${result.month || selectedMonth})`
        );
      } else {
        alert(
          "❌ 근태 업로드 실패: " +
            (result?.error || result?.message || "알 수 없는 오류")
        );
      }
    } catch (e) {
      console.error(e);
      alert("❌ 근태 업로드 오류: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setUploading(false);
    }
  };

  // 관리자 도구 노출 조건: 근태 데이터가 있을 때
  const showAdminTools = !!(attendanceData && attendanceData.length > 0);

  return (
    <div
      className={`apple-glass p-6 rounded-[24px] w-full ${
        className || "max-w-md mx-auto"
      }`}
    >
      {!hideHeader && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <KeyRound className="text-blue-500" />
            {user ? "출퇴근 기록" : "출퇴근 체크"}
          </h2>
          {(loading || uploading) && (
            <RefreshCw className="animate-spin text-zinc-400" size={20} />
          )}
        </div>
      )}

      <div className="space-y-4">
        {!user && (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                전화번호 뒷자리 (4자리)
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={16}
                />
                <input
                  type="text"
                  maxLength={4}
                  value={phoneSuffix}
                  onChange={(e) =>
                    setPhoneSuffix(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="w-full h-12 pl-10 pr-4 bg-zinc-100 dark:bg-white/10 rounded-xl outline-none text-lg font-mono tracking-widest text-center focus:ring-2 ring-blue-500/50 transition-all"
                  placeholder="1234"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                PIN (4자리)
              </label>
              <div className="relative">
                <KeyRound
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={16}
                />
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full h-12 pl-10 pr-4 bg-zinc-100 dark:bg-white/10 rounded-xl outline-none text-lg font-mono tracking-widest text-center focus:ring-2 ring-blue-500/50 transition-all"
                  placeholder="••••"
                />
              </div>
            </div>
          </>
        )}

        {message && (
          <div
            className={`p-3 rounded-xl text-sm flex items-start gap-2 ${
              message.type === "success"
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : message.type === "error"
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 출퇴근 버튼 */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => callApi("checkin")}
            disabled={loading}
            className="h-12 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            <LogIn size={18} />
            출근하기
          </button>
          <button
            onClick={() => callApi("checkout")}
            disabled={loading}
            className="h-12 bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-300 dark:hover:bg-white/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:bg-zinc-200"
          >
            <LogOut size={18} />
            퇴근하기
          </button>
          <button
            onClick={() => callApi("status")}
            disabled={loading}
            className="col-span-2 h-10 bg-transparent border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} />
            현재 상태 조회
          </button>
        </div>

        {/* ✅ 관리자용: 근태 CSV/업로드 */}
        {showAdminTools && (
          <div className="pt-4 mt-2 border-t border-black/5 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                근태 내보내기(승인완료만)
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Calendar size={14} />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAttendanceCSVDownload}
                disabled={uploading}
                className="h-10 bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-white/20 transition-all disabled:opacity-50"
              >
                <Download size={16} />
                CSV 다운로드
              </button>

              <button
                onClick={handleAttendanceUpload}
                disabled={uploading}
                className="h-10 bg-[#1D6F42] hover:bg-[#185c37] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={16} />
                )}
                구글시트 업로드
              </button>
            </div>

            <div className="text-[12px] text-zinc-500 dark:text-zinc-400">
              * 업로드는 <b>{selectedMonth}</b> 월의 <b>승인완료</b> 기록만{" "}
              <b>지점코드 → 이름 → 날짜</b> 순으로 정렬해 <b>덮어쓰기</b>로 반영됩니다.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePanel;