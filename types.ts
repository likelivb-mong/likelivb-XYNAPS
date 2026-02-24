
export enum BranchCode {
  GDXC = 'GDXC', // 건대1호점
  GDXR = 'GDXR', // 건대2호점
  NWXC = 'NWXC', // 건대3호점
  GNXC = 'GNXC', // 강남점
  SWXC = 'SWXC', // 수원점
  XYNP = 'XYNP', // XYNP
}

export enum EmployeeRank {
  CREW = 'CREW',
  LEADER = 'LEADER', // 크루장
}

export enum ScheduleType {
  FIXED = 'FIXED',
  SUBSTITUTE = 'SUB',
  TRAINING = 'EDU',
}

export enum AttendanceStatus {
  WORKING = 'WORKING',
  OFF_WORK = 'OFF',
  BREAK = 'BREAK',
  PENDING_APPROVAL = 'PENDING', // 승인 대기 중
}

export enum AttendanceTag {
  NORMAL = 'NORMAL', // 정상
  LATE = 'LATE', // 지각 (15분 이내)
  OUTSIDE_SCHEDULE = 'OUTSIDE', // 스케줄 외 (조기출근, 15분이상 지각, 스케줄 없음)
}

export enum UserRole {
  MANAGER = 'MANAGER', // System Admin Role
  CREW = 'CREW',
}

export interface WageConfig {
  basic: number;
  responsibility: number; // 책임수당
  incentive: number; // 장려수당
  special: number; // 특별수당
}

export interface Employee {
  id: string;
  name: string;
  branch: BranchCode;
  position: EmployeeRank;
  bankName: string;
  accountNumber: string;
  phone: string;
  pin: string; // Login PIN (4 chars, Alphanumeric)
  wage: WageConfig;
  joinDate: string;
  avatarUrl?: string;
  isOnline: boolean;
  isResigned?: boolean; // 퇴사 여부
}

export interface Schedule {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: ScheduleType;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  extraHourlyPay: number; // 휴일 근로 시 추가되는 시급
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string; // ISO string
  clockOut?: string; // ISO string
  accumulatedMinutes: number; // For timer display
  status: AttendanceStatus;
  tag?: AttendanceTag; // 근무 상태 태그 (지각, 스케줄외 등)
}

export interface ApprovalRequest {
  id: string;
  employeeId: string;
  type: 'CORRECTION' | 'LEAVE' | 'OVERTIME' | 'EXPENSE' | 'CLOCK_IN' | 'SUBSTITUTE';
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: string;
  targetDate: string;
  expenseAmount?: number; // 비용 청구 시 금액
  proofImageUrl?: string; // 영수증 이미지
  startTime?: string; // ISO string, used for CLOCK_IN or CORRECTION requests
  endTime?: string; // ISO string, used for CORRECTION requests
  substituteId?: string; // 대타 요청 시 대상 직원 ID
  substituteStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED'; // 대타 요청 받은 직원의 수락 상태
}