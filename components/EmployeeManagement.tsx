import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BranchCode, EmployeeRank } from '../types';
import type { Employee, WageConfig } from '../types';
import { Plus, Phone, Search, X, ChevronRight, Award, Wallet, KeyRound } from 'lucide-react';
import { RANK_LABEL, BRANCH_NAMES } from '../constants';

const BANK_OPTIONS = [
  'KB국민은행',
  '신한은행',
  '하나은행',
  '우리은행',
  'NH농협은행',
  '카카오뱅크',
  '토스뱅크',
  '케이뱅크',
  '기타'
];

type SortOption = 'REGISTRATION' | 'RANK' | 'NAME';

interface EmployeeManagementProps {
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  restrictedBranch?: BranchCode;
  readOnly?: boolean;
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ 
  employees, 
  onAddEmployee,
  onUpdateEmployee,
  restrictedBranch,
  readOnly = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<BranchCode | 'ALL'>(restrictedBranch || 'ALL');
  const [sortOption, setSortOption] = useState<SortOption>('RANK');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({
    wage: { basic: 9860, responsibility: 0, incentive: 0, special: 0 }
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Branch Filter
      if (restrictedBranch && emp.branch !== restrictedBranch) return false;
      if (!restrictedBranch && selectedBranch !== 'ALL' && emp.branch !== selectedBranch) return false;

      // Search Filter
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        return (
          emp.name.toLowerCase().includes(lowerTerm) ||
          emp.phone.includes(lowerTerm) ||
          RANK_LABEL[emp.position].includes(lowerTerm)
        );
      }
      return true;
    }).sort((a, b) => {
      if (sortOption === 'RANK') {
        // Leader first
        if (a.position === EmployeeRank.LEADER && b.position !== EmployeeRank.LEADER) return -1;
        if (a.position !== EmployeeRank.LEADER && b.position === EmployeeRank.LEADER) return 1;
        return a.name.localeCompare(b.name);
      }
      if (sortOption === 'REGISTRATION') {
         return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
      }
      return a.name.localeCompare(b.name);
    });
  }, [employees, selectedBranch, searchTerm, restrictedBranch, sortOption]);

  const handleEdit = (emp: Employee) => {
    if (readOnly) return;
    setEditingEmployee(emp);
    setFormData(JSON.parse(JSON.stringify(emp))); // Deep copy
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    if (readOnly) return;
    setEditingEmployee(null);
    setFormData({
      branch: restrictedBranch || BranchCode.GDXC,
      position: EmployeeRank.CREW,
      wage: { basic: 9860, responsibility: 0, incentive: 0, special: 0 },
      isOnline: false,
      joinDate: new Date().toISOString().split('T')[0],
      isResigned: false
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.phone || !formData.pin) {
      alert('이름, 전화번호, PIN은 필수 항목입니다.');
      return;
    }

    if (editingEmployee) {
      // Update
      const updatedEmployee = { ...editingEmployee, ...formData } as Employee;
      onUpdateEmployee(updatedEmployee);
    } else {
      // Create
      const newEmployee: Employee = {
        ...formData as Employee,
        id: `emp-${Date.now()}`,
      };
      onAddEmployee(newEmployee);
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!editingEmployee) return;
    if (confirm('정말 퇴사 처리하시겠습니까?')) {
        const resignedEmp = { ...editingEmployee, isResigned: true } as Employee;
        onUpdateEmployee(resignedEmp);
        setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-20 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/5 dark:border-white/10 pb-4">
        <div>
           <h2 className="text-[20px] md:text-[34px] font-bold text-zinc-900 dark:text-white tracking-tight leading-none">직원 관리</h2>
           <p className="text-[13px] text-zinc-500 mt-1">총 {filteredEmployees.length}명의 직원이 조회되었습니다.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="flex-1 md:w-[240px] h-[40px] bg-white dark:bg-white/10 rounded-full flex items-center px-4 border border-black/5 dark:border-white/5">
                <Search size={16} className="text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="이름, 직급 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-[13px] ml-2 w-full text-zinc-900 dark:text-white placeholder-zinc-400"
                />
            </div>
            
            {!readOnly && (
                <button 
                    onClick={handleAddNew}
                    className="flex-shrink-0 w-[40px] h-[40px] md:w-auto md:h-[40px] md:px-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center gap-2 font-bold text-[13px] shadow-lg hover:scale-105 transition-transform"
                >
                    <Plus size={18} /> <span className="hidden md:inline">직원 등록</span>
                </button>
            )}
        </div>
      </div>

      {/* Filters */}
      {!restrictedBranch && (
        <div className="flex overflow-x-auto no-scrollbar pb-2 gap-2">
            <button 
                onClick={() => setSelectedBranch('ALL')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-all ${selectedBranch === 'ALL' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-white/5 text-zinc-500 hover:bg-black/5'}`}
            >
                전체 지점
            </button>
            {Object.entries(BRANCH_NAMES).map(([code, name]) => (
                <button 
                    key={code}
                    onClick={() => setSelectedBranch(code as BranchCode)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-all ${selectedBranch === code ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-white/5 text-zinc-500 hover:bg-black/5'}`}
                >
                    {name}
                </button>
            ))}
        </div>
      )}

      {/* Employee List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
         {filteredEmployees.map(emp => (
             <div 
                key={emp.id} 
                onClick={() => handleEdit(emp)}
                className={`apple-glass p-4 rounded-[20px] flex flex-col gap-3 group border border-transparent hover:border-black/5 dark:hover:border-white/10 transition-all cursor-pointer relative overflow-hidden ${emp.isResigned ? 'opacity-60 grayscale' : ''}`}
             >
                {emp.isResigned && (
                    <div className="absolute top-3 right-3 bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold z-10">퇴사</div>
                )}
                
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-bold ${
                             emp.position === EmployeeRank.LEADER ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                         }`}>
                             {emp.name.charAt(0)}
                         </div>
                         <div>
                             <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                                 {emp.name}
                                 {emp.position === EmployeeRank.LEADER && <Award size={14} className="text-purple-500" />}
                             </h3>
                             <p className="text-[12px] text-zinc-500 flex items-center gap-1.5">
                                 <span>{BRANCH_NAMES[emp.branch]}</span>
                                 <span className="w-0.5 h-0.5 rounded-full bg-zinc-300"></span>
                                 <span>{RANK_LABEL[emp.position]}</span>
                             </p>
                         </div>
                    </div>
                    {!readOnly && <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />}
                </div>

                <div className="bg-zinc-50 dark:bg-white/5 rounded-[12px] p-3 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                         <span className="text-zinc-400 flex items-center gap-1"><Phone size={12} /> 연락처</span>
                         <span className="text-zinc-700 dark:text-zinc-300 font-mono">{emp.phone}</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                         <span className="text-zinc-400 flex items-center gap-1"><Wallet size={12} /> 기본급</span>
                         <span className="text-zinc-700 dark:text-zinc-300 font-mono">₩{emp.wage.basic.toLocaleString()}</span>
                    </div>
                </div>
             </div>
         ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-fade-in">
              <div className="apple-glass w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden animate-scale-up border border-black/10 dark:border-white/10 bg-surface dark:bg-[#1c1c1e] flex flex-col max-h-[90vh]">
                  
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/5 shrink-0">
                      <h3 className="text-[18px] font-bold text-zinc-900 dark:text-white">
                          {editingEmployee ? '직원 정보 수정' : '새 직원 등록'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-zinc-500">
                          <X size={18} />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4">
                          {/* Basic Info */}
                          <div className="col-span-2 space-y-4">
                              <h4 className="text-[13px] font-bold text-zinc-400 uppercase tracking-wider mb-2">기본 정보</h4>
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className="text-[12px] font-medium text-zinc-500 block mb-1">이름</label>
                                      <input 
                                        type="text" 
                                        value={formData.name || ''}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full h-10 px-3 rounded-[10px] bg-zinc-100 dark:bg-black/20 text-[13px] outline-none border border-transparent focus:border-blue-500/50"
                                      />
                                  </div>
                                  <div>
                                      <label className="text-[12px] font-medium text-zinc-500 block mb-1">연락처</label>
                                      <input 
                                        type="text" 
                                        value={formData.phone || ''}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        className="w-full h-10 px-3 rounded-[10px] bg-zinc-100 dark:bg-black/20 text-[13px] outline-none border border-transparent focus:border-blue-500/50"
                                      />
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className="text-[12px] font-medium text-zinc-500 block mb-1">지점</label>
                                      <select 
                                        value={formData.branch}
                                        onChange={e => setFormData({...formData, branch: e.target.value as BranchCode})}
                                        disabled={!!restrictedBranch}
                                        className="w-full h-10 px-3 rounded-[10px] bg-zinc-100 dark:bg-black/20 text-[13px] outline-none border border-transparent focus:border-blue-500/50"
                                      >
                                          {Object.entries(BRANCH_NAMES).map(([code, name]) => (
                                              <option key={code} value={code}>{name}</option>
                                          ))}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="text-[12px] font-medium text-zinc-500 block mb-1">직급</label>
                                      <select 
                                        value={formData.position}
                                        onChange={e => setFormData({...formData, position: e.target.value as EmployeeRank})}
                                        className="w-full h-10 px-3 rounded-[10px] bg-zinc-100 dark:bg-black/20 text-[13px] outline-none border border-transparent focus:border-blue-500/50"
                                      >
                                          {Object.entries(RANK_LABEL).map(([code, name]) => (
                                              <option key={code} value={code}>{name}</option>
                                          ))}
                                      </select>
                                  </div>
                              </div>
                          </div>

                          {/* Account Info */}
                          <div className="col-span-2 space-y-4 pt-2 border-t border-black/5 dark:border-white/5">
                              <h4 className="text-[13px] font-bold text-zinc-400 uppercase tracking-wider mb-2">계정 및 급여</h4>
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className="text-[12px] font-medium text-zinc-500 block mb-1">입사일</label>
                                      <input 
                                        type="date" 
                                        value={formData.joinDate || ''}
                                        onChange={e => setFormData({...formData, joinDate: e.target.value})}
                                        className="w-full h-10 px-3 rounded-[10px] bg-zinc-100 dark:bg-black/20 text-[13px] outline-none border border-transparent focus:border-blue-500/50"
                                      />
                                  </div>
                                  <div>
                                      <label className="text-[12px] font-medium text-zinc-500 block mb-1 flex items-center gap-1">
                                          <KeyRound size={12} /> 로그인 PIN
                                      </label>
                                      <input 
                                        type="text" 
                                        maxLength={4}
                                        value={formData.pin || ''}
                                        onChange={e => setFormData({...formData, pin: e.target.value.toUpperCase()})}
                                        placeholder="4자리"
                                        className="w-full h-10 px-3 rounded-[10px] bg-zinc-100 dark:bg-black/20 text-[13px] outline-none border border-transparent focus:border-blue-500/50 font-mono uppercase"
                                      />
                                  </div>
                              </div>

                              <div className="bg-zinc-50 dark:bg-white/5 p-4 rounded-[16px]">
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                      <div>
                                          <label className="text-[11px] font-bold text-zinc-400 block mb-1">기본 시급</label>
                                          <div className="relative">
                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-zinc-400">₩</span>
                                              <input 
                                                type="number"
                                                value={formData.wage?.basic || 0}
                                                onChange={e => setFormData({...formData, wage: { ...formData.wage!, basic: Number(e.target.value) }})}
                                                className="w-full h-9 pl-7 pr-3 rounded-[8px] bg-white dark:bg-black/30 text-[13px] font-mono outline-none"
                                              />
                                          </div>
                                      </div>
                                      <div>
                                          <label className="text-[11px] font-bold text-zinc-400 block mb-1">책임 수당 (시급)</label>
                                          <div className="relative">
                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-zinc-400">₩</span>
                                              <input 
                                                type="number"
                                                value={formData.wage?.responsibility || 0}
                                                onChange={e => setFormData({...formData, wage: { ...formData.wage!, responsibility: Number(e.target.value) }})}
                                                className="w-full h-9 pl-7 pr-3 rounded-[8px] bg-white dark:bg-black/30 text-[13px] font-mono outline-none"
                                              />
                                          </div>
                                      </div>
                                      <div>
                                          <label className="text-[11px] font-bold text-zinc-400 block mb-1">장려 수당 (시급)</label>
                                          <div className="relative">
                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-zinc-400">₩</span>
                                              <input 
                                                type="number"
                                                value={formData.wage?.incentive || 0}
                                                onChange={e => setFormData({...formData, wage: { ...formData.wage!, incentive: Number(e.target.value) }})}
                                                className="w-full h-9 pl-7 pr-3 rounded-[8px] bg-white dark:bg-black/30 text-[13px] font-mono outline-none"
                                              />
                                          </div>
                                      </div>
                                      <div>
                                          <label className="text-[11px] font-bold text-zinc-400 block mb-1">특별 수당 (시급)</label>
                                          <div className="relative">
                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-zinc-400">₩</span>
                                              <input 
                                                type="number"
                                                value={formData.wage?.special || 0}
                                                onChange={e => setFormData({...formData, wage: { ...formData.wage!, special: Number(e.target.value) }})}
                                                className="w-full h-9 pl-7 pr-3 rounded-[8px] bg-white dark:bg-black/30 text-[13px] font-mono outline-none"
                                              />
                                          </div>
                                      </div>
                                  </div>
                                  <div className="text-right text-[12px] text-zinc-500">
                                      총 시급: <span className="font-bold text-zinc-900 dark:text-white">₩{((formData.wage?.basic||0) + (formData.wage?.responsibility||0) + (formData.wage?.incentive||0) + (formData.wage?.special||0)).toLocaleString()}</span>
                                  </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                  <div className="col-span-1">
                                      <label className="text-[12px] font-medium text-zinc-500 block mb-1">은행</label>
                                      <select 
                                        value={formData.bankName || ''}
                                        onChange={e => setFormData({...formData, bankName: e.target.value})}
                                        className="w-full h-10 px-3 rounded-[10px] bg-zinc-100 dark:bg-black/20 text-[13px] outline-none border border-transparent focus:border-blue-500/50"
                                      >
                                          <option value="">선택</option>
                                          {BANK_OPTIONS.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                                      </select>
                                  </div>
                                  <div className="col-span-2">
                                      <label className="text-[12px] font-medium text-zinc-500 block mb-1">계좌번호</label>
                                      <input 
                                        type="text" 
                                        value={formData.accountNumber || ''}
                                        onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                                        className="w-full h-10 px-3 rounded-[10px] bg-zinc-100 dark:bg-black/20 text-[13px] outline-none border border-transparent focus:border-blue-500/50 font-mono"
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 flex gap-3 bg-zinc-50/50 dark:bg-white/5 shrink-0">
                      {editingEmployee && (
                           <button 
                             onClick={handleDelete}
                             className="px-4 py-2.5 rounded-[12px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-bold text-[13px] hover:bg-red-200 transition-colors"
                           >
                               퇴사 처리
                           </button>
                      )}
                      <div className="flex-1"></div>
                      <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-5 py-2.5 rounded-[12px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-[13px] hover:bg-zinc-300 transition-colors"
                      >
                          취소
                      </button>
                      <button 
                        onClick={handleSave}
                        className="px-6 py-2.5 rounded-[12px] bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-[13px] shadow-lg hover:scale-105 transition-transform"
                      >
                          저장
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};

export default EmployeeManagement;