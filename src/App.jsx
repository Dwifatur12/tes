import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, LogIn, LogOut, User, Lock, CheckCircle2, AlertCircle, 
  RefreshCcw, History, Clock, Users, Shield, MapPin, ExternalLink, 
  FileText, Check, X, PieChart, TrendingUp, Key, Save, Scan, 
  Loader2, Download, Printer, Edit, Trash2, Plus, UserPlus, 
  FileSpreadsheet, MessageCircle, Moon, Sun, ChevronRight, Activity,
  LayoutDashboard, Database, BarChart3, Settings, Wand2, Eye, EyeOff, MapPinOff,
  ShieldAlert, HelpCircle, AlertTriangle, MessageSquare, BellRing, Upload, Megaphone,
  Trophy, ThumbsDown, CalendarDays, Search, Send, VolumeX, Mail, Copy, Filter
} from 'lucide-react';

// ==========================================
// KONFIGURASI DATABASE & FIREBASE
// ==========================================
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, writeBatch, setDoc } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyBeVz1veJfe_9vNw-sZTnEaiBn860pQrFA",
  authDomain: "aplikasi-absen-2cf3f.firebaseapp.com",
  projectId: "aplikasi-absen-2cf3f",
  storageBucket: "aplikasi-absen-2cf3f.firebasestorage.app",
  messagingSenderId: "783186509092",
  appId: "1:783186509092:web:9ccb6ed22fdc72c468c7b1",
  measurementId: "G-S2MYY30NGJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'lapas-kalabahi-v2';

function getDistanceInKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1) return null;
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const formatWITA = (date) => {
  const str = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(date);
  return str.replace(/\./g, ':');
};

const formatDateIndo = (date) => {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
};

const getMinutesDiff = (limitH, limitM, actualH, actualM) => {
  return (actualH * 60 + actualM) - (limitH * 60 + limitM);
};

// ==========================================
// FUNGSI HELPER GLOBAL (EXCEL, WORD, PRINT, KETERANGAN)
// ==========================================
const loadXlsxScript = () => new Promise((resolve, reject) => {
  if (window.XLSX) return resolve(window.XLSX);
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  script.onload = () => resolve(window.XLSX);
  script.onerror = () => reject(new Error("Gagal memuat library Excel"));
  document.head.appendChild(script);
});

const getLogKeteranganDetail = (item, dateObj) => {
  if (!item) return '';
  if (item.type === 'Masuk') {
      const [h, m] = item.timeStr.replace(/\./g, ':').split(':').map(Number);
      const diff = getMinutesDiff(7, 30, h, m);
      if (diff > 0) return `Terlambat ${diff} Menit`;
      return 'Tepat Waktu';
  }
  if (item.type === 'Keluar') {
      const [h, m] = item.timeStr.replace(/\./g, ':').split(':').map(Number);
      const day = dateObj ? dateObj.getDay() : new Date(item.timestamp).getDay();
      let lH = 14, lM = 30; if (day === 5) { lH = 11; lM = 30; } else if (day === 6) { lH = 13; lM = 0; }
      const diff = getMinutesDiff(lH, lM, h, m);
      if (diff < 0) return `Pulang Awal ${Math.abs(diff)} Menit`;
      return 'Tepat Waktu';
  }
  return item.type;
};

const printHTMLTable = (title, tableHtml) => {
  const win = window.open('', '_blank');
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; }
          h2 { text-align: center; margin-bottom: 20px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 10px; text-align: center; vertical-align: middle; }
          th { background-color: #f3f4f6; font-weight: bold; }
          img { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; display: block; margin: 0 auto 5px auto; }
          .detail { font-size: 10px; font-weight: bold; margin-top: 4px; display: block; }
          .late { color: #dc2626; }
          .ontime { color: #16a34a; }
          .status { padding: 4px 8px; border-radius: 12px; background: #f3f4f6; display: inline-block; font-size: 10px;}
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        ${tableHtml}
        <script>
          setTimeout(() => { window.print(); window.close(); }, 800);
        </script>
      </body>
    </html>
  `);
  win.document.close();
};

const copyToClipboard = (text, showToast) => {
  const fallback = () => {
    const textArea = document.createElement("textarea"); textArea.value = text;
    textArea.style.position = "fixed"; textArea.style.opacity = "0";
    document.body.appendChild(textArea); textArea.focus(); textArea.select();
    try { document.execCommand('copy'); showToast("Berhasil disalin ke clipboard!"); } catch (err) { showToast("Gagal menyalin", "error"); }
    document.body.removeChild(textArea);
  };
  if (!navigator.clipboard) { fallback(); return; }
  navigator.clipboard.writeText(text).then(() => showToast("Berhasil disalin ke clipboard!")).catch(fallback);
};

// ==========================================
// FORMAT GENERATOR WA APEL PAGI
// ==========================================
const generateWAPesan = (pegawaiList, allHistory, dateObj) => {
  const tStr = formatDateIndo(dateObj);
  const tLogs = allHistory.filter(h => h.dateStr === tStr);

  let hadirStafCount = 0; let hadirCpnsCount = 0; let totalStafCount = 0; let totalCpnsCount = 0;
  let bko = []; let terlambat = []; let lepasPiket = []; let cutiTahunan = []; let dinasLuar = []; let sakit = []; let tanpaKet = [];

  pegawaiList.forEach(p => {
    const isCpns = p.nama.toUpperCase().includes('DINA TIMUTANG') || p.nama.toUpperCase().includes('MARIA HERLINA SASI');
    if (isCpns) totalCpnsCount++; else totalStafCount++;

    const userLogs = tLogs.filter(l => l.username === p.nip);
    if (userLogs.length === 0) { tanpaKet.push(p.nama); } 
    else {
      const special = userLogs.find(l => ['Sakit', 'Cuti', 'Dinas Luar', 'Lepas Piket', 'BKO'].includes(l.type));
      if (special) {
        if (special.type === 'Sakit') sakit.push(p.nama); else if (special.type === 'Cuti') cutiTahunan.push(p.nama);
        else if (special.type === 'Dinas Luar') dinasLuar.push(p.nama); else if (special.type === 'Lepas Piket') lepasPiket.push(p.nama);
        else if (special.type === 'BKO') bko.push(p.nama);
      } else {
        const inLog = userLogs.find(l => l.type === 'Masuk');
        if (inLog) {
          if (isCpns) hadirCpnsCount++; else hadirStafCount++;
          const [h, m] = inLog.timeStr.replace(/\./g, ':').split(':').map(Number);
          const diff = getMinutesDiff(7, 30, h, m);
          if (diff > 0) terlambat.push(`${p.nama} (Terlambat ${diff} Menit)`);
        } else { tanpaKet.push(p.nama); }
      }
    }
  });

  const tidakHadirStaf = totalStafCount - hadirStafCount; const tidakHadirCpns = totalCpnsCount - hadirCpnsCount;
  const formatList = (arr) => arr.length > 0 ? arr.map((name, i) => `${i+1}. ${name}`).join('\n') : '-';

  let msg = `Selamat Pagi, Ijin melaporkan Bapak\nApel Pagi Pegawai Staf Lapas Kelas IIB Kalabahi\n${tStr}\n\n`;
  msg += `*Jumlah Pegawai Staf* : ${totalStafCount} Orang\n* Hadir : ${hadirStafCount} Orang\n* Tidak Hadir : ${tidakHadirStaf === 0 ? '-' : tidakHadirStaf + ' Orang'}\n`;
  msg += `*Jumlah CPNS* : ${totalCpnsCount} Orang\n* Hadir : ${hadirCpnsCount} Orang\n* Tidak Hadir : ${tidakHadirCpns === 0 ? '-' : tidakHadirCpns + ' Orang'}\n`;
  msg += `*Jumlah Peserta Magang* : 18 Orang\n* Hadir : 18 Orang\n* Tidak Hadir : -\n\n*KETERANGAN :*\n\n`;
  msg += `*BKO :*\n${formatList(bko)}\n\n*TERLAMBAT :*\n${formatList(terlambat)}\n\n*LEPAS PIKET :*\n${formatList(lepasPiket)}\n\n`;
  msg += `*CUTI MELAHIRKAN :*\n-\n\n*CUTI TAHUNAN :*\n${formatList(cutiTahunan)}\n\n*DINAS LUAR :*\n${formatList(dinasLuar)}\n\n`;
  msg += `*LIBUR BKO :*\n-\n\n*SAKIT :*\n${formatList(sakit)}\n\n*IJIN :*\n-\n\n*TANPA KETERANGAN :*\n${formatList(tanpaKet)}\n\n`;
  msg += `*AMANAT*\n* Apel Pagi berjalan aman dan lancar.\n\nMengetahui,\nKepala Lapas Kelas IIB Kalabahi\nTTD\nM Arfandy,A.Md.IP.,S.H.,M.H\nNIP. 198007232000121001\n\nDemikian Laporan Apel Pagi\nTerima Kasih.`;
  return msg;
};

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('absensiUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') !== 'false');
  const [toast, setToast] = useState(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncRefs, setSyncRefs] = useState({ server: null, perf: null });
  const [isTimeSynced, setIsTimeSynced] = useState(false);
  const [timeAnomaly, setTimeAnomaly] = useState(false);

  const [locationConfig, setLocationConfig] = useState({ lat: -8.219515, lng: 124.513346, radius: 200 });

  const [pegawaiList, setPegawaiList] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [passRequests, setPassRequests] = useState([]); 
  const [messages, setMessages] = useState([]);
  
  const [pengumumanData, setPengumumanData] = useState({ 
    id: null, 
    text: "Selamat Datang di SATU-LAKAL (Sistem Absensi Terpadu Lapas Kalabahi). Mari tingkatkan terus kedisiplinan dan kinerja kita bersama. Selamat bertugas!" 
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const syncTime = async () => {
      const providers = ['https://timeapi.io/api/Time/current/zone?timeZone=Asia/Makassar', 'https://worldtimeapi.org/api/timezone/Asia/Makassar'];
      try {
        const fastestResponse = await Promise.any(providers.map(url => fetch(url, { cache: 'no-cache' }).then(res => { if (!res.ok) throw new Error(); return res.json(); })));
        const serverDate = new Date(fastestResponse.dateTime || fastestResponse.datetime);
        setSyncRefs({ server: serverDate.getTime(), perf: performance.now() });
        setIsTimeSynced(true); setTimeAnomaly(false);
      } catch (err) { setTimeout(syncTime, 10000); }
    };
    syncTime(); const resyncInterval = setInterval(syncTime, 1800000);
    return () => clearInterval(resyncInterval);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      if (syncRefs.server && syncRefs.perf) {
        const elapsedSinceSync = performance.now() - syncRefs.perf;
        const exactTime = new Date(syncRefs.server + elapsedSinceSync);
        const systemDrift = Math.abs((Date.now()) - (syncRefs.server + elapsedSinceSync));
        if (systemDrift > 60000) setTimeAnomaly(true);
        setCurrentTime(exactTime);
      } else { setCurrentTime(new Date()); }
    }, 1000);
    return () => clearInterval(tick);
  }, [syncRefs]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (e) { console.error("Auth failed", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => { setFirebaseUser(user); setIsAuthReady(true); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsubPegawai = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'pegawai'), (snap) => setPegawaiList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubCreds = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'credentials'), (snap) => setCredentials(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAbsen = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'absensi'), (snap) => setAllHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp)));
    const unsubPengumuman = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'pengumuman'), (snap) => { if (!snap.empty) setPengumumanData({ id: snap.docs[0].id, text: snap.docs[0].data().text }); });
    const unsubReqs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'password_requests'), (snap) => setPassRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPesan = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'pesan'), (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp)));
    const unsubConfig = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'lokasi'), (snap) => { if (snap.exists()) setLocationConfig(snap.data()); });

    return () => { unsubPegawai(); unsubCreds(); unsubAbsen(); unsubPengumuman(); unsubReqs(); unsubPesan(); unsubConfig(); };
  }, [firebaseUser]);

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Shield size={60} className="text-blue-500 animate-pulse" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-100 transition-colors duration-500 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;400;600;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        .glass-card { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: 0 20px 50px rgba(0,0,0,0.05); }
        .dark .glass-card { background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
        .btn-3d { transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 4px 0 rgba(30, 64, 175, 0.5); }
        .btn-3d:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(30, 64, 175, 0.5); }
        .laser-line { width: 100%; height: 2px; background: #3b82f6; box-shadow: 0 0 15px #3b82f6; position: absolute; animation: scan 2s infinite linear; z-index: 10; }
        @keyframes scan { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-150%); } }
        .animate-marquee { display: inline-block; animation: marquee 25s linear infinite; white-space: nowrap; }
        
        input[type="date"]::-webkit-calendar-picker-indicator, input[type="time"]::-webkit-calendar-picker-indicator { cursor: pointer; filter: brightness(0); opacity: 0.7; transition: all 0.3s; }
        .dark input[type="date"]::-webkit-calendar-picker-indicator, .dark input[type="time"]::-webkit-calendar-picker-indicator { filter: brightness(0) invert(1); opacity: 1; }
      `}</style>

      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}
          <span className="text-xs font-bold uppercase tracking-widest text-white">{toast.message}</span>
        </div>
      )}

      {timeAnomaly && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-sm glass-card p-4 rounded-2xl border-rose-600/50 flex items-center gap-3 animate-bounce">
          <ShieldAlert className="text-rose-600 shrink-0" size={24}/>
          <p className="text-[9px] font-bold text-rose-600 uppercase leading-relaxed">Manipulasi Waktu Terdeteksi! Gunakan waktu otomatis.</p>
        </div>
      )}

      {!currentUser ? (
        <LoginPage 
          onLogin={(u) => { 
            localStorage.setItem('absensiUser', JSON.stringify(u)); setCurrentUser(u); showToast(`Selamat datang, ${u.username}`);
          }} 
          credentials={credentials} pegawaiList={pegawaiList} 
          isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
          showToast={showToast} db={db} appId={appId}
        />
      ) : (
        <MainDashboard 
          currentUser={currentUser} pegawaiList={pegawaiList} allHistory={allHistory} credentials={credentials} locationConfig={locationConfig}
          passRequests={passRequests} messages={messages} showToast={showToast} isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onLogout={() => { localStorage.removeItem('absensiUser'); setCurrentUser(null); showToast("Berhasil keluar."); }}
          appId={appId} db={db} currentTime={currentTime} isTimeSynced={isTimeSynced} timeAnomaly={timeAnomaly} pengumumanData={pengumumanData}
        />
      )}
    </div>
  );
}

// ==========================================
// HALAMAN LOGIN & LUPA PASSWORD
// ==========================================
function LoginPage({ onLogin, credentials, pegawaiList, isDarkMode, toggleDarkMode, showToast, db, appId }) {
  const [nip, setNip] = useState(''); const [pass, setPass] = useState(''); const [showPassword, setShowPassword] = useState(false); const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault(); if (!nip || !pass) return showToast("Harap isi NIP dan Password", "error");
    if (nip === '2001' && pass === 'november') return onLogin({ username: 'Admin Lapas', role: 'admin', rawUsername: '2001' });

    const cred = credentials.find(c => c.username === nip);
    const expectedPass = cred?.password || '123456'; 
    if (pass === expectedPass) {
      const peg = pegawaiList.find(p => p.nip === nip);
      if (peg) onLogin({ username: peg.nama, role: 'pegawai', rawUsername: nip });
      else showToast("NIP tidak terdaftar dalam sistem", "error");
    } else showToast("NIP atau Password salah", "error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20000ms] hover:scale-105" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop')` }} />
      <div className="absolute inset-0 z-0 bg-slate-900/40 dark:bg-slate-950/60"></div>

      <button onClick={toggleDarkMode} className="absolute top-8 right-8 p-4 glass-card rounded-2xl transition-transform hover:scale-110 z-10 border border-white/20">
        {isDarkMode ? <Sun className="text-yellow-400" size={20}/> : <Moon className="text-white drop-shadow-md" size={20}/>}
      </button>

      <div className="glass-card p-10 rounded-[3rem] w-full max-w-sm text-center border border-white/20 shadow-2xl z-10 relative">
        <Shield size={50} className="text-blue-600 dark:text-blue-500 mx-auto mb-6 drop-shadow-lg" />
        <h1 className="text-4xl font-black tracking-tighter dark:text-white leading-tight text-slate-900">SATU-LAKAL</h1>
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mt-2 mb-10 leading-relaxed px-4">(Sistem Absensi Terpadu Lapas Kalabahi)</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-400 ml-2">NIP Pegawai</label>
            <input type="text" value={nip} onChange={e => setNip(e.target.value)} className="w-full px-5 py-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl outline-none focus:border-blue-500 font-bold dark:text-white transition-all text-slate-950 shadow-inner backdrop-blur-md" placeholder="Masukkan NIP" />
          </div>
          <div className="space-y-1 relative">
            <div className="flex justify-between items-end"><label className="text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-400 ml-2">Password</label></div>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} className="w-full pl-5 pr-12 py-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl outline-none focus:border-blue-500 font-bold dark:text-white transition-all text-slate-950 shadow-inner backdrop-blur-md" placeholder="Masukkan Password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600 transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
          <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest mt-6 btn-3d shadow-blue-600/50 hover:bg-blue-700 transition-colors">Masuk Sekarang</button>
        </form>
        
        <div className="mt-8 text-[9px] font-bold text-slate-600 dark:text-slate-400 flex flex-col items-center justify-center gap-2 mx-auto uppercase tracking-widest">
          <p className="flex items-center gap-1"><HelpCircle size={14}/> Lupa password / Butuh bantuan?</p>
          <button onClick={() => setShowForgotModal(true)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-black transition-colors">Hubungi Admin / Reset Sandi</button>
        </div>
      </div>
      {showForgotModal && <ForgotPasswordModal db={db} appId={appId} onClose={() => setShowForgotModal(false)} showToast={showToast} pegawaiList={pegawaiList} />}
    </div>
  );
}

