import { supabase } from './supabaseClient';
import { Employee, AttendanceRecord, ApprovalRequest, Schedule } from '../types';

// ===== EMPLOYEES =====
export async function fetchEmployees() {
  const { data, error } = await supabase.from('employees').select('*');
  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data || [];
}

export async function addEmployee(employee: Employee) {
  const { error } = await supabase.from('employees').insert([
    {
      id: employee.id,
      name: employee.name,
      branch: employee.branch,
      position: employee.position,
      phone: employee.phone,
      bank_name: employee.bankName,
      account_number: employee.accountNumber,
      wage_basic: employee.wage.basic,
      wage_responsibility: employee.wage.responsibility,
      wage_incentive: employee.wage.incentive,
      wage_special: employee.wage.special,
      join_date: employee.joinDate,
      is_online: employee.isOnline,
    },
  ]);
  if (error) {
    console.error('Error adding employee:', error);
    throw error;
  }
}

export async function updateEmployee(employee: Employee) {
  const { error } = await supabase.from('employees').update({
    name: employee.name,
    branch: employee.branch,
    position: employee.position,
    phone: employee.phone,
    bank_name: employee.bankName,
    account_number: employee.accountNumber,
    wage_basic: employee.wage.basic,
    wage_responsibility: employee.wage.responsibility,
    wage_incentive: employee.wage.incentive,
    wage_special: employee.wage.special,
    join_date: employee.joinDate,
    is_online: employee.isOnline,
  }).eq('id', employee.id);
  if (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
}

export async function deleteEmployee(employeeId: string) {
  const { error } = await supabase.from('employees').delete().eq('id', employeeId);
  if (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
}

// ===== ATTENDANCE RECORDS =====
export async function fetchAttendanceRecords() {
  const { data, error } = await supabase.from('attendance_records').select('*');
  if (error) {
    console.error('Error fetching attendance records:', error);
    return [];
  }
  return data || [];
}

export async function addAttendanceRecord(record: AttendanceRecord) {
  const { error } = await supabase.from('attendance_records').insert([
    {
      id: record.id,
      employee_id: record.employeeId,
      date: record.date,
      clock_in: record.clockIn,
      clock_out: record.clockOut,
      status: record.status,
      tag: record.tag,
      accumulated_minutes: record.accumulatedMinutes,
    },
  ]);
  if (error) {
    console.error('Error adding attendance record:', error);
    throw error;
  }
}

export async function updateAttendanceRecord(record: AttendanceRecord) {
  const { error } = await supabase.from('attendance_records').update({
    clock_in: record.clockIn,
    clock_out: record.clockOut,
    status: record.status,
    tag: record.tag,
    accumulated_minutes: record.accumulatedMinutes,
  }).eq('id', record.id);
  if (error) {
    console.error('Error updating attendance record:', error);
    throw error;
  }
}

export async function deleteAttendanceRecord(recordId: string) {
  const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
  if (error) {
    console.error('Error deleting attendance record:', error);
    throw error;
  }
}

// ===== APPROVAL REQUESTS =====
export async function fetchApprovalRequests() {
  const { data, error } = await supabase.from('approval_requests').select('*');
  if (error) {
    console.error('Error fetching approval requests:', error);
    return [];
  }
  return data || [];
}

export async function addApprovalRequest(request: ApprovalRequest) {
  const { error } = await supabase.from('approval_requests').insert([
    {
      id: request.id,
      employee_id: request.employeeId,
      type: request.type,
      status: request.status,
      target_date: request.targetDate,
      start_time: request.startTime,
      end_time: request.endTime,
      description: request.description,
      substitute_status: request.substituteStatus,
    },
  ]);
  if (error) {
    console.error('Error adding approval request:', error);
    throw error;
  }
}

export async function updateApprovalRequest(request: ApprovalRequest) {
  const { error } = await supabase.from('approval_requests').update({
    status: request.status,
    description: request.description,
    substitute_status: request.substituteStatus,
  }).eq('id', request.id);
  if (error) {
    console.error('Error updating approval request:', error);
    throw error;
  }
}

export async function deleteApprovalRequest(requestId: string) {
  const { error } = await supabase.from('approval_requests').delete().eq('id', requestId);
  if (error) {
    console.error('Error deleting approval request:', error);
    throw error;
  }
}

// ===== SCHEDULES =====
export async function fetchSchedules() {
  const { data, error } = await supabase.from('schedules').select('*');
  if (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }
  return data || [];
}

export async function addSchedules(schedules: Schedule[]) {
  const formattedSchedules = schedules.map(s => ({
    id: s.id,
    employee_id: s.employeeId,
    date: s.date,
    start_time: s.startTime,
    end_time: s.endTime,
  }));

  const { error } = await supabase.from('schedules').insert(formattedSchedules);
  if (error) {
    console.error('Error adding schedules:', error);
    throw error;
  }
}

export async function updateSchedule(schedule: Schedule) {
  const { error } = await supabase.from('schedules').update({
    start_time: schedule.startTime,
    end_time: schedule.endTime,
  }).eq('id', schedule.id);
  if (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
}

export async function deleteSchedule(scheduleId: string) {
  const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
  if (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
}
