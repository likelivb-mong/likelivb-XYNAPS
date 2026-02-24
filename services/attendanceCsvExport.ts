export function downloadAttendanceCSV(filename: string, records: any[]) {
  if (!records || records.length === 0) {
    alert("내보낼 근태 데이터가 없습니다.");
    return;
  }

  const headers = [
    "date",
    "employeeName",
    "branch",
    "status",
    "minutes",
  ];

  const lines = [
    headers.join(","),
    ...records.map(r =>
      [
        r.date,
        r.employeeName,
        r.branch,
        r.status,
        r.minutes
      ].join(",")
    )
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}