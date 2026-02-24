import React, { useState } from 'react';
import { KeyRound, Phone, LogIn, LogOut, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Employee, AttendanceRecord } from '../types';
import { downloadAttendanceCSV } from "../services/attendanceCsvExport";
import { uploadAttendanceToSheet } from "../services/googleUpload";

const API_URL = 'https://script.google.com/macros/s/AKfycbw9hI__EYVf9BCcdzO2VSKUBO9pulIhgEUyTHgJIx7UHYunEbWB_11amDamp0cMPazP/exec';

interface AttendancePanelProps {
  user?: Employee;
  className?: string;
  hideHeader?: boolean;
  attendanceData?: AttendanceRecord[];
}

const AttendancePanel: React.FC<AttendancePanelProps> = ({ user, className, hideHeader, attendanceData }) => {
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const callApi = async (action: 'checkin' | 'checkout' | 'status') => {
    // Determine credentials
    const targetPhoneSuffix = user ? user.phone.slice(-4) : phoneSuffix;
    const targetPin = user ? user.pin : pin;

    if (targetPhoneSuffix.length !== 4 || targetPin.length !== 4) {
      setMessage({ text: '전화번호 뒷자리 4자리와 PIN 4자리를 입력해주세요.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Using GET request to avoid CORS preflight issues common with GAS
      const params = new URLSearchParams({
        action,
        phoneSuffix: targetPhoneSuffix,
        pin: targetPin
      });

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        method: 'GET',
        redirect: 'follow' // Important for GAS web apps
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.result === 'success') {
        setMessage({ text: data.message || '성공적으로 처리되었습니다.', type: 'success' });
        setLastAction(action);
      } else {
        setMessage({ text: data.message || '오류가 발생했습니다.', type: 'error' });
      }
    } catch (error) {
      console.error('API Error:', error);
      setMessage({ text: '서버 통신 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`apple-glass p-6 rounded-[24px] w-full ${className || 'max-w-md mx-auto'}`}>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <KeyRound className="text-blue-500" />
            {user ? '출퇴근 기록' : '출퇴근 체크'}
          </h2>
          {loading && <RefreshCw className="animate-spin text-zinc-400" size={20} />}
        </div>
      )}

      <div className="space-y-4">
        {!user && (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">전화번호 뒷자리 (4자리)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="text"
                  maxLength={4}
                  value={phoneSuffix}
                  onChange={(e) => setPhoneSuffix(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full h-12 pl-10 pr-4 bg-zinc-100 dark:bg-white/10 rounded-xl outline-none text-lg font-mono tracking-widest text-center focus:ring-2 ring-blue-500/50 transition-all"
                  placeholder="1234"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">PIN (4자리)</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full h-12 pl-10 pr-4 bg-zinc-100 dark:bg-white/10 rounded-xl outline-none text-lg font-mono tracking-widest text-center focus:ring-2 ring-blue-500/50 transition-all"
                  placeholder="••••"
                />
              </div>
            </div>
          </>
        )}

        {message && (
          <div className={`p-3 rounded-xl text-sm flex items-start gap-2 ${
            message.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
            message.type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
            'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => callApi('checkin')}
            disabled={loading}
            className="h-12 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            <LogIn size={18} />
            출근하기
          </button>
          <button
            onClick={() => callApi('checkout')}
            disabled={loading}
            className="h-12 bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-300 dark:hover:bg-white/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:bg-zinc-200"
          >
            <LogOut size={18} />
            퇴근하기
          </button>
          <button
            onClick={() => callApi('status')}
            disabled={loading}
            className="col-span-2 h-10 bg-transparent border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} />
            현재 상태 조회
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendancePanel;
