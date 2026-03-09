import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Calendar, Users, DollarSign, CheckSquare, Menu, Bell, Command, ChevronRight, Moon, Sun, UserCircle, LogOut, FileText, CheckCircle2, AlertCircle, Clock, ArrowRightLeft } from 'lucide-react';
import { UserRole, Employee, EmployeeRank, ApprovalRequest } from '../types';
import { RANK_LABEL } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: UserRole;
  onRoleSwitch: () => void; // Used for logout now
  currentUser: Employee | null;
  approvalRequests?: ApprovalRequest[];
  employees: Employee[];
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, userRole, onRoleSwitch, currentUser, approvalRequests = [], employees }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  // Separate refs for mobile and desktop notification containers to prevent conflict
  const mobileNotificationRef = useRef<HTMLDivElement>(null);
  const desktopNotificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check storage for theme preference (Persist on auto-login)
    const savedTheme = localStorage.getItem('antigravity_theme');
    
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      // Fallback: Check if class is already present
      if (document.documentElement.classList.contains('dark')) {
        setIsDarkMode(true);
      } else {
        setIsDarkMode(false);
      }
    }
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isMobile = mobileNotificationRef.current && mobileNotificationRef.current.contains(target);
      const isDesktop = desktopNotificationRef.current && desktopNotificationRef.current.contains(target);
      
      if (!isMobile && !isDesktop) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('antigravity_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('antigravity_theme', 'light');
    }
  };

  const managerMenuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'schedule', label: '근무 일정', icon: Calendar },
    { id: 'employees', label: '직원 관리', icon: Users },
    { id: 'payroll', label: '급여 정산', icon: DollarSign },
    { id: 'approvals', label: '승인 요청', icon: CheckSquare },
  ];

  const crewMenuItems = [
    { id: 'dashboard', label: '내 근무', icon: LayoutDashboard },
    { id: 'schedule', label: '스케줄', icon: Calendar },
    // Leader gets access to Employee Management (Restricted to their branch)
    ...(currentUser?.position === EmployeeRank.LEADER ? [{ id: 'employees', label: '직원 관리', icon: Users }] : []),
    { id: 'payroll', label: '내 급여 확인', icon: DollarSign },
    { id: 'requests', label: '수정/비용 청구', icon: FileText },
    { id: 'notifications', label: '알림 기록', icon: Bell },
  ];

  const menuItems = userRole === UserRole.MANAGER ? managerMenuItems : crewMenuItems;

  // Notification Logic
  let notifications: ApprovalRequest[] = [];
  let unreadCount = 0;

  if (userRole === UserRole.MANAGER) {
      // Manager sees all PENDING requests
      notifications = approvalRequests.filter(r => r.status === 'PENDING');
      unreadCount = notifications.length;
  } else {
      // Crew sees:
      // 1. Their own requests (recent 5)
      // 2. Substitute requests targeting them (PENDING)
      if (currentUser) {
          const myRequests = approvalRequests
              .filter(r => r.employeeId === currentUser.id)
              .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
              .slice(0, 5);
          
          const subRequests = approvalRequests.filter(r => 
              r.type === 'SUBSTITUTE' && 
              r.substituteId === currentUser.id && 
              r.status === 'PENDING' &&
              (!r.substituteStatus || r.substituteStatus === 'PENDING')
          );

          notifications = [...subRequests, ...myRequests];
          unreadCount = notifications.filter(r => 
              (r.employeeId === currentUser.id && r.status === 'PENDING') || 
              (r.substituteId === currentUser.id && r.status === 'PENDING' && (!r.substituteStatus || r.substituteStatus === 'PENDING'))
          ).length; 
      }
  }

  const NotificationDropdown = () => (
    <div className="absolute top-12 right-0 w-[320px] bg-white dark:bg-[#1c1c1e] rounded-[16px] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-scale-up z-50">
        <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-white/5 flex justify-between items-center">
            <span className="text-[13px] font-bold text-zinc-900 dark:text-white">알림</span>
            {unreadCount > 0 && (
                <span className="text-[11px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">{unreadCount}건 대기중</span>
            )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-[13px]">
                    새로운 알림이 없습니다.
                </div>
            ) : (
                <div className="divide-y divide-black/5 dark:divide-white/5">
                    {notifications.map(req => {
                        const empName = employees.find(e => e.id === req.employeeId)?.name || '알 수 없음';
                        const isSubRequestForMe = req.type === 'SUBSTITUTE' && req.substituteId === currentUser?.id;

                        return (
                            <div 
                                key={req.id} 
                                onClick={() => {
                                    if(userRole === UserRole.CREW && isSubRequestForMe) {
                                        onTabChange('notifications');
                                    } else if (userRole === UserRole.MANAGER) {
                                        onTabChange('approvals');
                                    }
                                    setIsNotificationOpen(false);
                                }}
                                className="p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                                        {isSubRequestForMe ? '📢 대타 요청 도착' : 
                                         userRole === UserRole.MANAGER ? empName : (
                                            req.type === 'CLOCK_IN' ? '근무 요청' :
                                            req.type === 'CORRECTION' ? '정정 요청' : 
                                            req.type === 'EXPENSE' ? '비용 청구' : 
                                            req.type === 'SUBSTITUTE' ? '대타 요청' : '요청'
                                        )}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${
                                        isSubRequestForMe ? 'bg-purple-100 text-purple-600 animate-pulse' :
                                        req.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                                        req.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                                        'bg-orange-100 text-orange-600'
                                    }`}>
                                        {isSubRequestForMe ? <ArrowRightLeft size={10} /> :
                                         req.status === 'APPROVED' ? <CheckCircle2 size={10} /> :
                                         req.status === 'REJECTED' ? <AlertCircle size={10} /> :
                                         req.type === 'SUBSTITUTE' ? <ArrowRightLeft size={10} /> :
                                         <Clock size={10} />}
                                        
                                        {isSubRequestForMe ? '수락 대기' :
                                         req.status === 'APPROVED' ? '승인' :
                                         req.status === 'REJECTED' ? '반려' :
                                         req.type === 'SUBSTITUTE' ? '진행중' :
                                         '대기'}
                                    </span>
                                </div>
                                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-1">
                                    {req.description}
                                </p>
                                <span className="text-[10px] text-zinc-400">
                                    {req.targetDate}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
        <div 
            onClick={() => { 
                onTabChange(userRole === UserRole.MANAGER ? 'approvals' : 'notifications'); 
                setIsNotificationOpen(false); 
            }}
            className="p-3 text-center text-[12px] font-medium text-blue-500 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border-t border-black/5 dark:border-white/5 flex items-center justify-center gap-1"
        >
            모든 기록 보기 <ChevronRight size={12} />
        </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background text-zinc-900 dark:text-zinc-100 font-sans selection:bg-primary/30 transition-colors duration-300 text-[14px]">
      {/* Sidebar - macOS Style */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] apple-sidebar transform transition-transform duration-300 ease-out lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col pt-10 pb-6 px-6">
          {/* Logo Area */}
          <div className="flex flex-col mb-10">
            
            <div className="flex flex-col leading-[0.9] tracking-tighter mb-4">
                <span className="text-[20px] font-black text-zinc-900 dark:text-white">the work is</span>
                <span className="text-[20px] font-black text-zinc-900 dark:text-white">mysterious</span>
                <span className="text-[20px] font-black text-zinc-900 dark:text-white">& important</span>
            </div>

            <div>
              <h1 className="font-bold text-[13px] tracking-tight text-zinc-500 dark:text-zinc-400 leading-none">Crew Task Board</h1>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium mt-1">
                {userRole === UserRole.MANAGER ? 'Master OS' : (currentUser?.position === EmployeeRank.LEADER ? 'Crew Leader Portal' : 'Crew Portal')}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-2 px-4 uppercase tracking-wider">메인 메뉴</div>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[10px] group transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-[#0A84FF] text-white font-medium shadow-md shadow-blue-900/20' 
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className={`${activeTab === item.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`} strokeWidth={2} />
                  <span className="text-[14px]">{item.label}</span>
                </div>
              </button>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="pt-6 border-t border-black/5 dark:border-white/5 mx-2 space-y-2">
            
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-[12px] text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </div>
              <span className="text-[13px] font-medium">{isDarkMode ? '라이트 모드' : '다크 모드'}</span>
            </button>

            {/* User Profile / Logout */}
            <div 
              onClick={onRoleSwitch}
              className="flex items-center gap-3 p-2 rounded-[12px] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors cursor-pointer group relative"
              title="로그아웃"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border border-black/5 dark:border-white/5 ${userRole === UserRole.MANAGER ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                {userRole === UserRole.MANAGER ? 'AD' : currentUser?.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-zinc-900 dark:text-zinc-200 truncate group-hover:text-black dark:group-hover:text-white">
                    {userRole === UserRole.MANAGER ? '관리자' : currentUser?.name}
                </p>
                <p className="text-[12px] text-zinc-500 truncate">
                    {userRole === UserRole.MANAGER ? '관리자 모드' : `${currentUser?.branch} ${RANK_LABEL[currentUser?.position || EmployeeRank.CREW]}`}
                </p>
              </div>
              <div className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 group-hover:text-red-500 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-all">
                <LogOut size={14} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[280px] min-h-screen flex flex-col relative z-0 overflow-x-hidden">
        {/* Mobile Header */}
        <header className="h-14 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 lg:hidden border-b border-black/5 dark:border-white/10 shrink-0">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white p-2"
          >
            <Menu size={24} />
          </button>
          <span className="font-semibold text-[14px] text-zinc-900 dark:text-white">Crew Task Board</span>
          <div className="relative" ref={mobileNotificationRef}>
            <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white relative p-2"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-black"></span>
                )}
            </button>
            {isNotificationOpen && <NotificationDropdown />}
          </div>
        </header>

        {/* Desktop Header Actions (Absolute positioned) */}
        <div className="hidden lg:flex absolute top-8 right-10 z-20 gap-4" ref={desktopNotificationRef}>
           {/* Notification Bell with Apple style */}
           <div className="relative">
               <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="w-10 h-10 rounded-full bg-surface/50 backdrop-blur-md border border-black/5 dark:border-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all shadow-sm"
               >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
               </button>
               {isNotificationOpen && <NotificationDropdown />}
           </div>
        </div>

        {/* Reduced padding on mobile (p-3) vs desktop (p-10) */}
        <div className="flex-1 p-3 lg:p-10 max-w-[1440px] w-full mx-auto min-w-0 overflow-y-auto">
          {children}
        </div>
      </main>
      
      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;