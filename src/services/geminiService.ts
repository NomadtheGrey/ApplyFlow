import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile } from "../types";
import type { FieldDescriptor, FillPlan } from "../extension/protocol";

// Lazy client: constructing GoogleGenAI throws in a browser context when no
// API key is present, so we defer it until the first call. A missing key then
// surfaces as a catchable error instead of killing the page/worker on load.
let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

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
  const response = await ai().models.generateContent({
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
  const response = await ai().models.generateContent({
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

const FILL_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          uid: { type: Type.STRING },
          value: { type: Type.STRING },
        },
        required: ["uid", "value"],
      },
    },
  },
  required: ["items"],
} as const;

function buildMappingPrompt(profile: UserProfile, fields: FieldDescriptor[]): string {
  const fieldLines = fields.map((f) => {
    const parts = [
      `uid=${f.uid}`,
      `kind=<${f.tag} type="${f.type}">`,
      `label="${f.label}"`,
    ];
    if (f.name) parts.push(`name="${f.name}"`);
    if (f.placeholder) parts.push(`placeholder="${f.placeholder}"`);
    if (f.options) parts.push(`options=[${f.options.map((o) => `"${o}"`).join(", ")}]`);
    return "- " + parts.join(" ");
  });

  return `You are filling out a job application form for a candidate. Below is the candidate's profile (JSON) and the form's empty fields.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

FORM FIELDS:
${fieldLines.join("\n")}

Decide the value for each field and respond with a JSON object: { "items": [ { "uid": "...", "value": "..." } ] }.
One item per field, same uids, same order.

HARD RULES:
- Use ONLY information present in the profile. If you cannot determine a value, set "value" to "" (empty string) to skip the field. NEVER invent employers, dates, numbers, or answers.
- SKIP (empty value) any equal-opportunity / demographic fields: veteran status, disability, gender, race/ethnicity, sexual orientation, or similar. Leave those for the human.
- SKIP fields asking to upload files or agree to legal text unless the answer is unambiguous.
- Split fullName into first/last/middle names as the labels require.
- For <select> fields, "value" must EXACTLY match one of the listed options (the visible text), or "" if none fits.
- For checkbox/radio, use "yes" or "no" only when the label makes the meaning unambiguous.
- Keep values plain and short — what a human would type into the box.
- Phone: use the profile's phone number as written.`;
}

/**
 * Ask Gemini which profile value belongs in each page field.
 * Empty-string values come back as null (skip). Never invents data.
 */
export async function mapFieldsToProfile(
  profile: UserProfile,
  fields: FieldDescriptor[]
): Promise<FillPlan> {
  const response = await ai().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: buildMappingPrompt(profile, fields),
    config: {
      responseMimeType: "application/json",
      responseSchema: FILL_PLAN_SCHEMA as any,
    },
  });
  if (!response.text) throw new Error("Empty response from the AI");
  const parsed = JSON.parse(response.text) as { items: { uid: string; value: string }[] };
  const known = new Set(fields.map((f) => f.uid));
  return {
    items: parsed.items
      .filter((it) => known.has(it.uid))
      .map((it) => ({ uid: it.uid, value: it.value === "" ? null : it.value })),
  };
}
