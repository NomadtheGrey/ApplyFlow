export interface WorkExperience {
  company: string;
  position: string;
  duration: string;
  description: string[];
}

export interface Education {
  institution: string;
  degree: string;
  year: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  links: { label: string; url: string }[];
}

export interface AppState {
  profile: UserProfile | null;
  isParsing: boolean;
}
