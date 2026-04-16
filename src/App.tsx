import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  FlaskConical, 
  Gamepad2, 
  Calendar, 
  TrendingUp, 
  Award, 
  Settings, 
  LogOut,
  Bell,
  Search,
  User,
  Coffee,
  Play,
  FileText,
  Briefcase,
  Globe,
  Headphones,
  Clock,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, Cell
} from 'recharts';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDocs, getDoc, collection, query, where, onSnapshot, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import { AuthProvider, useAuth } from './AuthContext';
import { AccessibilityProvider, useAccessibility, ReadAloudText } from './AccessibilityContext';
import { Mascot } from './components/Mascot';
import { LabSimulation, ExperimentType } from './components/LabSimulation';
import { UserProfile, Activity, Goal, Attendance, StudyLog, Badge } from './types';

// --- ERROR HANDLING ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return new Error(errInfo.error);
}

// --- AUTH COMPONENTS ---

const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    rollNo: '',
    password: '',
    name: '',
    email: '',
    class: '',
    age: '',
    hobbies: '',
    role: 'student' as 'student' | 'teacher' | 'parent',
    childRollNo: '' // for parent
  });
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setError('');
    try {
      if (isRegister) {
        // Validate required fields
        if (!formData.name || !formData.email || !formData.rollNo || !formData.password) {
          throw new Error("Please fill in all required fields.");
        }

        // 1. Check if roll number is already assigned (Publicly readable via roll_map)
        try {
          const rollSnap = await getDoc(doc(db, 'roll_map', formData.rollNo));
          if (rollSnap.exists()) {
            throw new Error("This Roll Number is already registered.");
          }
        } catch (dbErr: any) {
          // If it's a permission error, it might be something else, but 'get' is allowed true
          if (dbErr.message.includes('permission')) {
             throw handleFirestoreError(dbErr, OperationType.GET, `roll_map/${formData.rollNo}`);
          }
        }

        // 2. Simple registration - uses provided email for Firebase Auth
        const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        
        // 3. Create profile and mapping
        const profile: UserProfile = {
          uid: userCred.user.uid,
          name: formData.name,
          rollNo: formData.rollNo,
          email: formData.email,
          role: formData.role,
          class: formData.class,
          age: parseInt(formData.age) || 0,
          hobbies: formData.hobbies ? formData.hobbies.split(',').map(h => h.trim()).filter(h => h) : [],
          parentOf: formData.role === 'parent' ? formData.childRollNo : undefined
        };

        try {
          await setDoc(doc(db, 'users', userCred.user.uid), profile);
          await setDoc(doc(db, 'roll_map', formData.rollNo), { email: formData.email });
        } catch (dbErr) {
          throw handleFirestoreError(dbErr, OperationType.WRITE, `users/${userCred.user.uid}`);
        }
      } else {
        // Login by Roll No - need to find email first
        let email = '';
        try {
          const rollSnap = await getDoc(doc(db, 'roll_map', formData.rollNo));
          if (!rollSnap.exists()) throw new Error("Roll Number not found");
          email = rollSnap.data().email;
        } catch (dbErr: any) {
          if (dbErr.message.includes('found')) throw dbErr;
          throw handleFirestoreError(dbErr, OperationType.GET, `roll_map/${formData.rollNo}`);
        }

        await signInWithEmailAndPassword(auth, email, formData.password);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-indigo-100"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl text-indigo-600 mb-2">EduMentor 360</h1>
          <p className="text-slate-500">Your Learning Adventure Awaits!</p>
        </div>

        <div className="space-y-4">
          {isRegister && (
            <>
              <input 
                type="text" 
                placeholder="Full Name" 
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </>
          )}

          <input 
            type="text" 
            placeholder="Roll Number" 
            className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={formData.rollNo}
            onChange={e => setFormData({...formData, rollNo: e.target.value})}
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
          />

          {isRegister && (
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Class" 
                className="p-3 rounded-xl border border-slate-200"
                value={formData.class}
                onChange={e => setFormData({...formData, class: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="Age" 
                className="p-3 rounded-xl border border-slate-200"
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
              />
              <select 
                className="col-span-2 p-3 rounded-xl border border-slate-200"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as any})}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
              </select>
              {formData.role === 'parent' && (
                <input 
                  type="text" 
                  placeholder="Child's Roll No" 
                  className="col-span-2 p-3 rounded-xl border border-slate-200"
                  value={formData.childRollNo}
                  onChange={e => setFormData({...formData, childRollNo: e.target.value})}
                />
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button 
            onClick={handleAuth}
            className="w-full bg-indigo-600 text-white p-4 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            {isRegister ? 'Create Account' : 'Embark Now'}
          </button>

          <p className="text-center text-slate-500 text-sm">
            {isRegister ? 'Already have an account?' : 'New explorer?'}
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-indigo-600 font-medium ml-1"
            >
              {isRegister ? 'Login' : 'Register'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// --- CORE UI COMPONENTS ---

const DashboardCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 ${className}`}
  >
    <div className="flex items-center gap-3 mb-6">
      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
        {icon}
      </div>
      <h3 className="text-xl text-slate-800">
        <ReadAloudText text={title} />
      </h3>
    </div>
    {children}
  </motion.div>
);

const Sidebar: React.FC<{ activeTab: string; setActiveTab: (t: string) => void }> = ({ activeTab, setActiveTab }) => {
  const { profile } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'activities', label: 'Activities', icon: <Calendar size={20} /> },
    { id: 'lab', label: 'Virtual Lab', icon: <FlaskConical size={20} /> },
    { id: 'resources', label: 'Resources', icon: <BookOpen size={20} /> },
    { id: 'fun', label: 'Fun Zone', icon: <Gamepad2 size={20} /> },
    { id: 'skills', label: 'Career & Skills', icon: <Briefcase size={20} /> },
    { id: 'ebooks', label: 'E-Books', icon: <FileText size={20} /> },
    { id: 'news', label: 'Student News', icon: <Globe size={20} /> },
  ];

  return (
    <div className="w-64 h-screen bg-indigo-600 text-white fixed left-0 top-0 flex flex-col p-6 overflow-y-auto scrollbar-hide border-r border-indigo-700 z-[100] shadow-2xl">
      <div className="flex items-center gap-3 mb-10 shrink-0">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 text-2xl">
          🎓
        </div>
        <h2 className="text-xl font-fredoka">EduMentor</h2>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer relative z-10 ${
              activeTab === item.id ? 'bg-white text-indigo-600 shadow-lg' : 'hover:bg-indigo-500/50'
            }`}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="font-medium whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-indigo-500/50 shrink-0">
        <button 
          type="button"
          onClick={() => signOut(auth)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-500 transition-all text-indigo-100 hover:text-white cursor-pointer"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

// --- VIEWS ---

const StudentDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [data, setData] = useState({
    attendance: 92,
    studyTime: [
      { day: 'Mon', hours: 2.5 },
      { day: 'Tue', hours: 3.2 },
      { day: 'Wed', hours: 1.8 },
      { day: 'Thu', hours: 4.1 },
      { day: 'Fri', hours: 2.9 },
      { day: 'Sat', hours: 5.0 },
      { day: 'Sun', hours: 3.5 },
    ],
    goals: [
      { id: 1, title: 'Math Worksheet', completed: true },
      { id: 2, title: 'English Essay', completed: false },
      { id: 3, title: 'Science Lab Report', completed: false },
    ],
    badges: ['Early Bird', 'Math Pro', 'Streak Master']
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DashboardCard title="Study Velocity" icon={<TrendingUp />} className="lg:col-span-2">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.studyTime}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title="Attendance" icon={<Calendar />}>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="70" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
              <circle 
                cx="80" cy="80" r="70" stroke="#6366f1" strokeWidth="12" fill="transparent"
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={2 * Math.PI * 70 * (1 - data.attendance / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-slate-800">{data.attendance}%</span>
              <span className="text-xs text-slate-500">This Month</span>
            </div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Daily Expedition" icon={<Bell />}>
        <div className="space-y-4 h-64 overflow-y-auto pr-2">
          {data.goals.map(goal => (
            <div key={goal.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                goal.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
              }`}>
                {goal.completed && '✓'}
              </div>
              <span className={`text-sm ${goal.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                <ReadAloudText text={goal.title} />
              </span>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title="Achievements" icon={<Award />}>
        <div className="flex flex-wrap gap-3 h-64 content-start">
          {data.badges.map(badge => (
            <div key={badge} className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-2xl text-sm font-medium shadow-md">
              🏅 {badge}
            </div>
          ))}
          <div className="w-full flex items-center justify-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-sm">
            Complete goals to unlock more!
          </div>
        </div>
      </DashboardCard>
    </div>
  );
};

const VirtualLab: React.FC = () => {
  const [activeExp, setActiveExp] = useState<ExperimentType>('gravity');
  const experiments = [
    { id: 'gravity', title: 'Solar Dynamics', icon: '🪐', type: 'gravity' as const },
    { id: 'atoms', title: 'Atomic Model', icon: '⚛️', type: 'atoms' as const },
    { id: 'optics', title: 'Light Refraction', icon: '🌈', type: 'optics' as const },
  ];

  return (
    <div className="space-y-6">
      <LabSimulation type={activeExp} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {experiments.map(exp => (
          <button 
            key={exp.id} 
            type="button"
            onClick={() => setActiveExp(exp.type)}
            className={`p-6 rounded-3xl border transition-all cursor-pointer text-left relative z-10 ${
              activeExp === exp.id 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                : 'bg-white border-slate-100 hover:shadow-md text-slate-800'
            }`}
          >
             <div className={`w-full aspect-video rounded-2xl mb-4 flex items-center justify-center text-4xl ${
               activeExp === exp.id ? 'bg-white/20' : 'bg-slate-100'
             }`}>
               {exp.icon}
             </div>
             <h3 className="text-lg font-medium">{exp.title}</h3>
             <p className={`text-sm ${activeExp === exp.id ? 'text-indigo-100' : 'text-slate-500'}`}>
               Click to load 3D simulation
             </p>
          </button>
        ))}
      </div>
    </div>
  );
};

const Activities: React.FC = () => {
  const items = [
    { title: 'Algebra Practice', subject: 'Math', due: 'Tomorrow', status: 'Pending', icon: '📐' },
    { title: 'Photosynthesis Essay', subject: 'Biology', due: 'Friday', status: 'In Progress', icon: '🌿' },
    { title: 'World War II Summary', subject: 'History', due: 'Monday', status: 'Assigned', icon: '🌍' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {items.map((item, i) => (
        <DashboardCard key={i} title={item.subject} icon={<span>{item.icon}</span>} className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-medium text-lg">{item.title}</h4>
              <p className="text-sm text-slate-500">Due: {item.due}</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full font-medium">
              {item.status}
            </span>
          </div>
          <button className="w-full py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 text-sm font-medium transition-colors">
            View Details & Submit
          </button>
        </DashboardCard>
      ))}
    </div>
  );
};

const VisualResources: React.FC = () => {
  const topics = [
    { title: 'Understanding Calculus', duration: '12:45', views: '1.2k', icon: '🔢' },
    { title: 'The Human Heart', duration: '08:20', views: '3.4k', icon: '❤️' },
    { title: 'Quantum Mechanics Basics', duration: '15:10', views: '800', icon: '🌀' },
  ];
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 aspect-video rounded-3xl flex items-center justify-center relative overflow-hidden group">
        <Play fill="white" size={64} className="text-white z-10 opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer" />
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent text-white">
          <h3 className="text-2xl font-fredoka">Deep Dive: Plate Tectonics</h3>
          <p className="text-slate-300">Advanced Earth Science - Chapter 4</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {topics.map((t, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:shadow-md cursor-pointer transition-shadow">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl">{t.icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium truncate">{t.title}</h4>
              <p className="text-xs text-slate-400">{t.duration} • {t.views} views</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SkillsSection: React.FC = () => {
  const skills = [
    { title: 'Python Programming', level: 'Intermediate', color: 'bg-blue-500' },
    { title: 'Digital Marketing', level: 'Beginner', color: 'bg-pink-500' },
    { title: 'Graphic Design', level: 'Advanced', color: 'bg-purple-500' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {skills.map((s, i) => (
        <DashboardCard key={i} title={s.title} icon={<Briefcase size={20} />}>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.level}</span>
              <span className="text-2xl">🚀</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className={`${s.color} h-full w-2/3`} />
            </div>
            <button className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200">
              Continue Learning
            </button>
          </div>
        </DashboardCard>
      ))}
    </div>
  );
};

const NewsSection: React.FC = () => {
  const news = [
    { title: 'National Science Fair 2024 Winners Announced!', date: '2h ago', category: 'Achievements' },
    { title: 'New Astronomy Club starting this Friday', date: '5h ago', category: 'Clubs' },
    { title: 'Changes in Semester Examination patterns', date: '1d ago', category: 'Academics' },
  ];
  return (
    <div className="space-y-4">
      {news.map((item, i) => (
        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-indigo-300 transition-colors cursor-pointer group">
          <div className="flex justify-between items-start mb-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] uppercase font-bold rounded-lg tracking-widest">
              {item.category}
            </span>
            <span className="text-xs text-slate-400">{item.date}</span>
          </div>
          <h3 className="text-xl text-slate-800 group-hover:text-indigo-600 transition-colors uppercase font-fredoka">{item.title}</h3>
        </div>
      ))}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const { isReadAloudEnabled, setIsReadAloudEnabled, speak, stop } = useAccessibility();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (isReadAloudEnabled && !loading && user) {
      const headerText = `Welcome to your ${activeTab} view, ${profile?.name || 'Student'}.`;
      speak(headerText);
    } else {
      stop();
    }
  }, [activeTab, isReadAloudEnabled, loading, user, profile, speak, stop]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="text-5xl"
      >
        🎓
      </motion.div>
    </div>
  );

  if (!user) return <Login />;

  const renderTab = () => {
    switch(activeTab) {
      case 'dashboard': return <StudentDashboard />;
      case 'activities': return <Activities />;
      case 'lab': return <VirtualLab />;
      case 'resources': return <VisualResources />;
      case 'skills': return <SkillsSection />;
      case 'news': return <NewsSection />;
      case 'ebooks': return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {['Algebra I', 'Modern Biology', 'World History', 'Literature'].map(b => (
            <div key={b} className="aspect-[3/4] bg-white rounded-2xl border-2 border-slate-100 p-4 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform cursor-pointer">
              <div className="text-5xl mb-4">📚</div>
              <h4 className="font-medium">{b}</h4>
              <p className="text-xs text-slate-400 mt-2">Download PDF</p>
            </div>
          ))}
        </div>
      );
      case 'fun': return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="aspect-video bg-indigo-900 rounded-3xl flex flex-col items-center justify-center text-white p-8">
            <div className="text-6xl mb-4">🧩</div>
            <h3 className="text-2xl mb-2">Daily Puzzle</h3>
            <p className="text-indigo-200 mb-6 font-fredoka uppercase">Crack the code to earn a badge!</p>
            <button className="px-8 py-3 bg-indigo-600 rounded-xl font-bold">Play Now</button>
          </div>
          <div className="aspect-video bg-emerald-900 rounded-3xl flex flex-col items-center justify-center text-white p-8">
            <div className="text-6xl mb-4">🧠</div>
            <h3 className="text-2xl mb-2">Trivia Master</h3>
            <p className="text-emerald-200 mb-6 font-fredoka uppercase">10 questions from this weeks lessons</p>
            <button className="px-8 py-3 bg-emerald-600 rounded-xl font-bold">Start Quiz</button>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 ml-64 p-8 pb-32 min-h-screen relative">
        <header className="flex justify-between items-center mb-10 sticky top-0 bg-slate-50/90 backdrop-blur-md z-[60] pb-4 px-2">
          <div>
            <h1 className="text-4xl text-slate-800">
              <ReadAloudText text={`Welcome, ${profile?.name || 'Explorer'}!`} />
            </h1>
            <p className="text-slate-500">
              <ReadAloudText text={`Class: ${profile?.class || 'N/A'} | Roll No: ${profile?.rollNo || 'N/A'}`} />
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const newVal = !isReadAloudEnabled;
                setIsReadAloudEnabled(newVal);
                if (!newVal) stop();
              }}
              className={`p-3 rounded-2xl flex items-center gap-2 transition-all ${
                isReadAloudEnabled ? 'bg-amber-500 text-white shadow-lg scale-105' : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'
              }`}
            >
              <Volume2 size={20} className={isReadAloudEnabled ? 'animate-pulse' : ''} />
              <span className="font-medium">{isReadAloudEnabled ? 'Stop Reading' : 'Read Aloud'}</span>
            </button>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <User size={24} />
            </div>
          </div>
        </header>

        <StudyTimer />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>

        <Mascot />
      </main>
    </div>
  );
};

const StudyTimer: React.FC = () => {
  const [seconds, setSeconds] = useState(3600); // 60 mins
  const [isActive, setIsActive] = useState(false);
  const [showBreak, setShowBreak] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(s => s - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
      setShowBreak(true);
      window.speechSynthesis.speak(new SpeechSynthesisUtterance("Time for a 10 minute break! You've worked hard."));
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="absolute top-6 right-8 flex items-center gap-4 bg-white p-2 pl-4 rounded-2xl border border-slate-100 shadow-sm z-40">
      <div className="flex items-center gap-2 text-slate-600 font-mono text-lg">
        <Clock size={20} className="text-indigo-600" />
        {formatTime(seconds)}
      </div>
      <button 
        onClick={() => setIsActive(!isActive)}
        className={`px-4 py-2 rounded-xl text-white font-medium transition-all ${
          isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        {isActive ? 'Pause' : 'Study'}
      </button>

      <AnimatePresence>
        {showBreak && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-indigo-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-6"
          >
            <div className="bg-white rounded-[40px] p-12 text-center max-w-lg shadow-2xl">
              <div className="text-8xl mb-6">☕</div>
              <h2 className="text-4xl text-indigo-900 mb-4">Break Time!</h2>
              <p className="text-slate-600 mb-8 text-lg">You've completed 60 minutes of studying. Take 10 minutes to stretch, hydrate, and relax!</p>
              <button 
                onClick={() => { setShowBreak(false); setSeconds(3600); }}
                className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all"
              >
                I'm Ready to Resume
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <AppContent />
      </AccessibilityProvider>
    </AuthProvider>
  );
}
