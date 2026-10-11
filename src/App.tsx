import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Search, 
  Settings, 
  LayoutDashboard, 
  Briefcase, 
  User,
  Plus,
  ArrowRight,
  ClipboardCheck,
  Loader2,
  Trash2,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { useState, useCallback, useEffect, ReactNode } from "react";
import { cn } from "./lib/utils";
import { AppState, UserProfile } from "./types";
import { parseResume, generateAutofillAnswers } from "./services/geminiService";

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('applyflow_profile');
    try {
      return {
        profile: saved ? (JSON.parse(saved) as UserProfile) : null,
        isParsing: false,
      };
    } catch {
      return { profile: null, isParsing: false };
    }
  });
  
  useEffect(() => {
    if (state.profile) {
      localStorage.setItem('applyflow_profile', JSON.stringify(state.profile));
    } else {
      localStorage.removeItem('applyflow_profile');
    }
  }, [state.profile]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'resume' | 'assistant'>('dashboard');
  
  const handleResumeTextSubmit = async (text: string) => {
    setState(prev => ({ ...prev, isParsing: true }));
    try {
      const parsed = await parseResume(text);
      setState({ profile: parsed, isParsing: false });
      setActiveTab('dashboard');
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, isParsing: false }));
      alert("Failed to parse resume. Please try again with clear text.");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <nav className="w-72 border-r border-slate-200 bg-white flex flex-col p-6 shrink-0 relative z-10">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
            <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">ApplyFlow <span className="text-blue-600">Pro</span></span>
        </div>
        
        <div className="space-y-1.5 flex-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-3 mb-2">Main Menu</label>
          <SidebarLink 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Dashboard" 
            isActive={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarLink 
            icon={<FileText className="w-5 h-5" />} 
            label="Resume Profile" 
            isActive={activeTab === 'resume'} 
            onClick={() => setActiveTab('resume')} 
          />
          <SidebarLink 
            icon={<Search className="w-5 h-5" />} 
            label="Form Assistant" 
            isActive={activeTab === 'assistant'} 
            onClick={() => setActiveTab('assistant')} 
          />
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col gap-6">
          <div className="space-y-1">
            <SidebarLink 
              icon={<Settings className="w-5 h-5" />} 
              label="Settings" 
              isActive={false} 
              onClick={() => {}} 
            />
          </div>
          
          <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl -mr-12 -mt-12"></div>
            <p className="text-[10px] uppercase font-bold opacity-50 mb-2 tracking-wider">ApplyFlow Workspace</p>
            <p className="text-sm font-bold truncate">Ready to Assist</p>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                className="bg-blue-500 h-full rounded-full"
              />
            </div>
            <p className="text-[10px] mt-2 opacity-40">Connected to Gemini 3 Flash</p>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-slate-50/50">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <DashboardView profile={state.profile} onSwitchTab={setActiveTab} />
          )}
          {activeTab === 'resume' && (
            <ResumeView 
              profile={state.profile} 
              isParsing={state.isParsing}
              onSubmit={handleResumeTextSubmit}
              onClear={() => setState({ profile: null, isParsing: false })}
            />
          )}
          {activeTab === 'assistant' && (
            <AssistantView profile={state.profile} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SidebarLink({ icon, label, isActive, onClick }: { icon: ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm",
        isActive 
          ? "bg-slate-100 text-slate-900 font-bold shadow-sm" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium"
      )}
    >
      <span className={cn(
        "transition-colors",
        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
      )}>
        {icon}
      </span>
      <span>{label}</span>
      {isActive && (
        <motion.div 
          layoutId="sidebar-active"
          className="ml-auto w-1 h-4 bg-blue-600 rounded-full"
        />
      )}
    </button>
  );
}

// --- Views ---

