
import { BranchCode, Employee, Schedule, ScheduleType, AttendanceStatus, AttendanceRecord, ApprovalRequest, EmployeeRank, Holiday, AttendanceTag } from './types';

export const BRANCH_NAMES: Record<BranchCode, string> = {
  [BranchCode.GDXC]: 'GDXC',
  [BranchCode.GDXR]: 'GDXR',
  [BranchCode.NWXC]: 'NWXC',
  [BranchCode.GNXC]: 'GNXC',
  [BranchCode.SWXC]: 'SWXC',
  [BranchCode.XYNP]: 'XYNP',
};

export const RANK_LABEL: Record<EmployeeRank, string> = {
  [EmployeeRank.CREW]: '크루',
  [EmployeeRank.LEADER]: '크루장',
};

// Mock Employees
export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    name: '김지수',
    branch: BranchCode.GDXC,
    position: EmployeeRank.LEADER, // Was MASTER, now LEADER with responsibility pay
    bankName: 'KakaoBank',
    accountNumber: '3333-01-2345678',
    phone: '010-1234-5678',
    pin: 'A1B2',
    wage: { basic: 12000, responsibility: 2000, incentive: 0, special: 0 },
    joinDate: '2023-01-15',
    isOnline: true,
  },
  {
    id: 'emp-002',
    name: '이도현',
    branch: BranchCode.GDXC,
    position: EmployeeRank.CREW,
    bankName: 'Shinhan',
    accountNumber: '110-123-456789',
    phone: '010-9876-5432',
    pin: '9999', // Easy PIN for demo
    wage: { basic: 10000, responsibility: 0, incentive: 500, special: 0 },
    joinDate: '2023-03-20',
    isOnline: false,
  },
  {
    id: 'emp-003',
    name: '박서준',
    branch: BranchCode.GNXC,
    position: EmployeeRank.LEADER, 
    bankName: 'Woori',
    accountNumber: '1002-333-444555',
    phone: '010-5555-6666',
    pin: 'M3K9',
    wage: { basic: 13000, responsibility: 3000, incentive: 1000, special: 0 },
    joinDate: '2022-11-01',
    isOnline: true,
  },
  {
    id: 'emp-004',
    name: '최예나',
    branch: BranchCode.SWXC,
    position: EmployeeRank.CREW,
    bankName: 'Toss',
    accountNumber: '1000-00-000000',
    phone: '010-7777-8888',
    pin: 'X7Y8',
    wage: { basic: 9860, responsibility: 0, incentive: 0, special: 0 },
    joinDate: '2024-01-10',
    isOnline: true,
  },
  {
    id: 'emp-005',
    name: '정해인',
    branch: BranchCode.NWXC,
    position: EmployeeRank.CREW,
    bankName: 'KB',
    accountNumber: '123-456-789012',
    phone: '010-2222-3333',
    pin: 'P2O1',
    wage: { basic: 10500, responsibility: 0, incentive: 0, special: 500 },
    joinDate: '2023-06-15',
    isOnline: false,
  },
  {
    id: 'emp-006',
    name: '강해린',
    branch: BranchCode.XYNP,
    position: EmployeeRank.CREW,
    bankName: 'KakaoBank',
    accountNumber: '7777-88-999999',
    phone: '010-1111-2222',
    pin: 'N3J5',
    wage: { basic: 11000, responsibility: 0, incentive: 0, special: 0 },
    joinDate: '2024-02-01',
    isOnline: true,
  }
];

// Mock Holidays
export const MOCK_HOLIDAYS: Holiday[] = [
  {
    id: 'hol-1',
    date: '2024-05-05',
    name: '어린이날',
    extraHourlyPay: 4930 // 예: 최저시급의 50%
  },
  {
    id: 'hol-2',
    date: '2024-05-15',
    name: '부처님오신날',
    extraHourlyPay: 4930
  }
];

// Mock Schedules (Current Month)
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const todayStr = `${year}-${month}-${String(today.getDate()).padStart(2, '0')}`;

export const MOCK_SCHEDULES: Schedule[] = [
  { id: 'sch-1', employeeId: 'emp-001', date: `${year}-${month}-01`, startTime: '09:00', endTime: '18:00', type: ScheduleType.FIXED },
  { id: 'sch-2', employeeId: 'emp-001', date: `${year}-${month}-02`, startTime: '09:00', endTime: '18:00', type: ScheduleType.FIXED },
  { id: 'sch-3', employeeId: 'emp-002', date: `${year}-${month}-01`, startTime: '13:00', endTime: '22:00', type: ScheduleType.SUBSTITUTE },
  { id: 'sch-4', employeeId: 'emp-003', date: `${year}-${month}-03`, startTime: '10:00', endTime: '19:00', type: ScheduleType.TRAINING },
  // Adding a schedule for today for testing Crew logic (emp-002)
  { id: 'sch-test', employeeId: 'emp-002', date: todayStr, startTime: '09:00', endTime: '18:00', type: ScheduleType.FIXED },
];

// Mock Attendance (Today)
export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-001',
    employeeId: 'emp-001',
    date: todayStr,
    clockIn: new Date(new Date().setHours(8, 55)).toISOString(),
    accumulatedMinutes: 125,
    status: AttendanceStatus.WORKING,
    tag: AttendanceTag.NORMAL,
  },
  {
    id: 'att-003',
    employeeId: 'emp-003',
    date: todayStr,
    clockIn: new Date(new Date().setHours(9, 58)).toISOString(),
    accumulatedMinutes: 62,
    status: AttendanceStatus.WORKING,
    tag: AttendanceTag.LATE,
  },
  {
    id: 'att-004',
    employeeId: 'emp-004',
    date: todayStr,
    clockIn: new Date(new Date().setHours(9, 0)).toISOString(),
    clockOut: new Date(new Date().setHours(11, 0)).toISOString(),
    accumulatedMinutes: 120,
    status: AttendanceStatus.OFF_WORK,
    tag: AttendanceTag.NORMAL,
  }
];

export const MOCK_APPROVALS: ApprovalRequest[] = [
  {
    id: 'req-001',
    employeeId: 'emp-002',
    type: 'CORRECTION',
    description: 'Forgot to clock out yesterday (22:00)',
    status: 'PENDING',
    requestDate: '2024-05-20',
    targetDate: '2024-05-19',
  },
  {
    id: 'req-002',
    employeeId: 'emp-005',
    type: 'LEAVE',
    description: 'Medical appointment',
    status: 'PENDING',
    requestDate: '2024-05-21',
    targetDate: '2024-05-25',
  }
];
