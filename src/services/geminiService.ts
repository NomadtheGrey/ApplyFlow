import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const USER_PROFILE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fullName: { type: Type.STRING },
    email: { type: Type.STRING },
    phone: { type: Type.STRING },
    location: { type: Type.STRING },
    summary: { type: Type.STRING },
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          position: { type: Type.STRING },
          duration: { type: Type.STRING },
          description: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["company", "position", "duration", "description"]
      }
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution: { type: Type.STRING },
          degree: { type: Type.STRING },
          year: { type: Type.STRING }
        },
        required: ["institution", "degree", "year"]
      }
    },
    links: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          url: { type: Type.STRING }
        },
        required: ["label", "url"]
      }
    }
  },
  required: ["fullName", "email", "summary", "experience"]
};

export async function parseResume(resumeText: string): Promise<UserProfile> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract the following resume text into a structured JSON profile. 
    Be thorough and preserve all key responsibilities and achievements in the experience sections.
    
    RESUME TEXT:
    ${resumeText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: USER_PROFILE_SCHEMA as any,
    },
  });

  if (!response.text) throw new Error("Failed to parse resume");
  return JSON.parse(response.text) as UserProfile;
}

export async function generateAutofillAnswers(
  profile: UserProfile,
  jobDescription: string,
  questions: string[]
): Promise<Record<string, string>> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an expert job application assistant. Based on the user's resume profile and the provided job description, generate professional, tailored answers for the following application questions.
    
    USER PROFILE:
    ${JSON.stringify(profile, null, 2)}
    
    JOB DESCRIPTION:
    ${jobDescription}
    
    QUESTIONS:
    ${JSON.stringify(questions)}
    
    Respond with a JSON object where keys are the questions provided and values are the generated answers.
    Answers should be concise, professional, and highlight relevant skills from the profile.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: questions.reduce((acc, q) => {
          acc[q] = { type: Type.STRING };
          return acc;
        }, {} as any),
      } as any,
    },
  });

  if (!response.text) throw new Error("Failed to generate answers");
  return JSON.parse(response.text);
}