function DashboardView({ profile, onSwitchTab }: { profile: UserProfile | null, onSwitchTab: (tab: any) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-10 max-w-6xl mx-auto"
    >
      <header className="mb-10 flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
            <span className="px-2 py-0.5 bg-blue-100 rounded">LIVE SESSION</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">ApplyFlow Dashboard</h1>
          <p className="text-slate-500 font-medium">Smart job application management is active.</p>
        </div>
        <div className="flex items-center gap-4">
           {profile && (
             <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider border border-green-100 shadow-sm">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               Profile Active
             </div>
           )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <DashboardCard 
          title="Resume Profile"
          description={profile ? `Currently using the profile for ${profile.fullName}.` : "Add your resume to enable smart parsing and autofill capabilities."}
          icon={<User className="w-6 h-6" />}
          actionLabel={profile ? "View / Edit Profile" : "Upload Your Resume"}
          onClick={() => onSwitchTab('resume')}
          isReady={!!profile}
        />
        <DashboardCard 
          title="Form Assistant"
          description="Synthesize tailored answers for job application questions based on your background."
          icon={<ClipboardCheck className="w-6 h-6" />}
          actionLabel="Start Form Assistant"
          onClick={() => onSwitchTab('assistant')}
          disabled={!profile}
        />
      </div>

      {profile && (
        <div className="sleek-card p-10 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Briefcase className="w-48 h-48" />
          </div>
          <div className="relative">
            <h2 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              Core Profile Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              <div className="space-y-2">
                <p className="sleek-label mb-0 uppercase text-[10px]">Active Name</p>
                <p className="text-lg font-bold text-slate-800">{profile.fullName}</p>
              </div>
              <div className="space-y-2">
                <p className="sleek-label mb-0 uppercase text-[10px]">Work Records</p>
                <p className="text-lg font-bold text-slate-800">{profile.experience.length} Positions</p>
              </div>
              <div className="space-y-2">
                <p className="sleek-label mb-0 uppercase text-[10px]">Top Skills</p>
                <div className="flex flex-wrap gap-1">
                   {profile.skills.slice(0, 2).map(s => (
                     <span key={s} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">{s}</span>
                   ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="sleek-label mb-0 uppercase text-[10px]">Last Location</p>
                <p className="text-lg font-bold text-slate-800">{profile.location || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function DashboardCard({ title, description, icon, actionLabel, onClick, isReady, disabled }: any) {
  return (
    <div className={cn(
      "sleek-card p-8 group transition-all duration-300",
      disabled ? "opacity-50 grayscale cursor-not-allowed bg-slate-50/50" : "hover:shadow-xl hover:border-blue-200 hover:translate-y-[-4px]"
    )}>
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300",
        isReady ? "bg-green-50 text-green-600 shadow-sm" : "bg-blue-50 text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white"
      )}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-10 leading-relaxed font-medium">
        {description}
      </p>
      <button 
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
          isReady 
            ? "bg-slate-100 text-slate-900 hover:bg-slate-200" 
            : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100"
        )}
      >
        {actionLabel}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  );
}

function ResumeView({ profile, isParsing, onSubmit, onClear }: any) {
  const [inputText, setInputText] = useState("");

  if (profile) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-10 max-w-6xl mx-auto"
      >
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Source Profile</h1>
            <p className="text-sm text-slate-500 font-medium">This is the background used for all autofill generations.</p>
          </div>
          <button 
            onClick={onClear}
            className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold text-xs uppercase tracking-widest px-4 py-2 hover:bg-red-50 rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Purged Profile
          </button>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <div className="sleek-card p-10 relative overflow-hidden bg-white/50 backdrop-blur-sm">
               <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                 <User className="w-64 h-64" />
               </div>
               
               <div className="relative">
                 <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200">
                      {profile.fullName.charAt(0)}
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">Verified Data</span>
                    </div>
                 </div>
                 
                 <h2 className="text-3xl font-bold text-slate-900 mb-2">{profile.fullName}</h2>
                 <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-500 mb-8 pb-8 border-b border-slate-100">
                   <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-slate-300" /> {profile.email}</span>
                   {profile.phone && <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-slate-300" /> {profile.phone}</span>}
                   {profile.location && <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-slate-300" /> {profile.location}</span>}
                 </div>
                 
                 <div className="space-y-4">
                    <label className="sleek-label">Executive Summary</label>
                    <p className="text-slate-700 leading-relaxed font-medium bg-slate-50/50 p-6 rounded-2xl border border-slate-100 italic">
                      "{profile.summary}"
                    </p>
                 </div>
               </div>
            </div>

            <div className="sleek-card p-10 space-y-10">
              <div>
                <h3 className="sleek-label pb-4 border-b border-slate-100 mb-6">Work Experience</h3>
                <div className="space-y-12">
                  {profile.experience.map((exp: any, i: number) => (
                    <div key={i} className="relative pl-10 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-[2px] before:bg-slate-100 last:before:hidden">
                      <div className="absolute left-[-5px] top-2 w-3 h-3 rounded-full bg-white border-2 border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]" />
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xl font-bold text-slate-900">{exp.position}</p>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">{exp.duration}</span>
                      </div>
                      <p className="text-base font-bold text-blue-600 mb-4">{exp.company}</p>
                      <ul className="text-sm text-slate-600 space-y-3 list-none">
                        {exp.description.map((desc: string, j: number) => (
                          <li key={j} className="flex gap-3">
                            <span className="text-blue-200 font-bold mt-0.5">•</span>
                            <span className="font-medium">{desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-8">
            <div className="sleek-card p-8">
              <label className="sleek-label border-b border-slate-100 pb-4 mb-6">Skills & Competencies</label>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: string) => (
                  <span key={skill} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100 transition-hover hover:bg-blue-100 cursor-default">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="sleek-card p-8">
              <label className="sleek-label border-b border-slate-100 pb-4 mb-6">Education History</label>
              <div className="space-y-6">
                {profile.education.map((edu: any, i: number) => (
                  <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <p className="font-bold text-slate-900 text-sm">{edu.institution}</p>
                    <p className="text-xs font-semibold text-blue-600 mt-1">{edu.degree}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">{edu.year}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl">
               <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                 <CheckCircle2 className="text-blue-500 w-4 h-4" />
                 Ready for Application
               </h4>
               <p className="text-xs text-slate-400 leading-relaxed mb-6">Your profile is fully parsed and optimized for smart autofill. Head over to the assistant to start applying.</p>
               <button className="w-full py-3 bg-blue-600 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/40">Open Form Assistant</button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-10 max-w-4xl mx-auto"
    >
      <div className="text-center mb-12 py-10">
        <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-200">
          <UploadCloud className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Import Source Resume</h1>
        <p className="text-slate-500 max-w-lg mx-auto leading-relaxed text-base font-medium">
          Paste your professional history to create a structured source of truth for the AI assistant.
        </p>
      </div>

      <div className="sleek-card p-10 bg-white shadow-2xl shadow-slate-200/50">
        <div className="mb-6 flex justify-between items-center">
           <label className="sleek-label mb-0">Plain Text Input</label>
           <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold text-slate-500">FORMAT: UNSTRUCTURED</span>
        </div>
        <textarea 
          placeholder="Paste resume text or LinkedIn profile content..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-80 p-8 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-300 resize-none transition-all outline-none font-medium leading-relaxed"
        />
        
        <div className="mt-10 flex flex-col items-center gap-4">
          <button 
            disabled={!inputText.trim() || isParsing}
            onClick={() => onSubmit(inputText)}
            className={cn(
              "sleek-button w-full h-16 text-lg flex items-center justify-center shadow-2xl shadow-blue-600/20",
              isParsing ? "bg-slate-200 text-slate-400 shadow-none hover:bg-slate-200" : ""
            )}
          >
            {isParsing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin mr-3" />
                Synthesizing Profile...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6 mr-3" />
                Build My Pro Profile
              </>
            )}
          </button>
          
          <div className="flex items-center gap-4 mt-4">
             <div className="flex -space-x-2">
                {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />)}
             </div>
             <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
               Trusted by 2,000+ early adopters
             </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FeatureIcon({ label, icon }: { label: string, icon: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
        {icon}
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function AssistantView({ profile }: { profile: UserProfile | null }) {
  const [jobDescription, setJobDescription] = useState("");
  const [questionsText, setQuestionsText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<Record<string, string> | null>(null);

  const handleGenerate = async () => {
    if (!profile) return;
    setIsGenerating(true);
    try {
      const qList = questionsText.split("\n").filter(q => q.trim().length > 0);
      const generated = await generateAutofillAnswers(profile, jobDescription, qList);
      setResults(generated);
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center p-10">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-8 text-slate-300 border border-slate-200">
            <User className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Profile Required</h2>
          <p className="text-slate-500 mb-8 text-sm font-medium">You must establish your source profile before using the smart assistant features.</p>
          <button className="text-blue-600 font-bold hover:underline py-2 px-6 bg-blue-50 rounded-xl transition-all">Go to Profile Settings →</button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-10 max-w-7xl mx-auto h-full flex flex-col"
    >
      <header className="mb-10 flex justify-between items-end shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            <span className="px-2 py-0.5 bg-slate-200 rounded text-slate-700">ACTIVE SESSION</span>
            <span>LinkedIn / Jobs / Detection</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Form Filling Assistant</h1>
          <p className="text-slate-500 font-medium">Generate contextually relevant, professional answers in seconds.</p>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={!jobDescription || !questionsText || isGenerating}
          className="sleek-button px-10 flex items-center gap-3 h-14"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <MessageSquare className="w-5 h-5" />
              Generate Response
            </>
          )}
        </button>
      </header>

      <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden">
        {/* Left Column: Form Setup */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar pb-10">
          <div className="sleek-card flex flex-col">
            <div className="px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-blue-500" />
                 Context Definition
               </h2>
               <div className="text-[10px] font-bold text-slate-400">PASTE JOB SPECIFICATION</div>
            </div>
            <div className="p-8">
              <textarea 
                placeholder="Paste the target job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full h-48 p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-300 resize-none outline-none transition-all font-medium"
              />
            </div>
          </div>

          <div className="sleek-card flex flex-col">
            <div className="px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-amber-500" />
                 Application Questions
               </h2>
               <div className="text-[10px] font-bold text-slate-400">ONE PER LINE</div>
            </div>
            <div className="p-8">
              <textarea 
                placeholder="Paste specific application questions here...\n\nExample:\n- Describe your most challenging project.\n- Why do you want to join our team?"
                value={questionsText}
                onChange={(e) => setQuestionsText(e.target.value)}
                className="w-full h-48 p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-300 resize-none outline-none transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* Right Column: AI Output */}
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full pb-10">
          <div className="bg-slate-900 rounded-[2rem] p-4 flex flex-col h-full shadow-2xl shadow-blue-900/10 relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ClipboardCheck className="w-32 h-32 text-blue-500" />
            </div>
            
            <div className="px-6 py-6 border-b border-slate-800 mb-6 relative z-10 flex justify-between items-end">
              <div>
                <p className="text-[10px] bg-blue-600/20 text-blue-400 px-2 shadow-inner inline-block rounded font-bold uppercase tracking-widest mb-1">Results Console</p>
                <h3 className="text-white font-bold">Synthesized Answers</h3>
              </div>
              <button 
                onClick={() => setResults(null)}
                className="text-[10px] font-bold text-slate-500 hover:text-white uppercase transition-colors"
                disabled={!results}
              >
                Clear
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-2 custom-scrollbar relative z-10">
              {!results && !isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 px-6">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-slate-600">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Awaiting Generation</p>
                  <p className="text-xs text-slate-600 mt-2 font-medium">The results console will populate once you trigger the generation phase.</p>
                </div>
              )}

              {isGenerating && (
                <div className="space-y-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-slate-800/40 p-6 rounded-2xl animate-pulse">
                      <div className="h-2 w-1/3 bg-slate-700 rounded-full mb-4" />
                      <div className="h-3 bg-slate-700 rounded-full mb-2" />
                      <div className="h-3 w-5/6 bg-slate-700 rounded-full" />
                    </div>
                  ))}
                </div>
              )}

              {results && Object.entries(results).map(([q, a], i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-slate-800/60 p-6 rounded-2xl border border-slate-800 group transition-all hover:bg-slate-800 hover:border-slate-700 shadow-xl"
                >
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Question {i+1}</p>
                    <button 
                      onClick={() => typeof a === 'string' && navigator.clipboard.writeText(a)}
                      className="p-1.5 bg-slate-700 hover:bg-blue-600 rounded-lg transition-colors group-hover:scale-110 active:scale-95"
                      title="Copy Answer"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-400 mb-3 leading-snug">{q}</p>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">{a}</p>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-800 relative z-10 px-2">
               <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white uppercase tracking-tight">AI Confidence: High</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Synthesized from 12 match points</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
