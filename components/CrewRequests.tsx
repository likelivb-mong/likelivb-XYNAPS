import React, { useState } from 'react';
import { Employee, ApprovalRequest } from '../types';
import { FileText, Clock, DollarSign, Upload, X, CheckCircle, Receipt, Plus, History, AlertCircle } from 'lucide-react';

interface CrewRequestsProps {
  currentUser: Employee;
  onRequestSubmit?: (request: ApprovalRequest) => void;
  requests: ApprovalRequest[];
  onCancelRequest: (id: string) => void;
}

const CrewRequests: React.FC<CrewRequestsProps> = ({ currentUser, onRequestSubmit, requests, onCancelRequest }) => {
  const [activeTab, setActiveTab] = useState<'CORRECTION' | 'EXPENSE'>('CORRECTION');
  
  // Form States
  const [targetDate, setTargetDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  // Filter requests for current user (use real requests prop)
  const myRequests = requests
    .filter(r => r.employeeId === currentUser.id)
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDate || !description) return alert('필수 정보를 입력해주세요.');
    if (activeTab === 'EXPENSE' && (!expenseAmount)) return alert('청구 금액은 필수입니다.');

    let isoStartTime = undefined;
    let isoEndTime = undefined;

    if (activeTab === 'CORRECTION') {
        if (startTime) {
            isoStartTime = new Date(`${targetDate}T${startTime}`).toISOString();
        }
        if (endTime) {
            isoEndTime = new Date(`${targetDate}T${endTime}`).toISOString();
        }
    }

    const newRequest: ApprovalRequest = {
        id: `req-${Date.now()}`,
        employeeId: currentUser.id,
        type: activeTab,
        description,
        status: 'PENDING',
        requestDate: new Date().toISOString().split('T')[0],
        targetDate,
        startTime: isoStartTime,
        endTime: isoEndTime,
        expenseAmount: activeTab === 'EXPENSE' ? Number(expenseAmount) : undefined,
        proofImageUrl: receiptImage || undefined
    };

    if (onRequestSubmit) {
        onRequestSubmit(newRequest);
    }
    
    // Reset
    setTargetDate('');
    setStartTime('');
    setEndTime('');
    setDescription('');
    setExpenseAmount('');
    setReceiptImage(null);
    alert('요청이 제출되었습니다.');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setReceiptImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20">
       <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-[16px] font-bold text-zinc-900 dark:text-white tracking-tight leading-none">요청 및 청구</h2>
        <p className="text-[13px] text-zinc-500 mt-1 font-medium">근무 기록 수정이나 비용 청구를 진행합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Request Form */}
          <div className="apple-glass rounded-[20px] p-5 h-fit order-1">
              <div className="flex p-1 bg-zinc-100 dark:bg-white/10 rounded-[12px] mb-5">
                <button
                    onClick={() => setActiveTab('CORRECTION')}
                    className={`flex-1 py-2 text-[13px] font-semibold rounded-[10px] transition-all flex items-center justify-center gap-2 ${activeTab === 'CORRECTION' ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                    <Clock size={14} /> 근무 기록 수정
                </button>
                <button
                    onClick={() => setActiveTab('EXPENSE')}
                    className={`flex-1 py-2 text-[13px] font-semibold rounded-[10px] transition-all flex items-center justify-center gap-2 ${activeTab === 'EXPENSE' ? 'bg-white dark:bg-[#636366] text-black dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                    <DollarSign size={14} /> 비용 청구
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                      <label className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">
                          {activeTab === 'CORRECTION' ? '수정 대상 날짜' : '비용 발생 날짜'} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="date" 
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full h-[42px] px-3 rounded-[12px] text-[13px] bg-white dark:bg-[#1c1c1e] outline-none border border-black/5 dark:border-white/5 focus:border-blue-500/50 transition-colors" 
                        required
                      />
                  </div>

                  {activeTab === 'CORRECTION' && (
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">출근 시간</label>
                              <input 
                                type="time" 
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full h-[42px] px-3 rounded-[12px] text-[13px] bg-white dark:bg-[#1c1c1e] text-center outline-none border border-black/5 dark:border-white/5 focus:border-blue-500/50 transition-colors" 
                              />
                          </div>
                          <div>
                              <label className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">퇴근 시간</label>
                              <input 
                                type="time" 
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full h-[42px] px-3 rounded-[12px] text-[13px] bg-white dark:bg-[#1c1c1e] text-center outline-none border border-black/5 dark:border-white/5 focus:border-blue-500/50 transition-colors" 
                              />
                          </div>
                      </div>
                  )}

                  {activeTab === 'EXPENSE' && (
                       <div>
                        <label className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">청구 금액 (원) <span className="text-red-500">*</span></label>
                        <input 
                            type="number" 
                            placeholder="예: 15000"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            className="w-full h-[42px] px-3 rounded-[12px] text-[13px] bg-white dark:bg-[#1c1c1e] outline-none border border-black/5 dark:border-white/5 focus:border-blue-500/50 transition-colors" 
                            required
                        />
                      </div>
                  )}

                  <div>
                      <label className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">사유 / 상세 내용 <span className="text-red-500">*</span></label>
                      <textarea 
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder={activeTab === 'CORRECTION' ? "예: 출근 버튼을 깜빡했습니다." : "예: 매장 비품 구매 (영수증 첨부)"}
                          className="w-full h-24 p-3 rounded-[12px] text-[13px] bg-white dark:bg-[#1c1c1e] resize-none outline-none border border-black/5 dark:border-white/5 focus:border-blue-500/50 transition-colors"
                          required
                      />
                  </div>
                  
                  {activeTab === 'EXPENSE' && (
                      <div>
                           <label className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">영수증 첨부</label>
                           <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-[12px] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                               {receiptImage ? (
                                   <div className="relative h-full w-full p-2">
                                       <img src={receiptImage} alt="Receipt" className="h-full w-full object-contain rounded-lg" />
                                       <button type="button" onClick={(e) => {e.preventDefault(); setReceiptImage(null);}} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={12} /></button>
                                   </div>
                               ) : (
                                   <div className="flex flex-col items-center gap-1 text-zinc-400">
                                       <Upload size={16} />
                                       <span className="text-[12px]">터치하여 사진 업로드</span>
                                   </div>
                               )}
                               <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                           </label>
                      </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full h-[48px] bg-[#0A84FF] hover:bg-blue-600 text-white rounded-[14px] font-bold text-[14px] shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all mt-2"
                  >
                    제출하기
                  </button>
              </form>
          </div>

          {/* History List */}
          <div className="order-2 space-y-3">
              <h3 className="text-[14px] font-bold text-zinc-900 dark:text-white px-1 flex items-center gap-2">
                  <History size={14} className="text-zinc-500" />
                  최근 요청 내역
              </h3>
              
              {myRequests.length === 0 ? (
                  <div className="apple-glass rounded-[20px] p-8 flex flex-col items-center justify-center text-zinc-400 text-[13px]">
                      <FileText size={24} className="mb-2 opacity-50" />
                      <p>요청 내역이 없습니다.</p>
                  </div>
              ) : (
                  <div className="space-y-2">
                      {myRequests.map((req) => (
                          <div key={req.id} className="apple-glass rounded-[16px] p-4 flex flex-col gap-2 border border-black/5 dark:border-white/5">
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2">
                                      <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${
                                          req.type === 'EXPENSE' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' :
                                          'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300'
                                      }`}>
                                          {req.type === 'EXPENSE' ? '비용 청구' : req.type === 'CLOCK_IN' ? '근무 요청' : '근무 수정'}
                                      </span>
                                      <span className="text-[12px] text-zinc-400">{req.targetDate}</span>
                                  </div>
                                  <span className={`text-[12px] font-bold flex items-center gap-1 ${
                                      req.status === 'APPROVED' ? 'text-green-500' : 
                                      req.status === 'REJECTED' ? 'text-red-500' : 'text-orange-500'
                                  }`}>
                                      {req.status === 'APPROVED' ? <CheckCircle size={12} /> : 
                                       req.status === 'REJECTED' ? <AlertCircle size={12} /> : 
                                       <Clock size={12} />}
                                      {req.status === 'APPROVED' ? '승인됨' : 
                                       req.status === 'REJECTED' ? '반려됨' : '대기중'}
                                  </span>
                              </div>
                              <p className="text-[13px] text-zinc-700 dark:text-zinc-200 leading-snug">
                                  {req.description}
                              </p>
                              {req.expenseAmount && (
                                  <div className="text-[13px] font-semibold text-zinc-900 dark:text-white mt-1">
                                      ₩{req.expenseAmount.toLocaleString()}
                                  </div>
                              )}

                              {/* Cancel Button for Pending Requests */}
                              {req.status === 'PENDING' && (
                                <button
                                    onClick={() => {
                                        if(confirm('정말 요청을 취소하시겠습니까?')) {
                                            onCancelRequest(req.id);
                                        }
                                    }}
                                    className="mt-2 w-full py-2 rounded-[8px] border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-[12px] font-medium hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 transition-colors"
                                >
                                    요청 취소
                                </button>
                              )}
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default CrewRequests;