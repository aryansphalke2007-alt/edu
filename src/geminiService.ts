import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getMentorResponse(history: { role: string, parts: { text: string }[] }[], userInput: string, userProfile: any) {
  try {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: "user", parts: [{ text: userInput }] }],
      config: {
        systemInstruction: `You are EduMentor, a friendly animated mentor mascot for a student named ${userProfile?.name || 'Student'}.
        Your personality: Enthusiastic, encouraging, wise but fun. You hold a ruler (metaphorically) to guide students.
        Stay focused on academics, student development, career guidance, and overall growth.
        Always respond in a way that is clear for text-to-speech. Keep responses concise and engaging.
        If they ask about their class (${userProfile?.class}), provide relevant advice.
        Your goal is to be a digital mentor, not just a homework solver.`,
      }
    });

    const result = await model;
    return result.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having a bit of a brain freeze! But don't worry, keep exploring your lessons!";
  }
}
