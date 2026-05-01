import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("Gemini API Key missing. Check your .env.local file.");
}

export const genAI = new GoogleGenerativeAI(apiKey || 'placeholder_key');
