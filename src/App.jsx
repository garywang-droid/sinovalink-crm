import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, Database, Plus, ChevronLeft, ChevronRight, AlertTriangle, 
  Activity, ShieldAlert, XCircle, CheckSquare, MessageCircle, ClipboardList, 
  Target, Crown, BellRing, Zap, Briefcase, TrendingUp, MapPin, MousePointer2,
  Bomb, Save, UserPlus, ListPlus, Flame, Star, ArrowUpCircle, MessageSquareDashed, 
  ExternalLink, Link, ArrowRight, LogOut, Send, Trash2, Archive, Download, SwitchCamera,
  Users, FileText, Printer, DownloadCloud, LayoutTemplate, ChevronDown, ChevronUp, Clock
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, arrayUnion } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

/** --- Firebase 核心配置 (严格遵循规则) --- */
const firebaseConfig = {
  apiKey: "AIzaSyBobE0USzMg0_0nK6h34OoOi1N159ZrDlw",
  authDomain: "sinovalink.firebaseapp.com",
  projectId: "sinovalink",
  storageBucket: "sinovalink.firebasestorage.app",
  messagingSenderId: "535670397178",
  appId: "1:535670397178:web:24caa2e735644621419143"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = 'sinovalink-crm';

/** --- 核心常量与字典 --- */
const INITIAL_USERS = { 'FD': '汪千皓', 'XJ': '汤学骏', 'TC': '唐晨', 'LE': '李乐', 'ST': '司徒', 'ZC': '梁卓超' };
const COUNTRIES = ["Germany", "Japan", "USA", "United Kingdom", "France", "Australia", "Canada", "Brazil", "India", "South Korea", "Italy", "Spain", "Netherlands", "Poland", "Mexico", "Turkey", "Saudi Arabia", "UAE", "Singapore", "Malaysia", "Thailand", "Vietnam", "Indonesia", "Other"];
const SILENT_REASONS = ['内容不匹配', '职位不对', '时机不对', '账号被屏蔽', '竞争对手介入', '企业无需求', '其他'];

// 时间限制辅助函数
const getTodayStr = () => new Date().toISOString().slice(0, 10);
const getMaxNextDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 5); // 最大不得超过5天
    return d.toISOString().slice(0, 10);
};
const validateNextDate = (dateStr) => {
    if (!dateStr) return false;
    const dateVal = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = (dateVal - today) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 5;
};

const isBomb = (nextActionDate) => {
  if (!nextActionDate) return false;
  const targetDate = new Date(nextActionDate);
  targetDate.setHours(0, 0, 0, 0);
  return Date.now() > (targetDate.getTime() + (36 * 60 * 60 * 1000));
};

const isInRange = (dateStr, range) => {
  if (!dateStr) return false;
  const d = new Date(dateStr); const now = new Date();
  const days = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
  if (range === 'WEEK') return days <= 7;
  if (range === 'MONTH') return days <= 30;
  return true;
};

const formatLogTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = n => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const downloadFile = (content, filename, type = 'text/plain') => {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** --- UI Primitives --- */
const InfoSection = ({ title, children }) => (<div className="mb-6"><h4 className="font-bold text-slate-800 border-l-4 border-blue-500 pl-3 mb-3 text-sm">{title}</h4>{children}</div>);
const InfoRow = ({ label, val }) => (<div className="flex justify-between py-1.5 border-b border-slate-100 text-xs"><span className="text-slate-500 shrink-0 mr-4">{label}</span><span className="font-bold text-slate-700 text-right break-words">{val}</span></div>);
const Checkbox = ({ label, checked, onChange }) => (<div onClick={() => onChange(!checked)} className="flex items-center gap-2 cursor-pointer select-none"><div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>{checked && <CheckSquare size={12} className="text-white"/>}</div><span className="text-xs font-bold text-slate-600">{label}</span></div>);
const FormInput = ({ label, placeholder, value, onChange, type='text', disabled=false, min, max }) => (<div><label className="text-xs font-bold text-slate-500 mb-1 block">{label}</label><input type={type} min={min} max={max} disabled={disabled} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm disabled:opacity-60" placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/></div>);
const FormTextArea = ({ label, placeholder, value, onChange, height='h-24' }) => (<div><label className="text-xs font-bold text-slate-500 mb-1 block">{label}</label><textarea className={`w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm resize-none ${height}`} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/></div>);
const NavBtn = ({ icon, label, active, onClick, highlight }) => (<button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${highlight && !active ? 'text-yellow-500' : ''}`}>{icon} <span className="font-bold text-sm">{label}</span></button>);
const LevelBadge = ({ level, isSilentArchived }) => {
  if (isSilentArchived) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-500 border border-slate-300">已沉默</span>;
  const colors = { 'S': 'text-red-600 border-red-200 bg-red-50', 'A': 'text-purple-600 border-purple-200 bg-purple-50', 'B': 'text-blue-600 border-blue-200 bg-blue-50', 'default': 'text-slate-500 border-slate-200 bg-slate-50' };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors[level] || colors.default}`}>{level} 级</span>;
};
const StatCard = ({ label, value, icon, highlight }) => (<div className={`p-5 rounded-xl border bg-white shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${highlight ? 'border-purple-200 ring-4 ring-purple-50' : 'border-slate-200'}`}><div className="flex justify-between items-start mb-2"><div className={`p-2 rounded-lg ${highlight ? 'bg-purple-50' : 'bg-slate-50'}`}>{icon}</div></div><div><div className="text-2xl font-extrabold text-slate-800 tracking-tight">{value}</div><div className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wide">{label}</div></div></div>);
const MedalMvpCard = ({ title, name, val, icon, gradient, border, text, accent }) => (<div className={`relative p-0.5 rounded-xl bg-gradient-to-br ${gradient} shadow-md group hover:-translate-y-1 transition-transform`}><div className={`relative h-full bg-slate-900/95 backdrop-blur-xl rounded-xl p-4 border ${border} flex items-center justify-between overflow-hidden`}><div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full ${accent} opacity-10 blur-2xl`}></div><div className="flex items-center gap-3 z-10"><div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center border border-white/10`}><div className="text-white drop-shadow-md">{icon}</div></div><div><div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</div><div className={`text-sm font-black ${text} truncate w-20`}>{name || 'N/A'}</div></div></div><div className={`text-2xl font-black ${text} font-mono z-10`}>{val}</div></div></div>);

/** --- 自定义弹窗 --- */
const CustomDialog = ({ config, onClose }) => {
  const [val, setVal] = useState('');
  useEffect(() => { if (config) setVal(config.defaultValue || ''); }, [config]);
  if (!config) return null;

  const handleConfirm = () => {
    config.onConfirm(val);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 zoom-in-95">
         <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">{config.title}</h3>
         {config.content && <p className="text-sm text-slate-600 mb-4 leading-relaxed">{config.content}</p>}
         {config.type === 'prompt' && (
           <input type="text" className="w-full p-3 border border-slate-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all text-sm font-bold" value={val} onChange={e=>setVal(e.target.value)} autoFocus placeholder="在此输入..." />
         )}
         {config.type === 'prompt-number' && (
           <input type="number" className="w-full p-3 border border-slate-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all text-sm font-mono font-bold" value={val} onChange={e=>setVal(e.target.value)} autoFocus placeholder="输入数值..." />
         )}
         <div className="flex gap-3 justify-end mt-2">
           <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">取消</button>
           <button onClick={handleConfirm} className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors shadow-sm ${config.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>确认执行</button>
         </div>
      </div>
    </div>
  );
};

/** --- Splash Screen --- */
const SplashScreen = ({ onFinish }) => {
  const [stage, setStage] = useState(0); const stageRef = useRef(0); const canvasRef = useRef(null);
  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 500); const t2 = setTimeout(() => setStage(2), 2500);
    const t3 = setTimeout(() => setStage(3), 4000); const t4 = setTimeout(() => setStage(4), 6500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);
  const handleEnter = () => { setStage(5); setTimeout(onFinish, 1000); };
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    let width = canvas.width = window.innerWidth; let height = canvas.height = window.innerHeight;
    const particles = []; const globeRadius = 200;
    for (let i = 0; i < 600; i++) {
      const theta = Math.random() * Math.PI * 2; const phi = Math.acos((Math.random() * 2) - 1);
      const tx = globeRadius * Math.sin(phi) * Math.cos(theta); const ty = globeRadius * Math.sin(phi) * Math.sin(theta); const tz = globeRadius * Math.cos(phi);
      const dist = Math.max(width, height) * 1.5; const angle = Math.random() * Math.PI * 2;
      particles.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, z: (Math.random() - 0.5) * 1000, sx: Math.cos(angle) * dist, sy: Math.sin(angle) * dist, sz: (Math.random() - 0.5) * 1000, tx, ty, tz, phase: 0, speed: 0.005 + Math.random() * 0.01, size: 1 + Math.random() * 1.5, color: i % 15 === 0 ? '#FBBF24' : '#3B82F6' });
    }
    let animId; let rotation = 0;
    const render = () => {
      ctx.fillStyle = 'rgba(2,6,23,0.3)'; ctx.fillRect(0, 0, width, height);
      const cx = width / 2; const cy = height / 2; rotation += 0.005; const cosRot = Math.cos(rotation); const sinRot = Math.sin(rotation);
      particles.forEach(p => {
        if (stageRef.current >= 2 && p.phase < 1) { p.phase += p.speed; if(p.phase > 1) p.phase = 1; const t = 1 - Math.pow(1 - p.phase, 3); p.x = p.sx + (p.tx - p.sx) * t; p.y = p.sy + (p.ty - p.sy) * t; p.z = p.sz + (p.tz - p.sz) * t; } 
        else if (stageRef.current < 2) { p.x = p.sx; p.y = p.sy; p.z = p.sz; }
        let x = p.x, y = p.y, z = p.z;
        if(p.phase > 0) { const tx = p.phase >= 1 ? p.tx : p.x; const ty = p.phase >= 1 ? p.ty : p.y; const tz = p.phase >= 1 ? p.tz : p.z; x = tx * cosRot - tz * sinRot; z = tx * sinRot + tz * cosRot; y = ty; }
        const scale = 500 / (500 + z); const x2d = x * scale + cx; const y2d = y * scale + cy;
        if (scale > 0) { ctx.beginPath(); ctx.arc(x2d, y2d, p.size * scale, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.globalAlpha = stageRef.current < 2 ? 0.3 : 1; ctx.fill(); ctx.globalAlpha = 1; }
      });
      if (stageRef.current === 5) ctx.clearRect(0, 0, width, height); else animId = requestAnimationFrame(render);
    };
    render(); const resize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize); return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return (
    <div className={`fixed inset-0 bg-slate-950 z-[9999] flex flex-col items-center justify-center transition-opacity duration-1000 ${stage === 5 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-slate-500 text-xl md:text-2xl tracking-[0.8em] italic transition-all duration-1000 ease-in-out w-full text-center" style={{ opacity: stage === 1 ? 1 : 0, transform: stage === 1 ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(1.1)', filter: stage === 1 ? 'blur(0px)' : 'blur(4px)' }}>凡事皆有概率……</div>
      <div className="relative z-10 text-center space-y-8 transition-all duration-1000 ease-out" style={{ opacity: stage >= 3 ? 1 : 0, transform: stage >= 3 ? 'translateY(0)' : 'translateY(20px)', filter: stage >= 3 ? 'blur(0px)' : 'blur(10px)' }}>
         <div className="space-y-4 px-4"><h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-400 to-amber-100 tracking-tight leading-relaxed drop-shadow-[0_0_30px_rgba(234,179,8,0.4)]">所谓偶然，都在规模中消散</h1><h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-400 to-amber-100 tracking-tight leading-relaxed drop-shadow-[0_0_30px_rgba(234,179,8,0.4)] delay-500">所谓必然，都在算法里靠岸</h1></div>
      </div>
      <div className="absolute bottom-20 z-20 transition-all duration-1000" style={{ opacity: stage >= 4 ? 1 : 0, transform: stage >= 4 ? 'translateY(0)' : 'translateY(20px)' }}>
        <button onClick={handleEnter} className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-full border border-slate-700 hover:border-blue-500/50 transition-colors backdrop-blur-sm"><div className="absolute inset-0 w-0 bg-blue-500/10 transition-all duration-[250ms] ease-out group-hover:w-full"></div><span className="relative text-slate-400 group-hover:text-blue-400 font-mono tracking-widest text-sm flex items-center gap-3"><MousePointer2 size={16} className="animate-pulse"/> CLICK TO INITIALIZE SYSTEM</span></button>
      </div>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
};

/** --- Login Screen --- */
const LoginScreen = ({ onLogin, savedUsers, onRegister }) => {
  const [isRegister, setIsRegister] = useState(false); const [role, setRole] = useState(''); const [pwd, setPwd] = useState(''); const [newName, setNewName] = useState(''); const [newCode, setNewCode] = useState(''); const [error, setError] = useState('');
  const handleLogin = () => { 
    if (role === 'FD' && pwd !== 'Sinovalink8252726') { 
      setError('高层验证码错误'); return; 
    } 
    onLogin({ role, name: savedUsers[role] || role }); 
  };
  const handleRegister = () => { if (!newName || !newCode) { setError('信息不全'); return; } if (newCode.length > 4 || savedUsers[newCode.toUpperCase()]) { setError('代号不可用或已存在'); return; } onRegister(newCode.toUpperCase(), newName); onLogin({ role: newCode.toUpperCase(), name: newName }); };
  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200/20 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500"></div>
        <div className="text-center mb-8"><div className="inline-flex p-4 bg-slate-950 rounded-2xl mb-4 shadow-xl border border-slate-800"><ShieldAlert className="text-blue-500" size={36}/></div><h1 className="text-3xl font-black text-slate-800 tracking-tight">粤新链·王者之师</h1><p className="text-xs text-slate-400 mt-2 font-mono tracking-widest">SINOVALINK-OS v16.0</p></div>{error && <div className="mb-6 bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl text-sm flex gap-2 items-center"><AlertTriangle size={18}/>{error}</div>}
        {!isRegister ? ( <div className="space-y-5"><div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">选择探员身份 / Select Identity</label><select className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-bold appearance-none cursor-pointer" value={role} onChange={e => {setRole(e.target.value); setError('');}}><option value="">-- 点击选择 --</option>{Object.entries(savedUsers).map(([k,v]) => <option key={k} value={k}>{k} - {v}</option>)}</select></div>{(role === 'FD') && (<input type="password" placeholder="输入高层权限密码..." className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none font-mono" value={pwd} onChange={e => setPwd(e.target.value)}/>)}<button onClick={handleLogin} disabled={!role} className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">进入指挥系统</button><div className="text-center pt-4"><button onClick={() => setIsRegister(true)} className="text-xs text-slate-400 hover:text-blue-600 font-bold transition-colors border-b border-transparent hover:border-blue-600">注册临时探员代号</button></div></div>
        ) : ( <div className="space-y-5"><h3 className="font-bold text-slate-800 border-b pb-3 flex items-center gap-2"><UserPlus size={18}/> 新探员登记</h3><input className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="真实姓名 (如: 张三)" value={newName} onChange={e => setNewName(e.target.value)}/><input className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono" placeholder="系统代号 (如: ZS, 最多4位)" maxLength={4} value={newCode} onChange={e => setNewCode(e.target.value)}/><button onClick={handleRegister} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-colors">确认注册并登入</button><button onClick={() => setIsRegister(false)} className="w-full text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors">取消注册 返回登录</button></div> )}
      </div>
    </div>
  );
};

/** --- ParticleCore --- */
const ParticleCore = ({ allLeads }) => {
  const canvasRef = useRef(null); const [logs, setLogs] = useState([]);
  
  useEffect(() => { 
    if (!allLeads || allLeads.length === 0) { 
      setLogs([{id: 'init', text: "系统初始化完成... 等待全球数据节点接入"}]); return; 
    } 
    const timer = setInterval(() => { 
      const randomLead = allLeads[Math.floor(Math.random() * allLeads.length)]; 
      if (randomLead) { 
        const actions = ["节点穿刺成功", "正在分析数据流", "正在同步画像", "AI 推荐策略生成", "检测到高频活动"]; 
        const action = actions[Math.floor(Math.random() * actions.length)]; 
        setLogs(prev => [{id: crypto.randomUUID(), text: `[${new Date().toLocaleTimeString()}] ${action} > ${randomLead.company?.substring(0,15) || 'Unknown Target'}...`}, ...prev].slice(0, 8)); 
      } 
    }, 1800); 
    return () => clearInterval(timer); 
  }, [allLeads]);

  useEffect(() => { 
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return; 
    let particles = []; let rot = 0; let animId; 
    const resize = () => { if (canvas.parentElement) { canvas.width = canvas.parentElement.offsetWidth; canvas.height = canvas.parentElement.offsetHeight; } }; 
    window.addEventListener('resize', resize); resize();
    
    const init = () => { 
      particles = []; 
      if (allLeads && allLeads.length > 0) { 
        allLeads.forEach(l => { 
          const h = (l.company||'A').split('').reduce((a,b)=>a+b.charCodeAt(0),0); 
          const r = 100 + (h%60); const a = (h%360)*(Math.PI/180); 
          particles.push({ x:0, y:0, bx:Math.cos(a)*r, by:Math.sin(a)*r*0.4, z:Math.sin(a)*r, c: l.level==='S'?'#EF4444':l.level==='A'?'#A855F7':'#3B82F6', s: l.level==='S'?3:2 }); 
        }); 
      } 
      for(let i=0; i<80; i++) { 
        const a = Math.random()*Math.PI*2; const r = 80+Math.random()*120; 
        particles.push({ x:0, y:0, bx:Math.cos(a)*r, by:Math.sin(a)*r*0.4, z:Math.sin(a)*r, c:'#334155', s:1, bg:true }); 
      } 
    };
    
    const draw = () => { 
      ctx.clearRect(0, 0, canvas.width, canvas.height); 
      const cx = canvas.width/2; const cy = canvas.height/2; 
      ctx.beginPath(); ctx.arc(cx,cy,45,0,Math.PI*2); ctx.fillStyle='#020617'; ctx.fill(); ctx.strokeStyle='rgba(59,130,246,0.3)'; ctx.lineWidth=1; ctx.stroke(); 
      particles.forEach(p => { 
        const cr = Math.cos(rot * (p.bg?0.4:1)); const sr = Math.sin(rot * (p.bg?0.4:1)); 
        const rx = p.bx*cr - p.z*sr; const rz = p.bx*sr + p.z*cr; 
        const sc = 300/(300+rz); const x = rx*sc + cx; const y = p.by*sc + cy; 
        if(sc>0) { ctx.globalAlpha = sc>1 ? 1 : sc*0.6; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x,y,p.s*sc,0,Math.PI*2); ctx.fill(); } 
      }); 
      rot += 0.003; animId = requestAnimationFrame(draw); 
    };
    init(); draw(); 
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId); }; 
  }, [allLeads]);

  return ( 
    <div className="relative bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col w-full h-56 rounded-2xl mb-6">
      <div className="h-8 bg-black/60 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center"><div className="w-2 h-2 bg-blue-500 rounded-full animate-ping mr-2"></div><h3 className="text-slate-200 font-bold text-xs tracking-widest">GLOBAL PIERCING NET</h3></div>
        <div className="text-[10px] text-green-400 font-mono tracking-widest flex items-center gap-1"><Activity size={10}/> LIVE</div>
      </div>
      <div className="flex-1 flex relative bg-slate-950">
        <div className="w-1/3 p-3 border-r border-slate-800/50 bg-gradient-to-r from-slate-900/80 to-transparent flex flex-col z-10">
          <h4 className="text-[10px] font-bold text-slate-500 mb-2 flex items-center gap-2 border-b border-slate-800/50 pb-1 uppercase tracking-wider"><Database size={10}/> System Data Streams</h4>
          <div className="flex-1 overflow-hidden font-mono text-[10px] space-y-1.5 opacity-90">
            {logs.map((log, i) => (<div key={log.id} className={`truncate p-0.5 rounded ${i===0 ? 'text-green-400 bg-green-900/10 border-l border-green-500 pl-1' : 'text-slate-500'}`}>{i===0?'> ':''} {log.text}</div>))}
          </div>
        </div>
        <div className="flex-1 relative flex items-center justify-center">
          <canvas ref={canvasRef} className="w-full h-full block" />
          <div className="absolute inset-0 pointer-events-none" style={{background: 'radial-gradient(circle at center, transparent 0%, #020617 100%)'}}></div>
        </div>
      </div>
    </div> 
  );
};

/** --- Views --- */
const DashboardView = ({ allLeads, myTodos, bombSquad, mvpStats, timeRange, setTimeRange, campaigns, silentCases, allProjects, onSelectTodo }) => {
  const projectStats = useMemo(() => {
    return allProjects.map(proj => {
      const ls = allLeads.filter(l => l.projectName === proj);
      const camps = campaigns.filter(c => c.projectName === proj);
      let totalD = 0, totalC = 0; let hasActiveNoD = false;
      camps.forEach(c => {
         (c.rounds || []).forEach(r => {
             totalD += r.contactCount || 0;
             totalC += Object.values(r.accountStats || {}).reduce((s, acc) => s + (acc.cCount || 0), 0);
             if (r.status === 'active' && !r.contactCount) hasActiveNoD = true;
         });
      });
      return { name: proj, totalD, totalC, b: ls.filter(l=>l.level==='B').length, a: ls.filter(l=>l.level==='A').length, s: ls.filter(l=>l.level==='S').length, rate: totalD > 0 ? ((totalC / totalD) * 100).toFixed(1) : '0.0', hasActiveNoD, hasCampaigns: camps.length > 0 };
    });
  }, [allLeads, campaigns, allProjects]);

  const activeRoundsCount = campaigns.reduce((sum, c) => sum + (c.rounds||[]).filter(r=>r.status==='active').length, 0);

  return (
    <div className="bg-slate-50 p-6 h-full overflow-y-auto font-sans text-slate-800 animate-in fade-in duration-300">
      <ParticleCore allLeads={allLeads} />
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="总线索数" value={allLeads.length} icon={<Database className="text-blue-600"/>} />
        <StatCard label="A级 核心池" value={allLeads.filter(l=>l.level==='A').length} icon={<Target className="text-purple-600"/>} highlight />
        <StatCard label="B级 发展池" value={allLeads.filter(l=>l.level==='B').length} icon={<Briefcase className="text-blue-500"/>} />
        <StatCard label="紧急待办" value={myTodos.length} icon={<BellRing className="text-red-600"/>} />
        <StatCard label="活跃战役数" value={activeRoundsCount} icon={<Zap className="text-green-500"/>} />
        <StatCard label="沉默案例库" value={silentCases.length} icon={<Archive className="text-orange-500"/>} />
      </div>

      {myTodos.length > 0 && (
        <div className="mb-6 bg-white border border-orange-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
            <h3 className="font-bold text-orange-800 flex items-center gap-2 text-sm">
              <BellRing size={16} className="text-orange-500"/> 
              今日跟进任务 ({myTodos.length} 项待处理)
            </h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto custom-scrollbar">
            {myTodos.map((todo, i) => {
              const isCamp = todo.type === 'STALE_CAMP';
              const id = isCamp ? todo.camp.dbId : todo.lead.dbId;
              const title = isCamp ? `[管道停滞] ${todo.camp.projectName}` : todo.lead.clientName;
              const subTitle = isCamp ? `目标国家: ${todo.camp.country}` : `@ ${todo.lead.company}`;
              const badge = isCamp ? null : <LevelBadge level={todo.lead.level}/>;
              const rightLabel = isCamp ? `停滞 ${todo.daysIdle} 天` : todo.lead.nextActionDate?.slice(0,10);
              
              return (
                <div key={id || i} 
                  onClick={() => onSelectTodo(todo)}
                  className="p-4 flex justify-between items-center hover:bg-orange-50/50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    {todo.type === 'BOMB' ? <Flame size={18} className="text-red-500 animate-pulse shrink-0"/> 
                      : todo.type === 'STALE_CAMP' ? <Clock size={18} className="text-red-500 shrink-0"/>
                      : <BellRing size={18} className="text-orange-500 shrink-0"/>}
                    <div>
                      <div className="font-bold text-slate-800 text-sm">
                        {title}
                        <span className="ml-2 text-xs font-normal text-slate-500">{subTitle}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        {badge}
                        <span className={isCamp ? 'text-red-600 font-bold' : ''}>{todo.msg}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs font-bold px-2 py-1 rounded ${
                      todo.type==='BOMB' || todo.type==='STALE_CAMP' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {rightLabel}
                    </span>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-orange-500 transition-colors"/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800 flex items-center gap-2"><MapPin size={18} className="text-blue-500"/> 战区纵深效能分析</h3></div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 text-xs uppercase tracking-wider"><tr><th className="px-4 py-3">项目域</th><th className="px-4 py-3 bg-slate-100 w-24 text-center border-l">D-Level (触达)</th><th className="px-4 py-3 bg-yellow-50 text-yellow-700 text-center border-x">C-Level (回关)</th><th className="px-4 py-3 text-blue-600 text-center">B-Level</th><th className="px-4 py-3 text-purple-600 text-center">A-Level</th><th className="px-4 py-3 text-red-600 text-center">S-Level</th><th className="px-4 py-3 text-right">综合回关率</th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {projectStats.map((p) => (
                  <tr key={p.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 bg-slate-50 text-center border-l">{!p.hasCampaigns ? '—' : p.hasActiveNoD ? <span className="text-orange-500 font-bold text-xs bg-orange-100 px-2 py-0.5 rounded">待录入</span> : <span className="font-mono text-slate-600 font-bold">{p.totalD}</span>}</td>
                    <td className="px-4 py-3 bg-yellow-50/50 text-center font-mono font-bold text-yellow-700 border-x">{p.totalC}</td>
                    <td className="px-4 py-3 font-bold text-blue-600 text-center">{p.b}</td><td className="px-4 py-3 font-bold text-purple-600 text-center">{p.a}</td><td className="px-4 py-3 font-bold text-red-600 text-center">{p.s}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">{p.rate}%</td>
                  </tr>
                ))}
                {projectStats.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-slate-400">暂无项目数据</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex bg-white rounded-xl border p-1 shadow-sm"><button onClick={()=>setTimeRange('WEEK')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${timeRange==='WEEK'?'bg-slate-900 text-white shadow':'text-slate-500 hover:bg-slate-100'}`}>本周榜单</button><button onClick={()=>setTimeRange('MONTH')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${timeRange==='MONTH'?'bg-slate-900 text-white shadow':'text-slate-500 hover:bg-slate-100'}`}>本月榜单</button></div>
          <div className="grid grid-cols-1 gap-3">
            <MedalMvpCard title="破冰先锋 (B级最多)" name={mvpStats.b.name} val={mvpStats.b.val} icon={<TrendingUp size={18} className="text-blue-100"/>} gradient="from-blue-500 to-blue-700" border="border-blue-400/30" text="text-white" accent="bg-blue-400" />
            <MedalMvpCard title="核心爆破手 (A级最多)" name={mvpStats.a.name} val={mvpStats.a.val} icon={<Target size={18} className="text-purple-100"/>} gradient="from-purple-500 to-purple-700" border="border-purple-400/30" text="text-white" accent="bg-purple-400" />
            <MedalMvpCard title="战略攻坚王 (S级最多)" name={mvpStats.s.name} val={mvpStats.s.val} icon={<Crown size={18} className="text-red-100"/>} gradient="from-red-500 to-red-700" border="border-red-400/30" text="text-white" accent="bg-red-400" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[140px]">
            <div className="p-3 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800"><div className="font-bold flex items-center gap-2 text-sm tracking-wide"><Bomb size={16} className="text-red-500"/> 拆弹组 (Bomb Squad)</div></div>
            <div className="divide-y divide-slate-100 overflow-y-auto flex-1 p-1">
              {bombSquad.map((u, idx) => (
                <div key={u.role} className={`p-2.5 rounded-lg flex justify-between items-center mb-1 transition-colors ${idx===0 && u.count>0 ? 'bg-red-50 border border-red-100' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2">{idx===0 && u.count>0 && <Flame size={16} className="text-red-500 animate-pulse"/>}<div className="font-bold text-xs text-slate-700">{u.name}</div></div>
                  <div className={`font-mono font-black text-sm px-2 py-0.5 rounded ${u.count>0 ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-50'}`}>{u.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PipelineView = ({ campaigns, allLeads, user, knownUsers, showToast, allProjects, FirebaseService, setDialogConfig }) => {
  const [filterProj, setFilterProj] = useState('ALL'); const [filterCountry, setFilterCountry] = useState('ALL');
  const [showNew, setShowNew] = useState(false); 
  const [expandedRoundId, setExpandedRoundId] = useState(null);
  const [actionModalData, setActionModalData] = useState(null);
  const [collapsedCamps, setCollapsedCamps] = useState({});
  
  const allCountries = useMemo(() => Array.from(new Set(campaigns.map(c=>c.country))), [campaigns]);
  
  const getCampLastUpdate = (c) => {
    let max = new Date(c.createdAt || 0).getTime();
    if (c.updatedAt) max = Math.max(max, new Date(c.updatedAt).getTime());
    (c.rounds || []).forEach(r => {
      if (r.createdAt) max = Math.max(max, new Date(r.createdAt).getTime());
      if (r.updatedAt) max = Math.max(max, new Date(r.updatedAt).getTime());
      if (r.companyFilledAt) max = Math.max(max, new Date(r.companyFilledAt).getTime());
      if (r.foundCompFilledAt) max = Math.max(max, new Date(r.foundCompFilledAt).getTime());
      if (r.contactFilledAt) max = Math.max(max, new Date(r.contactFilledAt).getTime());
      Object.values(r.accountStats || {}).forEach(st => {
        if (st.updatedAt) max = Math.max(max, new Date(st.updatedAt).getTime());
      });
    });
    return max;
  };

  const filtered = campaigns.filter(c => (filterProj==='ALL'||c.projectName===filterProj) && (filterCountry==='ALL'||c.country===filterCountry))
    .sort((a,b) => getCampLastUpdate(b) - getCampLastUpdate(a));

  const toggleCampCollapse = (campId) => {
    setCollapsedCamps(prev => ({ ...prev, [campId]: !prev[campId] }));
  };

  const NewCampSubjectModal = () => {
    const [f, setF] = useState({ proj: '', country: '' });
    const handleSave = async () => {
      try {
        if(!f.proj || !f.country) return showToast('请填写项目和国家');
        await FirebaseService.addCampaign({ 
            id: crypto.randomUUID(), projectName: f.proj, country: f.country, 
            createdAt: new Date().toISOString(), createdBy: user.role, rounds: [] 
        });
        showToast('战役主体已建立'); setShowNew(false);
      } catch (err) { showToast('创建失败，请检查权限。'); }
    };
    return (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"><div className="bg-white rounded-2xl w-96 p-6 shadow-2xl zoom-in-95"><h3 className="font-bold mb-5 text-lg flex items-center gap-2"><MapPin className="text-blue-500"/> 新建战区主体</h3><div className="space-y-4"><div><label className="text-xs font-bold text-slate-500 mb-1 block">关联项目 (Project)</label><input list="pipeline-projs" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:bg-white focus:border-blue-500 outline-none" value={f.proj} onChange={e=>setF({...f, proj:e.target.value})}/><datalist id="pipeline-projs">{allProjects.map(p=><option key={p} value={p}/>)}</datalist></div><div><label className="text-xs font-bold text-slate-500 mb-1 block">目标国家 (Country)</label><input list="pipeline-country" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:bg-white focus:border-blue-500 outline-none" value={f.country} onChange={e=>setF({...f, country:e.target.value})}/><datalist id="pipeline-country">{COUNTRIES.map(p=><option key={p} value={p}/>)}</datalist></div></div><div className="mt-8 flex gap-3"><button onClick={()=>setShowNew(false)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">取消</button><button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg transition-colors flex items-center justify-center gap-2"><Zap size={16}/> 创建主体</button></div></div></div>);
  };

  const ActionModal = ({ data, onClose }) => {
    const { type, camp, roundId } = data;
    const currentRound = camp.rounds.find(r => r.id === roundId);
    
    const [val, setVal] = useState(''); 
    const [acc, setAcc] = useState(''); const [op, setOp] = useState(user.role);

    useEffect(() => {
        if (!currentRound) return;
        if (type === 'FOUND_COMP' && currentRound.foundCompanyList) setVal(currentRound.foundCompanyList.join('\n'));
        else if (type === 'COMP' && currentRound.companyList) setVal(currentRound.companyList.join('\n'));
        else if (type === 'COMP' && currentRound.companyCount) setVal(currentRound.companyCount.toString());
        else if (type === 'FOUND_COMP' && currentRound.foundCompanyCount) setVal(currentRound.foundCompanyCount.toString());
        else if (type === 'CONT' && currentRound.contactCount) setVal(currentRound.contactCount.toString());
    }, [type, currentRound]);

    // 计算当前剩余可分配额度（总联系人数 - 其他账号已分配数量）
    const maxAllowed = currentRound?.contactCount || 0;
    let currentOtherAlloc = 0;
    Object.entries(currentRound?.accountStats || {}).forEach(([k, v]) => {
        if (k !== acc) currentOtherAlloc += (v.allocated || 0);
    });
    const remainingAlloc = Math.max(0, maxAllowed - currentOtherAlloc);

    const handleSave = async () => {
      // 提交前拦截：校验配额是否溢出
      if (type === 'ALLOC') {
          if (!acc || !val) { showToast('请完整填写账号和分配数量'); return; }
          if (parseInt(val) > remainingAlloc) {
              showToast(`⚠️ 超出上限！当前最多只能再分配 ${remainingAlloc} 个联系人`);
              return;
          }
      }

      try {
        const updatedRounds = camp.rounds.map(r => {
            if (r.id !== roundId) return r;
            if (type === 'ALLOC') {
                if(!acc || !val) return r;
                const stats = { ...r.accountStats, [acc]: { operator: op, allocated: parseInt(val), cCount: 0, updatedAt: new Date().toISOString(), updatedBy: user.role } };
                return { ...r, accountStats: stats };
            } else if (type === 'COMP' || type === 'FOUND_COMP') {
                let count = 0; let list = [];
                const strVal = val.trim();
                if (/^\d+$/.test(strVal)) {
                    count = parseInt(strVal);
                } else {
                    list = strVal.split('\n').map(s=>s.trim()).filter(Boolean);
                    count = list.length;
                }
                
                if (type === 'COMP') {
                    return { ...r, companyCount: count, companyList: list.length ? list : null, companyFilledAt: new Date().toISOString(), companyFilledBy: user.role };
                } else {
                    return { ...r, foundCompanyCount: count, foundCompanyList: list.length ? list : null, foundCompFilledAt: new Date().toISOString(), foundCompFilledBy: user.role };
                }
            } else {
                return { ...r, contactCount: val ? parseInt(val) : 0, contactFilledAt: new Date().toISOString(), contactFilledBy: user.role };
            }
        });
        await FirebaseService.updateCampaign(camp.dbId, { rounds: updatedRounds });
        showToast('已更新该轮次数据'); onClose();
      } catch (err) { showToast('保存失败'); }
    };
    
    const titleMap = { 'COMP': '录入目标企业', 'FOUND_COMP': '录入发现企业', 'CONT': '录入发掘联系人数', 'ALLOC': '分配执行账号配额' };
    const isListType = type === 'COMP' || type === 'FOUND_COMP';

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center animate-in fade-in">
        <div className="bg-white p-6 rounded-2xl w-80 md:w-96 shadow-2xl zoom-in-95">
          <h3 className="font-bold mb-5 flex items-center gap-2 text-slate-800"><Database size={18} className="text-blue-500"/> {titleMap[type]}</h3>
          {type === 'ALLOC' ? (
            <div className="space-y-4">
              <FormInput label="执行账号名 (如: Gary01)" value={acc} onChange={setAcc}/>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">绑定持有人</label><select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none" value={op} onChange={e=>setOp(e.target.value)}>{Object.entries(knownUsers).map(([k,v])=><option key={k} value={k}>{k} - {v}</option>)}</select></div>
              <FormInput type="number" label={`分配配额数量 (D) - 当前最多可分: ${remainingAlloc}`} value={val} onChange={setVal}/>
            </div>
          ) : isListType ? (
             <div>
               <label className="text-xs font-bold text-slate-500 mb-1 block">直接输入总数 或 粘贴企业名单(一行一个)</label>
               <textarea className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white h-40 resize-none text-sm leading-relaxed" placeholder="输入纯数字，或在此粘贴企业名单列表..." value={val} onChange={e=>setVal(e.target.value)}></textarea>
             </div>
          ) : ( <FormInput type="number" label="输入最终数值" value={val} onChange={setVal}/> )}
          
          <div className="mt-8 flex gap-3"><button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors">取消</button><button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-colors">确认保存</button></div>
        </div>
      </div>
    );
  };

  const handleStartRound = (camp) => {
    setDialogConfig({
        title: '启动新轮次',
        content: '请输入新轮次名称/备注（可选，如不填则默认按次序）:',
        type: 'prompt',
        onConfirm: async (roundName) => {
            try {
                const newRound = { 
                  id: crypto.randomUUID(), round: (camp.rounds || []).length + 1, 
                  roundName: roundName || '', status: 'active', 
                  createdAt: new Date().toISOString(), createdBy: user.role, accountStats: {} 
                };
                await FirebaseService.updateCampaign(camp.dbId, { rounds: [...(camp.rounds||[]), newRound] });
                showToast(`已开启新轮次`);
            } catch (e) { showToast('操作失败'); }
        }
    });
  };

  const updateRoundStatus = async (camp, roundId, status) => {
     try {
       const updatedRounds = camp.rounds.map(r => r.id === roundId ? { ...r, status } : r);
       await FirebaseService.updateCampaign(camp.dbId, { rounds: updatedRounds });
       showToast(`状态已更新为 ${status}`);
     } catch (e) { showToast('更新失败'); }
  };

  const deleteRound = (camp, roundId) => {
     setDialogConfig({
        title: '删除该轮次',
        content: '警告：此操作将永久删除该轮次及其所有数据。确定要删除吗？',
        type: 'confirm',
        danger: true,
        onConfirm: async () => {
             try {
               const updatedRounds = camp.rounds.filter(r => r.id !== roundId);
               await FirebaseService.updateCampaign(camp.dbId, { rounds: updatedRounds });
               showToast(`已删除该轮次`);
             } catch (e) { showToast('删除失败'); }
        }
     });
  };

  const handleQuickUpdateC = (camp, roundId, acc, currentVal) => {
      const currentRound = camp.rounds.find(r => r.id === roundId);
      const allocated = currentRound?.accountStats?.[acc]?.allocated || 0;
      const reached = currentRound?.accountStats?.[acc]?.reached || 0;

      setDialogConfig({
          title: `更新回关数`,
          content: `请输入执行账号 [${acc}] 的最新 C级 回关总数 (上限不能超过触达数: ${reached || allocated}):`,
          type: 'prompt-number',
          defaultValue: currentVal,
          onConfirm: async (val) => {
              if(val!==null && !isNaN(val) && val !== '') {
                  const numVal = parseInt(val);
                  if (numVal > allocated) {
                      showToast(`⚠️ 错误：回关数 (${numVal}) 绝不能大于分配配额数 (${allocated})`);
                      return;
                  }
                  if (reached > 0 && numVal > reached) {
                      showToast(`⚠️ 逻辑警告：回关数 (${numVal}) 不应大于已触达数 (${reached})`);
                      return;
                  }
                  try {
                     const updatedRounds = camp.rounds.map(r => {
                         if (r.id !== roundId) return r;
                         return { ...r, accountStats: { ...r.accountStats, [acc]: { ...r.accountStats[acc], cCount: numVal, updatedAt: new Date().toISOString(), updatedBy: user.role } } };
                     });
                     await FirebaseService.updateCampaign(camp.dbId, { rounds: updatedRounds });
                     showToast('回关数据已更新');
                  } catch(e) { showToast('更新失败'); }
              }
          }
      });
  };

  // 新增：触达量独立更新控制
  const handleQuickUpdateReached = (camp, roundId, acc, currentVal) => {
      const currentRound = camp.rounds.find(r => r.id === roundId);
      const allocated = currentRound?.accountStats?.[acc]?.allocated || 0;

      setDialogConfig({
          title: `更新触达量`,
          content: `请输入执行账号 [${acc}] 的最新已触达总数 (配额上限: ${allocated}):`,
          type: 'prompt-number',
          defaultValue: currentVal || 0,
          onConfirm: async (val) => {
              if(val!==null && !isNaN(val) && val !== '') {
                  const numVal = parseInt(val);
                  if (numVal > allocated) {
                      showToast(`⚠️ 错误：触达数 (${numVal}) 绝不能大于分配配额数 (${allocated})`);
                      return;
                  }
                  try {
                     const updatedRounds = camp.rounds.map(r => {
                         if (r.id !== roundId) return r;
                         return { ...r, accountStats: { ...r.accountStats, [acc]: { ...r.accountStats[acc], reached: numVal, updatedAt: new Date().toISOString(), updatedBy: user.role } } };
                     });
                     await FirebaseService.updateCampaign(camp.dbId, { rounds: updatedRounds });
                     showToast('触达进度已更新');
                  } catch(e) { showToast('更新失败'); }
              }
          }
      });
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3">
          <select className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:outline-blue-500 shadow-sm" value={filterProj} onChange={e=>setFilterProj(e.target.value)}><option value="ALL">所有项目域</option>{allProjects.map(p=><option key={p} value={p}>{p}</option>)}</select>
          <select className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:outline-blue-500 shadow-sm" value={filterCountry} onChange={e=>setFilterCountry(e.target.value)}><option value="ALL">所有目标国家</option>{allCountries.map(p=><option key={p} value={p}>{p}</option>)}</select>
        </div>
        {(user.role === 'FD' || user.role === 'TC') && <button onClick={()=>setShowNew(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold flex gap-2 items-center shadow-lg transition-colors"><Zap size={16}/> 建立战区主体</button>}
      </div>
      <div className="space-y-6">
        {filtered.length === 0 && <div className="text-center p-12 text-slate-400 font-bold flex flex-col items-center gap-4"><Database size={48} className="opacity-20"/> 暂无战役数据，请先建立主体</div>}
        {filtered.map(camp => {
          const safeRounds = camp.rounds || [];
          const isCollapsed = collapsedCamps[camp.dbId];
          const lastUpdateText = new Date(getCampLastUpdate(camp)).toLocaleString();

          return (
            <div key={camp.dbId} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-4">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleCampCollapse(camp.dbId)}>
                  <div className={`p-2 rounded-lg transition-colors ${isCollapsed ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                     {isCollapsed ? <ChevronRight size={20}/> : <ChevronDown size={20}/>}
                  </div>
                  <div>
                    <div className="font-black text-xl text-slate-800 flex items-center gap-3">
                       {camp.projectName} <span className="text-slate-300 font-normal">|</span> <span className="text-blue-600 flex items-center gap-1"><MapPin size={16}/> {camp.country}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-mono tracking-wide flex gap-4">
                       <span>SUBJ-ID: {camp.dbId.slice(0,8).toUpperCase()}</span>
                       <span className="flex items-center gap-1 text-slate-500"><Clock size={12}/> 活跃: {lastUpdateText}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                   {!isCollapsed && <button onClick={()=>handleStartRound(camp)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-2"><Plus size={16} className="text-blue-500"/> 启动新轮次</button>}
                </div>
              </div>
              
              {!isCollapsed && (
                <div className="divide-y divide-slate-100 bg-white animate-in slide-in-from-top-2">
                  {safeRounds.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">此战区暂无执行轮次</div>}
                  {safeRounds.map((round, idx) => {
                      const stats = Object.values(round.accountStats || {});
                      const totalAlloc = stats.reduce((sum, st) => sum + (st.allocated || 0), 0);
                      const totalReached = stats.reduce((sum, st) => sum + (st.reached || 0), 0); // 新增全量触达数计算
                      const totalC = stats.reduce((sum, st) => sum + (st.cCount || 0), 0);
                      
                      // 核心修复 5：加入时间阀门，只统计属于当前轮次期间诞生的 B 级线索
                      const roundStart = new Date(round.createdAt).getTime();
                      const nextRound = safeRounds.find(r => r.round === round.round + 1);
                      const roundEnd = nextRound ? new Date(nextRound.createdAt).getTime() : Date.now() + 31536000000;
                      
                      const bCount = allLeads.filter(l => 
                          l.projectName === camp.projectName && 
                          l.level === 'B' && 
                          new Date(l.createdAt).getTime() >= roundStart &&
                          new Date(l.createdAt).getTime() < roundEnd
                      ).length;
                      
                      const rate0 = round.companyCount ? ((round.foundCompanyCount || 0) / round.companyCount * 100).toFixed(0) : 0;
                      const rate1 = round.foundCompanyCount ? ((round.contactCount || 0) / round.foundCompanyCount * 100).toFixed(0) : 0;
                      const rate2 = round.contactCount ? (totalReached / round.contactCount * 100).toFixed(0) : 0; // 联系人 -> 触达的进度率
                      const rate3 = totalReached ? (totalC / totalReached * 100).toFixed(0) : 0; // 触达 -> 回关率
                      const rate4 = totalC ? (bCount / totalC * 100).toFixed(0) : 0;

                      return (
                        <div key={round.id} className="flex flex-col pb-4 mb-4 border-b border-slate-100 last:border-0">
                          <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 rounded-xl" onClick={()=>setExpandedRoundId(expandedRoundId===round.id?null:round.id)}>
                             <div className="flex items-center gap-2 md:gap-4 w-full flex-wrap md:flex-nowrap">
                                
                                {/* === 新增：轮次标识与自定义备注 === */}
                                <div className="w-20 md:w-28 shrink-0 flex flex-col justify-center border-r border-slate-200/50 pr-2 md:pr-4">
                                   <div className="flex items-center gap-2">
                                       <span className={`text-base md:text-xl font-black ${round.status==='active' ? 'text-blue-600' : 'text-slate-400'}`}>R{round.round}</span>
                                       {round.status==='active' ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span> : <span className="hidden md:inline-block text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-bold uppercase">{round.status}</span>}
                                   </div>
                                   {round.roundName && <div className="text-[10px] md:text-xs font-bold text-slate-600 mt-1.5 bg-blue-50/50 border border-blue-100/50 px-2 py-1 rounded line-clamp-2" title={round.roundName}>{round.roundName}</div>}
                                </div>

                                <div className="w-1/2 md:flex-1 px-2 flex flex-col justify-center border-r border-slate-200/50 relative group" onClick={(e)=>{e.stopPropagation(); setActionModalData({type:'COMP', camp, roundId: round.id});}}>
                                  <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide group-hover:text-blue-500 transition-colors">Target Comps {round.companyList && '📋'}</div>
                                  <div className={`text-2xl font-black transition-colors ${!round.companyCount ? 'text-orange-400' : 'text-slate-800 group-hover:text-blue-600'}`}>{round.companyCount || '待录入'}</div>
                                </div>
                                
                                <div className="hidden md:flex flex-col justify-center px-1 text-[10px] text-slate-400 font-mono items-center opacity-60"><ArrowRight size={12}/>{rate0}%</div>
                                
                                <div className="w-1/2 md:flex-1 px-2 flex flex-col justify-center border-r border-slate-200/50 relative group" onClick={(e)=>{e.stopPropagation(); setActionModalData({type:'FOUND_COMP', camp, roundId: round.id});}}>
                                  <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide group-hover:text-blue-500 transition-colors">Found Comps {round.foundCompanyList && '📋'}</div>
                                  <div className={`text-2xl font-black transition-colors ${!round.foundCompanyCount ? 'text-orange-400' : 'text-slate-800 group-hover:text-blue-600'}`}>{round.foundCompanyCount || '待录入'}</div>
                                </div>
                                
                                <div className="hidden md:flex flex-col justify-center px-1 text-[10px] text-slate-400 font-mono items-center opacity-60"><ArrowRight size={12}/>{rate1}%</div>
                                
                                <div className="w-1/3 md:flex-1 px-2 flex flex-col justify-center border-r border-slate-200/50 relative group" onClick={(e)=>{e.stopPropagation(); setActionModalData({type:'CONT', camp, roundId: round.id});}}>
                                  <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide group-hover:text-blue-500 transition-colors">Found Contacts</div>
                                  <div className={`text-2xl font-black transition-colors ${!round.contactCount ? 'text-orange-400' : 'text-slate-800 group-hover:text-blue-600'}`}>{round.contactCount || '待录入'}</div>
                                </div>
                                
                                <div className="hidden md:flex flex-col justify-center px-1 text-[10px] text-slate-400 font-mono items-center opacity-60"><ArrowRight size={12}/>{rate2}%</div>
                                
                                {/* 恢复版式：点击 Reached 直接打开账号分配与明细管理 */}
                                <div className="w-1/3 md:flex-1 px-2 flex flex-col justify-center border-r border-slate-200/50 relative group" onClick={(e)=>{e.stopPropagation(); setActionModalData({type:'ALLOC', camp, roundId: round.id});}}>
                                  <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide group-hover:text-blue-500 transition-colors">Reached 触达</div>
                                  <div className="text-2xl font-black text-blue-600">{totalReached}</div>
                                </div>

                                <div className="hidden md:flex flex-col justify-center px-1 text-[10px] text-slate-400 font-mono items-center opacity-60"><ArrowRight size={12}/>{rate3}%</div>
                                
                                <div className="w-1/3 md:flex-1 px-2 flex flex-col justify-center border-r border-slate-200/50">
                                  <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">C Level Reply</div>
                                  <div className="text-2xl font-black text-yellow-600">{totalC}</div>
                                </div>
                                
                                <div className="hidden md:flex flex-col justify-center px-1 text-[10px] text-slate-400 font-mono items-center opacity-60"><ArrowRight size={12}/>{rate4}%</div>
                                
                                <div className="w-1/3 md:flex-1 px-2 flex flex-col justify-center">
                                  <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">B Level Pool</div>
                                  <div className="text-2xl font-black text-blue-600">{bCount}</div>
                                </div>
                             </div>
                          </div>

                      {expandedRoundId === round.id && (
                        <div className="bg-white p-4 animate-in slide-in-from-top-2">
                          <table className="w-full text-left text-sm mb-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase font-bold">
                                <tr>
                                    <th className="p-3 pl-4">执行账号</th>
                                    <th className="p-3">负责人</th>
                                    <th className="p-3 text-right">配额(D)</th>
                                    <th className="p-3 text-right text-blue-600">已触达</th>
                                    <th className="p-3 text-right">回关(C)</th>
                                    <th className="p-3 text-center">双项进度操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {Object.entries(round.accountStats||{}).map(([acc, st]) => (
                                <tr key={acc} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-3 pl-4 font-bold text-slate-800 font-mono">{acc}</td>
                                  <td className="p-3 text-xs font-bold text-slate-600"><span className="bg-slate-100 px-2 py-1 rounded">{knownUsers[st.operator]||st.operator}</span></td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-600">{st.allocated}</td>
                                  <td className="p-3 text-right font-mono text-blue-600 font-black text-base">{st.reached || 0}</td>
                                  <td className="p-3 text-right font-mono text-yellow-600 font-black text-base">{st.cCount}</td>
                                  <td className="p-3 text-center">
                                     <div className="flex items-center justify-center gap-2">
                                         <button onClick={()=>handleQuickUpdateReached(camp, round.id, acc, st.reached)} className="text-[11px] font-bold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm">更触达</button>
                                         <button onClick={()=>handleQuickUpdateC(camp, round.id, acc, st.cCount)} className="text-[11px] font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm">更回关</button>
                                     </div>
                                  </td>
                                </tr>
                              ))}
                              {Object.keys(round.accountStats||{}).length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-400 font-bold">暂未分配任何执行账号</td></tr>}
                            </tbody>
                          </table>
                          
                          <div className="flex flex-wrap gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner">
                              <button onClick={()=>setActionModalData({type:'COMP', camp, roundId: round.id})} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm border ${!round.companyCount?'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200':'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'}`}>1. 目标企业 (名单)</button>
                              <button onClick={()=>setActionModalData({type:'FOUND_COMP', camp, roundId: round.id})} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm border ${!round.foundCompanyCount?'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200':'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'}`}>2. 发现企业 (名单)</button>
                              <button onClick={()=>setActionModalData({type:'CONT', camp, roundId: round.id})} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm border ${!round.contactCount?'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200':'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'}`}>3. 录入联系人数</button>
                              <button onClick={()=>setActionModalData({type:'ALLOC', camp, roundId: round.id})} className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-md flex items-center gap-2"><UserPlus size={14}/> 4. 账号派发 (D)</button>
                              
                              <div className="flex-1"></div>
                              
                              <div className="flex gap-2 border-l border-slate-200 pl-4 items-center">
                                {round.status !== 'completed' && <button onClick={()=>updateRoundStatus(camp, round.id, 'completed')} className="px-4 py-2 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600 shadow-sm">归档本轮</button>}
                                {round.status === 'active' && <button onClick={()=>updateRoundStatus(camp, round.id, 'paused')} className="px-4 py-2 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-yellow-50 hover:text-yellow-700 transition-colors text-slate-600 shadow-sm">暂停本轮</button>}
                                {round.status !== 'active' && <button onClick={()=>updateRoundStatus(camp, round.id, 'active')} className="px-4 py-2 text-xs font-bold rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors text-green-700 shadow-sm">重新激活</button>}
                                
                                {user.role === 'FD' && (
                                  <button onClick={()=>deleteRound(camp, round.id)} className="px-4 py-2 text-xs font-bold rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors text-red-600 shadow-sm ml-1 flex items-center gap-1">
                                    <Trash2 size={12}/> 删除本轮
                                  </button>
                                )}
                              </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          );
        })}
      </div>
      {showNew && <NewCampSubjectModal/>}
      {actionModalData && <ActionModal data={actionModalData} onClose={()=>setActionModalData(null)}/>}
    </div>
  );
};

const AccountsView = ({ campaigns, allLeads, knownUsers }) => {
  const [showHistory, setShowHistory] = useState({});
  const [exp, setExp] = useState(null);

  const accounts = useMemo(() => {
    const map = {};
    campaigns.forEach(c => {
      (c.rounds || []).forEach(round => {
          if(!round.accountStats) return;
          Object.entries(round.accountStats).forEach(([acc, st]) => {
            if(!map[acc]) map[acc] = { name: acc, op: st.operator, alloc: 0, cCount: 0, activeCamps: [], historyCamps: [] };
            map[acc].alloc += st.allocated||0; map[acc].cCount += st.cCount||0;
            const campData = { projectName: c.projectName, round: round.round, alloc: st.allocated, cCount: st.cCount, createdAt: round.createdAt };
            if (round.status === 'active') map[acc].activeCamps.push(campData);
            else map[acc].historyCamps.push(campData);
          });
      });
    });
    allLeads.forEach(l => {
      if(!l.account) return;
      if(!map[l.account]) map[l.account] = { name: l.account, op: l.tracker, alloc: 0, cCount: 0, activeCamps: [], historyCamps: [] };
      if(!map[l.account].yields) map[l.account].yields = {B:0,A:0,S:0};
      if(l.level==='B') map[l.account].yields.B++; if(l.level==='A') map[l.account].yields.A++; if(l.level==='S') map[l.account].yields.S++;
    });
    return Object.values(map).map(a => {
      a.activeCamps.sort((x,y)=>new Date(y.createdAt)-new Date(x.createdAt));
      a.historyCamps.sort((x,y)=>new Date(y.createdAt)-new Date(x.createdAt));
      
      const allCamps = [...a.activeCamps, ...a.historyCamps];
      const c1 = allCamps[0]; const c2 = allCamps[1];
      let status = 'gray';
      if (c1 && c2 && c1.alloc && c2.alloc) {
        const r1 = c1.cCount/c1.alloc; const r2 = c2.cCount/c2.alloc;
        if(r1 >= 0.4 && r2 >= 0.4) status = 'green';
        else if(r1 < 0.2 || r2 < 0.2) status = 'red';
        else if((r1 >= 0.2 && r1 < 0.4) || (r2 - r1 > 0.15)) status = 'yellow';
      } else if (c1 && c1.alloc) {
        const r1 = c1.cCount/c1.alloc; status = r1>=0.4?'green':r1<0.2?'red':'yellow';
      }
      return { ...a, status, rate: a.alloc ? (a.cCount/a.alloc)*100 : 0 };
    }).sort((x,y)=>y.alloc - x.alloc);
  }, [campaigns, allLeads]);

  const stats = { total: accounts.length, g: accounts.filter(a=>a.status==='green').length, y: accounts.filter(a=>a.status==='yellow').length, r: accounts.filter(a=>a.status==='red').length, totalA: accounts.reduce((s,a)=>s+a.alloc,0), totalC: accounts.reduce((s,a)=>s+a.cCount,0) };

  return (
    <div className="p-6 h-full bg-slate-50 overflow-y-auto animate-in fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="总纳管账号" value={stats.total} icon={<Database size={20} className="text-slate-600"/>}/>
        <StatCard label="全局平均回关率" value={stats.totalA ? (stats.totalC/stats.totalA*100).toFixed(1)+'%' : '-'} icon={<Activity size={20} className="text-blue-600"/>} highlight/>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200 flex flex-col justify-center items-center hover:shadow-md transition-shadow"><div className="text-3xl font-black text-green-600 font-mono">{stats.g}</div><div className="text-xs text-slate-500 font-bold mt-1 tracking-wider uppercase">健康 (≥40%)</div></div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-200 flex flex-col justify-center items-center hover:shadow-md transition-shadow"><div className="text-3xl font-black text-yellow-500 font-mono">{stats.y}</div><div className="text-xs text-slate-500 font-bold mt-1 tracking-wider uppercase">关注 (20-40%)</div></div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200 flex flex-col justify-center items-center hover:shadow-md transition-shadow"><div className="text-3xl font-black text-red-600 font-mono">{stats.r}</div><div className="text-xs text-slate-500 font-bold mt-1 tracking-wider uppercase">预警 (&lt;20%)</div></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {accounts.map(a => (
          <div key={a.name} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-blue-300 transition-colors flex flex-col">
            <div className="p-4 flex justify-between items-center bg-slate-50/50 cursor-pointer shrink-0" onClick={()=>setExp(exp===a.name?null:a.name)}>
              <div className="flex items-center gap-3">
                <div className="relative">
                   <div className={`w-3 h-3 rounded-full ${a.status==='green'?'bg-green-500':a.status==='yellow'?'bg-yellow-400':a.status==='red'?'bg-red-500':'bg-slate-300'} shadow-sm relative z-10`}></div>
                   {a.status==='red' && <div className="absolute inset-0 bg-red-500 rounded-full animate-ping z-0"></div>}
                </div>
                <div><div className="font-bold text-slate-800 font-mono text-sm">{a.name}</div><div className="text-[10px] text-slate-500 bg-slate-200/50 inline-block px-1.5 rounded mt-0.5">OP: {knownUsers[a.op]||a.op}</div></div>
              </div>
              <div className="text-right">
                <div className={`font-mono font-black text-xl ${a.status==='red'?'text-red-600':a.status==='green'?'text-green-600':'text-slate-700'}`}>{a.rate.toFixed(1)}%</div>
                <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Avg Rate</div>
              </div>
            </div>
            <div className="p-4 grid grid-cols-3 gap-2 text-center text-sm border-t border-b border-slate-100 bg-white shrink-0">
              <div><div className="text-[10px] text-slate-400 font-bold uppercase mb-1">参与轮次</div><div className="font-bold font-mono text-slate-700">{a.activeCamps.length + a.historyCamps.length}</div></div>
              <div className="border-l border-r border-slate-100"><div className="text-[10px] text-slate-400 font-bold uppercase mb-1">总分配(D)</div><div className="font-bold font-mono text-slate-700">{a.alloc}</div></div>
              <div><div className="text-[10px] text-slate-400 font-bold uppercase mb-1">总回关(C)</div><div className="font-bold font-mono text-yellow-600 text-lg">{a.cCount}</div></div>
            </div>
            {a.yields && <div className="p-2.5 bg-slate-50 flex justify-center gap-6 text-xs font-bold border-t border-slate-100 shrink-0"><span className="flex items-center gap-1 text-blue-600">B: <span className="font-mono bg-blue-100 px-1 rounded">{a.yields.B}</span></span><span className="flex items-center gap-1 text-purple-600">A: <span className="font-mono bg-purple-100 px-1 rounded">{a.yields.A}</span></span><span className="flex items-center gap-1 text-red-600">S: <span className="font-mono bg-red-100 px-1 rounded">{a.yields.S}</span></span></div>}
            
            {exp === a.name && (
              <div className="bg-slate-800 p-4 text-xs animate-in slide-in-from-top-2 text-slate-300 flex-1 flex flex-col">
                <div className="font-bold text-blue-400 mb-3 flex items-center gap-2"><Activity size={12}/> 当前执行中活跃战役 ({a.activeCamps.length})</div>
                <div className="space-y-1.5 mb-4">
                  {a.activeCamps.map((c,i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-blue-900/30 hover:bg-slate-900 transition-colors">
                        <span className="truncate w-32 font-bold text-slate-200" title={c.projectName}>{c.projectName} <span className="text-slate-500 font-normal ml-1">R{c.round}</span></span>
                        <span className="font-mono text-slate-400">{c.alloc} / <span className="text-yellow-500">{c.cCount}</span></span>
                        <span className={`font-mono font-bold w-12 text-right ${c.alloc?(((c.cCount/c.alloc)*100)>=40?'text-green-400':((c.cCount/c.alloc)*100)<20?'text-red-400':'text-yellow-400'):'text-slate-500'}`}>{c.alloc?((c.cCount/c.alloc)*100).toFixed(0):0}%</span>
                    </div>
                  ))}
                  {a.activeCamps.length === 0 && <div className="text-slate-500 italic p-2 text-center">暂无执行中战役</div>}
                </div>
                
                <div className="flex items-center justify-between mb-3 border-t border-slate-700/50 pt-3">
                    <div className="font-bold text-slate-500 flex items-center gap-2"><Archive size={12}/> 历史战役归档 ({a.historyCamps.length})</div>
                    {a.historyCamps.length > 0 && (
                        <button onClick={()=>setShowHistory(prev=>({...prev, [a.name]: !prev[a.name]}))} className="text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-700/50 px-2 py-1 rounded">
                            {showHistory[a.name] ? '收起历史' : '展开查看'}
                        </button>
                    )}
                </div>
                {showHistory[a.name] && a.historyCamps.length > 0 && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-1">
                      {a.historyCamps.map((c,i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-900/30 p-2 rounded border border-slate-700/30 hover:bg-slate-900/50 transition-colors opacity-80">
                            <span className="truncate w-32 font-bold text-slate-400" title={c.projectName}>{c.projectName} <span className="text-slate-600 font-normal ml-1">R{c.round}</span></span>
                            <span className="font-mono text-slate-500">{c.alloc} / <span className="text-yellow-700">{c.cCount}</span></span>
                            <span className={`font-mono font-bold w-12 text-right ${c.alloc?(((c.cCount/c.alloc)*100)>=40?'text-green-600':((c.cCount/c.alloc)*100)<20?'text-red-600':'text-yellow-600'):'text-slate-600'}`}>{c.alloc?((c.cCount/c.alloc)*100).toFixed(0):0}%</span>
                        </div>
                      ))}
                    </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const BuyersView = ({ allLeads, currentUser, knownUsers, FirebaseService, showToast, setDialogConfig }) => {
  const [filterC, setFilterC] = useState('ALL'); const [filterL, setFilterL] = useState('ALL'); const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null); const [chatLead, setChatLead] = useState(null);

  const companies = useMemo(() => {
    const map = {};
    const isDecision = (t) => /VP|Director|CEO|COO|CFO|CTO|Owner|Founder|President|Chief|Partner|Head of|总监|总经理|董事|合伙人/i.test(t || '');
    const isMid = (t) => /Manager|Supervisor|Lead|主管|经理|负责人/i.test(t || '') && !isDecision(t);
    
    // 核心修复 1：权重映射，避免不同级别录入先后顺序导致截断
    const lvlWeight = { 'S': 3, 'A': 2, 'B': 1, 'C': 0 };

    allLeads.forEach(l => {
      const cName = l.company || 'Unknown';
      if(!map[cName]) map[cName] = { name: cName, country: l.country||'Unknown', leads: [], maxLevel: 'C', levels: new Set() };
      map[cName].leads.push(l);
      
      const currentMaxWeight = lvlWeight[map[cName].maxLevel] || -1;
      const incomingWeight = lvlWeight[l.level] || -1;
      if (incomingWeight > currentMaxWeight) {
          map[cName].maxLevel = l.level;
      }

      if(isDecision(l.title)) map[cName].levels.add('Decision'); else if(isMid(l.title)) map[cName].levels.add('Mid'); else map[cName].levels.add('Exec');
    });
    
    return Object.values(map).map(c => {
      let lTag = '执行层'; if(c.levels.has('Decision')) lTag = '决策层'; else if(c.levels.has('Mid')) lTag = '中层';
      return { ...c, lTag };
    }).filter(c => (filterC==='ALL'||c.country===filterC) && (filterL==='ALL'||c.lTag===filterL) && (!search||c.name.toLowerCase().includes(search.toLowerCase()))).sort((a,b) => {
      const w = {S:3,A:2,B:1,C:0};
      if(w[a.maxLevel] !== w[b.maxLevel]) return w[b.maxLevel] - w[a.maxLevel];
      return b.leads.length - a.leads.length;
    });
  }, [allLeads, filterC, filterL, search]);

  const allCountries = useMemo(()=>Array.from(new Set(allLeads.map(l=>l.country||'Unknown'))).filter(Boolean), [allLeads]);

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden animate-in fade-in">
      <div className="w-[380px] border-r border-slate-200 bg-white flex flex-col h-full shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div className="p-5 border-b border-slate-100 space-y-4 bg-slate-50">
          <div className="relative">
             <input className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm font-bold text-slate-700" placeholder="搜索目标企业名称..." value={search} onChange={e=>setSearch(e.target.value)}/>
             <MousePointer2 size={16} className="absolute left-4 top-3.5 text-slate-400"/>
          </div>
          <div className="flex gap-3">
            <select className="flex-1 p-2.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" value={filterC} onChange={e=>setFilterC(e.target.value)}><option value="ALL">全部目标国家</option>{allCountries.map(c=><option key={c} value={c}>{c}</option>)}</select>
            <select className="flex-1 p-2.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" value={filterL} onChange={e=>setFilterL(e.target.value)}><option value="ALL">所有渗透层级</option><option value="决策层">决策层</option><option value="中层">中层</option><option value="执行层">执行层</option></select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {companies.map(c => (
            <div key={c.name} onClick={()=>setSelected(c)} className={`p-4 rounded-xl cursor-pointer transition-all border ${selected?.name===c.name?'bg-white border-blue-500 shadow-md ring-1 ring-blue-500':'bg-transparent border-transparent hover:bg-slate-100'}`}>
              <div className="flex justify-between items-start mb-2"><div className="font-black text-sm text-slate-800 line-clamp-1 flex-1 pr-3" title={c.name}>{c.name}</div><LevelBadge level={c.maxLevel}/></div>
              <div className="flex justify-between items-center text-xs text-slate-500 font-bold"><span className="flex items-center gap-1.5"><MapPin size={12} className="text-blue-500"/> {c.country} <span className="px-1.5 font-normal opacity-40">|</span> <span className="text-slate-700">{c.leads.length} 人</span></span><span className={`px-2 py-0.5 rounded ${c.lTag==='决策层'?'bg-purple-100 text-purple-700 border border-purple-200':c.lTag==='中层'?'bg-blue-100 text-blue-700 border border-blue-200':'bg-slate-100 text-slate-600 border border-slate-200'}`}>{c.lTag}</span></div>
            </div>
          ))}
          {companies.length === 0 && <div className="p-8 text-center text-slate-400 font-bold">没有匹配的企业数据</div>}
        </div>
      </div>
      <div className="flex-1 bg-slate-50/50 overflow-y-auto p-10 relative">
        {!selected ? <div className="h-full flex items-center justify-center text-slate-400 font-bold flex-col gap-6"><div className="p-8 bg-slate-100 rounded-full shadow-inner"><MapPin size={48} className="text-slate-300"/></div><div className="text-lg">请在左侧选择企业以查阅买家全景画像</div></div> : (
          <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">{selected.name}</h2>
                  <div className="flex flex-wrap gap-3 text-sm font-bold text-slate-600">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200"><MapPin size={16} className="text-blue-500"/> {selected.country}</span>
                    <span className="flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700">最高渗透: {selected.lTag}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                 <div><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">总追踪交互节点</div><div className="text-3xl font-black text-slate-800 font-mono">{selected.leads.reduce((s,l)=>s+((l.logs||[]).length),0)}</div></div>
                 <div><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">买家主动回复数</div><div className="text-3xl font-black text-slate-800 font-mono">{selected.leads.reduce((s,l)=>s+(l.logs||[]).filter(g=>g.actionType==='CLIENT_REPLY').length,0)}</div></div>
                 <div><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">触点最高战力级别</div><div className="text-3xl font-black text-red-600">{selected.maxLevel} 级</div></div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-200 font-black text-slate-800 flex justify-between items-center text-lg"><div className="flex items-center gap-3"><Users size={22} className="text-blue-600"/> 已建联触点网络 ({selected.leads.length})</div></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white text-xs text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100"><tr><th className="py-5 pl-8">买家姓名 / 核心职位</th><th className="py-5 text-center">线索级别</th><th className="py-5">负责探员 / 来源账号</th><th className="py-5 text-right pr-8">最后活跃时间</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                  {selected.leads.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).map(l => {
                    const isDecision = /VP|Director|CEO|COO|CFO|CTO|Owner|Founder|President|Chief|Partner|Head of|总监|总经理|董事|合伙人/i.test(l.title || '');
                    return (
                      <tr key={l.dbId} className="hover:bg-blue-50/40 cursor-pointer transition-colors group" onClick={()=>setChatLead(l)}>
                        <td className="py-5 pl-8">
                           <div className="font-black text-slate-800 flex items-center gap-2 text-base">{l.clientName} {isDecision && <Crown size={16} className="text-yellow-500 drop-shadow-sm"/>}</div>
                           <div className="text-xs font-bold text-slate-500 mt-1 line-clamp-1 max-w-[300px]" title={l.title}>{l.title || 'N/A'}</div>
                        </td>
                        <td className="py-5 text-center"><LevelBadge level={l.level} isSilentArchived={l.isSilentArchived} isDead={l.isDead}/></td>
                        <td className="py-5">
                           <div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">{knownUsers[l.tracker]?knownUsers[l.tracker][0]:l.tracker[0]}</div><span className="text-slate-800 font-bold text-sm">{knownUsers[l.tracker]||l.tracker}</span></div>
                           <div className="text-[10px] text-slate-500 font-mono mt-1.5 bg-slate-100 inline-block px-2 py-0.5 rounded border border-slate-200">{l.account || 'Unknown'}</div>
                        </td>
                        <td className="py-5 pr-8 text-right">
                           <div className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{new Date(l.updatedAt).toLocaleDateString()}</div>
                           <div className="text-[10px] text-slate-400 mt-1 font-mono tracking-wider">{formatLogTime(l.updatedAt).slice(11)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody></table>
              </div>
            </div>
          </div>
        )}
      </div>
      {chatLead && <ChatDetailModal lead={chatLead} currentUser={currentUser} knownUsers={knownUsers} FirebaseService={FirebaseService} onClose={()=>setChatLead(null)} showToast={showToast} setDialogConfig={setDialogConfig}/>}
    </div>
  );
};

// 极简三步走导出中心
const ExportView = ({ allLeads, campaigns, silentCases, showToast, knownUsers, onPrint }) => {
  const [scope, setScope] = useState('ALL');
  const [target, setTarget] = useState('');

  const allProjs = useMemo(() => Array.from(new Set([...allLeads.map(l=>l.projectName), ...campaigns.map(c=>c.projectName)])).filter(Boolean), [allLeads, campaigns]);
  const allCountries = useMemo(() => Array.from(new Set([...allLeads.map(l=>l.country), ...campaigns.map(c=>c.country)])).filter(Boolean), [allLeads, campaigns]);

  const filteredLeads = useMemo(() => {
    if(scope === 'ALL') return allLeads;
    if(scope === 'PROJECT' && target) return allLeads.filter(l => l.projectName === target);
    if(scope === 'COUNTRY' && target) return allLeads.filter(l => l.country === target);
    return [];
  }, [allLeads, scope, target]);

  const generateTXT = (leads, scopeName) => {
      let txt = `=== SINOVALINK 战略情报与复盘语料 ===\n`;
      txt += `生成时间：${new Date().toLocaleString()}\n`;
      txt += `导出范围：${scopeName}\n`;
      txt += `线索总数：${leads.length} 条\n\n`;

      txt += `[AI 分析指令]\n`;
      txt += `请作为资深B2B高管大客户直销专家，阅读以下线索的全部详情（包含客户背景、企业情报及完整的对话交互记录）。\n`;
      txt += `请针对每个客户，指出当前谈判/沟通的瓶颈，分析客户潜在异议，并提供针对性的下一步高跟进回复话术（需符合欧美商业习惯，专业且具洞察力）。\n\n`;
      txt += `====================================================\n\n`;

      leads.forEach((l, idx) => {
          txt += `【客户档案 #${idx + 1}】\n`;
          txt += `- 客户姓名：${l.clientName} (${l.title || '未知职位'})\n`;
          txt += `- 所属公司：${l.company}\n`;
          txt += `- 系统评级：${l.level} 级\n`;
          txt += `- 所在国家：${l.country} | 行业：${l.industry}\n`;
          txt += `- 负责探员：${knownUsers[l.tracker] || l.tracker} | 触达账号：${l.account}\n`;
          txt += `- 状态：${l.isDead ? '已战死' : l.isSilentArchived ? '已沉默' : '活跃追踪中'}\n`;
          txt += `- 下次跟进点：${l.nextActionDate?.slice(0, 10) || '未设定'}\n\n`;

          txt += `[买家核心画像]\n${l.personalIntro || '无'}\n\n`;
          txt += `[企业关键情报]\n${l.companyIntro || '无'}\n\n`;

          txt += `[完整交互记录 (${(l.logs||[]).length}条)]\n`;
          if ((l.logs||[]).length === 0) {
              txt += `(暂无交互记录)\n`;
          } else {
              (l.logs || []).forEach(log => {
                  const roleLabel = log.actionType === 'CLIENT_REPLY' ? '【客户回复】' : log.actionType === 'SYSTEM' ? '【系统记录】' : `【我方（${knownUsers[log.operator]||log.operator}）】`;
                  txt += `> ${formatLogTime(log.timestamp)} ${roleLabel}:\n  ${log.content}\n\n`;
              });
          }
          txt += `----------------------------------------------------\n\n`;
      });
      return txt;
  };

  const handleTXT = () => {
      if (filteredLeads.length === 0) return showToast("⚠️ 错误：当前选择范围无可用线索数据");
      const scopeName = scope === 'ALL' ? '全量数据' : target;
      const txt = generateTXT(filteredLeads, scopeName);
      downloadFile(txt, `SinovaLink_语料_${scopeName}_${new Date().toISOString().slice(0,10)}.txt`);
      showToast('✅ TXT 语料库已开始下载');
  };

  const handlePDF = () => {
      if (filteredLeads.length === 0) return showToast("⚠️ 错误：当前选择范围无可用线索数据");
      const scopeName = scope === 'ALL' ? '全量数据' : target;
      
      if (typeof onPrint === 'function') {
          onPrint(filteredLeads, scopeName);
      } else {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
              let html = `<html><head><title>SINOVALINK Report - ${scopeName}</title><style>body{font-family:sans-serif;padding:40px;color:#334155;} h1{color:#0f172a;} .lead{border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px;} .meta{font-size:12px;color:#64748b;margin-bottom:10px;} .logs-box{background:#f8fafc;padding:15px;border-radius:6px;font-size:13px;margin-top:15px;}</style></head><body>`;
              html += `<h1>SINOVALINK 战略情报报表</h1><p><strong>导出范围:</strong> ${scopeName} | <strong>总计线索:</strong> ${filteredLeads.length} 条 | <strong>生成时间:</strong> ${new Date().toLocaleString()}</p><hr style="margin-bottom:30px;"/>`;
              filteredLeads.forEach((l, i) => {
                  html += `<div class="lead"><h2 style="margin-top:0;">#${i+1} ${l.clientName} <span style="font-weight:normal;font-size:16px;color:#64748b;">(${l.title || 'N/A'}) @ ${l.company}</span></h2>`;
                  html += `<div class="meta"><strong>评级:</strong> ${l.level} | <strong>国家:</strong> ${l.country} | <strong>行业:</strong> ${l.industry} | <strong>探员:</strong> ${knownUsers[l.tracker] || l.tracker}</div>`;
                  html += `<div class="meta" style="margin-bottom:15px;"><strong>关联账号:</strong> ${l.account || 'N/A'} | <strong>状态:</strong> ${l.isDead ? '已战死' : l.isSilentArchived ? '已沉默' : '活跃追踪中'} | <strong>下次跟进:</strong> ${l.nextActionDate?.slice(0, 10) || '未设定'}</div>`;
                  
                  if(l.personalIntro) html += `<p><strong>买家画像:</strong><br/>${l.personalIntro.replace(/\n/g, '<br/>')}</p>`;
                  if(l.companyIntro) html += `<p><strong>企业情报:</strong><br/>${l.companyIntro.replace(/\n/g, '<br/>')}</p>`;
                  
                  html += `<h3 style="font-size:14px; margin-top:20px; margin-bottom:10px;">完整交互记录 (${(l.logs||[]).length}条)</h3>`;
                  if ((l.logs||[]).length === 0) {
                      html += `<p style="color:#94a3b8;font-size:12px;">(暂无交互记录)</p>`;
                  } else {
                      html += `<div class="logs-box">`;
                      (l.logs || []).forEach(log => {
                          const roleLabel = log.actionType === 'CLIENT_REPLY' ? '客户回复' : log.actionType === 'SYSTEM' ? '系统记录' : `我方 (${knownUsers[log.operator]||log.operator})`;
                          const color = log.actionType === 'CLIENT_REPLY' ? '#0f172a' : log.actionType === 'SYSTEM' ? '#64748b' : '#2563eb';
                          html += `<div style="margin-bottom:12px;"><strong style="color:${color};">${formatLogTime(log.timestamp)} [${roleLabel}]</strong><div style="margin-top:4px;white-space:pre-wrap;">${log.content}</div></div>`;
                      });
                      html += `</div>`;
                  }
                  
                  html += `</div>`;
              });
              html += `</body></html>`;
              printWindow.document.write(html);
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => { printWindow.print(); }, 500);
          } else {
              window.print();
          }
      }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50 animate-in fade-in p-6">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200 p-10">
        
        <div className="text-center mb-10 border-b border-slate-100 pb-8">
            <div className="inline-flex p-4 bg-blue-50 text-blue-600 rounded-full mb-4">
                <DownloadCloud size={32}/>
            </div>
            <h2 className="text-2xl font-black text-slate-800">数据情报导出中心</h2>
            <p className="text-slate-500 text-sm mt-2 font-bold">请按照提示步骤，快速获取大模型投喂语料或打印纸质会议档案</p>
        </div>

        <div className="space-y-8">
            {/* Step 1 */}
            <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="bg-slate-800 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span> 第一步：选择导出范围</h3>
                <div className="flex gap-3">
                    <button onClick={()=>{setScope('ALL'); setTarget('');}} className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${scope === 'ALL' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'}`}>🌍 全量数据</button>
                    <button onClick={()=>{setScope('COUNTRY'); setTarget('');}} className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${scope === 'COUNTRY' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'}`}>📍 按国家筛选</button>
                    <button onClick={()=>{setScope('PROJECT'); setTarget('');}} className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${scope === 'PROJECT' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'}`}>📁 按项目筛选</button>
                </div>
            </div>

            {/* Step 2 */}
            <div className={`transition-opacity duration-300 ${scope === 'ALL' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="bg-slate-800 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span> 第二步：指定具体目标</h3>
                <select value={target} onChange={e=>setTarget(e.target.value)} className="w-full p-4 border-2 border-slate-200 rounded-xl bg-slate-50 text-base font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors cursor-pointer appearance-none">
                    <option value="" disabled>-- 请点击展开选择 {scope === 'COUNTRY' ? '目标国家' : scope === 'PROJECT' ? '项目域' : ''} --</option>
                    {scope === 'COUNTRY' && allCountries.map(x=><option key={x} value={x}>{x}</option>)}
                    {scope === 'PROJECT' && allProjs.map(x=><option key={x} value={x}>{x}</option>)}
                </select>
            </div>

            {/* Step 3 */}
            <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="bg-slate-800 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">3</span> 第三步：选择格式并导出</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={handleTXT} className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors shadow-xl group">
                        <FileText size={32} className="text-blue-400 mb-3 group-hover:scale-110 transition-transform"/>
                        <span className="text-white font-black text-lg mb-1">下载 TXT 轻量语料</span>
                        <span className="text-slate-400 text-xs font-bold">内置指令 · 适配所有大模型</span>
                    </button>

                    <button onClick={handlePDF} className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-blue-600 bg-blue-600 hover:bg-blue-700 transition-colors shadow-xl group">
                        <LayoutTemplate size={32} className="text-blue-100 mb-3 group-hover:scale-110 transition-transform"/>
                        <span className="text-white font-black text-lg mb-1">下载 HTML 离线报表</span>
                        <span className="text-blue-200 text-xs font-bold">完美排版 · 支持保存为 PDF</span>
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};


/** --- Modals --- */
const NewEntryModal = ({ user, onClose, onSuccess, allProjects, accountOptions, FirebaseService, showToast }) => {
  const [form, setForm] = useState({ projectName: '', country: '', account: '', clientName: '', title: '', company: '', industry: '', personalIntro: '', companyIntro: '', firstReplyContent: '', ourReply: '', nextDate: '', warRoom: false });
  const handleSubmit = async () => { 
    try {
      if(!form.projectName || !form.country || !form.clientName || !form.firstReplyContent || !form.ourReply || !form.nextDate) { showToast("请填写所有带 * 号的必填项"); return; }
      
      if (!validateNextDate(form.nextDate)) {
          showToast("⚠️ 下次跟进时间最短为今天，最长不可超过5天");
          return;
      }

      const logs = [{ id: crypto.randomUUID(), timestamp: new Date().toISOString(), operator: 'Client', actionType: 'CLIENT_REPLY', content: form.firstReplyContent }, { id: crypto.randomUUID(), timestamp: new Date().toISOString(), operator: user.role, actionType: 'USER_REPLY', content: form.ourReply }, { id: crypto.randomUUID(), timestamp: new Date().toISOString(), operator: 'System', actionType: 'SYSTEM', content: 'B级线索建立并入库' }]; 
      const newLead = { id: `${form.projectName}-${user.role}-${Date.now().toString().slice(-4)}`, tracker: user.role, level: 'B', isDead: false, isSilentArchived: false, ...form, personalIntro: form.personalIntro || 'N/A', companyIntro: form.companyIntro || 'N/A', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), logs, nextActionDate: new Date(form.nextDate).toISOString(), addToWarRoom: form.warRoom }; 
      await FirebaseService.addLead(newLead); onSuccess(); 
    } catch (err) { showToast("入库失败，请检查网络或权限。"); }
  };
  return ( <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in"><div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl zoom-in-95"><div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-black text-xl flex items-center gap-3 text-slate-800"><div className="p-2 bg-blue-100 rounded-lg text-blue-600"><UserPlus size={20}/></div> 录入高价值线索 (B-Level Enrichment)</h3><button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><XCircle className="text-slate-400 hover:text-slate-600"/></button></div><div className="flex-1 overflow-y-auto p-8 space-y-8"><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div><label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">关联项目域 *</label><input list="projects" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700" placeholder="选择或输入" value={form.projectName} onChange={e=>setForm({...form, projectName: e.target.value})} /><datalist id="projects">{allProjects.map(p=><option key={p} value={p}/>)}</datalist></div><div><label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">目标国家 *</label><input list="countries" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700" placeholder="选择国家" value={form.country} onChange={e=>setForm({...form, country: e.target.value})} /><datalist id="countries">{COUNTRIES.map(p=><option key={p} value={p}/>)}</datalist></div><div><label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">来源平台账号</label><input list="accounts" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-mono" placeholder="e.g. Gary01" value={form.account} onChange={e=>setForm({...form, account: e.target.value})} /><datalist id="accounts">{accountOptions.map(p=><option key={p} value={p}/>)}</datalist></div><FormInput label="客户姓名 *" value={form.clientName} onChange={v=>setForm({...form,clientName:v})}/><FormInput label="核心职位" value={form.title} onChange={v=>setForm({...form,title:v})}/><FormInput label="所属公司" value={form.company} onChange={v=>setForm({...form,company:v})}/></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><FormInput label="所处行业" value={form.industry} onChange={v=>setForm({...form,industry:v})}/></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><FormTextArea label="买家画像 (Persona)" height="h-28" value={form.personalIntro} onChange={v=>setForm({...form,personalIntro:v})}/><FormTextArea label="企业情报 (Company Intel)" height="h-28" value={form.companyIntro} onChange={v=>setForm({...form,companyIntro:v})}/></div><div className="border-t border-slate-200 pt-8 space-y-6"><FormTextArea label="[客户] 破冰回复原文 (必填) *" height="h-28" placeholder="Paste client's exact reply here..." value={form.firstReplyContent} onChange={v=>setForm({...form,firstReplyContent:v})}/><FormTextArea label="[我方] 首次响应策略 (必填) *" height="h-28" placeholder="What did you reply to hook them?" value={form.ourReply} onChange={v=>setForm({...form,ourReply:v})}/></div><div className="bg-blue-50/50 p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-end border border-blue-100"><div className="flex-1 w-full"><FormInput type="date" min={getTodayStr()} max={getMaxNextDateStr()} label="设定下次跟进时间 (最多5天后) *" value={form.nextDate} onChange={v=>setForm({...form,nextDate:v})}/></div><div className="pb-4 w-full md:w-auto"><Checkbox label="标记高优并推入周一 War Room 讨论池" checked={form.warRoom} onChange={c=>setForm({...form,warRoom:c})}/></div></div></div><div className="p-6 border-t border-slate-100 bg-white"><button onClick={handleSubmit} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black hover:bg-blue-600 shadow-xl shadow-slate-900/20 transition-colors flex items-center justify-center gap-3 text-lg"><Plus size={20}/> 确认入库并生成追踪卡</button></div></div></div> );
};

const CUpdateModal = ({ currentUser, campaigns, knownUsers, onClose, showToast, FirebaseService }) => {
  const list = useMemo(() => {
    const res = [];
    campaigns.forEach(camp => {
      (camp.rounds || []).filter(r => r.status === 'active').forEach(round => {
        if (round.accountStats) {
          Object.entries(round.accountStats).forEach(([acc, st]) => {
            if (currentUser.role === 'FD' || st.operator === currentUser.role) res.push({ camp, round, acc, ...st });
          });
        }
      });
    });
    return res.sort((a,b)=>new Date(b.round.createdAt) - new Date(a.round.createdAt));
  }, [campaigns, currentUser]);

  const [updatesR, setUpdatesR] = useState({});
  const [updatesC, setUpdatesC] = useState({});

  const handleUpdate = async (campId, roundId, acc) => {
    try {
      const camp = campaigns.find(c => c.dbId === campId);
      if (!camp) return;

      const round = camp.rounds.find(r => r.id === roundId);
      const st = round?.accountStats?.[acc];
      const allocated = st?.allocated || 0;

      const rStr = updatesR[`${campId}_${roundId}_${acc}`];
      const cStr = updatesC[`${campId}_${roundId}_${acc}`];
      
      let newR = rStr !== undefined && rStr !== '' ? parseInt(rStr) : (st?.reached || 0);
      let newC = cStr !== undefined && cStr !== '' ? parseInt(cStr) : (st?.cCount || 0);

      // 严格防呆拦截逻辑
      if (newR > allocated) return showToast(`⚠️ 触达数 (${newR}) 绝不能大于该账号配额 (${allocated})`);
      if (newC > allocated) return showToast(`⚠️ 回关数 (${newC}) 绝不能大于该账号配额 (${allocated})`);
      if (newR > 0 && newC > newR) return showToast(`⚠️ 回关数 (${newC}) 逻辑上不应大于已触达数 (${newR})`);

      const updatedRounds = camp.rounds.map(r => {
          if (r.id !== roundId) return r;
          return { ...r, accountStats: { ...r.accountStats, [acc]: { ...r.accountStats[acc], reached: newR, cCount: newC, updatedAt: new Date().toISOString(), updatedBy: currentUser.role } } };
      });
      await FirebaseService.updateCampaign(camp.dbId, { rounds: updatedRounds });
      showToast(`已更新 [${acc}]`);
      setUpdatesR({...updatesR, [`${campId}_${roundId}_${acc}`]: ''});
      setUpdatesC({...updatesC, [`${campId}_${roundId}_${acc}`]: ''});
    } catch (err) { showToast(`保存失败`); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[85vh] zoom-in-95 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-xl flex items-center gap-3 text-slate-800"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ListPlus size={20}/></div> 执行进度速填 (触达/回关)</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><XCircle className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
          {list.length === 0 ? <div className="text-center p-12 text-slate-400 font-bold">当前无你负责的活跃战役账号</div> : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-500 uppercase text-xs sticky top-0 shadow-sm z-10 font-bold tracking-wider">
                  <tr><th className="p-4 pl-6">战役区 / 轮次</th><th className="p-4">执行账号</th><th className="p-4 text-center">配额 (D)</th><th className="p-4 text-center">已触达量</th><th className="p-4 text-center">回关数 (C)</th><th className="p-4 pr-6 text-center">填报最新进度 (触达 / 回关)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map(item => {
                    const uid = `${item.camp.dbId}_${item.round.id}_${item.acc}`;
                    return (
                      <tr key={uid} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-4 pl-6"><div className="font-bold text-slate-800 text-base">{item.camp.projectName}</div><div className="text-xs text-slate-500 mt-1"><span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold">R{item.round.round}</span> · {item.camp.country}</div></td>
                        <td className="p-4"><div className="font-mono text-slate-800 font-bold">{item.acc}</div> <div className="text-[10px] text-slate-400 font-sans mt-1">OP: {knownUsers[item.operator]||item.operator}</div></td>
                        <td className="p-4 text-center font-mono font-bold text-slate-600">{item.allocated}</td>
                        <td className="p-4 text-center font-mono font-black text-blue-600 text-lg">{item.reached || 0}</td>
                        <td className="p-4 text-center font-mono font-black text-yellow-600 text-lg">{item.cCount}</td>
                        <td className="p-4 pr-6">
                           <div className="flex items-center justify-end gap-2">
                             <input type="number" className="w-16 p-2 border border-blue-200 rounded-xl text-center text-sm focus:outline-blue-500 font-mono focus:ring-2 focus:ring-blue-500/20 bg-blue-50 focus:bg-white transition-all text-blue-700 font-bold" placeholder="触达" value={updatesR[uid]!==undefined ? updatesR[uid] : ''} onChange={e=>setUpdatesR({...updatesR, [uid]: e.target.value})}/>
                             <span className="text-slate-300 font-bold">/</span>
                             <input type="number" className="w-16 p-2 border border-slate-200 rounded-xl text-center text-sm focus:outline-yellow-500 font-mono focus:ring-2 focus:ring-yellow-500/20 bg-slate-50 focus:bg-white transition-all text-yellow-700 font-bold" placeholder="回关" value={updatesC[uid]!==undefined ? updatesC[uid] : ''} onChange={e=>setUpdatesC({...updatesC, [uid]: e.target.value})}/>
                             <button onClick={()=>handleUpdate(item.camp.dbId, item.round.id, item.acc)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors shadow-md ml-1">保存</button>
                           </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 重构完成版 Modal 1: 线索全景详情与双栏交互管控
const ChatDetailModal = ({ lead, currentUser, knownUsers, FirebaseService, onClose, showToast, setDialogConfig }) => {
    // 恢复双输入框设计状态
    const [clientContent, setClientContent] = useState('');
    const [userContent, setUserContent] = useState('');
    const [isClientFirst, setIsClientFirst] = useState(true); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 快捷元数据更新状态
    const [warRoom, setWarRoom] = useState(lead.addToWarRoom || false);
    const [nextDate, setNextDate] = useState(lead.nextActionDate?.slice(0,10) || '');
    const [silentReason, setSilentReason] = useState('');
    const [silentContext, setSilentContext] = useState('');

    const handleSaveMeta = async () => {
        if (!nextDate) {
            showToast('⚠️ 提醒：当前未设定下次跟进时间，请注意追踪闭环');
            return;
        }
        if (!validateNextDate(nextDate)) {
            showToast("⚠️ 下次跟进时间最短为今天，最长不可超过5天");
            return;
        }

        try {
            await FirebaseService.updateLead(lead.dbId, { addToWarRoom: warRoom, nextActionDate: nextDate ? new Date(nextDate).toISOString() : null, updatedAt: new Date().toISOString() });
            showToast('追踪设定已单独保存');
        } catch(e) { showToast('保存失败'); }
    };

    const handleAddDoubleLogs = async () => {
        if (!clientContent.trim() && !userContent.trim()) return;

        // 核心修复：强制工作流循环，必须带引爆点
        if (!nextDate) {
            showToast('⚠️ 提醒：请先设置下次跟进时间，保持追踪循环闭环');
            return;
        }
        if (!validateNextDate(nextDate)) {
            showToast("⚠️ 错误：下次跟进时间最短为今天，最长不得超过未来的5天");
            return;
        }

        setIsSubmitting(true);
        try {
            const newLogs = [];
            const timeA = new Date().toISOString();
            const timeB = new Date(Date.now() + 1000).toISOString(); 
            
            if (isClientFirst) {
               if(clientContent.trim()) newLogs.push({ id: crypto.randomUUID(), timestamp: timeA, operator: 'Client', actionType: 'CLIENT_REPLY', content: clientContent });
               if(userContent.trim()) newLogs.push({ id: crypto.randomUUID(), timestamp: timeB, operator: currentUser.role, actionType: 'USER_REPLY', content: userContent });
            } else {
               if(userContent.trim()) newLogs.push({ id: crypto.randomUUID(), timestamp: timeA, operator: currentUser.role, actionType: 'USER_REPLY', content: userContent });
               if(clientContent.trim()) newLogs.push({ id: crypto.randomUUID(), timestamp: timeB, operator: 'Client', actionType: 'CLIENT_REPLY', content: clientContent });
            }
            
            // 核心修复 2：使用 arrayUnion 实现服务端原子化追加，避免并发日志丢失
            await FirebaseService.updateLead(lead.dbId, { 
                logs: arrayUnion(...newLogs), 
                updatedAt: new Date().toISOString(),
                nextActionDate: new Date(nextDate).toISOString(),
                addToWarRoom: warRoom
            });
            setClientContent(''); setUserContent(''); showToast('最新交互已录入，引爆点已设定');
        } catch (e) { showToast('添加失败'); } finally { setIsSubmitting(false); }
    };

    const handleAction = (actionStr) => {
        if (actionStr === 'UPGRADE_A' || actionStr === 'UPGRADE_S') {
            setDialogConfig({
                title: '线索升级',
                content: '请输入升级关键原因或推进策略(必填):',
                type: 'prompt',
                onConfirm: async (reason) => {
                    if(!reason) { showToast('需填写原因方可升级'); return; }
                    const targetLvl = actionStr.split('_')[1];
                    const sysMsg = `线索已破冰升级为 ${targetLvl} 级。策略备注: ${reason}`;
                    
                    // 核心修复 4：操作人使用真实的探员，类型回调为 UPGRADE，激活 MVP 榜单
                    const newLog = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), operator: currentUser.role, actionType: 'UPGRADE', content: sysMsg };
                    
                    try {
                        await FirebaseService.updateLead(lead.dbId, {
                            level: targetLvl, 
                            updatedAt: new Date().toISOString(),
                            logs: arrayUnion(newLog)
                        });
                        showToast('状态流转成功'); onClose();
                    } catch(e) { showToast('操作失败'); }
                }
            });
            return;
        }

        if (actionStr === 'SILENT_ARCHIVE') {
            if(!silentReason) { showToast("请选择归档原因"); return; }
            const execArchive = async () => {
                const sysMsg = `已被彻底沉默归档 (原因: ${silentReason}，备注: ${silentContext||'无'})`;
                const newLog = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), operator: currentUser.role, actionType: 'SYSTEM', content: sysMsg };
                
                try {
                    await FirebaseService.addSilentCase({
                       ...lead, isSilentArchived: true, silentReason, silentContext, archivedAt: new Date().toISOString(), archivedBy: currentUser.role
                    });
                    await FirebaseService.updateLead(lead.dbId, {
                        isSilentArchived: true, silentReason, updatedAt: new Date().toISOString(),
                        logs: arrayUnion(newLog)
                    });
                    showToast('已移入沉默库终止追踪'); onClose();
                } catch(e) { showToast('操作失败'); }
            };
            execArchive();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-[1400px] h-[90vh] flex overflow-hidden shadow-2xl zoom-in-95">
                
                {/* 左侧：情报与管控区（优化收缩宽度） */}
                <div className="w-[300px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 relative z-10">
                    <div className="p-6 border-b border-slate-200 bg-white">
                        <div className="flex items-start justify-between mb-3">
                            <h2 className="text-xl font-black text-slate-800 leading-tight pr-2 break-all">{lead.clientName}</h2>
                            <LevelBadge level={lead.level} isDead={lead.isDead} isSilentArchived={lead.isSilentArchived}/>
                        </div>
                        <div className="text-xs font-bold text-slate-500 mb-4">{lead.title} @ <span className="text-slate-800">{lead.company}</span></div>
                        <div className="flex flex-wrap gap-2"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-bold border border-blue-100">{lead.country}</span><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-200">{lead.industry||'未指明行业'}</span></div>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        <InfoSection title="线索追踪元数据">
                            <InfoRow label="所属战区" val={lead.projectName} />
                            <InfoRow label="执行探员" val={knownUsers[lead.tracker]||lead.tracker} />
                            <InfoRow label="触达账号" val={<span className="font-mono bg-slate-200 px-1 rounded">{lead.account||'N/A'}</span>} />
                            <InfoRow label="入库时间" val={new Date(lead.createdAt).toLocaleDateString()} />
                        </InfoSection>

                        <InfoSection title="买家核心画像 (Persona)">
                            <div className="text-xs text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-200 whitespace-pre-wrap break-all">{lead.personalIntro}</div>
                        </InfoSection>
                        <InfoSection title="企业关键情报 (Company Intel)">
                            <div className="text-xs text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-200 whitespace-pre-wrap break-all">{lead.companyIntro}</div>
                        </InfoSection>
                    </div>
                    
                    {/* 左侧底部：状态流转与 FD 专属沉默操作 */}
                    {(!lead.isDead && !lead.isSilentArchived && (currentUser.role === lead.tracker || currentUser.role === 'FD')) && (
                        <div className="bg-white border-t border-slate-200 shrink-0 flex flex-col">
                            <div className="p-4 space-y-3">
                                <div className="flex gap-2">
                                    {lead.level === 'B' && <button onClick={()=>handleAction('UPGRADE_A')} className="flex-1 py-2.5 bg-purple-50 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 hover:bg-purple-100 transition-colors shadow-sm">升级突围 (A)</button>}
                                    {lead.level !== 'S' && <button onClick={()=>handleAction('UPGRADE_S')} className="flex-1 py-2.5 bg-red-50 text-red-700 font-bold text-xs rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-sm">核心攻坚 (S)</button>}
                                </div>
                            </div>
                            
                            {/* 只有 FD 才能操作彻底沉默，解除了限制锁 */}
                            {currentUser.role === 'FD' && (
                                <div className="p-4 bg-orange-50 border-t border-orange-100">
                                    <h5 className="text-[10px] font-black text-orange-600 mb-2.5 uppercase flex items-center gap-1.5"><Archive size={12}/> FD 专属：线索沉默归档处理</h5>
                                    <select value={silentReason} onChange={e=>setSilentReason(e.target.value)} className="w-full p-2 text-xs font-bold text-slate-700 border border-orange-200 rounded-lg bg-white mb-2 focus:outline-none">
                                        <option value="">-- 选择彻底沉默原因 --</option>
                                        {SILENT_REASONS.map(r=><option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <input type="text" placeholder="结案备注 / 是否可复用至其他项目?" value={silentContext} onChange={e=>setSilentContext(e.target.value)} className="w-full p-2 text-xs border border-orange-200 rounded-lg bg-white mb-3 focus:outline-none"/>
                                    <button onClick={()=>handleAction('SILENT_ARCHIVE')} className="w-full py-2 bg-orange-500 text-white font-bold text-xs rounded-lg hover:bg-orange-600 shadow-sm transition-colors">标记沉默并移入案例库</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* 右侧：聊天记录与双输入框工作流 */}
                <div className="flex-1 flex flex-col bg-slate-50 relative z-0">
                    <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 shadow-sm z-10">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><Activity size={20} className="text-blue-500"/> 战术交互复盘 (总计 {(lead.logs||[]).length} 条记录)</h3>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><XCircle size={24}/></button>
                    </div>
                    
                    {/* 横向铺开的快捷追踪设置栏，紧贴聊天区域顶部 */}
                    {(!lead.isDead && !lead.isSilentArchived && (currentUser.role === lead.tracker || currentUser.role === 'FD')) && (
                        <div className="bg-blue-50/50 border-b border-blue-100 p-3 px-6 flex justify-between items-center shrink-0 z-0">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5"><BellRing size={14}/> 设定下次跟进引爆点:</span>
                                    <input type="date" min={getTodayStr()} max={getMaxNextDateStr()} className={`text-xs font-bold p-1.5 border rounded-md focus:outline-none transition-colors text-slate-700 ${!nextDate || !validateNextDate(nextDate) ? 'border-orange-400 ring-2 ring-orange-300 bg-orange-50' : 'border-blue-200 bg-white'}`} value={nextDate} onChange={e=>setNextDate(e.target.value)}/>
                                </div>
                                <div className="h-4 w-px bg-blue-200"></div>
                                <Checkbox label="高优推入周一 War Room 讨论池" checked={warRoom} onChange={setWarRoom}/>
                            </div>
                            <button onClick={handleSaveMeta} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">保存追踪设定</button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {(lead.logs || []).map(log => {
                            const isClient = log.actionType === 'CLIENT_REPLY';
                            const isSys = log.actionType === 'SYSTEM' || log.actionType === 'UPGRADE';
                            return (
                                <div key={log.id} className={`flex ${isSys ? 'justify-center' : isClient ? 'justify-start' : 'justify-end'}`}>
                                    {isSys ? (
                                        <div className="bg-slate-200/80 text-slate-600 text-xs px-5 py-2 rounded-full font-bold shadow-sm border border-slate-300 break-all whitespace-pre-wrap max-w-[80%] text-center">{log.content}</div>
                                    ) : (
                                        <div className={`max-w-[80%] rounded-2xl p-5 shadow-sm border ${isClient ? 'bg-white border-slate-200 rounded-tl-none' : 'bg-blue-600 text-white border-blue-700 rounded-tr-none'}`}>
                                            <div className={`text-xs font-bold mb-3 flex items-center gap-2 ${isClient?'text-slate-400':'text-blue-200'}`}>
                                                <span>{log.operator === 'Client' ? lead.clientName : (knownUsers[log.operator]||log.operator)}</span>
                                                <span className="font-mono opacity-70 tracking-wider text-[10px]">{formatLogTime(log.timestamp)}</span>
                                            </div>
                                            <div className={`text-sm whitespace-pre-wrap break-all leading-relaxed ${isClient?'text-slate-700':'text-white'}`}>{log.content}</div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    
                    {/* 双输入框并行交互录入区 */}
                    {(!lead.isDead && !lead.isSilentArchived && (currentUser.role === lead.tracker || currentUser.role === 'FD')) && (
                        <div className="p-6 bg-white border-t border-slate-200 shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-bold text-slate-800 flex items-center gap-2"><Send size={16} className="text-blue-500"/> 并行交互录入流</span>
                                <button onClick={()=>setIsClientFirst(!isClientFirst)} className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 border border-slate-200"><SwitchCamera size={14}/> 调整发言次序 (当前: {isClientFirst?'客户在先':'我方在先'})</button>
                            </div>
                            <div className={`flex gap-4 ${isClientFirst ? 'flex-col md:flex-row' : 'flex-col md:flex-row-reverse'}`}>
                                <textarea value={clientContent} onChange={e=>setClientContent(e.target.value)} placeholder="[客户方] 原文粘贴..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none h-24"/>
                                <textarea value={userContent} onChange={e=>setUserContent(e.target.value)} placeholder="[我方] 推进策略回复..." className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none h-24 placeholder-blue-300"/>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button onClick={handleAddDoubleLogs} disabled={isSubmitting||(!clientContent.trim() && !userContent.trim())} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2">合并录入生成流</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// War Room 批示 Modal
const WarRoomModal = ({ lead, currentUser, FirebaseService, onClose, showToast }) => {
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!note.trim()) return;
        setIsSubmitting(true);
        try {
            const newLog = {
                id: crypto.randomUUID(), timestamp: new Date().toISOString(),
                operator: currentUser.role, actionType: 'SYSTEM', 
                content: `[WarRoom 批示] ${note}`
            };
            // 核心修复 2：应用 arrayUnion
            await FirebaseService.updateLead(lead.dbId, { 
                logs: arrayUnion(newLog), 
                addToWarRoom: false, 
                updatedAt: new Date().toISOString() 
            });
            showToast('批示已下达，目标移出讨论池');
            onClose(); 
        } catch (e) { showToast('下达批示失败'); } finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl zoom-in-95 overflow-hidden border border-red-100">
                <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-center border-b-4 border-red-500">
                    <h3 className="font-bold flex items-center gap-2 text-lg tracking-wider"><Flame size={20} className="text-red-500"/> War Room 战略决议批示</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><XCircle size={24}/></button>
                </div>
                <div className="p-8 bg-slate-50">
                    <div className="mb-5 text-sm bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        针对目标: <span className="font-black text-slate-800 text-base">{lead.clientName}</span> @ <span className="font-bold">{lead.company}</span>
                    </div>
                    <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="输入本周决议：给负责人的跟进指导、放弃建议或战略支撑点..." className="w-full h-40 p-4 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 text-sm resize-none mb-6 shadow-inner leading-relaxed"/>
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors">取消</button>
                        <button onClick={handleSubmit} disabled={isSubmitting||!note.trim()} className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg shadow-red-500/30">下达批示并结项</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


/** --- Main Application (Entry Point & State Wiring) --- */
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState(null); 
  const [authUser, setAuthUser] = useState(null); 
  
  const [view, setView] = useState('DASHBOARD');
  const [timeRange, setTimeRange] = useState('WEEK');
  
  const [rawLeads, setRawLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [silentCases, setSilentCases] = useState([]);
  
  const [page, setPage] = useState(1);
  const [modalType, setModalType] = useState('NONE');
  const [selectedLead, setSelectedLead] = useState(null);
  const [warRoomLead, setWarRoomLead] = useState(null); 
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  
  const [knownUsers, setKnownUsers] = useState(INITIAL_USERS); 
  const [toastMsg, setToastMsg] = useState('');
  const [dialogConfig, setDialogConfig] = useState(null); 

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

  /** --- Firebase Logic Rules Implementation --- */
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => { 
      try {
        await signInAnonymously(auth);
          try { await signInWithCustomToken(auth, __initial_auth_token); } 
          catch (e) { await signInAnonymously(auth); }
        } else {
          await signInAnonymously(auth); 
        }
        if (isMounted) setIsAuthReady(true);
      } catch (err) { console.error("Firebase auth err:", err); }
    };
    initAuth(); 
    const unsubscribe = onAuthStateChanged(auth, u => { if (isMounted) setAuthUser(u); }); 
    return () => { isMounted = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!isAuthReady || !authUser || !user) return; 
    
    const unsubL = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), 
      snap => setRawLeads(snap.docs.map(d=>({ ...d.data(), dbId: d.id })))
    );
    const unsubC = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'campaigns'), 
      snap => setCampaigns(snap.docs.map(d=>({ ...d.data(), dbId: d.id })))
    );
    const unsubS = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'silent_cases'), 
      snap => setSilentCases(snap.docs.map(d=>({ ...d.data(), dbId: d.id })))
    );
    // 订阅全局 knownUsers
    const unsubU = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'system_users'), 
      snap => {
         const dbUsers = {};
         snap.docs.forEach(d => { dbUsers[d.data().code] = d.data().name });
         setKnownUsers({ ...INITIAL_USERS, ...dbUsers });
      }
    );
    return () => { unsubL(); unsubC(); unsubS(); unsubU(); };
  }, [isAuthReady, authUser, user]);

  const FirebaseService = useMemo(() => {
     const reqAuth = () => { if (!authUser) throw new Error("No Auth"); };
     return {
        addLead: async (data) => { reqAuth(); return setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'leads')), data); },
        updateLead: async (id, data) => { reqAuth(); return setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', id), data, { merge: true }); },
        addCampaign: async (data) => { reqAuth(); return setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'campaigns')), data); },
        updateCampaign: async (id, data) => { reqAuth(); return setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'campaigns', id), data, { merge: true }); },
        addSilentCase: async (data) => { reqAuth(); return setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'silent_cases')), data); },
        registerUser: async (code, name) => { reqAuth(); return setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'system_users', code), { code, name }); }
     };
  }, [authUser]);


  /** --- Data Processing & Logic --- */
  const { leads, allLeads, myTodos, bombSquad, mvpStats, count } = useMemo(() => {
    if (!user) return { leads: [], allLeads: [], myTodos: [], bombSquad: [], mvpStats: {b:{val:0},a:{val:0},s:{val:0}}, count: 0 };
    const now = new Date();
    const activeLeads = rawLeads.filter(l => !l.isSilentArchived && !l.isDead);
    let baseLeads = search ? rawLeads : activeLeads;
    let myViewData = user.role !== 'FD' ? baseLeads.filter(l => l.tracker === user.role) : baseLeads;

    const myTodos = []; const bombCounts = {}; const scores = {};
    Object.keys(knownUsers).forEach(u => { bombCounts[u] = 0; scores[u] = {b:0, a:0, s:0}; });
    
    myViewData.forEach(l => {
      if (l.tracker === user.role && !l.isDead && !l.isSilentArchived) {
        if (isBomb(l.nextActionDate)) myTodos.push({ type: 'BOMB', lead: l, msg: `💣 严重逾期! 炸弹已引爆` });
        else if (l.nextActionDate && new Date(l.nextActionDate).getTime() <= now.getTime()) myTodos.push({ type: 'DUE', lead: l, msg: `⏰ 今日需跟进` });
      }
    });

    // 为 FD 生成大管道战役停滞预警 (超7天未更新)
    if (user.role === 'FD') {
      const nowTime = now.getTime();
      campaigns.forEach(c => {
         let hasData = false;
         let lastUpdate = new Date(c.createdAt || 0).getTime();
         (c.rounds || []).forEach(r => {
            if ((r.companyCount > 0) || (r.foundCompanyCount > 0) || (r.contactCount > 0) || (r.accountStats && Object.keys(r.accountStats).length > 0)) {
                hasData = true;
            }
            if (r.createdAt) lastUpdate = Math.max(lastUpdate, new Date(r.createdAt).getTime());
            if (r.updatedAt) lastUpdate = Math.max(lastUpdate, new Date(r.updatedAt).getTime());
            if (r.companyFilledAt) lastUpdate = Math.max(lastUpdate, new Date(r.companyFilledAt).getTime());
            if (r.foundCompFilledAt) lastUpdate = Math.max(lastUpdate, new Date(r.foundCompFilledAt).getTime());
            if (r.contactFilledAt) lastUpdate = Math.max(lastUpdate, new Date(r.contactFilledAt).getTime());
            
            Object.values(r.accountStats || {}).forEach(st => {
              if (st.updatedAt) lastUpdate = Math.max(lastUpdate, new Date(st.updatedAt).getTime());
            });
         });

         const daysIdle = Math.floor((nowTime - lastUpdate) / (24 * 3600 * 1000));
         if (hasData && daysIdle > 7) {
             myTodos.push({ type: 'STALE_CAMP', camp: c, msg: `⚠️ 管道停滞: 超7天无数据更新`, daysIdle });
         }
      });
    }

    // 预警排序优先级：炸弹 > 战役停滞 > 常规跟进
    myTodos.sort((a, b) => {
        const w = { BOMB: 3, STALE_CAMP: 2, DUE: 1 };
        return w[b.type] - w[a.type];
    });

    activeLeads.forEach(l => {
        if (isBomb(l.nextActionDate)) { if(bombCounts[l.tracker] !== undefined) bombCounts[l.tracker]++; }
        if (isInRange(l.createdAt, timeRange)) { if(scores[l.tracker]) scores[l.tracker].b++; }
        (l.logs || []).forEach(log => {
            if (log.actionType === 'UPGRADE' && isInRange(log.timestamp, timeRange)) {
                let roleKey = log.operator;
                Object.entries(knownUsers).forEach(([k,v])=>{if(v===log.operator) roleKey=k;});
                if (scores[roleKey]) { if (log.content.includes('A级')) scores[roleKey].a++; if (log.content.includes('S级')) scores[roleKey].s++; }
            }
        });
    });

    const bombSquad = Object.entries(bombCounts).map(([role, count]) => ({ role, name: knownUsers[role] || role, count })).sort((a,b) => b.count - a.count);
    const getMax = (key) => { let maxVal = -1; let winner = { name: '暂无', val: 0 }; Object.entries(scores).forEach(([role, s]) => { if (s[key] > maxVal && s[key] > 0) { maxVal = s[key]; winner = { name: knownUsers[role] || role, val: s[key] }; } }); return winner; };
    const mvpStats = { b: getMax('b'), a: getMax('a'), s: getMax('s') };

    let fData = [...myViewData];
    if (!search) fData = fData.filter(l => l.level !== 'C');
    if (view === 'MONDAY') fData = fData.filter(l => l.addToWarRoom); 
    else if (filter !== 'ALL') fData = fData.filter(l => l.level === filter);
    if (search) { const q = search.toLowerCase(); fData = fData.filter(l => l.clientName?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.id?.toLowerCase().includes(q)); }
    
    fData.sort((a, b) => {
        const aBomb = isBomb(a.nextActionDate) ? 1 : 0; const bBomb = isBomb(b.nextActionDate) ? 1 : 0;
        if (aBomb !== bBomb) return bBomb - aBomb;
        if (a.level === 'S' && b.level !== 'S') return -1; if (b.level === 'S' && a.level !== 'S') return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return { leads: fData.slice((page-1)*50, page*50), allLeads: activeLeads, myTodos, bombSquad, mvpStats, count: fData.length };
  }, [rawLeads, user, filter, view, search, timeRange, knownUsers, page]);

  const allProjects = useMemo(() => Array.from(new Set([...rawLeads.map(l=>l.projectName), ...campaigns.map(c=>c.projectName)])).filter(Boolean), [rawLeads, campaigns]);
  
  const accountOptions = useMemo(() => { 
      const accs = new Set(); 
      rawLeads.forEach(l => l.account && accs.add(l.account)); 
      campaigns.forEach(c => (c.rounds||[]).forEach(r => r.accountStats && Object.keys(r.accountStats).forEach(a => accs.add(a)))); 
      return Array.from(accs); 
  }, [rawLeads, campaigns]);
  
  /** --- Renders --- */
  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
  
  if (!isAuthReady) return (
    <div className="flex h-screen items-center justify-center bg-slate-950 flex-col gap-6">
      <div className="relative w-16 h-16"><div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div><div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
      <div className="text-xs text-blue-400 font-mono font-bold tracking-[0.3em] uppercase animate-pulse">Establishing Secure Uplink...</div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={setUser} savedUsers={knownUsers} onRegister={(code, name) => FirebaseService.registerUser(code, name)} />; 

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden relative">
      <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col shadow-2xl z-20 shrink-0 border-r border-slate-800/50 print:hidden">
        <div className="p-6 pb-2"><h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3"><ShieldAlert className="text-blue-500" size={24}/> SINOVA</h1><p className="text-[10px] text-slate-500 font-mono mt-1 ml-9">LINK OS</p></div>
        <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto pb-4 custom-scrollbar">
          <NavBtn icon={<LayoutDashboard size={20}/>} label="作战指挥中心" active={view==='DASHBOARD'} onClick={()=>{setView('DASHBOARD');setSearch('');}}/>
          <NavBtn icon={<Database size={20}/>} label="高阶线索底座" active={view==='LEADS'} onClick={()=>{setView('LEADS');setFilter('ALL');}}/>
          <NavBtn icon={<Flame size={20}/>} label="周一讨论池" active={view==='MONDAY'} onClick={()=>{setView('MONDAY');setSearch('');}} highlight/>
          <div className="h-6 flex items-center"><div className="h-px bg-slate-800 w-full"></div></div>
          <NavBtn icon={<TrendingUp size={20}/>} label="穿刺大管道" active={view==='PIPELINE'} onClick={()=>{setView('PIPELINE');setSearch('');}}/>
          <NavBtn icon={<Activity size={20}/>} label="账号健康度" active={view==='ACCOUNTS'} onClick={()=>{setView('ACCOUNTS');setSearch('');}}/>
          <NavBtn icon={<MapPin size={20}/>} label="买家全景图" active={view==='BUYERS'} onClick={()=>{setView('BUYERS');setSearch('');}}/>
          {user.role==='FD' && <><div className="h-4"></div><NavBtn icon={<ClipboardList size={20}/>} label="数据报表中心" active={view==='EXPORT'} onClick={()=>{setView('EXPORT');setSearch('');}}/></>}
        </nav>
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
            <button onClick={()=>window.open('https://sinova-7cip.vercel.app/', '_blank')} className="w-full py-2.5 bg-blue-900/30 hover:bg-blue-800/50 text-xs font-bold text-blue-400 rounded-lg flex items-center justify-center gap-2 transition-colors border border-blue-800/50"><ExternalLink size={14}/> 外部业务看板 ↗</button>
            <button onClick={()=>setModalType('C_STATS')} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-700"><ListPlus size={14}/> 执行进度速填 (触达/回关)</button>
            <div className="flex justify-between items-center pt-3 px-1 border-t border-slate-800/50">
              <div className="text-xs font-bold text-slate-400 font-mono"><span className="text-slate-300">{user.name}</span> <span className="text-slate-600">|</span> {user.role}</div>
              <button onClick={()=>{ setUser(null); showToast("已安全登出系统"); }} className="p-1.5 bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors" title="安全退出"><LogOut size={14}/></button>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50 print:hidden">
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">{view==='LEADS'?'高阶线索数据底座':view==='MONDAY'?'周一战略复盘 (War Room)':view==='EXPORT'?'数据分析与导出中心':view==='PIPELINE'?'全球穿刺战役管道':view==='ACCOUNTS'?'账号健康度':view==='BUYERS'?'买家结构全景图':'全球作战指挥中心'}</h2>
          {view!=='EXPORT' && (
            <div className="flex gap-4 items-center">
              <div className="relative">
                 <input className="bg-slate-100/80 border border-slate-200 px-4 py-2.5 pl-10 rounded-xl text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-bold text-slate-700" placeholder="全局检索客户、公司或ID..." value={search} onChange={e=>{setSearch(e.target.value);if(view!=='LEADS'&&view!=='MONDAY'&&view!=='BUYERS')setView('LEADS');}}/>
                 <MousePointer2 size={16} className="absolute left-3.5 top-3 text-slate-400"/>
              </div>
              <button onClick={()=>setModalType('NEW_B')} className="bg-slate-900 hover:bg-blue-600 transition-colors text-white px-5 py-2.5 rounded-xl font-bold flex gap-2 items-center shadow-lg shadow-slate-900/20"><UserPlus size={18}/> 录入新线索</button>
            </div>
          )}
        </header>

        <div className={`flex-1 overflow-auto ${view==='DASHBOARD' || view==='BUYERS' || view==='EXPORT' || view==='PIPELINE' || view==='ACCOUNTS' ? 'bg-slate-50 p-0' : 'p-6'}`}>
          {view === 'DASHBOARD' && <DashboardView allLeads={allLeads} myTodos={myTodos} bombSquad={bombSquad} mvpStats={mvpStats} timeRange={timeRange} setTimeRange={setTimeRange} campaigns={campaigns} silentCases={silentCases} allProjects={allProjects} onSelectTodo={(todo) => { if (todo.type === 'STALE_CAMP') { setView('PIPELINE'); } else { setSelectedLead(todo.lead); } }}/>}
          {view === 'PIPELINE' && <PipelineView campaigns={campaigns} allLeads={allLeads} user={user} knownUsers={knownUsers} showToast={showToast} allProjects={allProjects} FirebaseService={FirebaseService} setDialogConfig={setDialogConfig}/>}
          {view === 'ACCOUNTS' && <AccountsView campaigns={campaigns} allLeads={allLeads} knownUsers={knownUsers}/>}
          {view === 'BUYERS' && <BuyersView allLeads={allLeads} currentUser={user} knownUsers={knownUsers} FirebaseService={FirebaseService} showToast={showToast} setDialogConfig={setDialogConfig}/>}
          {view === 'EXPORT' && <ExportView allLeads={allLeads} campaigns={campaigns} silentCases={silentCases} showToast={showToast} knownUsers={knownUsers}/>}
          
          {(view === 'LEADS' || view === 'MONDAY') && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden animate-in fade-in">
              <div className="p-4 border-b border-slate-100 flex gap-2 bg-slate-50/50">{['ALL','B','A','S'].map(l => (<button key={l} onClick={()=>setFilter(l)} className={`px-5 py-1.5 text-xs rounded-lg font-bold transition-all ${filter===l ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}>{l === 'ALL' ? '全部' : `${l} 级别`}</button>))}</div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-sm tracking-wider border-b border-slate-200"><tr><th className="px-6 py-4">客户身份识别</th><th className="px-6 py-4">企业 & 职位</th><th className="px-6 py-4">线索评级</th><th className="px-6 py-4">下次跟进点</th><th className="px-6 py-4 text-right">操作指令</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map((l, i) => (
                      <tr key={l.id+i} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="px-6 py-4 font-bold text-slate-800 text-base">{l.clientName} {(l.isSilentArchived || l.isDead) && <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded border border-slate-300">已沉默</span>}<div className="text-[10px] font-normal text-slate-400 font-mono line-clamp-1 mt-1">{l.id}</div></td>
                        <td className="px-6 py-4"><div className="font-bold text-slate-700">{l.company}</div><div className="text-xs text-slate-500 mt-1">{l.title}</div></td>
                        <td className="px-6 py-4"><LevelBadge level={l.level} isDead={l.isDead} isSilentArchived={l.isSilentArchived}/></td>
                        <td className={`px-6 py-4 font-mono font-bold text-sm ${isBomb(l.nextActionDate)?'text-red-600':'text-slate-600'}`}><div className="flex items-center gap-2">{l.nextActionDate?.slice(0,10) || '-'} {isBomb(l.nextActionDate)&&<Flame size={14} className="animate-pulse"/>}</div></td>
                        <td className="px-6 py-4 text-right">
                          {view === 'MONDAY' ? (
                            <button onClick={()=>setWarRoomLead(l)} className="text-purple-600 font-bold bg-white border border-purple-200 hover:bg-purple-50 px-4 py-2 rounded-lg flex items-center gap-2 ml-auto transition-colors shadow-sm text-xs"><MessageSquareDashed size={14}/> 下达批示</button>
                          ) : (
                            <button onClick={()=>setSelectedLead(l)} className="text-slate-600 font-bold bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-lg transition-colors shadow-sm text-xs flex items-center gap-2 ml-auto">管理记录 <ChevronRight size={14}/></button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && <tr><td colSpan={5} className="text-center p-12 text-slate-400 font-bold">无匹配的线索数据</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-white"><span className="text-xs font-bold text-slate-500 font-mono tracking-widest">TOTAL RECORDS: {count}</span><div className="flex gap-2"><button onClick={()=>setPage(p=>Math.max(1,p-1))} className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"><ChevronLeft size={16}/></button><span className="flex items-center px-4 font-mono font-bold text-sm text-slate-700">{page}</span><button onClick={()=>setPage(p=>p+1)} className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"><ChevronRight size={16}/></button></div></div>
            </div>
          )}
        </div>
      </main>

      {/* Global Modals & Toast */}
      {selectedLead && <ChatDetailModal lead={selectedLead} currentUser={user} knownUsers={knownUsers} FirebaseService={FirebaseService} onClose={()=>setSelectedLead(null)} showToast={showToast} setDialogConfig={setDialogConfig}/>}
      {warRoomLead && <WarRoomModal lead={warRoomLead} currentUser={user} FirebaseService={FirebaseService} onClose={()=>setWarRoomLead(null)} showToast={showToast}/>}
      {modalType === 'NEW_B' && <NewEntryModal user={user} onClose={()=>setModalType('NONE')} onSuccess={()=>{setModalType('NONE'); showToast('高阶线索已入库');}} allProjects={allProjects} accountOptions={accountOptions} FirebaseService={FirebaseService} showToast={showToast}/>}
      {modalType === 'C_STATS' && <CUpdateModal currentUser={user} campaigns={campaigns} knownUsers={knownUsers} onClose={()=>setModalType('NONE')} showToast={showToast} FirebaseService={FirebaseService}/>}
      <CustomDialog config={dialogConfig} onClose={()=>setDialogConfig(null)} />
      {toastMsg && <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-slate-900/40 font-bold flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[9999] border border-slate-800"><CheckSquare size={18} className="text-green-400"/> {toastMsg}</div>}
    </div>
  );
}