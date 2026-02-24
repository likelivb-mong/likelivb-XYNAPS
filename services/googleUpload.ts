const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbw9hI__EYVf9BCcdzO2VSKUBO9pulIhgEUyTHgJIx7UHYunEbWB_11amDamp0cMPazP/exec";

async function postToScript(body: any) {
  const res = await fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // preflight 회피
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status}`);
  }
  return await res.json();
}

export async function uploadPayrollToSheet(data: any[]) {
  return await postToScript({
    action: "uploadPayroll",
    payload: data,
  });
}

export async function uploadAttendanceToSheet(data: any[]) {
  return await postToScript({
    action: "uploadAttendance",
    payload: data,
  });
}