function ForgotPasswordModal({ db, appId, onClose, showToast, pegawaiList }) {
  const [nipReq, setNipReq] = useState(''); const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); if (!nipReq) return showToast("Masukkan NIP Anda", "error");
    const peg = pegawaiList.find(p => p.nip === nipReq); if (!peg) return showToast("NIP tidak ditemukan di database", "error");
    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'password_requests'), { nip: nipReq, nama: peg.nama, timestamp: Date.now() });
      showToast("Permintaan reset sandi berhasil dikirim ke Admin!"); onClose();
    } catch (err) { showToast("Gagal mengirim permintaan", "error"); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full text-center border border-white/10 shadow-2xl animate-in zoom-in">
        <Key size={40} className="text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-2 text-slate-950 dark:text-white">Lupa Password?</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6 leading-relaxed">Kirim permintaan agar Admin mereset password Anda menjadi 123456</p>
        <form onSubmit={handleSubmit} className="text-left space-y-4">
          <input type="text" value={nipReq} onChange={e => setNipReq(e.target.value)} placeholder="Masukkan NIP Anda" className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-bold dark:text-white shadow-inner text-slate-950" />
          <button type="submit" disabled={loading} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl hover:scale-105 transition-transform">{loading ? 'Mengirim...' : 'Kirim Permintaan'}</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase mt-2">Batal</button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// DASHBOARD UTAMA
// ==========================================
function MainDashboard({ currentUser, pegawaiList, allHistory, credentials, locationConfig, passRequests, messages, showToast, isDarkMode, toggleDarkMode, onLogout, appId, db, currentTime, isTimeSynced, timeAnomaly, pengumumanData }) {
  const [activeTab, setActiveTab] = useState(currentUser.role === 'admin' ? 'rekap' : 'absen');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPengumumanModal, setShowPengumumanModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [absenReminder, setAbsenReminder] = useState(null);
  
  const [waConfig, setWaConfig] = useState(() => { const saved = localStorage.getItem('waAutoConfig'); return saved ? JSON.parse(saved) : { enabled: false, time: '15:00', phone: '' }; });
  const [showWAAlert, setShowWAAlert] = useState(false);
  const [lastWADate, setLastWADate] = useState(localStorage.getItem('lastWADate'));

  const unreadCount = messages.filter(m => m.receiverNip === currentUser.rawUsername && !m.isRead).length;

  const menuItems = [
    { id: 'absen', label: 'Presensi', icon: Camera },
    { id: 'riwayat', label: 'Riwayat Absensi', icon: History },
    { id: 'rekap', label: 'Laporan', icon: FileSpreadsheet },
    { id: 'analitik', label: 'Grafik', icon: BarChart3 },
    { id: 'kelola', label: 'Pegawai', icon: Users, admin: true },
  ];

  useEffect(() => {
    if (currentUser.role !== 'admin' || !waConfig.enabled || !waConfig.phone) return;
    const interval = setInterval(() => {
      const nowWITA = formatWITA(currentTime).substring(0, 5); 
      const dateToday = formatDateIndo(currentTime);
      if (nowWITA === waConfig.time && lastWADate !== dateToday) setShowWAAlert(true);
    }, 10000); 
    return () => clearInterval(interval);
  }, [currentTime, waConfig, lastWADate, currentUser.role]);

  useEffect(() => {
    const timeStr = formatWITA(currentTime).substring(0, 5);
    const day = currentTime.getDay();
    const todayStr = formatDateIndo(currentTime);
    const lastReminderStr = localStorage.getItem('lastAbsenReminder') || '';

    if (day !== 0 && lastReminderStr !== `${todayStr}-${timeStr}`) {
      let trigger = false; let msg = '';
      if (timeStr === '07:00') { trigger = true; msg = 'Waktunya Absen Masuk! (30 Menit sebelum jam kerja)'; }
      else if ((day >= 1 && day <= 4) && timeStr === '14:30') { trigger = true; msg = 'Waktu Jam Kerja Selesai. Jangan lupa Absen Keluar!'; }
      else if (day === 5 && timeStr === '11:30') { trigger = true; msg = 'Waktu Jam Kerja Selesai (Jumat). Jangan lupa Absen Keluar!'; }
      else if (day === 6 && timeStr === '13:00') { trigger = true; msg = 'Waktu Jam Kerja Selesai (Sabtu). Jangan lupa Absen Keluar!'; }

      if (trigger) { setAbsenReminder(msg); localStorage.setItem('lastAbsenReminder', `${todayStr}-${timeStr}`); }
    }
  }, [currentTime]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 fixed h-full z-40">
        <div className="flex items-center gap-3 mb-12">
          <Shield className="text-blue-600" size={32} />
          <div><h2 className="text-xl font-black tracking-tight dark:text-white text-slate-950">SATU-LAKAL</h2><p className="text-[7px] font-bold text-slate-500 uppercase leading-none mt-0.5">Lapas Kalabahi</p></div>
        </div>
        <nav className="flex-1 space-y-3">
          {menuItems.map(item => (
            (!item.admin || currentUser.role === 'admin') && (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <span className="flex items-center gap-4"><item.icon size={18} /> {item.label}</span>
                {item.badge > 0 && <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full shadow-md animate-pulse">{item.badge}</span>}
              </button>
            )
          ))}
        </nav>
        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-xs uppercase text-slate-800 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Key size={18} /> Ubah Password</button>
          <button onClick={() => setConfirmDialog({ title: "Keluar Aplikasi", message: "Apakah Anda yakin ingin keluar dari akun ini?", isDanger: true, confirmText: "Keluar", onConfirm: () => { setConfirmDialog(null); onLogout(); } })} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-xs uppercase text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"><LogOut size={18} /> Keluar</button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 pb-24 lg:pb-10 relative">
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-950 dark:text-white">{activeTab === 'absen' ? 'Pusat Presensi' : (activeTab === 'pesan' ? 'Pesan Masuk' : menuItems.find(m => m.id === activeTab)?.label || activeTab)}</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-500 mt-2">Pegawai: {currentUser.username} <span className="mx-2 opacity-30">|</span> Unit: Kalabahi</p>
            </div>

            <div className={`flex items-center gap-4 glass-card px-6 py-4 rounded-3xl w-full md:w-auto justify-between border-2 shadow-xl transition-all duration-700 ${timeAnomaly ? 'border-rose-600' : (isTimeSynced ? 'border-emerald-500/20' : 'border-blue-500/10')}`}>
              <div className="text-left md:text-right">
                <div className="flex items-center md:justify-end gap-3"><p className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right">{formatDateIndo(currentTime)}</p><p className={`text-3xl font-black tabular-nums leading-none ${timeAnomaly ? 'text-rose-600' : 'text-blue-600 dark:text-blue-400'}`}>{formatWITA(currentTime)}</p></div>
                <p className="text-[8px] font-black uppercase text-slate-700 dark:text-slate-500 mt-1 tracking-tighter flex items-center gap-1 md:justify-end">{timeAnomaly ? <ShieldAlert size={10} className="text-rose-600"/> : (isTimeSynced ? <CheckCircle2 size={10} className="text-emerald-500"/> : <Loader2 size={10} className="animate-spin text-blue-500"/>)}{timeAnomaly ? "MANIPULASI TERDETEKSI" : (isTimeSynced ? "TERVERIFIKASI SERVER WITA" : "SINKRONISASI WAKTU...")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveTab('pesan')} className={`relative p-3 rounded-xl transition-transform hover:scale-110 ${activeTab === 'pesan' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`} title="Pesan"><MessageCircle size={18}/>
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] h-4 w-4 flex items-center justify-center rounded-full animate-pulse font-bold">{unreadCount}</span>}
                </button>
                <button onClick={() => setShowPasswordModal(true)} className="lg:hidden p-3 bg-slate-100 dark:bg-slate-800 rounded-xl transition-transform hover:scale-110 text-slate-700 dark:text-slate-300" title="Ubah Password"><Key size={18}/></button>
                <button onClick={toggleDarkMode} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl transition-transform hover:scale-110">{isDarkMode ? <Sun size={18} className="text-yellow-500"/> : <Moon size={18} className="text-blue-600"/>}</button>
                <button onClick={() => setConfirmDialog({ title: "Keluar Aplikasi", message: "Apakah Anda yakin ingin keluar?", isDanger: true, confirmText: "Keluar", onConfirm: () => { setConfirmDialog(null); onLogout(); } })} className="lg:hidden p-3 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-500 rounded-xl transition-transform hover:scale-110" title="Keluar"><LogOut size={18}/></button>
              </div>
            </div>
          </header>

          <div className="mb-8 glass-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-blue-500 shadow-md bg-blue-50/50 dark:bg-blue-900/10">
            <div className="flex items-center gap-4 overflow-hidden w-full"><Megaphone className="text-blue-600 shrink-0" size={20} /><div className="overflow-hidden w-full"><div className="animate-marquee text-[11px] md:text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">{pengumumanData.text}</div></div></div>
            {currentUser.role === 'admin' && <button onClick={() => setShowPengumumanModal(true)} className="ml-4 p-3 bg-white dark:bg-slate-800 rounded-xl text-blue-600 shadow-sm hover:scale-110 transition-transform shrink-0" title="Edit Pengumuman"><Edit size={16}/></button>}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'absen' && <AbsenView currentUser={currentUser} currentTime={currentTime} allHistory={allHistory} pegawaiList={pegawaiList} locationConfig={locationConfig} showToast={showToast} appId={appId} db={db} isSynced={isTimeSynced && !timeAnomaly} />}
            {activeTab === 'riwayat' && <HistoryList history={currentUser.role === 'admin' ? allHistory : allHistory.filter(h => h.username === currentUser.rawUsername)} currentUser={currentUser} locationConfig={locationConfig} db={db} appId={appId} showToast={showToast} />}
            {activeTab === 'rekap' && <RekapView currentUser={currentUser} allHistory={allHistory} pegawaiList={pegawaiList} waConfig={waConfig} setWaConfig={(cfg) => { setWaConfig(cfg); localStorage.setItem('waAutoConfig', JSON.stringify(cfg)); showToast("Pengaturan WA Laporan Otomatis Tersimpan!"); }} showToast={showToast} db={db} appId={appId} />}
            {activeTab === 'analitik' && <AnalitikView allHistory={allHistory} pegawaiList={pegawaiList} />}
            {activeTab === 'kelola' && <KelolaView pegawaiList={pegawaiList} passRequests={passRequests} locationConfig={locationConfig} showToast={showToast} db={db} appId={appId} credentials={credentials} />}
            {activeTab === 'pesan' && <PesanView currentUser={currentUser} messages={messages} pegawaiList={pegawaiList} db={db} appId={appId} showToast={showToast} />}
          </div>
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center p-3 z-40 shadow-2xl safe-area-inset-bottom">
        {menuItems.map(item => (
          (!item.admin || currentUser.role === 'admin') && (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === item.id ? 'text-blue-600' : 'text-slate-700'}`}>
              <item.icon size={20} /><span className="text-[7px] font-black uppercase max-w-[60px] text-center truncate">{item.label}</span>
            </button>
          )
        ))}
      </nav>

      {showPasswordModal && <PasswordModal currentUser={currentUser} credentials={credentials} db={db} appId={appId} onClose={() => setShowPasswordModal(false)} showToast={showToast} />}
      {showPengumumanModal && <EditPengumumanModal db={db} appId={appId} pengumumanData={pengumumanData} onClose={() => setShowPengumumanModal(false)} showToast={showToast} />}
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
      
      {absenReminder && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in">
          <div className="glass-card p-10 md:p-16 rounded-[3rem] w-full max-w-lg text-center border-2 border-blue-500 shadow-2xl animate-in zoom-in-95">
            <Clock size={60} className="text-blue-500 mx-auto mb-6 animate-bounce" />
            <h2 className="text-3xl font-black mb-4 text-white">Waktunya Presensi!</h2>
            <p className="text-sm font-bold text-slate-300 mb-8">{absenReminder}</p>
            <button onClick={() => { setAbsenReminder(null); setActiveTab('absen'); }} className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black uppercase text-sm mb-4 btn-3d mt-2">Tutup & Pergi ke Absen</button>
          </div>
        </div>
      )}

      {showWAAlert && currentUser.role === 'admin' && (
        <AutoWAAlert onClose={() => setShowWAAlert(false)} onSend={() => { const d = formatDateIndo(currentTime); localStorage.setItem('lastWADate', d); setLastWADate(d); setShowWAAlert(false); }} waConfig={waConfig} allHistory={allHistory} pegawaiList={pegawaiList} currentTime={currentTime} />
      )}
    </div>
  );
}

// Modal Edit Pengumuman
function EditPengumumanModal({ db, appId, pengumumanData, onClose, showToast }) {
  const [text, setText] = useState(pengumumanData.text); const [loading, setLoading] = useState(false);
  const handleSave = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (pengumumanData.id) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pengumuman', pengumumanData.id), { text });
      else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'pengumuman'), { text });
      showToast("Pengumuman berhasil diperbarui!"); onClose();
    } catch (err) { showToast("Gagal menyimpan pengumuman", "error"); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-md w-full border border-white/10 shadow-2xl animate-in zoom-in">
        <Megaphone size={40} className="text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-1 text-center text-slate-950 dark:text-white">Edit Pengumuman</h2>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-6 text-center">Broadcast Internal</p>
        <form onSubmit={handleSave} className="space-y-4 text-left">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold dark:text-white shadow-inner text-slate-950 resize-none" placeholder="Tulis pengumuman..." />
          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] mt-4 shadow-xl hover:scale-105 transition-transform btn-3d">{loading ? 'Menyimpan...' : 'Sebarkan'}</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase mt-2">Batal</button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// VIEW: PRESENSI (ABSEN) + LIVE GPS
// ==========================================
function AbsenView({ currentUser, currentTime, allHistory, pegawaiList, locationConfig, showToast, appId, db, isSynced }) {
  const [photo, setPhoto] = useState(null); const [location, setLocation] = useState(null); const [dist, setDist] = useState(null);
  const [isScanning, setIsScanning] = useState(false); const [absenType, setAbsenType] = useState('Masuk'); const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false); const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  const [livenessStatus, setLivenessStatus] = useState('');
  const [isFakeGpsBlocked, setIsFakeGpsBlocked] = useState(false);

  // States for Personal Rekapitulasi
  const [rekapTabType, setRekapTabType] = useState('mingguan');
  const [rekapStartDate, setRekapStartDate] = useState('');
  const [rekapEndDate, setRekapEndDate] = useState('');
  const [rekapFilterStatus, setRekapFilterStatus] = useState('Semua');

  const videoRef = useRef(null); const canvasRef = useRef(null); const watchIdRef = useRef(null);
  const locationHistoryRef = useRef([]);
  const importFileInputRef = useRef(null);

  const currentUserData = pegawaiList?.find(p => p.nip === currentUser.rawUsername);
  const canBypassGps = currentUser.role === 'admin' || currentUserData?.bypassGps;

  useEffect(() => { return () => { stopCamera(); if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); }; }, []);

  const startCamera = async () => {
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }); if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); } } 
    catch (e) { showToast("Kamera tidak tersedia atau izin ditolak", "error"); setIsCameraActive(false); }
  };

  const stopCamera = () => { if (videoRef.current && videoRef.current.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop()); setIsCameraActive(false); };

  const processLivenessAndCapture = () => {
    if (!canBypassGps && isFakeGpsBlocked) return showToast("Akses Kamera Ditolak (Indikasi Fake GPS)", "error");
    setIsScanning(true);
    setLivenessStatus('Silakan berkedip atau gerakkan wajah Anda...');

    const video = videoRef.current; const canvas = canvasRef.current; if (!video || !canvas) return;
    const isDesktop = window.innerWidth >= 768; const vW = video.videoWidth; const vH = video.videoHeight;
    if (isDesktop) { canvas.width = 640; canvas.height = 360; } else { canvas.width = 480; canvas.height = 640; }
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame1 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    setTimeout(() => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame2 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      let diffCount = 0;
      for (let i = 0; i < frame1.length; i += 4) {
        const diff = Math.abs(frame1[i] - frame2[i]) + Math.abs(frame1[i+1] - frame2[i+1]) + Math.abs(frame1[i+2] - frame2[i+2]);
        if (diff > 50) diffCount++;
      }
      const motionPercent = (diffCount / (frame1.length / 4)) * 100;

      if (motionPercent < 0.5) { 
        setIsScanning(false); setLivenessStatus('');
        showToast("Liveness Gagal: Terdeteksi foto statis! Silakan ulangi & gerakkan wajah.", "error");
      } else {
        setLivenessStatus('Wajah Asli Terverifikasi!');
        
        setTimeout(() => {
          const targetRatio = canvas.width / canvas.height; const sourceRatio = vW / vH;
          let sx, sy, sWidth, sHeight;
          if (sourceRatio > targetRatio) { sHeight = vH; sWidth = vH * targetRatio; sx = (vW - sWidth) / 2; sy = 0; } 
          else { sWidth = vW; sHeight = vW / targetRatio; sx = 0; sy = (vH - sHeight) / 2; }
          
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          setPhoto(canvas.toDataURL('image/jpeg', 0.8)); setIsScanning(false); setLivenessStatus(''); stopCamera();
        }, 500);
      }
    }, 1500); 
  };

  const toggleLocationTracking = () => {
    if (isTrackingLocation) { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); setIsTrackingLocation(false); showToast("Pelacakan GPS dihentikan"); return; }
    showToast("Mencari satelit GPS... Harap berada di luar ruangan.", "success"); setIsTrackingLocation(true);
    if (!navigator.geolocation) { showToast("Browser Anda tidak mendukung fitur GPS.", "error"); setIsTrackingLocation(false); return; }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const now = Date.now();

        let fakeGpsDetected = false;
        locationHistoryRef.current = locationHistoryRef.current.filter(p => now - p.time <= 60000);
        
        for (const p of locationHistoryRef.current) {
          if (getDistanceInKm(latitude, longitude, p.lat, p.lng) > 10) { fakeGpsDetected = true; break; }
        }

        if (fakeGpsDetected) {
          setIsFakeGpsBlocked(true);
          showToast("Indikasi Fake GPS! Pergerakan tidak wajar (>10 KM / Menit) diblokir.", "error");
          return;
        }

        locationHistoryRef.current.push({lat: latitude, lng: longitude, time: now});
        setIsFakeGpsBlocked(false);

        if (accuracy > 100) { showToast(`Sinyal lemah (Akurasi ${Math.round(accuracy)}m). Tunggu sebentar atau cari tempat terbuka...`, "error"); return; }
        setLocation({ lat: latitude, lng: longitude }); setDist(getDistanceInKm(latitude, longitude, locationConfig.lat, locationConfig.lng));
      },
      (err) => { 
        if (err.code === err.PERMISSION_DENIED) showToast("Izin GPS ditolak oleh browser Anda!", "error");
        else if (err.code === err.TIMEOUT) showToast("Sinyal GPS lambat. Pastikan Anda tidak berada di dalam ruangan.", "error");
        else showToast("Gagal mengunci sinyal satelit GPS asli.", "error");
        setIsTrackingLocation(false); if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); 
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  };

  const submitAbsenClick = () => {
    if (!auth.currentUser) return showToast("Sesi habis, harap login ulang", "error");
    if (!isSynced) return showToast("Waktu perangkat tidak valid", "error");
    if (!canBypassGps && isFakeGpsBlocked) return showToast("Sistem mendeteksi penggunaan Fake GPS. Absen diblokir!", "error");
    if (!canBypassGps && currentTime.getDay() === 0) return showToast("Sistem menolak: Hari Minggu tidak ada jadwal absensi.", "error");

    if (['Masuk', 'Keluar'].includes(absenType)) {
      if (!canBypassGps && !location) return showToast("Harap mulai Lacak GPS terlebih dahulu!", "error");
      if (!canBypassGps && dist > (locationConfig.radius / 1000)) {
        return showToast(`DITOLAK! Anda berada ${(dist * 1000).toFixed(0)} meter dari Lapas Kalabahi. Jarak maksimal adalah ${locationConfig.radius} meter.`, "error");
      }
    }

    if (!canBypassGps && !location) setConfirmDialog({ title: "PERINGATAN GPS", message: "Sinyal GPS Anda belum terkunci atau menggunakan simulasi.\nAnda akan melakukan absensi TANPA verifikasi titik koordinat asli.\n\nTetap Lanjutkan?", isDanger: true, onConfirm: () => { setConfirmDialog(null); executeSubmit(); } });
    else setConfirmDialog({ title: "KONFIRMASI ABSENSI", message: `Apakah Anda yakin ingin mengirim laporan [${absenType}] sekarang?`, onConfirm: () => { setConfirmDialog(null); executeSubmit(); } });
  };

  const executeSubmit = async () => {
    if (absenType === 'Sakit') {
      const sickLogs = allHistory.filter(h => new Date(h.timestamp).getMonth() === currentTime.getMonth() && h.username === currentUser.rawUsername && h.type === 'Sakit');
      if (sickLogs.length >= 2) return showToast("Batas Sakit maksimal 2x sebulan telah tercapai", "error");
    }

    let statusKeterangan = '';
    if (absenType === 'Masuk') {
       const [h, m] = formatWITA(currentTime).substring(0, 5).replace(/\./g, ':').split(':').map(Number);
       const diff = getMinutesDiff(7, 30, h, m);
       if (diff > 0) statusKeterangan = ` (Terlambat ${diff} Menit)`;
    } else if (absenType === 'Keluar') {
       const [h, m] = formatWITA(currentTime).substring(0, 5).replace(/\./g, ':').split(':').map(Number);
       const day = currentTime.getDay();
       let lH = 14, lM = 30; if (day === 5) { lH = 11; lM = 30; } else if (day === 6) { lH = 13; lM = 0; }
       const diff = getMinutesDiff(lH, lM, h, m);
       if (diff < 0) statusKeterangan = ` (Pulang Awal ${Math.abs(diff)} Menit)`;
    }

    setLoading(true);
    try {
      const data = {
        username: currentUser.rawUsername, displayName: currentUser.username, type: absenType,
        timestamp: currentTime.getTime(), dateStr: formatDateIndo(currentTime), timeStr: formatWITA(currentTime).substring(0, 5), photoStr: photo,
        location: location || { lat: 0, lng: 0, manual: true }, distance: dist || 0,
        deviceVerified: true, isServerSynced: true, antiManipulationEnabled: true, timezone: 'WITA'
      };
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'absensi'), data);
      showToast(`Presensi ${absenType} Berhasil!${statusKeterangan}`); setPhoto(null); startCamera(); 
    } catch (e) { showToast("Gagal menyimpan data", "error"); } finally { setLoading(false); }
  };

  // LOGIKA REKAP PRIBADI
  const getPersonalLogs = () => {
    const now = currentTime.getTime(); let limit = now;
    if (rekapTabType === 'harian') limit = new Date(currentTime).setHours(0,0,0,0);
    else if (rekapTabType === 'mingguan') limit = now - (7 * 24 * 60 * 60 * 1000);
    else if (rekapTabType === 'bulanan') limit = now - (30 * 24 * 60 * 60 * 1000);
    else if (rekapTabType === 'triwulan') limit = now - (90 * 24 * 60 * 60 * 1000);
    else if (rekapTabType === 'custom') {
      if (rekapStartDate && rekapEndDate) {
        const start = new Date(rekapStartDate).setHours(0,0,0,0); const end = new Date(rekapEndDate).setHours(23,59,59,999);
        return allHistory.filter(h => h.username === currentUser.rawUsername && h.timestamp >= start && h.timestamp <= end);
      }
      return [];
    }
    return allHistory.filter(h => h.username === currentUser.rawUsername && h.timestamp >= limit);
  };

  const personalLogs = getPersonalLogs();
  
  // Mengelompokkan log berdasarkan tanggal
  const groupedPersonalLogs = personalLogs.reduce((acc, log) => {
    if (!acc[log.dateStr]) acc[log.dateStr] = { dateStr: log.dateStr, timestamp: log.timestamp, logs: [] };
    acc[log.dateStr].logs.push(log);
    return acc;
  }, {});

  let sortedGroupedLogs = Object.values(groupedPersonalLogs).sort((a, b) => b.timestamp - a.timestamp);

  if (rekapFilterStatus !== 'Semua') {
      sortedGroupedLogs = sortedGroupedLogs.filter(g => {
          const inLog = g.logs.find(l => l.type === 'Masuk');
          const outLog = g.logs.find(l => l.type === 'Keluar');
          const special = g.logs.find(l => !['Masuk', 'Keluar'].includes(l.type));
          
          if (['Sakit', 'Cuti', 'Dinas Luar', 'Lepas Piket', 'BKO'].includes(rekapFilterStatus)) return special && special.type === rekapFilterStatus;
          if (rekapFilterStatus === 'Terlambat') return inLog && getLogKeteranganDetail(inLog, new Date(inLog.timestamp)).includes('Terlambat');
          if (rekapFilterStatus === 'Tepat Waktu') return (inLog && getLogKeteranganDetail(inLog, new Date(inLog.timestamp)).includes('Tepat')) || (outLog && getLogKeteranganDetail(outLog, new Date(outLog.timestamp)).includes('Tepat'));
          if (rekapFilterStatus === 'Pulang Awal') return outLog && getLogKeteranganDetail(outLog, new Date(outLog.timestamp)).includes('Pulang Awal');
          
          return true;
      });
  }

  const exportPersonalToExcel = async () => {
    if(sortedGroupedLogs.length === 0) return showToast("Tidak ada data untuk diekspor", "error");
    const exportData = sortedGroupedLogs.map(g => {
        const inLog = g.logs.find(l => l.type === 'Masuk');
        const outLog = g.logs.find(l => l.type === 'Keluar');
        const special = g.logs.find(l => !['Masuk', 'Keluar'].includes(l.type));
        return {
            "Tanggal": g.dateStr,
            "Jam Masuk": inLog ? inLog.timeStr : '-',
            "Keterangan Masuk": inLog ? getLogKeteranganDetail(inLog, new Date(inLog.timestamp)) : '-',
            "Jam Keluar": outLog ? outLog.timeStr : '-',
            "Keterangan Keluar": outLog ? getLogKeteranganDetail(outLog, new Date(outLog.timestamp)) : '-',
            "Status Spesial": special ? special.type : '-'
        };
    });
    try {
      const XLSX = await loadXlsxScript();
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Pribadi");
      XLSX.writeFile(wb, `Rekap_Presensi_${currentUser.username}_${rekapTabType}.xlsx`);
      showToast("Berhasil diekspor ke Excel!");
    } catch (e) { showToast("Gagal mengekspor", "error"); }
  };

  const exportPersonalToWord = () => {
    if(sortedGroupedLogs.length === 0) return showToast("Tidak ada data untuk diekspor", "error");
    let tableRows = sortedGroupedLogs.map(g => {
        const inLog = g.logs.find(l => l.type === 'Masuk'); const outLog = g.logs.find(l => l.type === 'Keluar');
        const special = g.logs.find(l => !['Masuk', 'Keluar'].includes(l.type));
        let inDetail = inLog ? getLogKeteranganDetail(inLog, new Date(inLog.timestamp)) : '';
        let outDetail = outLog ? getLogKeteranganDetail(outLog, new Date(outLog.timestamp)) : '';
        
        let rowContent = `<tr><td style="border: 1px solid black; padding: 8px;">${g.dateStr}</td>`;
        if (special) {
           rowContent += `<td colspan="2" style="border: 1px solid black; padding: 8px; text-align: center; font-weight: bold; color: #d97706;">STATUS: ${special.type.toUpperCase()}</td></tr>`;
        } else {
           rowContent += `<td style="border: 1px solid black; padding: 8px; text-align: center;">${inLog ? inLog.timeStr + `<br><span style="font-size:10px; color:${inDetail.includes('Tepat')?'green':'red'}">${inDetail}</span>` : '-'}</td>`;
           rowContent += `<td style="border: 1px solid black; padding: 8px; text-align: center;">${outLog ? outLog.timeStr + `<br><span style="font-size:10px; color:${outDetail.includes('Tepat')?'green':'red'}">${outDetail}</span>` : '-'}</td></tr>`;
        }
        return rowContent;
    }).join('');
    
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Rekap Presensi Pribadi</title></head><body><h2 style="text-align: center; font-family: sans-serif;">Rekapitulasi Presensi: ${currentUser.username}</h2><p style="text-align: center; font-family: sans-serif;">Periode: ${rekapTabType.toUpperCase()}</p><table style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px;"><thead><tr><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Tanggal</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Masuk</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Keluar</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = `Rekap_Presensi_${currentUser.username}_${rekapTabType}.doc`; a.click(); showToast("Diekspor ke Word!");
  };

  const handlePrintPersonal = () => {
    if(sortedGroupedLogs.length === 0) return showToast("Tidak ada data untuk dicetak", "error");
    let tableRows = sortedGroupedLogs.map(g => {
        const inLog = g.logs.find(l => l.type === 'Masuk'); const outLog = g.logs.find(l => l.type === 'Keluar');
        const special = g.logs.find(l => !['Masuk', 'Keluar'].includes(l.type));
        let inDetail = inLog ? getLogKeteranganDetail(inLog, new Date(inLog.timestamp)) : '';
        let outDetail = outLog ? getLogKeteranganDetail(outLog, new Date(outLog.timestamp)) : '';
        
        let rowContent = `<tr><td>${g.dateStr}</td>`;
        if (special) {
           rowContent += `<td colspan="2" style="font-weight: bold; color: #d97706;">STATUS: ${special.type.toUpperCase()}</td></tr>`;
        } else {
           rowContent += `<td>${inLog ? `<img src="${inLog.photoStr}"/> <div>${inLog.timeStr}</div> <span class="detail ${inDetail.includes('Tepat')?'ontime':'late'}">${inDetail}</span>` : '-'}</td>`;
           rowContent += `<td>${outLog ? `<img src="${outLog.photoStr}"/> <div>${outLog.timeStr}</div> <span class="detail ${outDetail.includes('Tepat')?'ontime':'late'}">${outDetail}</span>` : '-'}</td></tr>`;
        }
        return rowContent;
    }).join('');
    
    let tableHtml = `<table><thead><tr><th>Tanggal</th><th>Masuk</th><th>Keluar</th></tr></thead><tbody>${tableRows}</tbody></table>`;
    printHTMLTable(`Rekap Presensi - ${currentUser.username} (${rekapTabType.toUpperCase()})`, tableHtml);
  };

  const handleCopyPersonal = () => {
    if(sortedGroupedLogs.length === 0) return showToast("Tidak ada data untuk disalin", "error");
    let text = `Tanggal\tJam Masuk\tKeterangan Masuk\tJam Keluar\tKeterangan Keluar\n`;
    sortedGroupedLogs.forEach(g => {
        const inLog = g.logs.find(l => l.type === 'Masuk'); const outLog = g.logs.find(l => l.type === 'Keluar');
        const special = g.logs.find(l => !['Masuk', 'Keluar'].includes(l.type));
        if (special) {
           text += `${g.dateStr}\tSTATUS:\t${special.type}\t-\t-\n`;
        } else {
           text += `${g.dateStr}\t${inLog ? inLog.timeStr : '-'}\t${inLog ? getLogKeteranganDetail(inLog, new Date(inLog.timestamp)) : '-'}\t${outLog ? outLog.timeStr : '-'}\t${outLog ? getLogKeteranganDetail(outLog, new Date(outLog.timestamp)) : '-'}\n`;
        }
    });
    copyToClipboard(text, showToast);
  };

  const handleImportPersonal = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext !== 'xlsx') {
       showToast("Hanya file Excel format .xlsx yang diizinkan untuk diimpor!", "error");
       e.target.value = null; 
       return;
    }
    
    setLoading(true);
    try {
        const XLSX = await loadXlsxScript();
        const reader = new FileReader();
        reader.onload = async (event) => {
            const data = event.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            const batch = writeBatch(db);
            let count = 0;
            json.forEach(row => {
                const tanggal = row.Tanggal || row.tanggal || row.Date || row.date;
                const waktu = row['Jam Masuk'] || row['Jam Keluar'] || row.Waktu || row.waktu || row.Time || row.time;
                const status = row['Status Spesial'] || row.Status || row.status || row.Keterangan || row.keterangan || 'Masuk';
                if (tanggal && waktu) {
                    const targetDate = new Date(tanggal);
                    const [h, m] = String(waktu).replace(/\./g, ':').split(':').map(Number);
                    targetDate.setHours(h || 0, m || 0, 0, 0);
                    const docRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'absensi'));
                    batch.set(docRef, {
                        username: currentUser.rawUsername, displayName: currentUser.username, type: status,
                        timestamp: targetDate.getTime(), dateStr: formatDateIndo(targetDate), timeStr: String(waktu), photoStr: null,
                        location: { manual: true, lat: locationConfig.lat, lng: locationConfig.lng }, distance: 0, 
                        deviceVerified: true, isServerSynced: true, antiManipulationEnabled: true, timezone: 'WITA', isAuto: true
                    });
                    count++;
                }
            });
            if(count > 0) { await batch.commit(); showToast(`Impor ${count} data presensi berhasil!`); } 
            else { showToast("Gagal: Pastikan tabel memiliki kolom Tanggal dan Jam Masuk/Waktu", "error"); }
        };
        reader.readAsBinaryString(file);
    } catch(err) { showToast("Gagal membaca file Excel", "error"); }
    finally { setLoading(false); e.target.value = null; }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <canvas ref={canvasRef} className="hidden" />
        <div className="glass-card p-6 md:p-10 rounded-[3rem] relative overflow-hidden shadow-2xl">
          <h3 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-500 mb-6 flex items-center gap-2"><Camera size={14} className="text-blue-600"/> Verifikasi Biometrik Wajah</h3>
          <div className="aspect-[3/4] md:aspect-video bg-slate-900 rounded-[2rem] overflow-hidden relative border-4 border-slate-200 dark:border-slate-800 shadow-inner">
            {!photo ? (
              <><video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover scale-x-[-1] ${isCameraActive ? 'block' : 'hidden'}`} />
                {!isCameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-10 p-6 text-center">
                    <Camera size={40} className="text-slate-500 mb-4" />
                    <p className="text-[9px] font-bold text-slate-400 mb-6 uppercase tracking-widest leading-relaxed">Kamera dalam status siaga<br/>Klik untuk memberikan izin</p>
                    <button onClick={startCamera} className="px-6 py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest btn-3d hover:scale-105 transition-transform">Izinkan & Buka Kamera</button>
                  </div>
                )}
                {isScanning && <div className="laser-line"></div>}
                {livenessStatus && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-blue-600/90 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest z-20 whitespace-nowrap animate-pulse border border-white/20 shadow-2xl backdrop-blur-sm">
                    {livenessStatus}
                  </div>
                )}
              </>
            ) : <img src={photo} className="w-full h-full object-cover" alt="Captured" />}
          </div>
          <button onClick={photo ? () => {setPhoto(null); startCamera();} : (isCameraActive ? processLivenessAndCapture : startCamera)} className="w-full mt-8 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest btn-3d transition-all hover:brightness-110">
            {photo ? 'Ambil Ulang Foto' : (isCameraActive ? 'Pindai Wajah & Liveness' : 'Nyalakan Kamera')}
          </button>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 md:p-8 rounded-[2.5rem] shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-500 mb-6 flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2"><MapPin size={14} className={isTrackingLocation ? "text-emerald-500 animate-pulse" : "text-blue-600"}/> Verifikasi Lokasi Pegawai {isTrackingLocation && "(LIVE)"}</span>
              {canBypassGps && <span className="text-[8px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full uppercase font-black tracking-widest">Bypass GPS Aktif</span>}
            </h3>
            <div className="aspect-video bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center border-4 border-slate-200 dark:border-slate-800 shadow-inner relative overflow-hidden">
              {location ? (
                <iframe title="Peta Lokasi" src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&t=k&z=18&output=embed`} className="absolute inset-0 w-full h-full opacity-80 dark:opacity-70 pointer-events-none" frameBorder="0" />
              ) : (
                <div className="text-center p-6 opacity-40"><MapPinOff size={40} className="text-rose-600 mx-auto mb-4"/><p className="text-rose-600 text-[10px] font-black uppercase tracking-widest">GPS Belum Terdeteksi</p></div>
              )}
              {isTrackingLocation && (
                <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                  <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
                  <span className="text-[7px] font-black uppercase tracking-widest text-emerald-500 bg-slate-900/80 px-2 py-0.5 rounded-full backdrop-blur-sm">Live</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-2">
              <span className="text-blue-600 text-lg leading-none">💡</span>
              <p>Pastikan Anda berada di luar ruangan agar satelit GPS mudah terkunci secara akurat. Hindari penggunaan Fake GPS karena sistem akan otomatis memblokir Anda.</p>
            </div>

            {location && (
              <>
                <div className="mt-4 bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  <div className="flex items-center gap-3">
                    <Activity size={24} className={`${isTrackingLocation ? 'text-emerald-500 animate-bounce' : 'text-blue-500'} shrink-0`}/>
                    <div>
                      <p className="text-slate-900 dark:text-white font-black text-xs md:text-sm tracking-tight leading-none">GPS Terkunci</p>
                      <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-mono leading-none">Lat: {location.lat.toFixed(5)} | Lng: {location.lng.toFixed(5)}</p>
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl text-center">Jarak dari Lapas Kalabahi: {dist ? (dist * 1000).toFixed(0) : 0} Meter</p>
                </div>
              </>
            )}

            {isFakeGpsBlocked && !canBypassGps && (
              <div className="mt-4 bg-rose-100 dark:bg-rose-900/30 p-4 rounded-2xl border border-rose-500 shadow-sm flex items-center gap-3 animate-in slide-in-from-top">
                 <ShieldAlert size={24} className="text-rose-600 animate-bounce shrink-0"/>
                 <div>
                    <p className="text-rose-600 font-black text-xs uppercase">Akses Diblokir Sistem</p>
                    <p className="text-rose-600/80 text-[9px] font-bold mt-1">Pergerakan {'>'}10KM / menit terdeteksi. Indikasi Fake GPS.</p>
                 </div>
              </div>
            )}

            {!canBypassGps && (
              <button onClick={toggleLocationTracking} className={`w-full mt-6 py-4 glass-card rounded-2xl font-black text-[9px] uppercase btn-3d transition-all shadow-md ${isTrackingLocation ? 'bg-slate-100 text-rose-600 dark:bg-slate-950 dark:text-rose-500' : 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white'}`}>
                {isTrackingLocation ? 'Hentikan Lacak GPS' : 'Mulai Lacak GPS Real-Time (Peta)'}
              </button>
            )}
          </div>

          <div className="glass-card p-6 md:p-8 rounded-[2.5rem] flex flex-col md:flex-row gap-4 items-center border border-blue-500/10 shadow-lg">
            <select value={absenType} onChange={e => setAbsenType(e.target.value)} className="w-full md:flex-1 p-4 bg-slate-100 dark:bg-slate-900 border-none rounded-2xl font-black text-xs text-center outline-none cursor-pointer text-slate-950 dark:text-white shadow-inner">
              {['Masuk', 'Keluar', 'Lepas Piket', 'Sakit', 'Cuti', 'Dinas Luar', 'BKO'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button disabled={!photo || loading || !isSynced} onClick={submitAbsenClick} className="w-full md:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] btn-3d shadow-xl shadow-blue-600/30 disabled:opacity-30 disabled:scale-100 transition-all active:scale-95">
              {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : `Lapor ${absenType}`}
            </button>
          </div>
        </div>
      </div>

      {/* REKAPITULASI PRIBADI */}
      <div className="glass-card rounded-[3rem] p-8 md:p-10 shadow-2xl overflow-hidden mt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h3 className="text-2xl font-black text-slate-950 dark:text-white flex items-center gap-3"><CalendarDays size={24} className="text-blue-600"/> Rekapitulasi Presensi Pribadi</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-2 tracking-widest">Laporan Rinci Aktivitas Absensi Anda</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {currentUser.role === 'admin' && (
                <>
                  <input type="file" accept=".xlsx" ref={importFileInputRef} onChange={handleImportPersonal} className="hidden" />
                  <button onClick={() => importFileInputRef.current.click()} disabled={loading} className="px-4 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-transform flex items-center gap-2" title="Impor Data Pribadi (Admin Only)"><Upload size={14}/> Impor</button>
                </>
              )}
              <button onClick={handleCopyPersonal} className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-black text-[9px] uppercase hover:scale-105 transition-transform flex items-center gap-2" title="Copy Tabel"><Copy size={14}/> Copy</button>
              <button onClick={handlePrintPersonal} className="px-4 py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-transform flex items-center gap-2" title="Cetak Tabel"><Printer size={14}/> Print</button>
              <button onClick={exportPersonalToExcel} className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-transform flex items-center gap-2" title="Eksport ke Excel .xlsx"><FileSpreadsheet size={14}/> Excel (.xlsx)</button>
              <button onClick={exportPersonalToWord} className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-transform flex items-center gap-2" title="Eksport ke Word"><FileText size={14}/> Word</button>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-slate-100 dark:border-slate-800">
            <select value={rekapTabType} onChange={e => setRekapTabType(e.target.value)} className="p-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer focus:border-blue-500 transition-colors">
              <option value="harian">Harian (Hari Ini)</option><option value="mingguan">Mingguan (7 Hari)</option><option value="bulanan">Bulanan (30 Hari)</option><option value="triwulan">Triwulan (90 Hari)</option><option value="custom">Pilih Manual</option>
            </select>
            {rekapTabType === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={rekapStartDate} onChange={e => setRekapStartDate(e.target.value)} className="p-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase border border-slate-200 dark:border-slate-800 shadow-sm dark:[color-scheme:dark] outline-none" /> 
                <span className="text-xs font-bold text-slate-500">-</span> 
                <input type="date" value={rekapEndDate} onChange={e => setRekapEndDate(e.target.value)} className="p-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase border border-slate-200 dark:border-slate-800 shadow-sm dark:[color-scheme:dark] outline-none" />
              </div>
            )}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>
            <div className="relative w-full sm:w-auto flex-1">
               <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <select value={rekapFilterStatus} onChange={e => setRekapFilterStatus(e.target.value)} className="w-full pl-9 pr-3 py-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer focus:border-blue-500 transition-colors appearance-none">
                   <option value="Semua">Semua Keterangan</option><option value="Tepat Waktu">Tepat Waktu</option><option value="Terlambat">Terlambat</option><option value="Pulang Awal">Pulang Awal</option><option value="Sakit">Sakit</option><option value="Cuti">Cuti</option><option value="Dinas Luar">Dinas Luar</option><option value="Lepas Piket">Lepas Piket</option><option value="BKO">BKO</option>
               </select>
            </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-500 uppercase text-[9px] font-black tracking-widest">
                 <tr>
                    <th className="px-6 py-5 rounded-l-2xl">Tanggal</th>
                    <th className="px-6 py-5 text-center">Masuk</th>
                    <th className="px-6 py-5 text-center rounded-r-2xl">Keluar</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {sortedGroupedLogs.length === 0 ? (
                    <tr><td colSpan="3" className="px-6 py-10 text-center opacity-50"><p className="text-[10px] font-black uppercase tracking-widest">Tidak ada data di periode ini</p></td></tr>
                 ) : (
                    sortedGroupedLogs.map((g, idx) => {
                       const inLog = g.logs.find(l => l.type === 'Masuk');
                       const outLog = g.logs.find(l => l.type === 'Keluar');
                       const special = g.logs.find(l => !['Masuk', 'Keluar'].includes(l.type));
                       
                       return (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                             <td className="px-6 py-6 font-bold text-xs text-slate-900 dark:text-white">{g.dateStr}</td>
                             {special ? (
                                <td colSpan="2" className="px-6 py-6 text-center">
                                   <span className="px-4 py-2 rounded-full text-[10px] font-black tracking-widest bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">STATUS: {special.type.toUpperCase()}</span>
                                </td>
                             ) : (
                                <>
                                   <td className="px-6 py-6">
                                      <div className="flex flex-col items-center gap-2">
                                         {inLog ? (
                                            <>
                                               {inLog.photoStr ? <img src={inLog.photoStr} className="w-14 h-14 object-cover rounded-xl border-2 border-emerald-500 shadow-sm" alt="Masuk"/> : <div className="w-14 h-14 bg-slate-200 rounded-xl"></div>}
                                               <span className="text-xs font-black text-slate-900 dark:text-white">{inLog.timeStr} WITA</span>
                                               <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${getLogKeteranganDetail(inLog, new Date(inLog.timestamp)).includes('Tepat') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>{getLogKeteranganDetail(inLog, new Date(inLog.timestamp))}</span>
                                            </>
                                         ) : <span className="text-slate-400 font-bold">-</span>}
                                      </div>
                                   </td>
                                   <td className="px-6 py-6">
                                      <div className="flex flex-col items-center gap-2">
                                         {outLog ? (
                                            <>
                                               {outLog.photoStr ? <img src={outLog.photoStr} className="w-14 h-14 object-cover rounded-xl border-2 border-rose-500 shadow-sm" alt="Keluar"/> : <div className="w-14 h-14 bg-slate-200 rounded-xl"></div>}
                                               <span className="text-xs font-black text-slate-900 dark:text-white">{outLog.timeStr} WITA</span>
                                               <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${getLogKeteranganDetail(outLog, new Date(outLog.timestamp)).includes('Tepat') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>{getLogKeteranganDetail(outLog, new Date(outLog.timestamp))}</span>
                                            </>
                                         ) : <span className="text-slate-400 font-bold">-</span>}
                                      </div>
                                   </td>
                                </>
                             )}
                          </tr>
                       )
                    })
                 )}
              </tbody>
           </table>
        </div>
      </div>
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}

// ==========================================
// VIEW: RIWAYAT ABSENSI
// ==========================================
function HistoryList({ history, currentUser, locationConfig, db, appId, showToast }) {
  const [editingLog, setEditingLog] = useState(null); 
  const [cancelLogTarget, setCancelLogTarget] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const filteredHistory = history.filter(item => 
    item.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayHistory = currentUser.role === 'admin' ? filteredHistory.slice(0, 100) : filteredHistory.slice(0, 20);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(displayHistory.map(h => h.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id, isChecked) => {
    if (isChecked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      title: "Hapus Massal", message: `Yakin menghapus ${selectedIds.length} data absensi yang dipilih? Tindakan ini tidak bisa dibatalkan.`, isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const batch = writeBatch(db);
          selectedIds.forEach(id => {
            const ref = doc(db, 'artifacts', appId, 'public', 'data', 'absensi', id);
            batch.delete(ref);
          });
          await batch.commit();
          showToast(`${selectedIds.length} data berhasil dihapus`);
          setSelectedIds([]);
        } catch (e) { showToast("Gagal menghapus data massal", "error"); }
      }
    });
  };

  const getLogKeterangan = (item) => {
    if (item.type === 'Masuk') {
        const [h, m] = item.timeStr.replace(/\./g, ':').split(':').map(Number);
        const diff = getMinutesDiff(7, 30, h, m);
        if (diff > 0) return `Terlambat ${diff} Menit`;
        return 'Tepat Waktu';
    }
    if (item.type === 'Keluar') {
        const [h, m] = item.timeStr.replace(/\./g, ':').split(':').map(Number);
        const day = new Date(item.timestamp).getDay();
        let lH = 14, lM = 30; if (day === 5) { lH = 11; lM = 30; } else if (day === 6) { lH = 13; lM = 0; }
        const diff = getMinutesDiff(lH, lM, h, m);
        if (diff < 0) return `Pulang Awal ${Math.abs(diff)} Menit`;
        return 'Tepat Waktu';
    }
    return '';
  };

  return (
    <div className="space-y-4">
      {currentUser.role === 'admin' && ( <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center gap-3 mb-6"><AlertTriangle size={20} className="text-amber-600 shrink-0" /><p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Akses Admin: Fitur Pengeditan & Pembatalan Aktif</p></div> )}
      
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-center">
        <div className="relative w-full md:w-1/2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari Nama atau NIP Pegawai..." className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold shadow-sm focus:border-blue-500 outline-none transition-colors" />
        </div>
        
        {currentUser.role === 'admin' && displayHistory.length > 0 && (
          <div className="flex items-center gap-4 w-full md:w-auto p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === displayHistory.length && displayHistory.length > 0} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
              <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">Pilih Semua</span>
            </label>
            {selectedIds.length > 0 && (
              <button onClick={handleBulkDelete} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase btn-3d shrink-0">Hapus {selectedIds.length} Data</button>
            )}
          </div>
        )}
      </div>

      {displayHistory.length === 0 && <div className="p-20 text-center opacity-30"><History size={60} className="mx-auto mb-6 text-slate-400" /><p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Tidak ada data ditemukan</p></div>}

      {displayHistory.map(item => (
        <div key={item.id} className="p-4 md:p-5 glass-card rounded-2xl flex flex-col md:flex-row md:items-center justify-between border border-white/5 transition-transform hover:translate-x-1 gap-4">
          <div className="flex items-center gap-4">
            {currentUser.role === 'admin' && (
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => toggleSelect(item.id, e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mr-2 shrink-0 cursor-pointer" />
            )}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0 ${item.type === 'Masuk' ? 'bg-emerald-500/10 text-emerald-600' : (['Sakit','Cuti','BKO','Dinas Luar'].includes(item.type) ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600')}`}>
              {item.type === 'Masuk' ? <LogIn size={20}/> : (item.type === 'Keluar' ? <LogOut size={20}/> : <FileText size={20}/>)}
            </div>
            <div className="text-left">
              <p className="font-black text-sm text-slate-950 dark:text-white leading-none">{item.displayName}</p>
              <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-1 uppercase">NIP. {item.username}</p>
              <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase flex flex-wrap items-center gap-1.5"><span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-blue-600 font-black">{item.timeStr} WITA</span> {item.dateStr} <span className="opacity-50">|</span> <span className="text-slate-900 dark:text-slate-300 font-black">{item.type}</span> {['Masuk', 'Keluar'].includes(item.type) && <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${getLogKeterangan(item).includes('Tepat') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>{getLogKeterangan(item)}</span>}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 shrink-0">
            {currentUser.role === 'admin' && (
              <div className="flex gap-2 mr-2">
                <button onClick={() => setEditingLog(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:scale-110 transition-transform" title="Edit Log"><Edit size={14}/></button>
                <button onClick={() => setCancelLogTarget(item)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:scale-110 transition-transform flex items-center gap-1" title="Batalkan & Kirim Notif"><X size={14}/><span className="text-[8px] font-black uppercase tracking-widest hidden lg:block">Batalkan</span></button>
              </div>
            )}
            {item.photoStr ? <img src={item.photoStr} className="w-12 h-12 rounded-xl object-cover" alt="Log" /> : <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 opacity-50 flex items-center justify-center"><User size={16} className="text-slate-400"/></div>}
          </div>
        </div>
      ))}
      {editingLog && <AdminEditHistoryModal log={editingLog} locationConfig={locationConfig} db={db} appId={appId} onClose={() => setEditingLog(null)} showToast={showToast} />}
      {cancelLogTarget && <AdminCancelModal log={cancelLogTarget} db={db} appId={appId} onClose={() => setCancelLogTarget(null)} showToast={showToast} />}
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}

function AdminCancelModal({ log, db, appId, onClose, showToast }) {
  const [reason, setReason] = useState(''); const [loading, setLoading] = useState(false);
  const handleCancel = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return showToast("Alasan pembatalan wajib diisi!", "error");
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absensi', log.id));
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'pesan'), {
        senderNip: 'admin', senderName: 'Sistem Admin Lapas', receiverNip: log.username, receiverName: log.displayName,
        message: `⚠️ PEMBERITAHUAN: Absensi Anda (${log.type} pada ${log.dateStr} Jam ${log.timeStr}) telah dibatalkan oleh Admin.\nAlasan: ${reason}`,
        timestamp: Date.now(), isRead: false
      });
      showToast("Absensi dibatalkan & Notifikasi terkirim!"); onClose();
    } catch(err) { showToast("Gagal memproses", "error"); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in">
        <X size={40} className="text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-1 text-center text-slate-950 dark:text-white">Batalkan Absen</h2>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-6 text-center">Untuk {log.displayName}</p>
        <form onSubmit={handleCancel} className="space-y-4 text-left">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-rose-500 font-bold dark:text-white shadow-inner text-slate-950 resize-none" placeholder="Tuliskan alasan pembatalan untuk dikirim sebagai notifikasi..." />
          <button type="submit" disabled={loading} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] mt-4 shadow-xl hover:scale-105 transition-transform btn-3d">{loading ? 'Memproses...' : 'Hapus & Kirim Pesan'}</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase mt-2">Tutup</button>
        </form>
      </div>
    </div>
  );
}

function AdminEditHistoryModal({ log, locationConfig, db, appId, onClose, showToast }) {
  const [type, setType] = useState(log.type); const [isSubmitting, setIsSubmitting] = useState(false);
  const dObj = new Date(log.timestamp || Date.now());
  const initialDate = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
  const [editStartDate, setEditStartDate] = useState(initialDate); const [editEndDate, setEditEndDate] = useState(initialDate); const [editTime, setEditTime] = useState(log.timeStr);

  const handleUpdate = async (e) => { 
    e.preventDefault(); setIsSubmitting(true);
    try { 
      const start = new Date(editStartDate); const end = new Date(editEndDate);
      if (end < start) { showToast("Tanggal selesai salah!", "error"); setIsSubmitting(false); return; }

      const [hour, minute] = editTime.replace(/\./g, ':').split(':').map(Number);
      let currentDate = new Date(start); let isFirst = true;

      while (currentDate <= end) {
        const targetDate = new Date(currentDate); targetDate.setHours(hour, minute, 0, 0);
        const dateStr = formatDateIndo(targetDate); const ts = targetDate.getTime();
        if (isFirst) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absensi', log.id), { type, timeStr: editTime, dateStr: dateStr, timestamp: ts }); isFirst = false; } 
        else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'absensi'), { username: log.username, displayName: log.displayName, type, timestamp: ts, dateStr: dateStr, timeStr: editTime, photoStr: log.photoStr || null, location: log.location || { manual: true, lat: locationConfig.lat, lng: locationConfig.lng }, distance: log.distance || 0, deviceVerified: true, isServerSynced: true, antiManipulationEnabled: true, timezone: 'WITA', isAuto: true }); }
        currentDate.setDate(currentDate.getDate() + 1); 
      }
      showToast(start.getTime() === end.getTime() ? "Berhasil diperbarui!" : "Data massal berhasil dibuat!"); onClose(); 
    } catch (err) { showToast("Gagal menyimpan", "error"); } finally { setIsSubmitting(false); }
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full text-center shadow-2xl animate-in zoom-in">
        <Edit size={40} className="text-blue-500 mx-auto mb-4" /><h2 className="text-xl font-black mb-6 text-slate-950 dark:text-white">Edit Absensi</h2>
        <form onSubmit={handleUpdate} className="space-y-4 text-left">
          <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 ml-2">Pilih Status</label><select value={type} onChange={e=>setType(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold">{['Masuk','Keluar','Lepas Piket','Sakit','Cuti','Dinas Luar','BKO'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 ml-2">Mulai</label><input type="date" value={editStartDate} onChange={e=>setEditStartDate(e.target.value)} className="w-full px-4 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-[10px] font-bold uppercase dark:[color-scheme:dark]" /></div><div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 ml-2">Selesai</label><input type="date" value={editEndDate} onChange={e=>setEditEndDate(e.target.value)} min={editStartDate} className="w-full px-4 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-[10px] font-bold uppercase dark:[color-scheme:dark]" /></div></div>
          <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 ml-2">Tentukan Waktu</label><input type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold dark:[color-scheme:dark]" /></div>
          <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] btn-3d mt-4">{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase">Batal</button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// VIEW: LAPORAN (REKAPITULASI & RANKING 5 TERBAIK/TERBURUK)
// ==========================================
function RekapView({ currentUser, allHistory, pegawaiList, waConfig, setWaConfig, showToast, db, appId }) {
  const [mainTab, setMainTab] = useState('rekap'); const [rekapType, setRekapType] = useState('harian'); 
  const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [isImporting, setIsImporting] = useState(false);
  const [showWASettings, setShowWASettings] = useState(false);
  const importLaporanRef = useRef(null);
  const bidangs = ["KALAPAS", "Tata Usaha", "KPLP", "Adm Kamtib", "Binadikgiatja"];
  
  const todayObj = new Date(); const todayStr = formatDateIndo(todayObj);

  const handleImportLaporan = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext !== 'xlsx') {
      showToast("Hanya file Excel format .xlsx yang diizinkan!", "error");
      e.target.value = null; return;
    }
    
    setIsImporting(true);
    showToast("Memproses data impor...");
    try {
      const XLSX = await loadXlsxScript();
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const batch = writeBatch(db);
        let count = 0;
        
        json.forEach(row => {
            const nip = row.NIP || row.nip;
            const tanggal = row.Tanggal || row.tanggal || row.Date || row.date;
            const waktu = row.Waktu || row.waktu || row['Jam Masuk'] || row['Jam Keluar'] || row.Time || row.time;
            const status = row.Status || row.status || row.Keterangan || row.keterangan || 'Masuk';
            
            if (nip && tanggal && waktu) {
                const peg = pegawaiList.find(p => p.nip === String(nip).trim());
                if(peg) {
                    const targetDate = new Date(tanggal);
                    const [h, m] = String(waktu).replace(/\./g, ':').split(':').map(Number);
                    targetDate.setHours(h || 0, m || 0, 0, 0);
                    
                    const docRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'absensi'));
                    batch.set(docRef, {
                        username: peg.nip, displayName: peg.nama, type: status,
                        timestamp: targetDate.getTime(), dateStr: formatDateIndo(targetDate), timeStr: String(waktu), photoStr: null,
                        location: { manual: true, lat: 0, lng: 0 }, distance: 0, 
                        deviceVerified: true, isServerSynced: true, antiManipulationEnabled: true, timezone: 'WITA', isAuto: true, adminFilled: true
                    });
                    count++;
                }
            }
        });
        
        if(count > 0) { await batch.commit(); showToast(`Impor Laporan: ${count} data presensi berhasil!`); } 
        else { showToast("Gagal: Pastikan tabel memiliki kolom NIP, Tanggal, dan Waktu", "error"); }
      };
      reader.readAsBinaryString(file);
    } catch(err) { showToast("Gagal membaca file Excel", "error"); }
    finally { setIsImporting(false); e.target.value = null; }
  };

  const getFilteredLogs = () => {
    const now = todayObj.getTime(); let limit = now;
    if (mainTab === 'ranking') return allHistory;
    
    if (rekapType === 'harian') return allHistory.filter(h => h.dateStr === todayStr);
    if (rekapType === 'mingguan') limit = now - (7 * 24 * 60 * 60 * 1000);
    if (rekapType === 'bulanan') limit = now - (30 * 24 * 60 * 60 * 1000);
    if (rekapType === 'triwulan') limit = now - (90 * 24 * 60 * 60 * 1000);
    if (rekapType === 'custom') {
      if (startDate && endDate) {
        const start = new Date(startDate).setHours(0,0,0,0); const end = new Date(endDate).setHours(23,59,59,999);
        return allHistory.filter(h => h.timestamp >= start && h.timestamp <= end);
      }
      return [];
    }
    return allHistory.filter(h => h.timestamp >= limit);
  };

  const getDateRangeText = () => {
    const now = todayObj; let startD = todayObj;
    if (rekapType === 'harian') { startD = now; } else if (rekapType === 'mingguan') { startD = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); } else if (rekapType === 'bulanan') { startD = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); } else if (rekapType === 'triwulan') { startD = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); } else { return null; }
    const formatShort = (d) => d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    if (rekapType === 'harian') return formatShort(now); return `${formatShort(startD)} - ${formatShort(now)}`;
  };

  const now = todayObj.getTime(); let rStart = new Date(todayObj); let rEnd = new Date(todayObj);
  if (rekapType === 'harian') { rStart = new Date(now); } else if (rekapType === 'mingguan') { rStart = new Date(now - (7 * 24 * 60 * 60 * 1000)); } else if (rekapType === 'bulanan') { rStart = new Date(now - (30 * 24 * 60 * 60 * 1000)); } else if (rekapType === 'triwulan') { rStart = new Date(now - (90 * 24 * 60 * 60 * 1000)); } else if (rekapType === 'custom' && startDate && endDate) { rStart = new Date(startDate); rEnd = new Date(endDate); } else { rStart = new Date(now - (30 * 24 * 60 * 60 * 1000)); }
  rStart.setHours(0, 0, 0, 0); rEnd.setHours(23, 59, 59, 999);

  const filteredLogs = getFilteredLogs(); const isDaily = rekapType === 'harian';

  const getStatusKompleks = (logs, dateObj) => {
    if (logs.length === 0) return { label: 'TANPA KETERANGAN', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', isBad: true };
    const special = logs.find(l => ['Sakit', 'Cuti', 'Dinas Luar', 'Lepas Piket', 'BKO'].includes(l.type));
    if (special) return { label: special.type.toUpperCase(), class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', isBad: false };
    
    const inLog = logs.find(l => l.type === 'Masuk'); const outLog = logs.find(l => l.type === 'Keluar'); const day = dateObj.getDay();
    let labels = []; let isBad = false;

    if (inLog) {
      const [h, m] = inLog.timeStr.replace(/\./g, ':').split(':').map(Number); const diff = getMinutesDiff(7, 30, h, m);
      if (diff > 0) { labels.push(`Terlambat ${diff} Menit`); isBad = true; } else { labels.push('Tepat Waktu (Masuk)'); }
    }
    if (outLog) {
      const [h, m] = outLog.timeStr.replace(/\./g, ':').split(':').map(Number); let lH = 14, lM = 30; if (day === 5) { lH = 11; lM = 30; } else if (day === 6) { lH = 13; lM = 0; }
      const diff = getMinutesDiff(lH, lM, h, m); if (diff < 0) { labels.push(`Pulang Awal ${Math.abs(diff)} Menit`); isBad = true; }
      else if (!inLog) { labels.push('Tepat Waktu (Keluar)'); }
    }
    
    if (!labels.length) return { label: 'AKTIF', class: 'bg-slate-100 text-slate-800 dark:bg-slate-800' };
    return { label: labels.join(' | '), class: isBad ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400', isBad };
  };

  const getRekapStats = (userLogs) => {
    let m = 0, lp = 0, sk = 0, ct = 0, dl = 0, bko = 0, tk = 0, tlat = 0, pawal = 0;
    let currD = new Date(rStart); const todayMid = new Date(todayObj).setHours(23,59,59,999);
    while(currD <= rEnd) {
      if(currD.getDay() !== 0 && currD.getTime() <= todayMid) {
        const dailyLogs = userLogs.filter(l => l.dateStr === formatDateIndo(currD));
        if (dailyLogs.length === 0) { tk++; }
        else {
          const special = dailyLogs.find(l => ['Sakit', 'Cuti', 'Dinas Luar', 'Lepas Piket', 'BKO'].includes(l.type));
          if (special) {
            if (special.type === 'Sakit') sk++;
            else if (special.type === 'Cuti') ct++;
            else if (special.type === 'Dinas Luar') dl++;
            else if (special.type === 'Lepas Piket') lp++;
            else if (special.type === 'BKO') bko++;
          } else {
            const inLog = dailyLogs.find(l => l.type === 'Masuk');
            if (inLog) m++;
            const stat = getStatusKompleks(dailyLogs, currD);
            if (stat.label.includes('Terlambat')) tlat++;
            if (stat.label.includes('Pulang Awal')) pawal++;
          }
        }
      }
      currD.setDate(currD.getDate() + 1);
    }
    return { m, lp, sk, ct, dl, bko, tk, tlat, pawal };
  };

  const calculateRanking = () => {
    const rangeLogs = allHistory.filter(h => h.timestamp >= rStart.getTime() && h.timestamp <= rEnd.getTime());
    const pegawaiRanking = pegawaiList.filter(p => !p.nama.includes('GELORA KURNIAWAN'));
    const todayMid = new Date(todayObj).setHours(0,0,0,0);
    
    const scores = pegawaiRanking.map(p => {
      const logs = rangeLogs.filter(l => l.username === p.nip);
      let tepat = 0, bad = 0, tk = 0, sakit = 0;
      
      let currD = new Date(rStart);
      while(currD <= rEnd) {
        if(currD.getDay() !== 0 && currD.getTime() <= todayMid) {
          const dailyLogs = logs.filter(l => l.dateStr === formatDateIndo(currD));
          const specialSakit = dailyLogs.find(l => l.type === 'Sakit');
          if(specialSakit) sakit++;

          const st = getStatusKompleks(dailyLogs, currD);
          if (st.label === 'TANPA KETERANGAN') tk++;
          else if (st.isBad) bad++;
          else if (st.label.includes('Tepat')) tepat++;
        }
        currD.setDate(currD.getDate() + 1);
      }
      
      let pinaltiSakit = sakit > 2 ? (sakit - 2) * 5 : 0;
      let score = (tepat * 2) - (bad * 2) - (tk * 4) - pinaltiSakit;
      return { p, tepat, bad, tk, sakit, score };
    });

    const bestCandidates = scores.filter(s => s.tk === 0 && s.bad === 0 && s.sakit <= 2 && s.tepat > 0);
    const best = bestCandidates.sort((a, b) => b.score - a.score).slice(0, 5);
    const worstCandidates = scores.filter(s => s.tk > 0 || s.bad > 0 || s.sakit > 2);
    const worst = worstCandidates.sort((a, b) => a.score - b.score).slice(0, 5);

    return { best, worst };
  };

  const rankData = mainTab === 'ranking' ? calculateRanking() : null;

  const exportRekapToExcel = async () => {
    let exportData = [];
    bidangs.forEach(bidang => {
      pegawaiList.filter(p => p.bidang === bidang).forEach(p => {
        const logs = filteredLogs.filter(l => l.username === p.nip);
        if (isDaily) {
          const inLog = logs.find(l => l.type === 'Masuk'); const outLog = logs.find(l => l.type === 'Keluar'); const status = getStatusKompleks(logs, todayObj);
          const inKet = inLog ? getLogKeteranganDetail(inLog, todayObj) : '';
          const outKet = outLog ? getLogKeteranganDetail(outLog, todayObj) : '';
          exportData.push({ "NIP": p.nip, "Nama": p.nama, "Bidang": bidang, "Masuk": inLog ? `${inLog.timeStr} (${inKet})` : '-', "Keluar": outLog ? `${outLog.timeStr} (${outKet})` : '-', "Status Akhir": status.label });
        } else {
          const s = getRekapStats(logs);
          exportData.push({ "NIP": p.nip, "Nama": p.nama, "Bidang": bidang, "Masuk": s.m, "Terlambat": s.tlat, "Pulang Awal": s.pawal, "Lepas Piket": s.lp, "Sakit": s.sk, "Cuti": s.ct, "Dinas Luar": s.dl, "BKO": s.bko, "Tanpa Keterangan": s.tk });
        }
      });
    });
    try {
      const XLSX = await loadXlsxScript();
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Laporan");
      XLSX.writeFile(wb, `Rekap_Absensi_${rekapType}.xlsx`);
      showToast("Berhasil diekspor ke Excel!");
    } catch (e) { showToast("Gagal mengekspor", "error"); }
  };

  const exportRekapToWord = () => {
    let tableRows = "";
    bidangs.forEach(bidang => {
      tableRows += `<tr><td colspan="${isDaily ? 6 : 12}" style="border: 1px solid black; padding: 8px; background-color: #e2e8f0; font-weight: bold; text-align: center;">BIDANG: ${bidang}</td></tr>`;
      pegawaiList.filter(p => p.bidang === bidang).forEach(p => {
        const logs = filteredLogs.filter(l => l.username === p.nip);
        if (isDaily) {
          const inLog = logs.find(l => l.type === 'Masuk'); const outLog = logs.find(l => l.type === 'Keluar'); const status = getStatusKompleks(logs, todayObj);
          const inKet = inLog ? getLogKeteranganDetail(inLog, todayObj) : '';
          const outKet = outLog ? getLogKeteranganDetail(outLog, todayObj) : '';
          tableRows += `<tr><td style="border: 1px solid black; padding: 5px;">${p.nip}</td><td style="border: 1px solid black; padding: 5px;">${p.nama}</td><td style="border: 1px solid black; padding: 5px;">${bidang}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${inLog ? inLog.timeStr + '<br><span style="font-size:10px;color:'+(inKet.includes('Tepat')?'green':'red')+';">' + inKet + '</span>' : '-'}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${outLog ? outLog.timeStr + '<br><span style="font-size:10px;color:'+(outKet.includes('Tepat')?'green':'red')+';">' + outKet + '</span>' : '-'}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${status.label}</td></tr>`;
        } else {
          const s = getRekapStats(logs);
          tableRows += `<tr><td style="border: 1px solid black; padding: 5px;">${p.nip}</td><td style="border: 1px solid black; padding: 5px;">${p.nama}</td><td style="border: 1px solid black; padding: 5px;">${bidang}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${s.m}</td><td style="border: 1px solid black; padding: 5px; text-align: center; color: red;">${s.tlat}</td><td style="border: 1px solid black; padding: 5px; text-align: center; color: red;">${s.pawal}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${s.lp}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${s.sk}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${s.ct}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${s.dl}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${s.bko}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${s.tk}</td></tr>`;
        }
      });
    });
    let headers = isDaily ? `<th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">NIP</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Nama</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Bidang</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Masuk</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Keluar</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Status Akhir</th>` : `<th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">NIP</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Nama</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Bidang</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Masuk</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Terlambat</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Plg Awal</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Lepas Piket</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Sakit</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Cuti</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Dinas Luar</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">BKO</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Tanpa Ket.</th>`;
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Rekap Absen</title></head><body><h2 style="text-align: center; font-family: sans-serif;">Laporan Rekapitulasi Absensi (${rekapType.toUpperCase()})</h2><p style="text-align: center; font-family: sans-serif;">Periode: ${getDateRangeText() || todayStr}</p><table style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px;"><thead><tr>${headers}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = `Rekap_Absensi_${rekapType}.doc`; a.click(); showToast("Diekspor ke Word!");
  };

  const handlePrintRekap = () => {
    let tableRows = "";
    bidangs.forEach(bidang => {
      tableRows += `<tr><td colspan="${isDaily ? 6 : 12}" style="background-color: #e2e8f0; font-weight: bold; text-align: center;">BIDANG: ${bidang}</td></tr>`;
      pegawaiList.filter(p => p.bidang === bidang).forEach(p => {
        const logs = filteredLogs.filter(l => l.username === p.nip);
        if (isDaily) {
          const inLog = logs.find(l => l.type === 'Masuk'); const outLog = logs.find(l => l.type === 'Keluar'); const status = getStatusKompleks(logs, todayObj);
          const inKet = inLog ? getLogKeteranganDetail(inLog, todayObj) : '';
          const outKet = outLog ? getLogKeteranganDetail(outLog, todayObj) : '';
          tableRows += `<tr><td>${p.nip}</td><td>${p.nama}</td><td>${bidang}</td><td>${inLog ? inLog.timeStr + '<br><span class="detail '+(inKet.includes('Tepat')?'ontime':'late')+'">' + inKet + '</span>' : '-'}</td><td>${outLog ? outLog.timeStr + '<br><span class="detail '+(outKet.includes('Tepat')?'ontime':'late')+'">' + outKet + '</span>' : '-'}</td><td>${status.label}</td></tr>`;
        } else {
          const s = getRekapStats(logs);
          tableRows += `<tr><td>${p.nip}</td><td>${p.nama}</td><td>${bidang}</td><td>${s.m}</td><td style="color:red;">${s.tlat}</td><td style="color:red;">${s.pawal}</td><td>${s.lp}</td><td>${s.sk}</td><td>${s.ct}</td><td>${s.dl}</td><td>${s.bko}</td><td>${s.tk}</td></tr>`;
        }
      });
    });
    let headers = isDaily ? `<tr><th>NIP</th><th>Nama</th><th>Bidang</th><th>Masuk</th><th>Keluar</th><th>Status Akhir</th></tr>` : `<tr><th>NIP</th><th>Nama</th><th>Bidang</th><th>Masuk</th><th>Terlambat</th><th>Plg Awal</th><th>Lepas Piket</th><th>Sakit</th><th>Cuti</th><th>Dinas Luar</th><th>BKO</th><th>Tanpa Ket.</th></tr>`;
    let html = `<table><thead>${headers}</thead><tbody>${tableRows}</tbody></table>`;
    printHTMLTable(`Laporan Rekapitulasi Absensi (${rekapType.toUpperCase()}) - ${getDateRangeText() || todayStr}`, html);
  };

  const exportRankingToExcel = async () => {
    if (!rankData) return showToast("Data ranking belum tersedia", "error");
    let exportData = [];
    
    exportData.push({"Kategori": "🏆 5 TERBAIK", "Nama": "", "Bidang": "", "Tepat Waktu": "", "Sakit": "", "Pelanggaran": ""});
    rankData.best.forEach((item, i) => {
      exportData.push({"Kategori": `Terbaik ${i+1}`, "Nama": item.p.nama, "Bidang": item.p.bidang, "Tepat Waktu": `${item.tepat}x`, "Sakit": `${item.sakit}x`, "Pelanggaran": "0"});
    });
    
    exportData.push({"Kategori": "", "Nama": "", "Bidang": "", "Tepat Waktu": "", "Sakit": "", "Pelanggaran": ""});
    
    exportData.push({"Kategori": "⚠️ PERLU PENINGKATAN", "Nama": "", "Bidang": "", "Tepat Waktu": "", "Sakit": "", "Pelanggaran": ""});
    rankData.worst.forEach((item, i) => {
      exportData.push({"Kategori": `Terburuk ${i+1}`, "Nama": item.p.nama, "Bidang": item.p.bidang, "Tepat Waktu": `${item.tepat}x`, "Sakit": `${item.sakit}x`, "Pelanggaran": `${item.bad} Telat/Plg Awal, ${item.tk} Tanpa Ket`});
    });

    try {
      const XLSX = await loadXlsxScript();
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ranking Pegawai");
      XLSX.writeFile(wb, `Ranking_Pegawai_${rekapType}.xlsx`);
      showToast("Ranking berhasil diekspor ke Excel!");
    } catch (e) { showToast("Gagal mengekspor ranking", "error"); }
  };

  const exportRankingToWord = () => {
    if (!rankData) return showToast("Data ranking belum tersedia", "error");
    
    const generateTable = (title, data, isBad) => {
      let rows = data.map((item, i) => `<tr><td style="border: 1px solid black; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid black; padding: 5px;">${item.p.nama}</td><td style="border: 1px solid black; padding: 5px;">${item.p.bidang}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${item.tepat}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${item.sakit}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${isBad ? `${item.bad} Telat/Plg Awal, ${item.tk} Tanpa Ket` : '0'}</td></tr>`).join('');
      if(data.length === 0) rows = `<tr><td colspan="6" style="border: 1px solid black; padding: 10px; text-align: center;">Tidak ada data</td></tr>`;
      return `<h3 style="font-family: sans-serif; margin-top: 20px;">${title}</h3><table style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px;"><thead><tr><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">No</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Nama</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Bidang</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Tepat Waktu</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Sakit</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Pelanggaran</th></tr></thead><tbody>${rows}</tbody></table>`;
    };

    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Ranking Pegawai</title></head><body>`;
    html += `<h2 style="text-align: center; font-family: sans-serif;">Laporan Ranking Pegawai (${rekapType.toUpperCase()})</h2><p style="text-align: center; font-family: sans-serif;">Periode: ${getDateRangeText() || todayStr}</p>`;
    html += generateTable("🏆 5 TERBAIK", rankData.best, false);
    html += generateTable("⚠️ PERLU PENINGKATAN", rankData.worst, true);
    html += `</body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = `Ranking_Pegawai_${rekapType}.doc`; a.click(); showToast("Ranking diekspor ke Word!");
  };

  const handlePrintRanking = () => {
    if (!rankData) return showToast("Data ranking belum tersedia", "error");
    
    const generateTable = (title, data, isBad) => {
      let rows = data.map((item, i) => `<tr><td>${i+1}</td><td style="text-align: left;">${item.p.nama}</td><td>${item.p.bidang}</td><td>${item.tepat}</td><td>${item.sakit}</td><td>${isBad ? `${item.bad} Telat, ${item.tk} Tanpa Ket` : '0'}</td></tr>`).join('');
      if(data.length === 0) rows = `<tr><td colspan="6" style="text-align: center; padding: 10px;">Tidak ada data</td></tr>`;
      return `<h3>${title}</h3><table><thead><tr><th>No</th><th>Nama</th><th>Bidang</th><th>Tepat Waktu</th><th>Sakit</th><th>Pelanggaran</th></tr></thead><tbody>${rows}</tbody></table>`;
    };

    let html = generateTable("🏆 5 TERBAIK", rankData.best, false) + generateTable("⚠️ PERLU PENINGKATAN", rankData.worst, true);
    printHTMLTable(`Laporan Ranking Pegawai (${rekapType.toUpperCase()}) - ${getDateRangeText() || todayStr}`, html);
  };

  return (
    <div className="glass-card rounded-[3rem] overflow-hidden shadow-2xl">
      <div className="p-8 md:p-10 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-950 dark:text-white tabular-nums tracking-tighter leading-none">{rekapType === 'harian' && mainTab === 'rekap' ? todayStr : `${mainTab === 'rekap' ? 'Rekap' : 'Ranking'} ${rekapType.toUpperCase()}`}</h2>
          <p className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-500 mt-2">Daftar Kehadiran & Laporan</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {['Rekap Absen', 'Ranking'].map(f => (
            <button key={f} onClick={() => setMainTab(f === 'Ranking' ? 'ranking' : 'rekap')} className={`px-4 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${mainTab === (f === 'Ranking' ? 'ranking' : 'rekap') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'}`}>
              {f === 'Ranking' ? <Trophy size={14} className="inline mr-1"/> : <CalendarDays size={14} className="inline mr-1"/>} {f}
            </button>
          ))}
          {currentUser.role === 'admin' && mainTab === 'rekap' && (
            <>
              <input type="file" accept=".xlsx" ref={importLaporanRef} onChange={handleImportLaporan} className="hidden" />
              <button onClick={() => importLaporanRef.current.click()} disabled={isImporting} className="px-4 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-transform flex items-center gap-2" title="Impor Absen (.xlsx)"><Upload size={14}/> {isImporting ? 'Proses...' : 'Impor'}</button>
              <button onClick={handlePrintRekap} className="px-4 py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-transform" title="Cetak Laporan Rapi"><Printer size={14}/></button>
              <button onClick={exportRekapToExcel} className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-transform" title="Eksport ke Excel .xlsx"><FileSpreadsheet size={14}/></button>
              <button onClick={exportRekapToWord} className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-transform" title="Eksport ke Word"><FileText size={14}/></button>
              <button onClick={() => setShowWASettings(true)} className="px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[9px] uppercase shadow-lg"><BellRing size={14}/></button>
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generateWAPesan(pegawaiList, allHistory, todayObj))}`, '_blank')} className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg"><MessageSquare size={14}/></button>
            </>
          )}
          {mainTab === 'ranking' && (
            <>
              <button onClick={handlePrintRanking} className="px-4 py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-transform flex items-center gap-2" title="Cetak Ranking Rapi"><Printer size={14}/> Print</button>
              <button onClick={exportRankingToExcel} className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-transform flex items-center gap-2" title="Eksport ke Excel .xlsx"><FileSpreadsheet size={14}/> Excel</button>
              <button onClick={exportRankingToWord} className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-transform flex items-center gap-2" title="Eksport ke Word"><FileText size={14}/> Word</button>
            </>
          )}
        </div>
      </div>

      <div className="px-8 md:px-10 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <select value={rekapType} onChange={e => setRekapType(e.target.value)} className="p-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-blue-500 transition-colors">
            <option value="harian">Harian (Hari Ini)</option><option value="mingguan">Mingguan (7 Hari)</option><option value="bulanan">Bulanan (30 Hari)</option><option value="triwulan">Triwulan (90 Hari)</option><option value="custom">Pilih Manual</option>
          </select>
          {rekapType !== 'custom' ? ( <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">Periode: {getDateRangeText()}</span> ) : (
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase border shadow-sm dark:[color-scheme:dark]" /> <span className="text-xs font-bold text-slate-500">-</span> <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase border shadow-sm dark:[color-scheme:dark]" />
            </div>
          )}
        </div>
        
        {mainTab === 'rekap' && (
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-56">
               <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full pl-9 pr-3 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm focus:border-blue-500 outline-none appearance-none cursor-pointer">
                 <option value="Semua">Semua Keterangan</option><option value="Tepat Waktu">Tepat Waktu</option><option value="Terlambat">Terlambat</option><option value="Pulang Awal">Pulang Awal</option><option value="Sakit">Sakit</option><option value="Cuti">Cuti</option><option value="Dinas Luar">Dinas Luar</option><option value="Lepas Piket">Lepas Piket</option><option value="BKO">BKO</option>
               </select>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari Nama atau NIP Pegawai..." className="w-full pl-9 pr-3 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold shadow-sm focus:border-blue-500 outline-none" />
            </div>
          </div>
        )}
      </div>

      {mainTab === 'ranking' ? (
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-emerald-600 uppercase flex items-center gap-2"><Trophy size={18}/> 5 Terbaik ({rekapType === 'custom' ? 'Kustom' : rekapType})</h3>
            {rankData.best.length > 0 ? rankData.best.map((item, i) => (
              <div key={i} className="glass-card p-5 rounded-2xl border-l-4 border-emerald-500 shadow-sm flex justify-between items-center">
                <div><p className="font-bold text-xs text-slate-900 dark:text-white">{item.p.nama}</p><p className="text-[9px] text-slate-500 uppercase">{item.p.bidang}</p></div>
                <div className="text-right text-[9px] font-black">
                  <p className="text-emerald-600">{item.tepat}x Tepat Waktu</p>
                  {item.sakit > 0 && <p className="text-amber-500 mt-0.5">{item.sakit}x Sakit</p>}
                </div>
              </div>
            )) : <p className="text-[9px] font-bold text-slate-400 uppercase py-4">Belum ada pegawai yang memenuhi kriteria terbaik (Minimal 1x tepat waktu tanpa pelanggaran)</p>}
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-black text-rose-600 uppercase flex items-center gap-2"><ThumbsDown size={18}/> Perlu Peningkatan</h3>
            {rankData.worst.length > 0 ? rankData.worst.map((item, i) => (
              <div key={i} className="glass-card p-5 rounded-2xl border-l-4 border-rose-500 shadow-sm flex justify-between items-center">
                <div><p className="font-bold text-xs text-slate-900 dark:text-white">{item.p.nama}</p><p className="text-[9px] text-slate-500 uppercase">{item.p.bidang}</p></div>
                <div className="text-right text-[9px] font-black flex flex-col items-end gap-0.5">
                  {item.tk > 0 && <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded">{item.tk} Tanpa Ket.</span>}
                  {item.bad > 0 && <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded">{item.bad} Telat/Pulang Cepat</span>}
                  {item.sakit > 2 && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded">Sakit {item.sakit}x (Lebih batas)</span>}
                </div>
              </div>
            )) : <p className="text-[9px] font-bold text-slate-400 uppercase py-4">Tidak ada pegawai dengan pelanggaran di periode ini</p>}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-500 uppercase text-[9px] font-black tracking-widest">
              <tr>
                <th className="px-10 py-6">Pegawai</th>
                {isDaily ? ( <><th className="px-6 py-6 text-center">Masuk</th><th className="px-6 py-6 text-center">Keluar</th><th className="px-6 py-6 text-center">Status Akhir</th></> ) : ( <><th className="px-6 py-6 text-center">Masuk</th><th className="px-6 py-6 text-center text-amber-600">Terlambat</th><th className="px-6 py-6 text-center text-rose-600">Plg Awal</th><th className="px-6 py-6 text-center">Lepas Piket</th><th className="px-6 py-6 text-center">Sakit</th><th className="px-6 py-6 text-center">Cuti</th><th className="px-6 py-6 text-center">Dinas Luar</th><th className="px-6 py-6 text-center">BKO</th><th className="px-6 py-6 text-center">Tanpa Ket.</th></> )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bidangs.map(bidang => {
                const pList = pegawaiList.filter(p => p.bidang === bidang && (p.nama.toLowerCase().includes(searchTerm.toLowerCase()) || p.nip.toLowerCase().includes(searchTerm.toLowerCase())));
                
                const filteredPList = pList.filter(p => {
                    if (filterStatus === 'Semua') return true;
                    const logs = filteredLogs.filter(l => l.username === p.nip);
                    if (isDaily) {
                        const status = getStatusKompleks(logs, todayObj);
                        const inLog = logs.find(l => l.type === 'Masuk'); const outLog = logs.find(l => l.type === 'Keluar');
                        const inKet = inLog ? getLogKeteranganDetail(inLog, todayObj) : '';
                        const outKet = outLog ? getLogKeteranganDetail(outLog, todayObj) : '';
                        const combinedKets = [status.label, inKet, outKet].join(' ');
                        
                        if (filterStatus === 'Terlambat') return combinedKets.includes('Terlambat');
                        if (filterStatus === 'Pulang Awal') return combinedKets.includes('Pulang Awal');
                        if (filterStatus === 'Tepat Waktu') return combinedKets.includes('Tepat');
                        if (['Sakit', 'Cuti', 'Dinas Luar', 'Lepas Piket', 'BKO'].includes(filterStatus)) return status.label.toUpperCase().includes(filterStatus.toUpperCase());
                        return false;
                    } else {
                        const s = getRekapStats(logs);
                        if (filterStatus === 'Terlambat') return s.tlat > 0; 
                        if (filterStatus === 'Pulang Awal') return s.pawal > 0; 
                        if (filterStatus === 'Sakit') return s.sk > 0; 
                        if (filterStatus === 'Cuti') return s.ct > 0; 
                        if (filterStatus === 'Dinas Luar') return s.dl > 0; 
                        if (filterStatus === 'Lepas Piket') return s.lp > 0; 
                        if (filterStatus === 'BKO') return s.bko > 0; 
                        if (filterStatus === 'Tepat Waktu') return (s.m > 0 && s.tlat === 0 && s.pawal === 0);
                        return false;
                    }
                });

                if(filteredPList.length === 0) return null;
                return (
                  <React.Fragment key={bidang}>
                    <tr className="bg-slate-50/50 dark:bg-slate-950/20"><td colSpan={isDaily ? 4 : 10} className="px-10 py-4 text-blue-600 font-black uppercase text-[8px] tracking-widest">{bidang}</td></tr>
                    {filteredPList.map(p => {
                      const logs = filteredLogs.filter(l => l.username === p.nip);
                      if (isDaily) {
                        const inLog = logs.find(l => l.type === 'Masuk'); const outLog = logs.find(l => l.type === 'Keluar'); const status = getStatusKompleks(logs, todayObj);
                        return (
                          <tr key={p.nip} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="px-10 py-6"><p className="font-black text-sm text-slate-950 dark:text-white leading-none">{p.nama}</p><p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-2 uppercase">{p.nip}</p></td>
                            <td className="px-6 py-6 text-center">{inLog ? <div className="flex flex-col items-center gap-1"><img src={inLog.photoStr} className="w-12 h-12 rounded-xl border-2 border-emerald-500 object-cover shadow-lg mx-auto"/><span className="text-[7px] font-black text-emerald-600 uppercase mt-1">{inLog.timeStr}</span><span className={`text-[7px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getLogKeteranganDetail(inLog, todayObj).includes('Tepat') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>{getLogKeteranganDetail(inLog, todayObj)}</span></div> : '-'}</td>
                            <td className="px-6 py-6 text-center">{outLog ? <div className="flex flex-col items-center gap-1"><img src={outLog.photoStr} className="w-12 h-12 rounded-xl border-2 border-rose-600 object-cover shadow-lg mx-auto"/><span className="text-[7px] font-black text-rose-600 uppercase mt-1">{outLog.timeStr}</span><span className={`text-[7px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getLogKeteranganDetail(outLog, todayObj).includes('Tepat') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>{getLogKeteranganDetail(outLog, todayObj)}</span></div> : '-'}</td>
                            <td className="px-6 py-6 text-center"><span className={`px-3 py-1.5 rounded-full text-[8px] font-black tracking-widest ${status.class}`}>{status.label}</span></td>
                          </tr>
                        );
                      } else {
                        const s = getRekapStats(logs);
                        return (
                          <tr key={p.nip} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="px-10 py-6"><p className="font-black text-sm text-slate-950 dark:text-white leading-none">{p.nama}</p><p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-2 uppercase">{p.nip}</p></td>
                            <td className="px-6 py-6 text-center font-black text-emerald-600 text-lg">{s.m}x</td>
                            <td className="px-6 py-6 text-center font-black text-amber-600 text-lg">{s.tlat}x</td>
                            <td className="px-6 py-6 text-center font-black text-rose-600 text-lg">{s.pawal}x</td>
                            <td className="px-6 py-6 text-center font-black text-slate-600 dark:text-slate-400 text-lg">{s.lp}x</td>
                            <td className="px-6 py-6 text-center font-black text-rose-600 text-lg">{s.sk}x</td>
                            <td className="px-6 py-6 text-center font-black text-emerald-600 text-lg">{s.ct}x</td>
                            <td className="px-6 py-6 text-center font-black text-indigo-600 text-lg">{s.dl}x</td>
                            <td className="px-6 py-6 text-center font-black text-blue-600 text-lg">{s.bko}x</td>
                            <td className="px-6 py-6 text-center font-black text-slate-500 dark:text-slate-400 text-lg">{s.tk}x</td>
                          </tr>
                        );
                      }
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showWASettings && currentUser.role === 'admin' && <WASettingsModal waConfig={waConfig} setWaConfig={setWaConfig} onClose={() => setShowWASettings(false)} />}
    </div>
  );
}

function WASettingsModal({ waConfig, setWaConfig, onClose }) {
  const [phone, setPhone] = useState(waConfig.phone); const [time, setTime] = useState(waConfig.time); const [enabled, setEnabled] = useState(waConfig.enabled);
  const handleSave = (e) => { e.preventDefault(); setWaConfig({ phone, time, enabled }); onClose(); };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in">
        <MessageSquare size={40} className="text-emerald-500 mx-auto mb-4" /><h2 className="text-xl font-black mb-1 text-center text-slate-950 dark:text-white">Otomasi WhatsApp</h2>
        <form onSubmit={handleSave} className="space-y-4 text-left mt-6">
          <select value={enabled} onChange={e => setEnabled(e.target.value === 'true')} className="w-full p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl font-bold text-xs"><option value="false">Nonaktifkan</option><option value="true">Aktifkan Pengingat</option></select>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Nomor WA (62...)" className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold dark:[color-scheme:dark]" />
          <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] mt-2 btn-3d">Simpan</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase mt-2">Batal</button>
        </form>
      </div>
    </div>
  );
}

function AutoWAAlert({ onClose, onSend, waConfig, allHistory, pegawaiList, currentTime }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in">
      <div className="glass-card p-10 md:p-16 rounded-[3rem] w-full max-w-lg text-center border-2 border-emerald-500 shadow-2xl animate-in zoom-in-95">
        <BellRing size={60} className="text-emerald-500 mx-auto mb-6 animate-bounce" /><h2 className="text-3xl font-black mb-2 text-white">Waktu Laporan!</h2>
        <button onClick={()=>{ const text = encodeURIComponent(generateWAPesan(pegawaiList, allHistory, currentTime)); window.open(waConfig.phone ? `https://wa.me/${waConfig.phone}?text=${text}` : `https://wa.me/?text=${text}`, '_blank'); onSend(); }} className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black uppercase text-sm mb-4 btn-3d mt-8">Kirim Laporan</button>
        <button onClick={onClose} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase">Lewati</button>
      </div>
    </div>
  );
}

// ==========================================
// VIEW: GRAFIK KEHADIRAN (Analitik)
// ==========================================
function AnalitikView({ allHistory, pegawaiList }) {
  const [rekapType, setRekapType] = useState('harian'); 
  const [startDate, setStartDate] = useState(''); 
  const [endDate, setEndDate] = useState('');

  const todayObj = new Date(); const todayStr = formatDateIndo(todayObj);

  const getDateRangeText = () => {
    const now = todayObj; let startD = todayObj;
    if (rekapType === 'harian') { startD = now; } else if (rekapType === 'mingguan') { startD = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); } else if (rekapType === 'bulanan') { startD = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); } else if (rekapType === 'triwulan') { startD = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); } else { return null; }
    const formatShort = (d) => d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    if (rekapType === 'harian') return formatShort(now); return `${formatShort(startD)} - ${formatShort(now)}`;
  };

  const now = todayObj.getTime(); let rStart = new Date(todayObj); let rEnd = new Date(todayObj);
  if (rekapType === 'harian') { rStart = new Date(now); } else if (rekapType === 'mingguan') { rStart = new Date(now - (7 * 24 * 60 * 60 * 1000)); } else if (rekapType === 'bulanan') { rStart = new Date(now - (30 * 24 * 60 * 60 * 1000)); } else if (rekapType === 'triwulan') { rStart = new Date(now - (90 * 24 * 60 * 60 * 1000)); } else if (rekapType === 'custom' && startDate && endDate) { rStart = new Date(startDate); rEnd = new Date(endDate); } else { rStart = new Date(now); }
  rStart.setHours(0, 0, 0, 0); rEnd.setHours(23, 59, 59, 999);

  const rangeLogs = allHistory.filter(h => h.timestamp >= rStart.getTime() && h.timestamp <= rEnd.getTime());
  const specialTypes = ['Lepas Piket', 'Sakit', 'Cuti', 'Dinas Luar', 'BKO'];

  let workingDays = 0; let curD = new Date(rStart); const todayMid = new Date(todayObj).setHours(23,59,59,999);
  while(curD <= rEnd) {
      if(curD.getDay() !== 0 && curD.getTime() <= todayMid) workingDays++;
      curD.setDate(curD.getDate() + 1);
  }

  const bidangs = ["KALAPAS", "Tata Usaha", "KPLP", "Adm Kamtib", "Binadikgiatja"];
  let bidangStats = bidangs.reduce((acc, b) => ({...acc, [b]: {hadir: 0, total: 0}}), {});
  let totalHadirCount = 0;

  pegawaiList.forEach(p => {
      let bTotal = workingDays;
      if (bidangStats[p.bidang]) bidangStats[p.bidang].total += bTotal;
      
      let cur = new Date(rStart);
      while(cur <= rEnd) {
          if(cur.getDay() !== 0 && cur.getTime() <= todayMid) {
              const dStr = formatDateIndo(cur);
              const logs = rangeLogs.filter(l => l.username === p.nip && l.dateStr === dStr);
              const hasSpecial = logs.some(l => specialTypes.includes(l.type));
              const hasMasukKeluar = logs.some(l => l.type === 'Masuk' || l.type === 'Keluar');
              if (!hasSpecial && hasMasukKeluar) {
                  totalHadirCount++;
                  if (bidangStats[p.bidang]) bidangStats[p.bidang].hadir++;
              }
          }
          cur.setDate(cur.getDate() + 1);
      }
  });

  const totalTarget = (pegawaiList.length || 36) * (workingDays || 1);
  const pct = Math.round((totalHadirCount / totalTarget) * 100) || 0;
  
  const chartData = bidangs.map(b => {
    const stat = bidangStats[b];
    return { bidang: b, hadir: stat.hadir, total: stat.total, persentase: stat.total > 0 ? Math.round((stat.hadir/stat.total)*100) : 0 };
  });

  let listKhusus = [];
  if (rekapType === 'harian') {
      listKhusus = pegawaiList.map(p => {
          const userLogs = rangeLogs.filter(l => l.username === p.nip);
          const specialLog = userLogs.find(l => specialTypes.includes(l.type));
          if (specialLog) return { nama: p.nama, bidang: p.bidang, type: specialLog.type };
          return null;
      }).filter(Boolean);
  }

  return (
    <div className="space-y-8">
      <div className="px-8 md:px-10 py-6 glass-card rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <select value={rekapType} onChange={e => setRekapType(e.target.value)} className="p-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-blue-500 transition-colors">
            <option value="harian">Harian (Hari Ini)</option><option value="mingguan">Mingguan (7 Hari)</option><option value="bulanan">Bulanan (30 Hari)</option><option value="triwulan">Triwulan (90 Hari)</option><option value="custom">Pilih Manual</option>
          </select>
          {rekapType !== 'custom' ? ( <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">Periode: {getDateRangeText()}</span> ) : (
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase border shadow-sm dark:[color-scheme:dark]" /> <span className="text-xs font-bold text-slate-500">-</span> <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase border shadow-sm dark:[color-scheme:dark]" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[{ l: 'Total Kehadiran', v: totalHadirCount, c: 'text-emerald-600' }, { l: 'Target Hadir (x Hari)', v: totalTarget, c: 'text-slate-600 dark:text-white' }, { l: 'Persentase Kehadiran', v: pct+'%', c: 'text-blue-600' }].map(s => (
          <div key={s.l} className="glass-card p-10 rounded-[2.5rem] text-center shadow-xl"><p className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-500 mb-4">{s.l}</p><p className={`text-6xl font-black ${s.c}`}>{s.v}</p></div>
        ))}
      </div>
      
      <div className="glass-card p-8 md:p-10 rounded-[3rem] shadow-2xl">
        <h3 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-500 mb-8 tracking-widest flex items-center gap-2"><BarChart3 size={16} className="text-blue-600"/> Grafik Kehadiran Per Bidang ({rekapType.toUpperCase()})</h3>
        <div className="space-y-6">
          {chartData.map((data, idx) => (
            <div key={idx} className="relative">
              <div className="flex justify-between font-black uppercase text-[10px] mb-2 text-slate-950 dark:text-white"><span>{data.bidang}</span><span className="text-blue-600">{data.hadir} dari {data.total} ({data.persentase}%)</span></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner flex"><div className="h-full bg-blue-600 transition-all duration-1000 ease-out" style={{ width: `${data.persentase}%` }}></div></div>
            </div>
          ))}
        </div>
      </div>

      {rekapType === 'harian' && listKhusus.length > 0 && (
        <div className="glass-card p-8 md:p-10 rounded-[3rem] shadow-2xl border-t-4 border-amber-500 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 mb-6 tracking-widest flex items-center gap-2">
            <FileText size={16}/> Daftar Pegawai Keterangan Khusus Hari Ini
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listKhusus.map((k, i) => (
              <div key={i} className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 p-5 rounded-[2rem] flex flex-col justify-between gap-4 transition-transform hover:scale-[1.02]">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{k.nama}</p>
                  <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{k.bidang}</p>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 px-3 py-2 rounded-xl w-fit flex items-center gap-1.5 border border-amber-200/50 dark:border-amber-800/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> {k.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIEW: SISTEM PESAN / INBOX
// ==========================================
function PesanView({ currentUser, messages, pegawaiList, db, appId, showToast }) {
  const [selectedPegawai, setSelectedPegawai] = useState('');
  const [msgText, setMsgText] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const displayMessages = currentUser.role === 'admin' 
    ? messages 
    : messages.filter(m => m.receiverNip === currentUser.rawUsername || m.senderNip === currentUser.rawUsername);

  useEffect(() => {
    const unreadReceived = messages.filter(m => m.receiverNip === currentUser.rawUsername && !m.isRead);
    if (unreadReceived.length > 0) {
      unreadReceived.forEach(m => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pesan', m.id), { isRead: true }));
    }
  }, [messages, currentUser.rawUsername]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedPegawai || !msgText.trim()) return showToast("Pilih penerima & tulis pesan!", "error");
    
    if (currentUser.role !== 'admin') {
      const myData = pegawaiList.find(p => p.nip === currentUser.rawUsername);
      if (myData?.isMuted) return showToast("Akses pesan Anda telah dibisukan oleh Admin.", "error");
    }

    setLoading(true);
    try {
      const receiver = selectedPegawai === 'admin' ? { nip: 'admin', nama: 'Admin Lapas' } : pegawaiList.find(p => p.nip === selectedPegawai);
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'pesan'), {
        senderNip: currentUser.rawUsername, senderName: currentUser.username,
        receiverNip: receiver.nip || 'admin', receiverName: receiver.nama || 'Admin Lapas',
        message: msgText, timestamp: Date.now(), isRead: false
      });
      setMsgText(''); showToast("Pesan terkirim!");
    } catch(err) { showToast("Gagal mengirim", "error"); } finally { setLoading(false); }
  };

  const handleMuteToggle = async (p) => {
    const action = p.isMuted ? 'Membuka akses pesan' : 'Membisukan (Mute)';
    setConfirmDialog({ title: "Konfirmasi Akses", message: `${action} untuk ${p.nama}?`, onConfirm: async () => {
      setConfirmDialog(null);
      try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pegawai', p.id), { isMuted: !p.isMuted }); showToast("Akses diubah!"); } catch(e) {}
    }});
  };

  const handleDeletePesan = async (id) => {
    setConfirmDialog({ title: "Hapus Pesan", message: "Yakin menghapus pesan ini?", isDanger: true, onConfirm: async () => {
      setConfirmDialog(null);
      try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pesan', id)); showToast("Pesan dihapus!"); } catch(e) {}
    }});
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
      <div className="md:col-span-1 space-y-6">
        <div className="glass-card p-6 rounded-3xl shadow-xl">
          <h3 className="text-sm font-black flex items-center gap-2 mb-4"><Send size={16}/> Tulis Pesan Baru</h3>
          <form onSubmit={handleSend} className="space-y-4">
            <select value={selectedPegawai} onChange={e=>setSelectedPegawai(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-xl font-bold text-[10px] uppercase text-slate-700 dark:text-slate-300 outline-none">
              <option value="">-- Pilih Penerima --</option>
              {currentUser.role !== 'admin' && <option value="admin">ADMIN LAPAS</option>}
              {pegawaiList.filter(p => p.nip !== currentUser.rawUsername).map(p => <option key={p.nip} value={p.nip}>{p.nama}</option>)}
            </select>
            <textarea value={msgText} onChange={e=>setMsgText(e.target.value)} placeholder="Tuliskan pesan Anda..." rows={4} className="w-full p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold text-slate-950 dark:text-white outline-none resize-none"/>
            <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] btn-3d shadow-lg">{loading ? 'Mengirim...' : 'Kirim Pesan'}</button>
          </form>
        </div>

        {currentUser.role === 'admin' && (
          <div className="glass-card p-6 rounded-3xl shadow-xl border border-rose-500/10">
            <h3 className="text-sm font-black text-rose-600 flex items-center gap-2 mb-4"><VolumeX size={16}/> Mute Pegawai (Admin)</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {pegawaiList.map(p => (
                <div key={p.nip} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div><p className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight">{p.nama}</p></div>
                  <button onClick={()=>handleMuteToggle(p)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase shrink-0 transition-colors ${p.isMuted ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800'}`}>{p.isMuted ? 'Unmute' : 'Mute'}</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="md:col-span-2 glass-card p-6 md:p-8 rounded-[3rem] shadow-xl min-h-[500px] flex flex-col">
        <h3 className="text-xl font-black flex items-center gap-3 mb-6"><Mail size={24} className="text-blue-600"/> Kotak Masuk / Percakapan</h3>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {displayMessages.length === 0 ? <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mt-20">Belum ada pesan</p> : 
           displayMessages.map(m => (
            <div key={m.id} className={`p-5 rounded-2xl relative group ${m.senderNip === currentUser.rawUsername ? 'bg-blue-50 dark:bg-blue-900/20 ml-12 border border-blue-100 dark:border-blue-800/50' : 'bg-slate-100 dark:bg-slate-800 mr-12 border border-slate-200 dark:border-slate-700/50'}`}>
              <div className="flex justify-between items-start mb-2">
                <p className={`text-[10px] font-black uppercase tracking-widest ${m.senderNip === currentUser.rawUsername ? 'text-blue-600' : 'text-slate-600 dark:text-slate-400'}`}>{m.senderNip === currentUser.rawUsername ? 'Dari Saya' : `Dari: ${m.senderName}`}</p>
                <div className="flex gap-2 items-center">
                  <p className="text-[8px] font-bold text-slate-400">{formatDateIndo(new Date(m.timestamp))} {formatWITA(new Date(m.timestamp))}</p>
                  {(currentUser.role === 'admin' || m.senderNip === currentUser.rawUsername || m.receiverNip === currentUser.rawUsername) && (
                    <button onClick={()=>handleDeletePesan(m.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Hapus Pesan"><Trash2 size={12}/></button>
                  )}
                </div>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{m.message}</p>
              {currentUser.role === 'admin' && m.receiverNip !== 'admin' && <p className="text-[8px] font-black uppercase text-amber-500 mt-3 border-t border-amber-500/20 pt-2 w-fit">Ditujukan untuk: {m.receiverName}</p>}
            </div>
          ))}
        </div>
      </div>
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}

// ==========================================
// VIEW: KELOLA PEGAWAI & LUPA PASSWORD
// ==========================================
function KelolaView({ pegawaiList, passRequests, locationConfig, showToast, db, appId, credentials }) {
  const [loading, setLoading] = useState(false); const [previewData, setPreviewData] = useState(null);
  const [targetPassUser, setTargetPassUser] = useState(null); const [showAddModal, setShowAddModal] = useState(false); 
  const [editPegawaiTarget, setEditPegawaiTarget] = useState(null);
  const [showBulkAbsenModal, setShowBulkAbsenModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); const fileInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBidang, setFilterBidang] = useState('Semua');
  const [selectedPegawaiIds, setSelectedPegawaiIds] = useState([]);

  const bidangs = ["KALAPAS", "Tata Usaha", "KPLP", "Adm Kamtib", "Binadikgiatja"];

  const toggleBypassGps = async (p) => {
    try { 
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pegawai', p.id), { bypassGps: !p.bypassGps }); 
      showToast(`Akses Bypass GPS untuk ${p.nama} ${!p.bypassGps ? 'Diaktifkan' : 'Dinonaktifkan'}`); 
    } catch (e) { showToast("Gagal mengubah status GPS", "error"); }
  };

  const dataAwal = [
    { nip: "198007232000121001", nama: "M Arfandy, A.Md. IP., S.H., M.H.", bidang: "KALAPAS", jabatan: "Kepala Lembaga Pemasyarakatan" },
    { nip: "198507302009011003", nama: "ABDURRAHMAN HARYONO, S.H.", bidang: "Tata Usaha", jabatan: "KEPALA SUBBAGIAN TATA USAHA" },
    { nip: "196810191992032001", nama: "OKTOVIYANA LILIYANI LOURU JAGI", bidang: "Tata Usaha", jabatan: "KAUR KEPEGAWAIAN DAN KEUANGAN" },
    { nip: "199006102009011001", nama: "ASRIYADI LAGANI, S.H.", bidang: "Tata Usaha", jabatan: "KEPALA URUSAN UMUM" },
    { nip: "199007082009121003", nama: "DANIEL ROBERTO ANIE", bidang: "Tata Usaha", jabatan: "PENGELOLA DATA KEPEGAWAIAN" },
    { nip: "199004212012121001", nama: "ANTONIUS SOEHONO PURWANTO", bidang: "Tata Usaha", jabatan: "OPERATOR MESIN" },
    { nip: "199710102017121001", nama: "RIVALDO FITHOREZA OLANG, S.Sos", bidang: "Tata Usaha", jabatan: "BENDAHARA PENGELUARAN" },
    { nip: "199804222017122002", nama: "MISYIE AMELIA MABILEHI", bidang: "Tata Usaha", jabatan: "PENGHUBUNG ADMINISTRASI" },
    { nip: "199806082020121001", nama: "TRIVAN DANIEL LOMI", bidang: "Tata Usaha", jabatan: "STAF KEPEGAWAIAN" },
    { nip: "200208312022031001", nama: "IRFAN ALFIAN JAE", bidang: "Tata Usaha", jabatan: "STAF KEUANGAN" },
    { nip: "200108022022031001", nama: "ABYESTIANUS TLOIM", bidang: "Tata Usaha", jabatan: "STAF KEUANGAN" },
    { nip: "200111122022031001", nama: "DWI FATUR RAHMAN WIJAYA", bidang: "Tata Usaha", jabatan: "STAF UMUM" },
    { nip: "200203102022031001", nama: "YEFONA SIMSON L. PRABILA", bidang: "Tata Usaha", jabatan: "STAF UMUM" },
    { nip: "199904072025062011", nama: "DINA TIMUTANG", bidang: "Tata Usaha", jabatan: "STAF UMUM" },
    { nip: "197610241997031001", nama: "ROBY EDUARD THERIK, S.H.", bidang: "KPLP", jabatan: "KEPALA KPLP" },
    { nip: "198503042009011004", nama: "MUHAMAD LUKMAN HINALEDE", bidang: "KPLP", jabatan: "STAF KPLP" },
    { nip: "199102252017121003", nama: "MUKHLIS YUSUF MARO", bidang: "KPLP", jabatan: "STAF KPLP" },
    { nip: "200303242022031001", nama: "MUHAIMIN ABDUL AZIS", bidang: "KPLP", jabatan: "STAF KPLP" },
    { nip: "200207112025021001", nama: "GELORA KURNIAWAN, S.Tr.Pas.", bidang: "KPLP", jabatan: "PEMBINA KEAMANAN PEMASYARAKATAN" },
    { nip: "198602112007031001", nama: "ARNOLDUS ENGE, S.H.", bidang: "Adm Kamtib", jabatan: "KASI ADMINISTRASI KAMTIB" },
    { nip: "196804261991031002", nama: "DAVID HABIL OBED LOA", bidang: "Adm Kamtib", jabatan: "KASUBSI PELAPORAN DAN TATA TERTIB" },
    { nip: "198603032009011007", nama: "MARTHEN SONOPAA", bidang: "Adm Kamtib", jabatan: "KEPALA SUBSEKSI KEAMANAN" },
    { nip: "199807072017121002", nama: "MAULUDIN HAMZAH, Sos.", bidang: "Adm Kamtib", jabatan: "PENGADMINISTRASI PERLENGKAPAN" },
    { nip: "199910132022031003", nama: "OPNY ANDOARDO SINAWENI", bidang: "Adm Kamtib", jabatan: "STAF KAMTIB" },
    { nip: "198509252008011001", nama: "SURYANTO AHMAD, S.Sos.", bidang: "Binadikgiatja", jabatan: "KASI BINADIK DAN GIATJA" },
    { nip: "196804131992031001", nama: "SEPRENI APRIANUS MALOTE, S.Sos.", bidang: "Binadikgiatja", jabatan: "KASUBSI PERAWATAN NAPI/ANAK" },
    { nip: "196903191991031001", nama: "YOSEF WASI", bidang: "Binadikgiatja", jabatan: "KASUBSI REGISTRASI & BIMKEMAS" },
    { nip: "198712262009011001", nama: "MOE KRIMANTO MOKA, S.H.", bidang: "Binadikgiatja", jabatan: "KEPALA SUBSEKSI KEGIATAN KERJA" },
    { nip: "198103082006041001", nama: "MARKUS DEMATRIUS KORANG LAWANG", bidang: "Binadikgiatja", jabatan: "PENGELOLA HASIL KERJA" },
    { nip: "198510132010121003", nama: "ASYER KOLIMON", bidang: "Binadikgiatja", jabatan: "STAF GIATJA" },
    { nip: "198610212012121001", nama: "DANANG MAKMUR HADI", bidang: "Binadikgiatja", jabatan: "PENGOLAH DATA SIDIK JARI" },
    { nip: "199405022012121001", nama: "AHYARDI ARDIMAN BASO", bidang: "Binadikgiatja", jabatan: "STAF REGISTRASI" },
    { nip: "199302182017121002", nama: "ANDRYAN HENDRICHUS KOLLY", bidang: "Binadikgiatja", jabatan: "PENGELOLA DAN PENGOLAH MAKANAN" },
    { nip: "199511222017121001", nama: "ROBERT STILMAN BILL ASBANU", bidang: "Binadikgiatja", jabatan: "PENGADMINISTRASI LAYANAN" },
    { nip: "199812202022031004", nama: "ESA PUTRA NURATIM FOEKH", bidang: "Binadikgiatja", jabatan: "STAF REGISTRASI" },
    { nip: "200211252025062006", nama: "MARIA HERLINA SASI", bidang: "Binadikgiatja", jabatan: "STAF REGISTRASI" }
  ];

  const handleImportExcel = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext !== 'xlsx') {
       showToast("Hanya file Excel format .xlsx yang diizinkan untuk diimpor!", "error");
       e.target.value = null; 
       return;
    }
    
    setLoading(true);
    showToast("Membaca file Excel...");
    try {
        const XLSX = await loadXlsxScript();
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = event.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            const parsedData = [];
            
            json.forEach(row => {
                const nip = row.NIP || row.nip;
                const nama = row.Nama || row.nama;
                const bidang = row.Bidang || row.bidang || 'Tata Usaha';
                const jabatan = row.Jabatan || row.jabatan || 'Staf';
                
                if (nip && nama) {
                    parsedData.push({ nip: String(nip).replace(/\s+/g, ''), nama: String(nama), bidang, jabatan });
                }
            });
            
            if (parsedData.length > 0) setPreviewData(parsedData); 
            else showToast("Format file kosong atau tidak memiliki kolom NIP dan Nama", "error");
        };
        reader.readAsBinaryString(file);
    } catch(err) { showToast("Gagal membaca file Excel", "error"); }
    finally { setLoading(false); e.target.value = null; }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      (previewData || dataAwal).forEach(p => {
        const cleanNip = p.nip.replace(/\s+/g, '');
        if (!pegawaiList.some(pl => pl.nip === cleanNip)) { const ref = doc(collection(db, 'artifacts', appId, 'public', 'data', 'pegawai')); batch.set(ref, { ...p, nip: cleanNip }); }
      });
      await batch.commit(); showToast("Data Pegawai Berhasil Ditambahkan/Sinkron!");
    } catch (e) { showToast("Gagal memperbarui data", "error"); } finally { setLoading(false); setPreviewData(null); }
  };

  const exportToExcel = async () => {
    let exportData = pegawaiList.map(p => ({ "NIP": p.nip, "Nama": p.nama, "Bidang": p.bidang, "Jabatan": p.jabatan || '-' }));
    try {
      const XLSX = await loadXlsxScript();
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Daftar Pegawai");
      XLSX.writeFile(wb, `Data_Pegawai_SatuLakal.xlsx`);
      showToast("Berhasil diekspor ke Excel!");
    } catch (e) { showToast("Gagal mengekspor", "error"); }
  };

  const exportToWord = () => {
    if (pegawaiList.length === 0) return showToast("Tidak ada data", "error");
    let tableRows = pegawaiList.map(p => `<tr><td style="border: 1px solid black; padding: 5px;">${p.nip}</td><td style="border: 1px solid black; padding: 5px;">${p.nama}</td><td style="border: 1px solid black; padding: 5px;">${p.bidang}</td><td style="border: 1px solid black; padding: 5px;">${p.jabatan || '-'}</td></tr>`).join('');
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Data Pegawai</title></head><body><h2 style="text-align: center; font-family: sans-serif;">Data Pegawai Lapas Kalabahi</h2><table style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px;"><thead><tr><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">NIP</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Nama</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Bidang</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Jabatan</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = `Data_Pegawai_SatuLakal.doc`; a.click(); showToast("Diekspor ke Word!");
  };

  const handleResetRequest = async (req) => {
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'credentials', req.nip), { username: req.nip, password: '123456', updatedAt: Date.now() }); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'password_requests', req.id)); showToast(`Sandi ${req.nama} direset ke 123456!`); } catch (err) { showToast("Gagal mereset", "error"); }
  };

  const filteredPegawai = pegawaiList.filter(p => {
    const matchSearch = p.nama.toLowerCase().includes(searchTerm.toLowerCase()) || p.nip.includes(searchTerm);
    const matchBidang = filterBidang === 'Semua' || p.bidang === filterBidang;
    return matchSearch && matchBidang;
  });

  const handleSelectAllPegawai = (e) => {
    if (e.target.checked) setSelectedPegawaiIds(filteredPegawai.map(p => p.nip));
    else setSelectedPegawaiIds([]);
  };

  const toggleSelectPegawai = (nip, isChecked) => {
     if (isChecked) setSelectedPegawaiIds(prev => [...prev, nip]);
     else setSelectedPegawaiIds(prev => prev.filter(i => i !== nip));
  };

  const handleBulkDeletePegawai = () => {
    setConfirmDialog({
        title: "Hapus Pegawai Massal",
        message: `Apakah Anda yakin ingin menghapus ${selectedPegawaiIds.length} pegawai secara permanen?`,
        isDanger: true,
        onConfirm: async () => {
            setConfirmDialog(null);
            setLoading(true);
            try {
                const batch = writeBatch(db);
                selectedPegawaiIds.forEach(nip => {
                    const peg = pegawaiList.find(p => p.nip === nip);
                    if (peg && peg.id) {
                        batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'pegawai', peg.id));
                    }
                });
                await batch.commit();
                showToast(`${selectedPegawaiIds.length} pegawai berhasil dihapus!`);
                setSelectedPegawaiIds([]);
            } catch (e) {
                showToast("Gagal menghapus pegawai massal", "error");
            } finally {
                setLoading(false);
            }
        }
    });
  };

  return (
    <div className="space-y-8">
      {passRequests.length > 0 && (
        <div className="glass-card p-6 rounded-3xl border-l-4 border-amber-500 shadow-xl bg-amber-50/50 dark:bg-amber-900/10 mb-8">
          <h3 className="text-sm font-black text-amber-700 dark:text-amber-500 mb-4 flex items-center gap-2"><AlertTriangle size={18}/> Permintaan Reset Password</h3>
          <div className="space-y-3">
            {passRequests.map(r => (
              <div key={r.id} className="flex flex-col md:flex-row justify-between md:items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm gap-4 border border-slate-100 dark:border-slate-800">
                <div><p className="font-bold text-xs text-slate-900 dark:text-white">{r.nama}</p><p className="text-[9px] text-slate-500 uppercase mt-1">NIP: {r.nip}</p></div>
                <div className="flex gap-2">
                  <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'password_requests', r.id))} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[9px] font-black uppercase hover:bg-slate-200">Tolak</button>
                  <button onClick={() => setConfirmDialog({ title: "Setujui Reset?", message: `Reset sandi ${r.nama} menjadi 123456?`, onConfirm: () => { setConfirmDialog(null); handleResetRequest(r); }})} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-[9px] font-black uppercase shadow-lg shadow-amber-500/30">Setujui & Reset</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-white/5 gap-6">
        <div>
          <h3 className="text-2xl font-black text-slate-950 dark:text-white">Database Pegawai</h3>
          <p className="text-[9px] font-bold text-slate-700 dark:text-slate-500 uppercase mt-1">Pegawai Terdaftar: {pegawaiList.length}</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <input type="file" accept=".xlsx" ref={fileInputRef} onChange={handleImportExcel} className="hidden" />
          <button onClick={() => setPreviewData(dataAwal)} className="px-5 py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d shadow-xl flex items-center gap-2"><Wand2 size={14}/> Sinkronisasi</button>
          <button onClick={() => setShowAddModal(true)} className="px-5 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d shadow-xl flex items-center gap-2"><Plus size={14}/> Tambah Pegawai</button>
          <button onClick={() => setShowLocationModal(true)} className="px-4 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d shadow-xl flex items-center gap-2"><MapPin size={14}/> Set Lokasi</button>
          <div className="h-full w-px bg-slate-200 dark:bg-slate-700 hidden md:block mx-1"></div>
          <button onClick={() => fileInputRef.current.click()} className="px-4 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[9px] btn-3d flex items-center gap-2"><Upload size={14}/> Impor Excel (.xlsx)</button>
          <button onClick={exportToExcel} className="px-4 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d flex items-center gap-2"><FileSpreadsheet size={14}/> Excel (.xlsx)</button>
          <button onClick={exportToWord} className="px-4 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d flex items-center gap-2"><FileText size={14}/> Word</button>
        </div>
      </div>
      
      <div className="flex flex-col xl:flex-row gap-4 mb-4 justify-between items-center mt-6">
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari Nama / NIP Pegawai..." className="w-full pl-10 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold shadow-sm focus:border-blue-500 outline-none transition-colors" />
          </div>
          <div className="relative w-full sm:w-56">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select value={filterBidang} onChange={e => setFilterBidang(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm focus:border-blue-500 outline-none transition-colors appearance-none cursor-pointer">
              <option value="Semua">Semua Bidang</option>
              {bidangs.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
        
        {pegawaiList.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer mr-2">
              <input type="checkbox" onChange={handleSelectAllPegawai} checked={selectedPegawaiIds.length === filteredPegawai.length && filteredPegawai.length > 0} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
              <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">Pilih Semua</span>
            </label>
            {selectedPegawaiIds.length > 0 && (
              <div className="flex gap-2">
                <button onClick={() => setShowBulkAbsenModal(true)} className="px-4 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase btn-3d shrink-0 flex items-center gap-2 hover:bg-emerald-700 transition-colors"><CheckCircle2 size={16}/> Absen Pegawai ({selectedPegawaiIds.length})</button>
                <button onClick={handleBulkDeletePegawai} className="px-4 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase btn-3d shrink-0 flex items-center gap-2 hover:bg-rose-700 transition-colors"><Trash2 size={16}/> Hapus ({selectedPegawaiIds.length})</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPegawai.map(p => (
          <div key={p.nip} className={`p-6 glass-card rounded-3xl flex justify-between items-center transition-transform hover:scale-[1.01] gap-4 ${selectedPegawaiIds.includes(p.nip) ? 'border-2 border-emerald-500 shadow-md bg-emerald-50/20 dark:bg-emerald-900/10' : ''}`}>
            <div className="flex items-center gap-4">
              <input type="checkbox" checked={selectedPegawaiIds.includes(p.nip)} onChange={(e) => toggleSelectPegawai(p.nip, e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
              <div className="text-left"><p className="font-black text-sm text-slate-950 dark:text-white leading-none">{p.nama}</p><p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-2 uppercase">{p.nip} | <span className="text-blue-600">{p.bidang}</span> {p.jabatan && <span className="opacity-70">| {p.jabatan}</span>}</p></div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => toggleBypassGps(p)} className={`p-3 rounded-xl ${p.bypassGps ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500'} transition-colors`} title={p.bypassGps ? "Cabut Izin Bypass GPS" : "Izinkan Absen Tanpa Verifikasi GPS"}><MapPinOff size={14}/></button>
              <button onClick={() => setEditPegawaiTarget(p)} className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl" title="Edit Pegawai"><Edit size={14}/></button>
              <button onClick={() => setTargetPassUser(p)} className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl" title="Lihat/Ubah Sandi"><Key size={14}/></button>
              <button onClick={() => setConfirmDialog({ title: "Hapus Pegawai", message: `Yakin ingin menghapus ${p.nama}?`, isDanger: true, onConfirm: async () => { setConfirmDialog(null); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pegawai', p.id)); showToast("Pegawai dihapus"); } })} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl"><Trash2 size={14}/></button>
            </div>
          </div>
        ))}
      </div>

      {previewData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="glass-card w-full max-w-2xl max-h-[80vh] rounded-[3rem] overflow-hidden flex flex-col">
            <div className="p-10 border-b border-white/10 flex justify-between items-center text-white"><div><h3 className="text-2xl font-black">Pratinjau Impor</h3></div><button onClick={() => setPreviewData(null)}><X size={24}/></button></div>
            <div className="flex-1 overflow-y-auto p-10 space-y-3 bg-slate-900/30">
              {previewData.slice(0, 50).map((p, i) => <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left"><p className="text-white font-bold text-xs">{p.nama}</p><p className="text-[9px] text-slate-500 mt-1 uppercase">NIP: {p.nip}</p></div>)}
            </div>
            <div className="p-10 flex justify-end gap-4"><button onClick={() => setPreviewData(null)} className="text-slate-400 font-black uppercase text-[9px]">Batal</button><button onClick={handleGenerate} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d">Konfirmasi Impor</button></div>
          </div>
        </div>
      )}

      {showAddModal && <AddPegawaiModal db={db} appId={appId} showToast={showToast} onClose={() => setShowAddModal(false)} />}
      {editPegawaiTarget && <EditPegawaiModal db={db} appId={appId} pegawai={editPegawaiTarget} showToast={showToast} onClose={() => setEditPegawaiTarget(null)} />}
      {showBulkAbsenModal && <AdminBulkAbsenModal selectedNips={selectedPegawaiIds} locationConfig={locationConfig} pegawaiList={pegawaiList} db={db} appId={appId} showToast={showToast} onClose={() => {setShowBulkAbsenModal(false); setSelectedPegawaiIds([]);}} />}
      {showLocationModal && <AdminLocationModal locationConfig={locationConfig} db={db} appId={appId} showToast={showToast} onClose={() => setShowLocationModal(false)} />}
      {targetPassUser && <AdminEditPasswordModal targetUser={targetPassUser} credentials={credentials} db={db} appId={appId} onClose={() => setTargetPassUser(null)} showToast={showToast} />}
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}

function AdminLocationModal({ locationConfig, db, appId, onClose, showToast }) {
  const [lat, setLat] = useState(locationConfig.lat);
  const [lng, setLng] = useState(locationConfig.lng);
  const [radius, setRadius] = useState(locationConfig.radius);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'lokasi'), {
        lat: parseFloat(lat), lng: parseFloat(lng), radius: parseInt(radius, 10)
      });
      showToast("Pengaturan lokasi berhasil disimpan!");
      onClose();
    } catch (err) { showToast("Gagal menyimpan pengaturan lokasi", "error"); } finally { setLoading(false); }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return showToast("Browser tidak mendukung GPS", "error");
    showToast("Mencari koordinat saat ini...", "success");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); showToast("Koordinat berhasil didapatkan!", "success"); },
      (err) => showToast("Gagal mendapatkan lokasi", "error"), { enableHighAccuracy: true }
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in">
        <MapPin size={40} className="text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-1 text-center text-slate-950 dark:text-white">Pengaturan Lokasi & Jarak</h2>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-6 text-center">Titik Pusat Absensi Pegawai</p>
        <form onSubmit={handleSave} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Latitude</label>
            <input type="number" step="any" value={lat} onChange={e=>setLat(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold dark:[color-scheme:dark]" required />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Longitude</label>
            <input type="number" step="any" value={lng} onChange={e=>setLng(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold dark:[color-scheme:dark]" required />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Toleransi Jarak Maksimal (Meter)</label>
            <input type="number" value={radius} onChange={e=>setRadius(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold dark:[color-scheme:dark]" required min="10" />
          </div>
          <button type="button" onClick={getCurrentLocation} className="w-full py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 hover:scale-105 transition-transform"><MapPin size={12}/> Ambil Koordinat Saat Ini</button>
          <button type="submit" disabled={loading} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] mt-4 shadow-xl hover:scale-105 transition-transform btn-3d">{loading ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase mt-2">Batal</button>
        </form>
      </div>
    </div>
  );
}

function AdminBulkAbsenModal({ selectedNips, pegawaiList, locationConfig, db, appId, onClose, showToast }) {
  const [type, setType] = useState('Masuk');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [waktu, setWaktu] = useState('07:30');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
     e.preventDefault();
     const start = new Date(startDate);
     const end = new Date(endDate);
     
     if (end < start) { 
        return showToast("Tanggal berakhir harus setelah atau sama dengan tanggal mulai!", "error"); 
     }
     
     setLoading(true);
     try {
        const batch = writeBatch(db);
        let currentDate = new Date(start);
        let totalDocs = 0;

        while (currentDate <= end) {
           const targetDate = new Date(currentDate);
           const [h, m] = waktu.replace(/\./g, ':').split(':').map(Number);
           targetDate.setHours(h, m, 0, 0);

           selectedNips.forEach(nip => {
              const pegawai = pegawaiList.find(p => p.nip === nip);
              if(!pegawai) return;

              const docRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'absensi'));
              batch.set(docRef, {
                 username: pegawai.nip,
                 displayName: pegawai.nama,
                 type: type,
                 timestamp: targetDate.getTime(),
                 dateStr: formatDateIndo(targetDate),
                 timeStr: waktu,
                 photoStr: null,
                 location: { manual: true, lat: locationConfig.lat, lng: locationConfig.lng },
                 distance: 0,
                 deviceVerified: true,
                 isServerSynced: true,
                 antiManipulationEnabled: true,
                 timezone: 'WITA',
                 isAuto: true,
                 adminFilled: true
              });
              totalDocs++;
           });
           
           currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if(totalDocs > 0) {
            await batch.commit();
            showToast(`Berhasil menambahkan ${totalDocs} data absen pegawai!`);
        }
        onClose();
     } catch(err) {
        showToast("Gagal memproses absen pegawai", "error");
     } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in">
        <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-1 text-center text-slate-950 dark:text-white">Absen Pegawai (Bypass GPS)</h2>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-6 text-center">Untuk {selectedNips.length} Pegawai Terpilih</p>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Pilih Status</label>
            <select value={type} onChange={e=>setType(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold">{['Masuk','Keluar','Lepas Piket','Sakit','Cuti','Dinas Luar','BKO'].map(t=><option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div className="grid grid-cols-2 gap-2">
             <div className="space-y-1">
               <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Tanggal Mulai</label>
               <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full px-4 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-[10px] font-bold uppercase dark:[color-scheme:dark]" />
             </div>
             <div className="space-y-1">
               <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Tanggal Berakhir</label>
               <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} min={startDate} className="w-full px-4 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-[10px] font-bold uppercase dark:[color-scheme:dark]" />
             </div>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Waktu / Jam</label>
            <input type="time" value={waktu} onChange={e=>setWaktu(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold dark:[color-scheme:dark]" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] mt-4 shadow-xl hover:scale-105 transition-transform btn-3d">{loading ? 'Memproses...' : 'Proses Absen Pegawai'}</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase mt-2">Batal</button>
        </form>
      </div>
    </div>
  );
}

function AddPegawaiModal({ db, appId, onClose, showToast }) {
  const [nip, setNip] = useState(''); const [nama, setNama] = useState(''); const [bidang, setBidang] = useState('Tata Usaha'); const [jabatan, setJabatan] = useState(''); const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); if (!nip || !nama) return showToast("NIP dan Nama Wajib", "error"); setLoading(true); try { await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'pegawai')), { nip: nip.replace(/\s+/g, ''), nama, bidang, jabatan }); showToast("Ditambahkan!"); onClose(); } catch (error) { showToast("Gagal", "error"); } finally { setLoading(false); } };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in">
        <UserPlus size={40} className="text-blue-500 mx-auto mb-4" /><h2 className="text-xl font-black mb-6 text-center text-slate-950 dark:text-white">Tambah Pegawai</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <input type="text" value={nip} onChange={e=>setNip(e.target.value)} placeholder="NIP Pegawai" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" />
          <input type="text" value={nama} onChange={e=>setNama(e.target.value)} placeholder="Nama Lengkap" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" />
          <select value={bidang} onChange={e=>setBidang(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl font-bold text-xs">{['KALAPAS', 'Tata Usaha', 'KPLP', 'Adm Kamtib', 'Binadikgiatja'].map(b => <option key={b} value={b}>{b}</option>)}</select>
          <input type="text" value={jabatan} onChange={e=>setJabatan(e.target.value)} placeholder="Jabatan (Opsional)" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" />
          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] btn-3d mt-4">Simpan</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase">Batal</button>
        </form>
      </div>
    </div>
  );
}

function EditPegawaiModal({ db, appId, pegawai, onClose, showToast }) {
  const [nip, setNip] = useState(pegawai.nip); const [nama, setNama] = useState(pegawai.nama); const [bidang, setBidang] = useState(pegawai.bidang || 'Tata Usaha'); const [jabatan, setJabatan] = useState(pegawai.jabatan || ''); const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { 
    e.preventDefault(); if (!nip || !nama) return showToast("NIP dan Nama Wajib", "error"); setLoading(true); 
    try { 
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pegawai', pegawai.id), { nip: nip.replace(/\s+/g, ''), nama, bidang, jabatan }); 
      showToast("Data Pegawai Diperbarui!"); onClose(); 
    } catch (error) { showToast("Gagal menyimpan perubahan", "error"); } finally { setLoading(false); } 
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in">
        <Edit size={40} className="text-blue-500 mx-auto mb-4" /><h2 className="text-xl font-black mb-6 text-center text-slate-950 dark:text-white">Edit Data Pegawai</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 ml-2">NIP</label><input type="text" value={nip} onChange={e=>setNip(e.target.value)} placeholder="NIP" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" /></div>
          <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 ml-2">Nama Lengkap</label><input type="text" value={nama} onChange={e=>setNama(e.target.value)} placeholder="Nama Lengkap" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" /></div>
          <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 ml-2">Bidang</label><select value={bidang} onChange={e=>setBidang(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl font-bold text-xs">{['KALAPAS', 'Tata Usaha', 'KPLP', 'Adm Kamtib', 'Binadikgiatja'].map(b => <option key={b} value={b}>{b}</option>)}</select></div>
          <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 ml-2">Jabatan</label><input type="text" value={jabatan} onChange={e=>setJabatan(e.target.value)} placeholder="Jabatan" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" /></div>
          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] btn-3d mt-4">Simpan Perubahan</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase">Batal</button>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = "Ya, Lanjutkan", cancelText = "Batal", isDanger = false }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm animate-in fade-in">
      <div className="glass-card p-8 rounded-[2rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in-95">
        <h3 className={`text-lg font-black mb-2 ${isDanger ? 'text-rose-500' : 'text-blue-500'}`}>{title}</h3>
        <p className="text-xs font-bold text-slate-400 mb-8 whitespace-pre-wrap leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-black uppercase text-[10px] hover:bg-slate-700 transition-colors">{cancelText}</button>
          <button onClick={onConfirm} className={`flex-1 py-3 text-white rounded-xl font-black uppercase text-[10px] btn-3d transition-all ${isDanger ? 'bg-rose-600 shadow-rose-600/30' : 'bg-blue-600 shadow-blue-600/30'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

function PasswordModal({ currentUser, credentials, db, appId, onClose, showToast }) {
  const [oldPass, setOldPass] = useState(''); const [newPass, setNewPass] = useState(''); const [showPass, setShowPass] = useState(false); const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!oldPass || !newPass) return showToast("Isi semua bidang", "error");
    if (currentUser.role === 'admin') {
       if (oldPass !== 'november') return showToast("Sandi lama admin salah", "error");
    } else {
       const cred = credentials.find(c => c.username === currentUser.rawUsername);
       const current = cred?.password || '123456';
       if (oldPass !== current) return showToast("Sandi lama salah", "error");
    }
    setLoading(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'credentials', currentUser.rawUsername), {
        username: currentUser.rawUsername, password: newPass, updatedAt: Date.now()
      });
      showToast("Sandi berhasil diubah!"); onClose();
    } catch (err) { showToast("Gagal mengubah sandi", "error"); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full text-center border border-white/10 shadow-2xl animate-in zoom-in">
        <Key size={40} className="text-blue-500 mx-auto mb-4" /><h2 className="text-xl font-black mb-6 text-slate-950 dark:text-white">Ubah Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 ml-2">Sandi Lama</label><input type={showPass?"text":"password"} value={oldPass} onChange={e=>setOldPass(e.target.value)} className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" /></div>
          <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 ml-2">Sandi Baru</label><input type={showPass?"text":"password"} value={newPass} onChange={e=>setNewPass(e.target.value)} className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" /></div>
          <label className="flex items-center gap-2 cursor-pointer mt-2 pl-2"><input type="checkbox" onChange={()=>setShowPass(!showPass)} checked={showPass} className="w-4 h-4 rounded" /><span className="text-[10px] font-bold text-slate-500">Tampilkan Sandi</span></label>
          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] btn-3d mt-4">Simpan Sandi</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase">Batal</button>
        </form>
      </div>
    </div>
  );
}

function AdminEditPasswordModal({ targetUser, credentials, db, appId, onClose, showToast }) {
  const [newPass, setNewPass] = useState('123456'); const [showPass, setShowPass] = useState(false); const [confirmDialog, setConfirmDialog] = useState(null);
  const handleUpdateClick = (e) => { e.preventDefault(); if (!newPass) return; setConfirmDialog({ title: "Konfirmasi Admin", message: `Ubah sandi untuk ${targetUser.nama}?`, isDanger: true, onConfirm: async () => { setConfirmDialog(null); try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'credentials', targetUser.nip), { username: targetUser.nip, password: newPass, updatedAt: Date.now() }); showToast("Sandi diperbarui!"); onClose(); } catch (err) {} } }); };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full text-center border border-white/10 shadow-2xl animate-in zoom-in">
        <Lock size={40} className="text-amber-500 mx-auto mb-4" /><h2 className="text-xl font-black mb-8 text-slate-950 dark:text-white">Akses Admin</h2>
        <form onSubmit={handleUpdateClick} className="space-y-4 text-left">
          <div className="relative"><input type={showPass?"text":"password"} value={newPass} onChange={e=>setNewPass(e.target.value)} className="w-full pl-5 pr-12 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" /><button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div>
          <button type="submit" className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] btn-3d">Simpan Sandi Baru</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase">Batal</button>
        </form>
      </div>
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}
