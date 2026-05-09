import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyDCRTg2llrHvxr30Q_Wzn3N_AkWAfXp1Tc');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const headers = [
  'SL NO', 'name', 'email', 'usn', 'admission_number', 'branch_code', 
  'Joined the Batch', 'Pre Assessment Score(20)', 'Attendance', 'Knowledge(25)', 
  'Skill(25)', 'Attendance', 'Knowledge(25)', 'Skill(25)'
];
const context = [
  null, null, null, null, null, null, null, null, 'Day 1', null, null, 'Day 2', null, null
];
const sampleRows = [
  [1, 'PAVAN', 'test@test.com', '4SF24CI115', '0707', 'CI', true, 10, true, 15, 17, true, 15, 17]
];

const prompt = `
    Analyze this spreadsheet structure and map it to our Attendance System database.
    
    Database Fields Needed:
    - student_name: Column containing the full name
    - student_email: Column containing email address
    - student_usn: Column containing USN (Unique Student Number)
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
        "attendance_indices": [
          { "index": number, "label": "string", "date": "ISO_DATE_STRING or null" }
        ]
      },
      "needs_date_inference": boolean,
      "confidence": number
    }
`;

async function run() {
  try {
    const result = await model.generateContent(prompt);
    console.log("Raw output:", result.response.text());
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
