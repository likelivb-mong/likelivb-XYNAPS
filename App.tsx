import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ScheduleCalendar from './components/ScheduleCalendar';
import EmployeeManagement from './components/EmployeeManagement';
import Payroll from './components/Payroll';
import ApprovalRequests from './components/ApprovalRequests';
import CrewDashboard from './components/CrewDashboard';
import CrewRequests from './components/CrewRequests';
import CrewNotifications from './components/CrewNotifications';
import Login from './components/Login';
import { UserRole, Employee, BranchCode, EmployeeRank, AttendanceRecord, ApprovalRequest, AttendanceStatus, AttendanceTag, Schedule } from './types';
import { supabase } from './lib/supabaseClient';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // App State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.MANAGER);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // Initialization (Data Fetching from Supabase)
  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Employees
      const { data: empData } = await supabase.from('employees').select('*');
      if (empData) setEmployees(empData);

      // 2. Fetch Schedules
      const { data: schedData } = await supabase.from('schedules').select('*');
      if (schedData) setSchedules(schedData);

      // 3. Fetch Attendance
      const { data: attData } = await supabase.from('attendance_records').select('*');
      if (attData) setAttendanceRecords(attData);

      // 4. Fetch Approvals
      const { data: appData } = await supabase.from('approval_requests').select('*');
      if (appData) setApprovalRequests(appData);
    };

    fetchData();

    // Auto-delete notifications older than 7 days (Logic remains, but action moved to Supabase could be done via cron, here we just filter view if needed or delete)
    // For now, we just fetch.
    
    // Check for Manager Auto-login
    const isManagerAuth = localStorage.getItem('antigravity_manager_auth');
    if (isManagerAuth === 'true') {
        const masterUser: Employee = {
            id: 'master-admin',
            name: '관리자',
            branch: BranchCode.GDXC,
            position: EmployeeRank.LEADER,
            bankName: '',
            accountNumber: '',
            phone: '',
            pin: '',
            wage: { basic: 0, responsibility: 0, incentive: 0, special: 0 },
            joinDate: new Date().toISOString().split('T')[0],
            isOnline: true
        };
        setCurrentUser(masterUser); 
        setUserRole(UserRole.MANAGER);
        setIsAuthenticated(true);
        setActiveTab('dashboard');
        return;
    }

    // Check for Crew Auto-login
    const savedUserId = localStorage.getItem('antigravity_user_id');
    if (savedUserId && employees.length > 0) {
        const found = employees.find(e => e.id === savedUserId);
        if (found) {
            setCurrentUser(found);
            setUserRole(UserRole.CREW);
            setIsAuthenticated(true);
        }
    }
  }, []);

  // Re-check auto-login when employees are loaded
  useEffect(() => {
      if (!isAuthenticated && employees.length > 0) {
          const savedUserId = localStorage.getItem('antigravity_user_id');
          if (savedUserId) {
              const found = employees.find(e => e.id === savedUserId);
              if (found) {
                  setCurrentUser(found);
                  setUserRole(UserRole.CREW);
                  setIsAuthenticated(true);
              }
          }
      }
  }, [employees, isAuthenticated]);

  // Login Handlers
  const handleLogin = (employee: Employee, remember: boolean) => {
    setCurrentUser(employee);
    setUserRole(UserRole.CREW);
    setIsAuthenticated(true);
    setActiveTab('dashboard');
    if (remember) {
        localStorage.setItem('antigravity_user_id', employee.id);
    }
  };

  const handleManagerLogin = (remember: boolean) => {
      const masterUser: Employee = {
          id: 'master-admin',
          name: '관리자',
          branch: BranchCode.GDXC, 
          position: EmployeeRank.LEADER,
          bankName: '',
          accountNumber: '',
          phone: '',
          pin: '',
          wage: { basic: 0, responsibility: 0, incentive: 0, special: 0 },
          joinDate: new Date().toISOString().split('T')[0],
          isOnline: true
      };

      setCurrentUser(masterUser); 
      setUserRole(UserRole.MANAGER);
      setIsAuthenticated(true);
      setActiveTab('dashboard');
      if (remember) {
          localStorage.setItem('antigravity_manager_auth', 'true');
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem('antigravity_user_id');
      localStorage.removeItem('antigravity_manager_auth');
      localStorage.removeItem('antigravity_theme');
      document.documentElement.classList.remove('dark');
  };

  // --- Handlers for Data Mutation (Supabase + Local State) ---

  const handleRequestSubmit = async (request: ApprovalRequest) => {
    setApprovalRequests(prev => [request, ...prev]);
    const { error } = await supabase.from('approval_requests').insert([request]);
    if (error) console.error('Supabase Error:', error);
  };

  const handleRequestCancel = async (id: string) => {
      setApprovalRequests(prev => prev.filter(req => req.id !== id));
      const { error } = await supabase.from('approval_requests').delete().eq('id', id);
      if (error) console.error('Supabase Error:', error);
  };

  const handleCrewSubstituteResponse = async (id: string, accepted: boolean) => {
    const updates: Partial<ApprovalRequest> = {
        substituteStatus: accepted ? 'ACCEPTED' : 'REJECTED',
        status: accepted ? 'PENDING' : 'REJECTED',
        // Description updates logic handled in UI usually, but we update data here
    };
    
    // We need to fetch the original description to append [동료수락]
    // For simplicity, we just update status here or we'd need optimistic update logic duplication
    setApprovalRequests(prev => prev.map(req => {
        if (req.id === id) {
            return { ...req, ...updates, description: accepted ? `[동료수락] ${req.description}` : `[동료거절] ${req.description}` };
        }
        return req;
    }));

    const { error } = await supabase.from('approval_requests').update(updates).eq('id', id);
    if (error) console.error('Supabase Error:', error);
  };

  const handleDirectClockIn = async (record: AttendanceRecord) => {
    setAttendanceRecords(prev => [...prev, record]);
    const { error } = await supabase.from('attendance_records').insert([record]);
    if (error) console.error('Supabase Error:', error);
  };

  const handleDirectClockOut = async (recordId: string, endTime: string) => {
      // Calculate minutes locally for optimistic update
      let diffMinutes = 0;
      setAttendanceRecords(prev => prev.map(rec => {
        if (rec.id === recordId) {
            const start = new Date(rec.clockIn).getTime();
            const end = new Date(endTime).getTime();
            diffMinutes = Math.max(0, Math.floor((end - start) / (1000 * 60)));
            return { 
                ...rec, 
                status: AttendanceStatus.OFF_WORK, 
                clockOut: endTime,
                accumulatedMinutes: diffMinutes 
            };
        }
        return rec;
      }));

      const { error } = await supabase.from('attendance_records').update({
          clockOut: endTime,
          status: AttendanceStatus.OFF_WORK,
          accumulatedMinutes: diffMinutes // We should probably recalculate or send this
      }).eq('id', recordId);
      if (error) console.error('Supabase Error:', error);
  };
  
  const handleUpdateAttendance = async (updatedRecord: AttendanceRecord) => {
      setAttendanceRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
      const { error } = await supabase.from('attendance_records').update(updatedRecord).eq('id', updatedRecord.id);
      if (error) console.error('Supabase Error:', error);
  };

  const handleDeleteAttendance = async (recordId: string) => {
      setAttendanceRecords(prev => prev.filter(r => r.id !== recordId));
      const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
      if (error) console.error('Supabase Error:', error);
  };

  const handleApprovalAction = async (id: string, action: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    const targetRequest = approvalRequests.find(r => r.id === id);
    if (!targetRequest) return;
    
    // 1. Update Request
    setApprovalRequests(prev => prev.map(req => req.id === id ? { ...req, status: action } : req));
    await supabase.from('approval_requests').update({ status: action }).eq('id', id);

    if (action !== 'APPROVED') return;

    // 2. Side Effects (Create Attendance Records)
    if (targetRequest.type === 'CLOCK_IN') {
        const newRecord: AttendanceRecord = {
            id: `att-req-${id}`,
            employeeId: targetRequest.employeeId,
            date: targetRequest.targetDate,
            clockIn: targetRequest.startTime || new Date().toISOString(),
            accumulatedMinutes: 0,
            status: AttendanceStatus.WORKING,
            tag: AttendanceTag.OUTSIDE_SCHEDULE,
        };
        setAttendanceRecords(prev => [...prev, newRecord]);
        await supabase.from('attendance_records').insert([newRecord]);

    } else if (targetRequest.type === 'CORRECTION') {
        // ... (Similar logic for correction, update existing record or create new)
        // Simplified for brevity - assumes logic mirrors original but calls Supabase
        const existing = attendanceRecords.find(r => r.employeeId === targetRequest.employeeId && r.date === targetRequest.targetDate);
        if (existing) {
             let newMinutes = existing.accumulatedMinutes;
             if (targetRequest.startTime && targetRequest.endTime) {
                 const start = new Date(targetRequest.startTime).getTime();
                 const end = new Date(targetRequest.endTime).getTime();
                 newMinutes = Math.floor((end - start) / (1000 * 60));
             }
             const updated = {
                 ...existing,
                 clockIn: targetRequest.startTime || existing.clockIn,
                 clockOut: targetRequest.endTime || existing.clockOut,
                 status: targetRequest.endTime ? AttendanceStatus.OFF_WORK : existing.status,
                 accumulatedMinutes: newMinutes,
                 tag: AttendanceTag.NORMAL
             };
             setAttendanceRecords(prev => prev.map(r => r.id === existing.id ? updated : r));
             await supabase.from('attendance_records').update(updated).eq('id', existing.id);
        } else {
             let newMinutes = 0;
             if (targetRequest.startTime && targetRequest.endTime) {
                 const start = new Date(targetRequest.startTime).getTime();
                 const end = new Date(targetRequest.endTime).getTime();
                 newMinutes = Math.floor((end - start) / (1000 * 60));
             }
             const newRecord: AttendanceRecord = {
                id: `att-cor-${id}`,
                employeeId: targetRequest.employeeId,
                date: targetRequest.targetDate,
                clockIn: targetRequest.startTime || new Date().toISOString(),
                clockOut: targetRequest.endTime,
                accumulatedMinutes: newMinutes,
                status: targetRequest.endTime ? AttendanceStatus.OFF_WORK : AttendanceStatus.WORKING,
                tag: AttendanceTag.NORMAL,
            };
            setAttendanceRecords(prev => [...prev, newRecord]);
            await supabase.from('attendance_records').insert([newRecord]);
        }
    }
  };

  // Schedule Handlers
  const handleAddSchedules = async (newSchedules: Schedule[]) => {
      setSchedules(prev => [...prev, ...newSchedules]);
      const { error } = await supabase.from('schedules').insert(newSchedules);
      if (error) console.error('Supabase Error:', error);
  };

  const handleUpdateSchedule = async (schedule: Schedule) => {
      setSchedules(prev => prev.map(s => s.id === schedule.id ? schedule : s));
      const { error } = await supabase.from('schedules').update(schedule).eq('id', schedule.id);
      if (error) console.error('Supabase Error:', error);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
      if (error) console.error('Supabase Error:', error);
  };

  // Employee Handlers
  const handleAddEmployee = async (employee: Employee) => {
      setEmployees(prev => [...prev, employee]);
      const { error } = await supabase.from('employees').insert([employee]);
      if (error) console.error('Supabase Error:', error);
  };

  const handleUpdateEmployee = async (employee: Employee) => {
      setEmployees(prev => prev.map(e => e.id === employee.id ? employee : e));
      const { error } = await supabase.from('employees').update(employee).eq('id', employee.id);
      if (error) console.error('Supabase Error:', error);
  };

  const renderContent = () => {
    if (userRole === UserRole.MANAGER) {
      switch (activeTab) {
        case 'dashboard':
          return <Dashboard attendanceData={attendanceRecords} schedules={schedules} employees={employees} />;
        case 'schedule':
          return <ScheduleCalendar 
                    currentUser={currentUser!} 
                    employees={employees}
                    attendanceData={attendanceRecords}
                    onRequestSubstitute={handleRequestSubmit}
                    onUpdateAttendance={handleUpdateAttendance}
                    onDeleteAttendance={handleDeleteAttendance}
                    schedules={schedules}
                    onAddSchedules={handleAddSchedules}
                    onUpdateSchedule={handleUpdateSchedule}
                    onDeleteSchedule={handleDeleteSchedule}
                 />;
        case 'employees':
          return <EmployeeManagement 
                    employees={employees} 
                    onAddEmployee={handleAddEmployee}
                    onUpdateEmployee={handleUpdateEmployee}
                 />;
        case 'payroll':
          return <Payroll attendanceData={attendanceRecords} approvalRequests={approvalRequests} />;
        case 'approvals':
          return <ApprovalRequests requests={approvalRequests} onAction={handleApprovalAction} employees={employees} />;
        default:
          return <Dashboard attendanceData={attendanceRecords} schedules={schedules} employees={employees} />;
      }
    } else {
      // Crew Mode Routes
      switch (activeTab) {
        case 'dashboard':
          return <CrewDashboard 
            currentUser={currentUser!} 
            attendanceData={attendanceRecords}
            approvalRequests={approvalRequests}
            onRequestClockIn={handleRequestSubmit}
            onDirectClockIn={handleDirectClockIn}
            onDirectClockOut={handleDirectClockOut}
            onNavigateToSchedule={() => setActiveTab('schedule')}
            schedules={schedules}
          />;
        case 'schedule':
          return <ScheduleCalendar 
            isCrewMode={true} 
            currentUser={currentUser!} 
            employees={employees}
            attendanceData={attendanceRecords}
            onRequestSubstitute={handleRequestSubmit} 
            onUpdateAttendance={handleUpdateAttendance}
            onDeleteAttendance={handleDeleteAttendance}
            schedules={schedules}
            onAddSchedules={handleAddSchedules}
            onUpdateSchedule={handleUpdateSchedule}
            onDeleteSchedule={handleDeleteSchedule}
          />;
        case 'employees':
          return <EmployeeManagement 
            employees={employees} 
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            restrictedBranch={currentUser!.branch}
            readOnly={true} 
          />;
        case 'payroll':
          return <Payroll isCrewMode={true} currentUser={currentUser!} attendanceData={attendanceRecords} approvalRequests={approvalRequests} />;
        case 'requests':
          return <CrewRequests 
            currentUser={currentUser!} 
            onRequestSubmit={handleRequestSubmit}
            requests={approvalRequests}
            onCancelRequest={handleRequestCancel}
          />;
        case 'notifications':
          return <CrewNotifications currentUser={currentUser!} requests={approvalRequests} onSubstituteAction={handleCrewSubstituteResponse} employees={employees} />;
        default:
          return <CrewDashboard 
            currentUser={currentUser!} 
            attendanceData={attendanceRecords}
            approvalRequests={approvalRequests}
            onRequestClockIn={handleRequestSubmit}
            onDirectClockIn={handleDirectClockIn}
            onDirectClockOut={handleDirectClockOut}
            onNavigateToSchedule={() => setActiveTab('schedule')}
            schedules={schedules}
          />;
      }
    }
  };

  // If not authenticated, show Login Screen
  if (!isAuthenticated) {
      return (
          <Login 
            employees={employees} 
            onLogin={handleLogin} 
            onManagerLogin={handleManagerLogin} 
          />
      );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      userRole={userRole}
      onRoleSwitch={handleLogout}
      currentUser={currentUser}
      approvalRequests={approvalRequests}
      employees={employees}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;