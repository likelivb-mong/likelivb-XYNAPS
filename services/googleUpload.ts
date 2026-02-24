const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzgEiGWb6Fq-6lDnPHTCC_2JMcjtO7dbDzZhqh8CRGWWM82GdTGsO_oL2Hj4UYyXv28/exec"; // Updated

export async function uploadPayrollToSheet(data: any[]) {
  try {
    console.log("Uploading to:", SHEET_API_URL);
    console.log("Payload:", data);

    const res = await fetch(SHEET_API_URL, {
      method: "POST",
      // Google Apps Script often has issues with CORS preflight (OPTIONS) for application/json.
      // Using text/plain avoids the preflight request.
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "uploadPayroll", // Must match the Apps Script handler
        payload: data
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Upload failed:", error);
    return { result: "error", message: error instanceof Error ? error.message : "Unknown error" };
  }
}