import { GoogleGenAI } from "@google/genai";
import { Employee, AttendanceRecord, Schedule } from "../types";

const apiKey = process.env.API_KEY || ''; // In a real app, ensure this is set
const ai = new GoogleGenAI({ apiKey });

export const generateWorkforceInsight = async (
  employees: Employee[],
  attendance: AttendanceRecord[],
  schedules: Schedule[],
  query: string
): Promise<string> => {
  if (!apiKey) return "API Key not configured.";

  try {
    const context = `
      You are an AI assistant for a Workforce Management System called 'Crew Task Board'.
      
      Current Data:
      Employees: ${JSON.stringify(employees.map(e => ({ name: e.name, branch: e.branch, position: e.position })))}
      Current Attendance Status: ${JSON.stringify(attendance.map(a => ({ id: a.employeeId, status: a.status, minutes: a.accumulatedMinutes })))}
      Schedules: ${JSON.stringify(schedules.slice(0, 10))}

      User Query: ${query}

      Provide a concise, professional insight or answer based on the data.
      If generating a report, keep it structured.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: context,
    });

    return response.text || "No insights available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate insight. Please try again later.";
  }
};