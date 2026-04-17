import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function getMentorResponse(history: { role: string, parts: { text: string }[] }[], userInput: string, userProfile: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: "user", parts: [{ text: userInput }] }],
      config: {
        systemInstruction: `You are EduMentor, a friendly animated mentor mascot for a student named ${userProfile?.name || 'Student'}.
        Your personality: Enthusiastic, encouraging, wise but fun.
        Stay focused on academics, student development, career guidance, and overall growth.
        Keep responses concise and engaging for text-to-speech.`,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having a bit of a brain freeze! But don't worry, keep exploring your lessons!";
  }
}
