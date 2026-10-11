# ApplyFlow

> **Smart job application assistant** that parses resumes and generates tailored autofill answers for job application forms.

ApplyFlow streamlines the job application process by turning unstructured resume details into structured career profiles and generating tailored, high-converting responses for custom application questions.

---

## Features

- **Resume Parsing Engine**: Transform plain text resumes or LinkedIn profiles into structured profiles with work experience, education, skills, and summary points.
- **Form Filling Assistant**: Paste any target job description alongside open-ended application questions (e.g. *Why are you interested in this role?*, *Describe a challenging project*) to generate tailored, professional answers.
- **Persistent Profile Store**: Save and manage your professional profile locally with instant access across sessions.
- **Copy-to-Clipboard Flow**: Quick one-click copying for each synthesized question answer.

---

## Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), [Motion](https://motion.dev/), [Lucide React](https://lucide.dev/)
- **AI Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai) with structured schema extraction

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- A valid Gemini API key set in your environment (`GEMINI_API_KEY`)

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server on port 3000
npm run dev
```

### Build

```bash
# Build production bundle
npm run build
```

---

## License

MIT
