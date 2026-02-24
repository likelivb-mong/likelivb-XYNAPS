import React, { useState } from 'react';
import { Smartphone, KeyRound, ArrowRight, ShieldCheck, UserCog, Lock, X, Eye, EyeOff } from 'lucide-react';
import { Employee, UserRole } from '../types';

interface LoginProps {
  employees: Employee[];
  onLogin: (employee: Employee, remember: boolean) => void;
  onManagerLogin: (remember: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ employees, onLogin, onManagerLogin }) => {
  const [phoneLast4, setPhoneLast4] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  // Manager Auth States
  const [showManagerAuth, setShowManagerAuth] = useState(false);
  const [managerPassword, setManagerPassword] = useState('');
  const [rememberManager, setRememberManager] = useState(false);
  const [managerError, setManagerError] = useState('');

  const handleCrewLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phoneLast4.length !== 4) {
      setError('휴대폰 번호 뒷자리 4자리를 입력해주세요.');
      return;
    }
    if (pin.length !== 4) {
      setError('PIN 코드 4자리를 입력해주세요.');
      return;
    }

    const found = employees.find(
      (emp) => emp.phone.slice(-4) === phoneLast4 && emp.pin === pin.toUpperCase()
    );

    if (found) {
      if (found.isResigned) {
        setError('퇴사 처리된 계정입니다. 관리자에게 문의하세요.');
        return;
      }
      onLogin(found, rememberMe);
    } else {
      setError('정보가 일치하지 않습니다. 다시 확인해주세요.');
    }
  };

  const handleManagerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManagerError('');
    if (managerPassword === '86890107') {
        onManagerLogin(rememberManager);
    } else {
        setManagerError('비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-100 dark:bg-black p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-[340px] flex flex-col items-center relative z-10 animate-scale-up">
        {/* Logo Area */}
        <div className="mb-6 flex flex-col items-center text-center">
          
          {/* Stacked Slogan */}
          <div className="flex flex-col items-center leading-none tracking-tighter mb-4 gap-0.5 mt-8">
            <span className="text-[28px] font-black text-zinc-900 dark:text-white">the work is</span>
            <span className="text-[28px] font-black text-zinc-900 dark:text-white">mysterious</span>
            <span className="text-[28px] font-black text-zinc-900 dark:text-white">& important</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full apple-glass rounded-[24px] p-6 shadow-2xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl relative transition-all duration-300">
          
          {!showManagerAuth ? (
             /* Crew Login Form */
            <form onSubmit={handleCrewLogin} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">
                    휴대폰 번호 (뒷 4자리)
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                      type="text"
                      maxLength={4}
                      value={phoneLast4}
                      onChange={(e) => setPhoneLast4(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="0000"
                      className="w-full h-[46px] pl-10 pr-4 rounded-[14px] bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 text-[16px] font-bold tracking-widest text-center text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">
                    PIN 코드
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                      type={showPin ? "text" : "password"}
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.toUpperCase())}
                      placeholder="PIN"
                      className="w-full h-[46px] pl-10 pr-10 rounded-[14px] bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 text-[16px] font-bold tracking-widest text-center text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-zinc-300 uppercase"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                    >
                        {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-2.5 rounded-[12px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] font-medium text-center animate-pulse">
                    {error}
                  </div>
                )}

                {/* Auto Login Checkbox */}
                <div className="flex items-center justify-center">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all ${rememberMe ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-zinc-300 dark:border-zinc-600'}`}>
                      {rememberMe && <ShieldCheck size={10} className="text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      checked={rememberMe} 
                      onChange={(e) => setRememberMe(e.target.checked)} 
                      className="hidden" 
                    />
                    <span className="text-[12px] text-zinc-600 dark:text-zinc-400 font-medium select-none group-hover:text-zinc-900 dark:group-hover:text-zinc-200">자동 로그인</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full h-[50px] rounded-[16px] bg-[#0A84FF] hover:bg-blue-600 text-white text-[15px] font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <span>로그인</span>
                  <ArrowRight size={16} />
                </button>
            </form>
          ) : (
             /* Manager Auth Form */
            <form onSubmit={handleManagerSubmit} className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-[16px] font-bold text-zinc-900 dark:text-white">마스터 인증</h3>
                    <button type="button" onClick={() => setShowManagerAuth(false)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                        <X size={18} className="text-zinc-500" />
                    </button>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">
                    관리자 비밀번호
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                      type="password"
                      autoFocus
                      value={managerPassword}
                      onChange={(e) => setManagerPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full h-[46px] pl-10 pr-4 rounded-[14px] bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 text-[16px] font-bold tracking-widest text-center text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-500/50 transition-all placeholder-zinc-300"
                    />
                  </div>
                </div>

                {managerError && (
                  <div className="p-2.5 rounded-[12px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] font-medium text-center animate-pulse">
                    {managerError}
                  </div>
                )}

                {/* Manager Auto Login Checkbox */}
                <div className="flex items-center justify-center">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all ${rememberManager ? 'bg-zinc-800 border-zinc-800 dark:bg-white dark:border-white' : 'bg-transparent border-zinc-300 dark:border-zinc-600'}`}>
                      {rememberManager && <ShieldCheck size={10} className="text-white dark:text-black" />}
                    </div>
                    <input 
                      type="checkbox" 
                      checked={rememberManager} 
                      onChange={(e) => setRememberManager(e.target.checked)} 
                      className="hidden" 
                    />
                    <span className="text-[12px] text-zinc-600 dark:text-zinc-400 font-medium select-none group-hover:text-zinc-900 dark:group-hover:text-zinc-200">자동 로그인</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full h-[50px] rounded-[16px] bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black text-[15px] font-bold shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <span>인증 및 입장</span>
                  <ShieldCheck size={16} />
                </button>
            </form>
          )}
        </div>

        {/* Manager Login Link (Only show when not in auth mode) */}
        {!showManagerAuth && (
            <button 
            onClick={() => { setShowManagerAuth(true); setManagerPassword(''); setManagerError(''); }}
            className="mt-6 flex items-center gap-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors text-[12px] font-medium"
            >
            <UserCog size={14} />
            관리자 모드로 입장
            </button>
        )}

        <p className="absolute bottom-[-60px] text-[11px] text-zinc-300 dark:text-zinc-600">
          © 2026 XYNAPS Corp.
        </p>
      </div>
    </div>
  );
};

export default Login;