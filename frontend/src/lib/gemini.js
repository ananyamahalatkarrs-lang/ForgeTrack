import { GoogleGenerativeAI } from '@google/generative-ai';

// Add hardcoded fallback in case Vite hasn't restarted to pick up .env.local
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyDCRTg2llrHvxr30Q_Wzn3N_AkWAfXp1Tc";

if (!apiKey) {
  console.warn("Gemini API Key missing. Check your .env.local file.");
}

export const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Uses Gemini to analyze the structure of a spreadsheet and map it to our database schema.
 */
export async function analyzeSheetStructure(headerInfo, sampleRows) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const { headers, context } = headerInfo;

  const prompt = `
    Analyze this spreadsheet structure and map it to our Attendance System database.
    
    Database Fields Needed:
    - student_name: Column containing the full name
    - student_email: Column containing email address
    - student_usn: Column containing USN (Unique Student Number)
    - student_branch: Column containing the branch (e.g. CS, AI, IS)
    - attendance_columns: A list of columns that represent attendance for specific dates or sessions.
    
    Headers found in sheet: ${JSON.stringify(headers)}
    Context (row above headers): ${JSON.stringify(context)}
    Sample Data (first few rows): ${JSON.stringify(sampleRows)}
    
    Rules:
    1. Some headers might be merged. For example, "Day 1" might be followed by "Attendance", "Knowledge", "Skill". In this case, "Attendance" under "Day 1" is the attendance column.
    2. If headers contain dates (e.g. "30/04/26" or "15-05-25"), identify them.
    3. If headers are generic like "Day 1", "Day 2", flag them as "needs_date_inference".
    4. Return ONLY a valid JSON object. Do not include any other text.
    
    Required JSON Structure:
    {
      "mappings": {
        "student_name_idx": number,
        "student_email_idx": number,
        "student_usn_idx": number,
        "student_branch_idx": number,
        "attendance_indices": [
          { "index": number, "label": "string", "date": "ISO_DATE_STRING or null" }
        ]
      },
      "needs_date_inference": boolean,
      "confidence": number
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Robust JSON extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI did not return a valid JSON object. Content: " + text.slice(0, 100));
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.warn("AI Analysis failed. Falling back to local heuristic mapping:", error.message);
    
    let nameIdx = -1, emailIdx = -1, usnIdx = -1, branchIdx = -1;
    const attendanceIndices = [];
    
    if (headers && Array.isArray(headers)) {
      headers.forEach((h, i) => {
        if (!h || typeof h !== 'string') return;
        const lower = h.toLowerCase();
        if (lower.includes('name')) nameIdx = i;
        else if (lower.includes('email')) emailIdx = i;
        else if (lower.includes('usn')) usnIdx = i;
        else if (lower.includes('branch') || lower.includes('dept')) branchIdx = i;
        else if (lower.includes('day') || lower.includes('session') || lower.includes('date') || lower.includes('att') || /\d/.test(h)) {
          attendanceIndices.push({ index: i, label: h, date: null });
        }
      });
    }

    // Default to first few columns if not found
    if (nameIdx === -1) nameIdx = 0;
    if (emailIdx === -1) emailIdx = 1;
    if (usnIdx === -1) usnIdx = 2;
    if (branchIdx === -1) branchIdx = 3;

    return {
      mappings: {
        student_name_idx: nameIdx,
        student_email_idx: emailIdx,
        student_usn_idx: usnIdx,
        student_branch_idx: branchIdx,
        attendance_indices: attendanceIndices.length > 0 ? attendanceIndices : [{ index: 4, label: "Day 1", date: null }]
      },
      needs_date_inference: true,
      confidence: 0.6
    };
  }
}
