import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BranchCode, EmployeeRank } from '../types';
import type { Employee } from '../types';
import { Plus, Phone, Search, X, ChevronRight, Award, Wallet, KeyRound, RotateCcw, Trash2 } from 'lucide-react';
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

type TabOption = 'ACTIVE' | 'RESIGNED';

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
  const [activeTab, setActiveTab] = useState<TabOption>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<BranchCode | 'ALL'>(restrictedBranch || 'ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({
    wage: { basic: 10320, responsibility: 0, incentive: 0, special: 140 }
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Tab Filter
      if (activeTab === 'ACTIVE' && emp.isResigned) return false;
      if (activeTab === 'RESIGNED' && !emp.isResigned) return false;

      // Branch Filter
      if (restrictedBranch && emp.branch !== restrictedBranch) return false;
      if (!restrictedBranch && selectedBranch !== 'ALL' && emp.branch !== selectedBranch) return false;

      // Search Filter (Name only)
      if (searchTerm) {
        return emp.name.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    }).sort((a, b) => {
      // Leader first, then Name
      if (a.position === EmployeeRank.LEADER && b.position !== EmployeeRank.LEADER) return -1;
      if (a.position !== EmployeeRank.LEADER && b.position === EmployeeRank.LEADER) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [employees, selectedBranch, searchTerm, restrictedBranch, activeTab]);

  // Count active employees only for the header message
  const activeEmployeeCount = employees.filter(e => !e.isResigned).length;

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
      wage: { basic: 10320, responsibility: 0, incentive: 0, special: 140 },
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

  const handleRestore = (emp: Employee, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`${emp.name} 직원을 복원하시겠습니까?`)) {
        const restoredEmp = { ...emp, isResigned: false };
        onUpdateEmployee(restoredEmp);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-20 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/5 dark:border-white/10 pb-4">
        <div>
           <h2 className="text-[20px] md:text-[34px] font-bold text-zinc-900 dark:text-white tracking-tight leading-none">직원 관리</h2>
           <p className="text-[13px] text-zinc-500 mt-1">총 {activeEmployeeCount}명의 직원이 근무 중입니다.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="flex-1 md:w-[240px] h-[40px] bg-white dark:bg-white/10 rounded-full flex items-center px-4 border border-black/5 dark:border-white/5">
                <Search size={16} className="text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="이름 검색"
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

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          {/* Tabs */}
          <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-xl">
              <button
                  onClick={() => setActiveTab('ACTIVE')}
                  className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'ACTIVE' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                  근무자
              </button>
              <button
                  onClick={() => setActiveTab('RESIGNED')}
                  className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'RESIGNED' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                  퇴사자
              </button>
          </div>

          {/* Branch Filter */}
          {!restrictedBranch && (
            <div className="flex overflow-x-auto no-scrollbar pb-1 gap-2 w-full md:w-auto">
                <button 
                    onClick={() => setSelectedBranch('ALL')}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border ${selectedBranch === 'ALL' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white' : 'bg-transparent text-zinc-500 border-zinc-200 dark:border-white/10 hover:bg-black/5'}`}
                >
                    전체
                </button>
                {Object.entries(BRANCH_NAMES).map(([code, name]) => (
                    <button 
                        key={code}
                        onClick={() => setSelectedBranch(code as BranchCode)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border ${selectedBranch === code ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white' : 'bg-transparent text-zinc-500 border-zinc-200 dark:border-white/10 hover:bg-black/5'}`}
                    >
                        {name}
                    </button>
                ))}
            </div>
          )}
      </div>

      {/* Employee List (Board/Table Form) */}
      <div className="apple-glass rounded-[20px] overflow-hidden border border-black/5 dark:border-white/10">
         <table className="w-full text-left border-collapse">
             <thead className="bg-zinc-50/50 dark:bg-white/5 border-b border-black/5 dark:border-white/5 text-[12px] text-zinc-500 uppercase tracking-wider">
                 <tr>
                     <th className="px-6 py-4 font-medium">이름 / 직급</th>
                     <th className="px-6 py-4 font-medium">연락처</th>
                     <th className="px-6 py-4 font-medium hidden md:table-cell">지점</th>
                     <th className="px-6 py-4 font-medium hidden md:table-cell">입사일</th>
                     <th className="px-6 py-4 font-medium text-right">관리</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-black/5 dark:divide-white/5">
                 {filteredEmployees.length === 0 ? (
                     <tr>
                         <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 text-[13px]">
                             조회된 직원이 없습니다.
                         </td>
                     </tr>
                 ) : (
                     filteredEmployees.map(emp => (
                         <tr 
                            key={emp.id} 
                            onClick={() => handleEdit(emp)}
                            className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                         >
                             <td className="px-6 py-4">
                                 <div className="flex flex-col">
                                     <div className="flex items-center gap-1.5">
                                         <span className="text-[15px] font-bold text-zinc-900 dark:text-white">
                                             {emp.name}
                                         </span>
                                         {emp.position === EmployeeRank.LEADER && <Award size={14} className="text-purple-500" />}
                                     </div>
                                     <span className="text-[11px] text-zinc-500 mt-0.5">
                                         {RANK_LABEL[emp.position]}
                                         <span className="md:hidden"> • {BRANCH_NAMES[emp.branch]}</span>
                                     </span>
                                 </div>
                             </td>
                             <td className="px-6 py-4">
                                 <a 
                                    href={`tel:${emp.phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors w-fit px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                 >
                                     <Phone size={14} />
                                     {emp.phone}
                                 </a>
                             </td>
                             <td className="px-6 py-4 hidden md:table-cell">
                                 <span className="text-[13px] text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-white/10 px-2.5 py-1 rounded-full">
                                     {BRANCH_NAMES[emp.branch]}
                                 </span>
                             </td>
                             <td className="px-6 py-4 hidden md:table-cell">
                                 <span className="text-[13px] text-zinc-500 font-mono">
                                     {emp.joinDate}
                                 </span>
                             </td>
                             <td className="px-6 py-4 text-right">
                                 {activeTab === 'RESIGNED' ? (
                                     <button 
                                        onClick={(e) => handleRestore(emp, e)}
                                        className="p-2 rounded-full hover:bg-green-100 text-green-600 dark:hover:bg-green-900/20 dark:text-green-400 transition-colors"
                                        title="복원"
                                     >
                                         <RotateCcw size={18} />
                                     </button>
                                 ) : (
                                     <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-500 transition-colors inline-block" />
                                 )}
                             </td>
                         </tr>
                     ))
                 )}
             </tbody>
         </table>
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
                      {editingEmployee && !editingEmployee.isResigned && (
                           <button 
                             onClick={handleDelete}
                             className="px-4 py-2.5 rounded-[12px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-bold text-[13px] hover:bg-red-200 transition-colors flex items-center gap-2"
                           >
                               <Trash2 size={16} />
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