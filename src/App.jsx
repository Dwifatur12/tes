import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, LogIn, LogOut, User, Lock, CheckCircle2, AlertCircle, 
  RefreshCcw, History, Clock, Users, Shield, MapPin, ExternalLink, 
  FileText, Check, X, PieChart, TrendingUp, Key, Save, Scan, 
  Loader2, Download, Printer, Edit, Trash2, Plus, UserPlus, 
  FileSpreadsheet, MessageCircle, Moon, Sun, ChevronRight, Activity,
  LayoutDashboard, Database, BarChart3, Settings, Wand2, Eye, EyeOff, MapPinOff,
  ShieldAlert, HelpCircle, AlertTriangle, MessageSquare, BellRing, Upload
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

const TARGET_LAT = -8.219515;
const TARGET_LNG = 124.513346;

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
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
};

const formatDateIndo = (date) => {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
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

  const [pegawaiList, setPegawaiList] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [allHistory, setAllHistory] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const syncTime = async () => {
      const providers = [
        'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Makassar',
        'https://worldtimeapi.org/api/timezone/Asia/Makassar'
      ];
      try {
        const fastestResponse = await Promise.any(
          providers.map(url => 
            fetch(url, { cache: 'no-cache' }).then(res => {
              if (!res.ok) throw new Error();
              return res.json();
            })
          )
        );
        const serverDate = new Date(fastestResponse.dateTime || fastestResponse.datetime);
        setSyncRefs({ server: serverDate.getTime(), perf: performance.now() });
        setIsTimeSynced(true);
        setTimeAnomaly(false);
      } catch (err) {
        setTimeout(syncTime, 10000);
      }
    };
    syncTime();
    const resyncInterval = setInterval(syncTime, 1800000);
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
      } else {
        setCurrentTime(new Date());
      }
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
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth failed", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const qPegawai = collection(db, 'artifacts', appId, 'public', 'data', 'pegawai');
    const unsubPegawai = onSnapshot(qPegawai, (snap) => setPegawaiList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qCreds = collection(db, 'artifacts', appId, 'public', 'data', 'credentials');
    const unsubCreds = onSnapshot(qCreds, (snap) => setCredentials(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qAbsen = collection(db, 'artifacts', appId, 'public', 'data', 'absensi');
    const unsubAbsen = onSnapshot(qAbsen, (snap) => setAllHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp)));

    return () => { unsubPegawai(); unsubCreds(); unsubAbsen(); };
  }, [firebaseUser]);

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Shield size={60} className="text-blue-500 animate-pulse" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-100 transition-colors duration-500 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;400;600;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        .glass-card { background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: 0 20px 50px rgba(0,0,0,0.05); }
        .dark .glass-card { background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
        .btn-3d { transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 4px 0 rgba(30, 64, 175, 0.5); }
        .btn-3d:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(30, 64, 175, 0.5); }
        .laser-line { width: 100%; height: 2px; background: #3b82f6; box-shadow: 0 0 15px #3b82f6; position: absolute; animation: scan 2s infinite linear; z-index: 10; }
        @keyframes scan { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
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
            localStorage.setItem('absensiUser', JSON.stringify(u));
            setCurrentUser(u);
            showToast(`Selamat datang, ${u.username}`);
          }} 
          credentials={credentials} 
          pegawaiList={pegawaiList} 
          isDarkMode={isDarkMode} 
          toggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
          showToast={showToast}
        />
      ) : (
        <MainDashboard 
          currentUser={currentUser} 
          pegawaiList={pegawaiList}
          allHistory={allHistory}
          credentials={credentials}
          showToast={showToast}
          isDarkMode={isDarkMode}
          toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onLogout={() => {
            localStorage.removeItem('absensiUser');
            setCurrentUser(null);
            showToast("Berhasil keluar.");
          }}
          appId={appId}
          db={db}
          currentTime={currentTime}
          isTimeSynced={isTimeSynced}
          timeAnomaly={timeAnomaly}
        />
      )}
    </div>
  );
}

// ==========================================
// HALAMAN LOGIN 
// ==========================================
function LoginPage({ onLogin, credentials, pegawaiList, isDarkMode, toggleDarkMode, showToast }) {
  const [nip, setNip] = useState('');
  const [pass, setPass] = useState('');
  const [showPassword, setShowPassword] = useState(false); 

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nip || !pass) return showToast("Harap isi NIP dan Kata Sandi", "error");
    
    if (nip === '2001' && pass === 'november') return onLogin({ username: 'Admin Lapas', role: 'admin', rawUsername: '2001' });

    const cred = credentials.find(c => c.username === nip);
    const expectedPass = cred?.password || '123456'; 
    
    if (pass === expectedPass) {
      const peg = pegawaiList.find(p => p.nip === nip);
      if (peg) onLogin({ username: peg.nama, role: 'pegawai', rawUsername: nip });
      else showToast("NIP tidak terdaftar dalam sistem", "error");
    } else showToast("NIP atau Kata Sandi salah", "error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-950 relative">
      <button onClick={toggleDarkMode} className="absolute top-8 right-8 p-4 glass-card rounded-2xl transition-transform hover:scale-110">
        {isDarkMode ? <Sun className="text-yellow-500" size={20}/> : <Moon className="text-blue-600" size={20}/>}
      </button>

      <div className="glass-card p-10 rounded-[3rem] w-full max-w-sm text-center border border-white/5 shadow-2xl">
        <Shield size={50} className="text-blue-600 mx-auto mb-6" />
        <h1 className="text-4xl font-black tracking-tighter dark:text-white leading-tight text-slate-950">SATU-KALA</h1>
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mt-2 mb-10 leading-relaxed px-4">Sistem Absensi Terpadu Lapas Kalabahi</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-500 ml-2">NIP Pegawai</label>
            <input 
              type="text" 
              value={nip} 
              onChange={e => setNip(e.target.value)} 
              className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 font-bold dark:text-white transition-all text-slate-950 shadow-inner" 
              placeholder="Masukkan NIP"
            />
          </div>
          <div className="space-y-1 relative">
            <div className="flex justify-between items-end">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-500 ml-2">Kata Sandi</label>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={pass} 
                onChange={e => setPass(e.target.value)} 
                className="w-full pl-5 pr-12 py-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 font-bold dark:text-white transition-all text-slate-950 shadow-inner" 
                placeholder="Masukkan Sandi"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest mt-6 btn-3d">
            Masuk Sekarang
          </button>
        </form>
        
        <button onClick={() => showToast("Gunakan NIP dan sandi bawaan (123456) jika belum diubah.", "success")} className="mt-8 text-[9px] font-bold text-slate-500 flex items-center justify-center gap-1 mx-auto hover:text-blue-500 transition-colors uppercase tracking-widest">
          <HelpCircle size={14}/> Butuh Bantuan?
        </button>
      </div>
    </div>
  );
}

// ==========================================
// DASHBOARD UTAMA
// ==========================================
function MainDashboard({ currentUser, pegawaiList, allHistory, credentials, showToast, isDarkMode, toggleDarkMode, onLogout, appId, db, currentTime, isTimeSynced, timeAnomaly }) {
  const [activeTab, setActiveTab] = useState(currentUser.role === 'admin' ? 'rekap' : 'absen');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // State untuk Fitur Auto WA
  const [waConfig, setWaConfig] = useState(() => {
    const saved = localStorage.getItem('waAutoConfig');
    return saved ? JSON.parse(saved) : { enabled: false, time: '15:00', phone: '' };
  });
  const [showWAAlert, setShowWAAlert] = useState(false);
  const [lastWADate, setLastWADate] = useState(localStorage.getItem('lastWADate'));

  const menuItems = [
    { id: 'absen', label: 'Presensi', icon: Camera },
    { id: 'riwayat', label: 'Riwayat Absensi', icon: History },
    { id: 'rekap', label: 'Laporan', icon: FileSpreadsheet },
    { id: 'analitik', label: 'Grafik Kehadiran', icon: BarChart3 },
    { id: 'kelola', label: 'Pegawai', icon: Users, admin: true },
  ];

  // Logika Pemantau Waktu untuk WA Laporan Otomatis
  useEffect(() => {
    if (!waConfig.enabled || !waConfig.phone) return;
    const interval = setInterval(() => {
      const nowWITA = formatWITA(currentTime).substring(0, 5); // format "HH:mm"
      const dateToday = formatDateIndo(currentTime);

      if (nowWITA === waConfig.time && lastWADate !== dateToday) {
        setShowWAAlert(true);
      }
    }, 10000); // cek setiap 10 detik
    return () => clearInterval(interval);
  }, [currentTime, waConfig, lastWADate]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 fixed h-full z-40">
        <div className="flex items-center gap-3 mb-12">
          <Shield className="text-blue-600" size={32} />
          <div>
            <h2 className="text-xl font-black tracking-tight dark:text-white text-slate-950">SATU-KALA</h2>
            <p className="text-[7px] font-bold text-slate-500 uppercase leading-none mt-0.5">Lapas Kalabahi</p>
          </div>
        </div>
        <nav className="flex-1 space-y-3">
          {menuItems.map(item => (
            (!item.admin || currentUser.role === 'admin') && (
              <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <item.icon size={18} /> {item.label}
              </button>
            )
          ))}
        </nav>
        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-xs uppercase text-slate-800 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Key size={18} /> Ubah Sandi
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-xs uppercase text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 pb-24 lg:pb-10 relative">
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-950 dark:text-white">
                {activeTab === 'absen' ? 'Pusat Presensi' : (menuItems.find(m => m.id === activeTab)?.label || activeTab)}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-500 mt-2">
                Pegawai: {currentUser.username} <span className="mx-2 opacity-30">|</span> Unit: Kalabahi
              </p>
            </div>

            <div className={`flex items-center gap-4 glass-card px-6 py-4 rounded-3xl w-full md:w-auto justify-between border-2 shadow-xl transition-all duration-700 ${timeAnomaly ? 'border-rose-600' : (isTimeSynced ? 'border-emerald-500/20' : 'border-blue-500/10')}`}>
              <div className="text-left md:text-right">
                <div className="flex items-center md:justify-end gap-2">
                  <p className={`text-3xl font-black tabular-nums leading-none ${timeAnomaly ? 'text-rose-600' : 'text-blue-600 dark:text-blue-400'}`}>
                    {formatWITA(currentTime)}
                  </p>
                </div>
                <p className="text-[8px] font-black uppercase text-slate-700 dark:text-slate-500 mt-1 tracking-tighter flex items-center gap-1 md:justify-end">
                  {timeAnomaly ? <ShieldAlert size={10} className="text-rose-600"/> : (isTimeSynced ? <CheckCircle2 size={10} className="text-emerald-500"/> : <Loader2 size={10} className="animate-spin text-blue-500"/>)}
                  {timeAnomaly ? "MANIPULASI TERDETEKSI" : (isTimeSynced ? "TERVERIFIKASI SERVER WITA" : "SINKRONISASI WAKTU...")}
                </p>
              </div>
              <button onClick={toggleDarkMode} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl transition-transform hover:scale-110">
                {isDarkMode ? <Sun size={18} className="text-yellow-500"/> : <Moon size={18} className="text-blue-600"/>}
              </button>
            </div>
          </header>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'absen' && <AbsenView currentUser={currentUser} currentTime={currentTime} allHistory={allHistory} showToast={showToast} appId={appId} db={db} isSynced={isTimeSynced && !timeAnomaly} />}
            {activeTab === 'riwayat' && <HistoryList history={currentUser.role === 'admin' ? allHistory : allHistory.filter(h => h.username === currentUser.rawUsername)} currentUser={currentUser} db={db} appId={appId} showToast={showToast} />}
            {activeTab === 'rekap' && <RekapView allHistory={allHistory} pegawaiList={pegawaiList} waConfig={waConfig} setWaConfig={(cfg) => { setWaConfig(cfg); localStorage.setItem('waAutoConfig', JSON.stringify(cfg)); showToast("Pengaturan WA Laporan Otomatis Tersimpan!"); }} showToast={showToast} />}
            {activeTab === 'analitik' && <AnalitikView allHistory={allHistory} pegawaiList={pegawaiList} />}
            {activeTab === 'kelola' && <KelolaView pegawaiList={pegawaiList} showToast={showToast} db={db} appId={appId} credentials={credentials} />}
          </div>
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center p-3 z-40 shadow-2xl safe-area-inset-bottom">
        {menuItems.map(item => (
          (!item.admin || currentUser.role === 'admin') && (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === item.id ? 'text-blue-600' : 'text-slate-700'}`}>
              <item.icon size={20} />
              <span className="text-[7px] font-black uppercase max-w-[60px] text-center truncate">{item.label}</span>
            </button>
          )
        ))}
      </nav>

      {showPasswordModal && <PasswordModal currentUser={currentUser} credentials={credentials} db={db} appId={appId} onClose={() => setShowPasswordModal(false)} showToast={showToast} />}
      
      {/* Pop-up Kirim WA Otomatis */}
      {showWAAlert && (
        <AutoWAAlert 
          onClose={() => setShowWAAlert(false)} 
          onSend={() => {
            const dateToday = formatDateIndo(currentTime);
            localStorage.setItem('lastWADate', dateToday);
            setLastWADate(dateToday);
            setShowWAAlert(false);
          }}
          waConfig={waConfig}
          allHistory={allHistory}
          pegawaiList={pegawaiList}
        />
      )}
    </div>
  );
}

// ==========================================
// VIEW: PRESENSI (ABSEN) + LIVE GPS MAP
// ==========================================
function AbsenView({ currentUser, currentTime, allHistory, showToast, appId, db, isSynced }) {
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [dist, setDist] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [absenType, setAbsenType] = useState('Masuk');
  const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false); 
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => { 
    return () => {
      stopCamera(); 
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true); 
      }
    } catch (e) { showToast("Kamera tidak tersedia atau izin ditolak", "error"); setIsCameraActive(false); }
  };

  const stopCamera = () => { 
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop()); 
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    setIsScanning(true);
    setTimeout(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const isDesktop = window.innerWidth >= 768;
      const vW = video.videoWidth;
      const vH = video.videoHeight;

      if (isDesktop) { canvas.width = 640; canvas.height = 360; }
      else { canvas.width = 480; canvas.height = 640; }

      const targetRatio = canvas.width / canvas.height;
      const sourceRatio = vW / vH;

      let sx, sy, sWidth, sHeight;
      if (sourceRatio > targetRatio) {
        sHeight = vH; sWidth = vH * targetRatio; sx = (vW - sWidth) / 2; sy = 0;
      } else {
        sWidth = vW; sHeight = vW / targetRatio; sx = 0; sy = (vH - sHeight) / 2;
      }

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      setPhoto(canvas.toDataURL('image/jpeg', 0.8));
      setIsScanning(false); stopCamera();
    }, 2000);
  };

  const toggleLocationTracking = () => {
    if (!navigator.geolocation) return showToast("GPS tidak didukung oleh perangkat", "error");

    if (isTrackingLocation) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      setIsTrackingLocation(false);
      showToast("Pelacakan GPS dihentikan");
      return;
    }

    showToast("Memulai pelacakan lokasi real-time...");
    setIsTrackingLocation(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        setDist(getDistanceInKm(latitude, longitude, TARGET_LAT, TARGET_LNG));
      },
      (err) => {
        showToast("Sinyal GPS Lemah, pastikan pengaturan lokasi aktif", "error");
        setIsTrackingLocation(false);
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  const submitAbsen = async () => {
    if (!auth.currentUser) return showToast("Sesi habis, harap login ulang", "error");
    if (!isSynced) return showToast("Waktu perangkat tidak valid", "error");

    if (!window.confirm(`KONFIRMASI ABSENSI:\n\nApakah Anda yakin ingin mengirim laporan [${absenType}] sekarang?\n\nPastikan foto wajah dan titik lokasi Anda sudah akurat.`)) {
      return;
    }

    if (absenType === 'Sakit') {
      const currentMonth = currentTime.getMonth();
      const currentYear = currentTime.getFullYear();
      const sickLogsThisMonth = allHistory.filter(h => {
        const logDate = new Date(h.timestamp);
        return h.username === currentUser.rawUsername && h.type === 'Sakit' && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
      });
      if (sickLogsThisMonth.length >= 2) return showToast("Batas Sakit maksimal 2x sebulan telah tercapai", "error");
    }
    
    setLoading(true);
    try {
      const dateStr = formatDateIndo(currentTime);
      const timeStr = formatWITA(currentTime).substring(0, 5);
      
      const data = {
        username: currentUser.rawUsername, displayName: currentUser.username, type: absenType,
        timestamp: currentTime.getTime(), dateStr, timeStr, photoStr: photo,
        location: location || { lat: 0, lng: 0, manual: true }, distance: dist || 0,
        deviceVerified: true, isServerSynced: true, antiManipulationEnabled: true, timezone: 'WITA'
      };

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'absensi'), data);
      showToast(`Presensi ${absenType} Berhasil Disimpan!`);
      setPhoto(null); 
      startCamera(); 
    } catch (e) { showToast("Gagal menyimpan data ke server", "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <canvas ref={canvasRef} className="hidden" />
      <div className="glass-card p-6 md:p-10 rounded-[3rem] relative overflow-hidden shadow-2xl">
        <h3 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-500 mb-6 flex items-center gap-2"><Camera size={14} className="text-blue-600"/> Verifikasi Biometrik Wajah</h3>
        <div className="aspect-[3/4] md:aspect-video bg-slate-900 rounded-[2rem] overflow-hidden relative border-4 border-slate-200 dark:border-slate-800 shadow-inner">
          {!photo ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`} />
              
              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-10 p-6 text-center">
                  <Camera size={40} className="text-slate-500 mb-4" />
                  <p className="text-[9px] font-bold text-slate-400 mb-6 uppercase tracking-widest leading-relaxed">Kamera dalam status siaga<br/>Klik untuk memberikan izin</p>
                  <button onClick={startCamera} className="px-6 py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest btn-3d hover:scale-105 transition-transform">
                    Izinkan & Buka Kamera
                  </button>
                </div>
              )}

              {isScanning && <div className="laser-line"></div>}
            </>
          ) : <img src={photo} className="w-full h-full object-cover" alt="Captured" />}
        </div>
        <button 
          onClick={photo ? () => {setPhoto(null); startCamera();} : (isCameraActive ? capturePhoto : startCamera)} 
          className="w-full mt-8 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest btn-3d transition-all hover:brightness-110"
        >
          {photo ? 'Ambil Ulang Foto' : (isCameraActive ? 'Pindai Wajah Sekarang' : 'Nyalakan Kamera')}
        </button>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6 md:p-8 rounded-[2.5rem] shadow-xl">
          <h3 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-500 mb-6 flex items-center gap-2">
            <MapPin size={14} className={isTrackingLocation ? "text-emerald-500 animate-pulse" : "text-blue-600"}/> 
            Koordinat Personel GPS {isTrackingLocation && "(LIVE)"}
          </h3>
          <div className="aspect-video bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center border-4 border-slate-200 dark:border-slate-800 shadow-inner relative overflow-hidden">
            {location ? (
              <>
                {/* Visual Peta Google Maps Real-Time */}
                <iframe 
                  title="Peta Lokasi Pegawai"
                  src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=16&output=embed`} 
                  className="absolute inset-0 w-full h-full opacity-60 dark:opacity-40 pointer-events-none"
                  frameBorder="0"
                />
                
                <div className="text-center animate-in zoom-in z-10 bg-slate-900/70 p-5 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl">
                  <Activity size={32} className={`${isTrackingLocation ? 'text-emerald-500 animate-bounce' : 'text-blue-500'} mx-auto mb-3`}/>
                  <p className="text-white font-black text-xl tracking-tight">Sinyal GPS Terkunci</p>
                  
                  {/* Tampilan Koordinat Real */}
                  <p className="text-[10px] font-bold text-slate-300 mt-3 uppercase tracking-widest font-mono">
                    Lat: {location.lat.toFixed(5)} <br/> Lng: {location.lng.toFixed(5)}
                  </p>
                  <p className="text-[9px] font-black text-blue-400 mt-2 uppercase tracking-widest bg-blue-900/40 px-3 py-1 rounded-full inline-block">
                    Jarak ke Lapas: {dist?.toFixed(2)} KM
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center p-6 opacity-40">
                <MapPinOff size={40} className="text-rose-600 mx-auto mb-4"/>
                <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest">GPS Belum Terdeteksi</p>
              </div>
            )}
            
            {/* Animasi Live Tracking */}
            {isTrackingLocation && (
              <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
                <span className="text-[7px] font-black uppercase tracking-widest text-emerald-500 bg-slate-900/80 px-2 py-0.5 rounded-full backdrop-blur-sm">Live</span>
              </div>
            )}
          </div>
          <button 
            onClick={toggleLocationTracking} 
            className={`w-full mt-6 py-4 glass-card rounded-2xl font-black text-[9px] uppercase btn-3d transition-all shadow-md ${isTrackingLocation ? 'bg-slate-100 text-rose-600 dark:bg-slate-950 dark:text-rose-500' : 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white'}`}
          >
            {isTrackingLocation ? 'Hentikan Lacak GPS' : 'Mulai Lacak GPS Real-Time (Peta)'}
          </button>
        </div>

        <div className="glass-card p-6 md:p-8 rounded-[2.5rem] flex flex-col md:flex-row gap-4 items-center border border-blue-500/10 shadow-lg">
          <select value={absenType} onChange={e => setAbsenType(e.target.value)} className="w-full md:flex-1 p-4 bg-slate-100 dark:bg-slate-900 border-none rounded-2xl font-black text-xs text-center outline-none cursor-pointer text-slate-950 dark:text-white shadow-inner">
            {['Masuk', 'Keluar', 'Lepas Piket', 'Sakit', 'Cuti', 'Dinas Luar'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button disabled={!photo || loading || !isSynced || !location} onClick={submitAbsen} className="w-full md:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] btn-3d shadow-xl shadow-blue-600/30 disabled:opacity-30 disabled:scale-100 transition-all active:scale-95">
            {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : `Lapor ${absenType}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VIEW: LAPORAN (REKAPITULASI) + WA FEATURE
// ==========================================
function RekapView({ allHistory, pegawaiList, waConfig, setWaConfig, showToast }) {
  const [showWASettings, setShowWASettings] = useState(false);
  const today = formatDateIndo(new Date());
  const todayLogs = allHistory.filter(h => h.dateStr === today);
  const bidangs = ["KALAPAS", "Tata Usaha", "KPLP", "Adm Kamtib", "Binadikgiatja"];

  const getFinalStatus = (logs) => {
    if (logs.length === 0) return { label: 'TANPA KETERANGAN', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
    const special = logs.find(l => ['Sakit', 'Cuti', 'Dinas Luar', 'Lepas Piket'].includes(l.type));
    if (special) return { label: special.type.toUpperCase(), class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
    const inLog = logs.find(l => l.type === 'Masuk');
    if (inLog) {
      const [h, m] = inLog.timeStr.split(':').map(Number);
      if (h > 7 || (h === 7 && m > 30)) return { label: 'TERLAMBAT', class: 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' };
      return { label: 'HADIR', class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' };
    }
    return { label: 'AKTIF', class: 'bg-slate-100 text-slate-800 dark:bg-slate-800' };
  };

  const getWAPesanLaporan = () => {
    let hadirCount = 0; let telatCount = 0; let tkCount = 0; let khususCount = 0;
    pegawaiList.forEach(p => {
      const logs = todayLogs.filter(l => l.username === p.nip);
      const s = getFinalStatus(logs).label;
      if (s === 'HADIR') hadirCount++;
      else if (s === 'TERLAMBAT') telatCount++;
      else if (s === 'TANPA KETERANGAN') tkCount++;
      else khususCount++;
    });

    return `*LAPORAN ABSENSI SATU-KALA*
Lapas Kelas IIB Kalabahi
Hari/Tanggal: ${today}

*REKAPITULASI KEHADIRAN*
👥 Total Personel: ${pegawaiList.length} Orang
✅ Hadir Tepat Waktu: ${hadirCount} Orang
⚠️ Terlambat: ${telatCount} Orang
ℹ️ Sakit/Cuti/DL: ${khususCount} Orang
❌ Tanpa Keterangan: ${tkCount} Orang

_Pesan ini dikirim secara otomatis melalui sistem SATU-KALA._`;
  };

  const sendManualWA = () => {
    const text = encodeURIComponent(getWAPesanLaporan());
    const phone = waConfig.phone || '';
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="glass-card rounded-[3rem] overflow-hidden shadow-2xl">
      <div className="p-8 md:p-10 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-950 dark:text-white tabular-nums tracking-tighter leading-none">{today}</h2>
          <p className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-500 mt-2">Daftar Kehadiran Personel (Verifikasi Server WITA)</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button onClick={() => setShowWASettings(true)} className="flex-1 md:flex-none px-5 py-4 bg-amber-500 text-white rounded-2xl font-black text-[9px] uppercase btn-3d flex items-center justify-center gap-2">
            <BellRing size={14}/> Auto WA
          </button>
          <button onClick={sendManualWA} className="flex-1 md:flex-none px-5 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase btn-3d flex items-center justify-center gap-2">
            <MessageSquare size={14}/> Kirim WA
          </button>
          <button onClick={() => window.print()} className="flex-1 md:flex-none px-5 py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-[9px] uppercase btn-3d flex items-center justify-center gap-2">
            <Printer size={14}/> Cetak PDF
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-500 uppercase text-[9px] font-black tracking-widest">
            <tr><th className="px-10 py-6">Personel</th><th className="px-6 py-6 text-center">Masuk</th><th className="px-6 py-6 text-center">Keluar</th><th className="px-6 py-6 text-center">Status Akhir</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {bidangs.map(bidang => (
              <React.Fragment key={bidang}>
                <tr className="bg-slate-50/50 dark:bg-slate-950/20"><td colSpan="4" className="px-10 py-4 text-blue-600 font-black uppercase text-[8px] tracking-widest">{bidang}</td></tr>
                {pegawaiList.filter(p => p.bidang === bidang).map(p => {
                  const logs = todayLogs.filter(l => l.username === p.nip);
                  const inLog = logs.find(l => l.type === 'Masuk');
                  const outLog = logs.find(l => l.type === 'Keluar');
                  const status = getFinalStatus(logs);
                  return (
                    <tr key={p.nip} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="px-10 py-6"><p className="font-black text-sm text-slate-950 dark:text-white leading-none">{p.nama}</p><p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-2 uppercase leading-relaxed">{p.nip} | {p.jabatan}</p></td>
                      <td className="px-6 py-6 text-center">{inLog ? <div className="flex flex-col items-center gap-1"><img src={inLog.photoStr} className="w-12 h-12 rounded-xl border-2 border-emerald-500 object-cover shadow-lg mx-auto"/><span className="text-[7px] font-black text-emerald-600 uppercase mt-1">{inLog.timeStr}</span></div> : <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl mx-auto opacity-30 flex items-center justify-center text-slate-400"><User size={16}/></div>}</td>
                      <td className="px-6 py-6 text-center">{outLog ? <div className="flex flex-col items-center gap-1"><img src={outLog.photoStr} className="w-12 h-12 rounded-xl border-2 border-rose-600 object-cover shadow-lg mx-auto"/><span className="text-[7px] font-black text-rose-600 uppercase mt-1">{outLog.timeStr}</span></div> : <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl mx-auto opacity-30 flex items-center justify-center text-slate-400"><User size={16}/></div>}</td>
                      <td className="px-6 py-6 text-center"><span className={`px-4 py-1.5 rounded-full text-[8px] font-black tracking-widest ${status.class}`}>{status.label}</span></td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showWASettings && (
        <WASettingsModal waConfig={waConfig} setWaConfig={setWaConfig} onClose={() => setShowWASettings(false)} />
      )}
    </div>
  );
}

// Modal Pengaturan Auto WhatsApp
function WASettingsModal({ waConfig, setWaConfig, onClose }) {
  const [phone, setPhone] = useState(waConfig.phone);
  const [time, setTime] = useState(waConfig.time);
  const [enabled, setEnabled] = useState(waConfig.enabled);

  const handleSave = (e) => {
    e.preventDefault();
    setWaConfig({ phone, time, enabled });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in">
        <MessageSquare size={40} className="text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-1 text-center text-slate-950 dark:text-white">Otomasi WhatsApp</h2>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-6 leading-relaxed text-center">Pengingat Pengiriman Laporan</p>
        
        <form onSubmit={handleSave} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Status Otomasi</label>
            <select value={enabled} onChange={e => setEnabled(e.target.value === 'true')} className="w-full p-4 bg-slate-100 dark:bg-slate-900 border-none rounded-2xl font-bold text-xs outline-none text-slate-950 dark:text-white shadow-inner">
              <option value="false">Nonaktifkan</option>
              <option value="true">Aktifkan Pengingat</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Nomor Tujuan WA (Cth: 62812...)</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Mulai dengan 62" className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none font-bold dark:text-white shadow-inner text-slate-950" />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Jadwal Pengiriman (WITA)</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none font-bold dark:text-white shadow-inner text-slate-950" />
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl mt-2 border border-amber-200 dark:border-amber-800 text-[8px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed">
            *Karena kebijakan keamanan browser, pengiriman otomatis akan memunculkan tombol konfirmasi (pop-up) di layar Anda pada jam yang ditentukan untuk menghindari pemblokiran WhatsApp.
          </div>
          <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] mt-2 shadow-xl shadow-emerald-600/30 hover:scale-[1.02] transition-transform btn-3d">Simpan Pengaturan</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase mt-2">Batal</button>
        </form>
      </div>
    </div>
  );
}

// Komponen Alert Kirim WA Otomatis (Muncul saat jam tiba)
function AutoWAAlert({ onClose, onSend, waConfig, allHistory, pegawaiList }) {
  const handleSend = () => {
    const today = formatDateIndo(new Date());
    const todayLogs = allHistory.filter(h => h.dateStr === today);
    
    let hadirCount = 0; let telatCount = 0; let tkCount = 0; let khususCount = 0;
    pegawaiList.forEach(p => {
      const logs = todayLogs.filter(l => l.username === p.nip);
      const isHadir = logs.some(l => l.type === 'Masuk');
      const isKhusus = logs.some(l => ['Sakit', 'Cuti', 'Dinas Luar', 'Lepas Piket'].includes(l.type));
      if (isKhusus) khususCount++;
      else if (isHadir) hadirCount++;
      else tkCount++;
    });

    const text = encodeURIComponent(`*LAPORAN ABSENSI SATU-KALA*
Lapas Kelas IIB Kalabahi
Hari/Tanggal: ${today}

*REKAPITULASI KEHADIRAN*
👥 Total Personel: ${pegawaiList.length} Orang
✅ Hadir: ${hadirCount} Orang
ℹ️ Sakit/Cuti/DL: ${khususCount} Orang
❌ Tanpa Keterangan: ${tkCount} Orang

_Pesan ini dikirim secara otomatis melalui sistem SATU-KALA._`);

    const url = waConfig.phone ? `https://wa.me/${waConfig.phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
    onSend();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="glass-card p-10 md:p-16 rounded-[3rem] w-full max-w-lg text-center border-2 border-emerald-500 shadow-2xl animate-in zoom-in-95 duration-500">
        <BellRing size={60} className="text-emerald-500 mx-auto mb-6 animate-bounce" />
        <h2 className="text-3xl font-black mb-2 text-white tracking-tight">Waktu Laporan Tiba!</h2>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-10 leading-relaxed">Sistem mendeteksi jadwal pengiriman Laporan WA otomatis pada pukul {waConfig.time} WITA.</p>
        
        <button onClick={handleSend} className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black uppercase text-sm mb-4 shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:scale-105 transition-all btn-3d">
          Kirim Laporan Sekarang
        </button>
        <button onClick={onClose} className="w-full py-4 text-slate-400 hover:text-white text-[10px] font-black uppercase transition-colors">
          Tunda / Lewati Hari Ini
        </button>
      </div>
    </div>
  );
}


// ==========================================
// VIEW: GRAFIK KEHADIRAN (Analitik)
// ==========================================
function AnalitikView({ allHistory, pegawaiList }) {
  const today = formatDateIndo(new Date());
  const todayLogs = allHistory.filter(h => h.dateStr === today);
  const hadir = pegawaiList.filter(p => todayLogs.some(l => l.username === p.nip)).length;
  const total = pegawaiList.length || 36;
  const pct = Math.round((hadir / total) * 100);

  const bidangs = ["KALAPAS", "Tata Usaha", "KPLP", "Adm Kamtib", "Binadikgiatja"];
  const chartData = bidangs.map(b => {
    const ps = pegawaiList.filter(p => p.bidang === b);
    const hs = ps.filter(p => todayLogs.some(l => l.username === p.nip)).length;
    const persentase = ps.length > 0 ? Math.round((hs / ps.length) * 100) : 0;
    return { bidang: b, hadir: hs, total: ps.length, persentase };
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[{ l: 'Kehadiran Total', v: hadir, c: 'text-emerald-600' }, { l: 'Absensi/Kosong', v: total-hadir, c: 'text-rose-600' }, { l: 'Persentase', v: pct+'%', c: 'text-blue-600' }].map(s => (
          <div key={s.l} className="glass-card p-10 rounded-[2.5rem] text-center shadow-xl"><p className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-500 mb-4">{s.l}</p><p className={`text-6xl font-black ${s.c}`}>{s.v}</p></div>
        ))}
      </div>

      <div className="glass-card p-8 md:p-10 rounded-[3rem] shadow-2xl">
        <h3 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-500 mb-8 tracking-widest flex items-center gap-2">
          <BarChart3 size={16} className="text-blue-600"/> Grafik Infografis Kehadiran Per Bidang (Hari Ini)
        </h3>
        <div className="space-y-6">
          {chartData.map((data, idx) => (
            <div key={idx} className="relative">
              <div className="flex justify-between font-black uppercase text-[10px] mb-2 text-slate-950 dark:text-white">
                <span>{data.bidang}</span>
                <span className="text-blue-600">{data.hadir} dari {data.total} Personel ({data.persentase}%)</span>
              </div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner flex">
                <div 
                  className="h-full bg-blue-600 transition-all duration-1000 ease-out flex items-center justify-end pr-2" 
                  style={{ width: `${data.persentase}%` }}
                >
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VIEW: KELOLA PEGAWAI (Update: Tambah & Impor)
// ==========================================
function KelolaView({ pegawaiList, showToast, db, appId, credentials }) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [targetPassUser, setTargetPassUser] = useState(null); 
  const [showAddModal, setShowAddModal] = useState(false); // Modal Tambah Manual
  const fileInputRef = useRef(null);

  const dataAwal = [
    { nip: "198007232000121001", nama: "M Arfandy, A.Md. IP., S.H., M.H.", bidang: "KALAPAS", jabatan: "Kepala Lembaga Pemasyarakatan" },
    { nip: "198507302009011003", nama: "ABDURRAHMAN HARYONO, S.H.", bidang: "Tata Usaha", jabatan: "KEPALA SUBBAGIAN TATA USAHA" },
    { nip: "196810191992032001", nama: "OKTOVIYANA LILIYANI LOURU JAGI", bidang: "Tata Usaha", jabatan: "KEPALA URUSAN KEPEGAWAIAN DAN KEUANGAN" },
    { nip: "199006102009011001", nama: "ASRIYADI LAGANI, S.H.", bidang: "Tata Usaha", jabatan: "KEPALA URUSAN UMUM" },
    { nip: "199007082009121003", nama: "DANIEL ROBERTO ANIE", bidang: "Tata Usaha", jabatan: "PENGELOLA DATA KEPEGAWAIAN" },
    { nip: "199004212012121001", nama: "ANTONIUS SOEHONO PURWANTO", bidang: "Tata Usaha", jabatan: "OPERATOR MESIN" },
    { nip: "199710102017121001", nama: "RIVALDO FITHOREZA OLANG, S.Sos", bidang: "Tata Usaha", jabatan: "BENDAHARA PENGELUARAN" },
    { nip: "199804222017122002", nama: "MISYIE AMELIA MABILEHI", bidang: "Tata Usaha", jabatan: "PENGHUBUNG ADMINISTRASI KEPEGAWAIAN" },
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
    { nip: "200207112025021001", nama: "GELORA KURNIAWAN, S.Tr.Pas.", bidang: "KPLP", jabatan: "PEMBINA KEAMANAN PEMASYARAKATAN AHLI PERTAMA" },
    { nip: "198602112007031001", nama: "ARNOLDUS ENGE, S.H.", bidang: "Adm Kamtib", jabatan: "KEPALA SEKSI ADMINISTRASI KEAMANAN DAN TATA TERTIB" },
    { nip: "196804261991031002", nama: "DAVID HABIL OBED LOA", bidang: "Adm Kamtib", jabatan: "KEPALA SUBSEKSI PELAPORAN DAN TATA TERTIB" },
    { nip: "198603032009011007", nama: "MARTHEN SONOPAA", bidang: "Adm Kamtib", jabatan: "KEPALA SUBSEKSI KEAMANAN" },
    { nip: "199807072017121002", nama: "MAULUDIN HAMZAH, Sos.", bidang: "Adm Kamtib", jabatan: "PENGADMINISTRASI PERLENGKAPAN KEAMANAN" },
    { nip: "199910132022031003", nama: "OPNY ANDOARDO SINAWENI", bidang: "Adm Kamtib", jabatan: "STAF KAMTIB" },
    { nip: "198509252008011001", nama: "SURYANTO AHMAD, S.Sos.", bidang: "Binadikgiatja", jabatan: "KEPALA SEKSI BIMBINGAN NARAPIDANA/ANAK DIDIK DAN KEGIATAN KERJA" },
    { nip: "196804131992031001", nama: "SEPRENI APRIANUS MALOTE, S.Sos.", bidang: "Binadikgiatja", jabatan: "KEPALA SUBSEKSI PERAWATAN NARAPIDANA/ANAK DIDIK" },
    { nip: "196903191991031001", nama: "YOSEF WASI", bidang: "Binadikgiatja", jabatan: "KEPALA SUBSEKSI REGISTRASI DAN BIMBINGAN KEMASYARAKATAN" },
    { nip: "198712262009011001", nama: "MOE KRIMANTO MOKA, S.H.", bidang: "Binadikgiatja", jabatan: "KEPALA SUBSEKSI KEGIATAN KERJA" },
    { nip: "198103082006041001", nama: "MARKUS DEMATRIUS KORANG LAWANG", bidang: "Binadikgiatja", jabatan: "PENGELOLA HASIL KERJA" },
    { nip: "198510132010121003", nama: "ASYER KOLIMON", bidang: "Binadikgiatja", jabatan: "STAF GIATJA" },
    { nip: "198610212012121001", nama: "DANANG MAKMUR HADI", bidang: "Binadikgiatja", jabatan: "PENGOLAH DATA SIDIK JARI" },
    { nip: "199405022012121001", nama: "AHYARDI ARDIMAN BASO", bidang: "Binadikgiatja", jabatan: "STAF REGISTRASI" },
    { nip: "199302182017121002", nama: "ANDRYAN HENDRICHUS KOLLY", bidang: "Binadikgiatja", jabatan: "PENGELOLA DAN PENGOLAH MAKANAN" },
    { nip: "199511222017121001", nama: "ROBERT STILMAN BILL ASBANU", bidang: "Binadikgiatja", jabatan: "PENGADMINISTRASI LAYANAN KUNJUNGAN" },
    { nip: "199812202022031004", nama: "ESA PUTRA NURATIM FOEKH", bidang: "Binadikgiatja", jabatan: "STAF REGISTRASI" },
    { nip: "200211252025062006", nama: "MARIA HERLINA SASI", bidang: "Binadikgiatja", jabatan: "STAF REGISTRASI" }
  ];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      (previewData || dataAwal).forEach(p => {
        const cleanNip = p.nip.replace(/\s+/g, '');
        if (!pegawaiList.some(pl => pl.nip === cleanNip)) {
          const ref = doc(collection(db, 'artifacts', appId, 'public', 'data', 'pegawai'));
          batch.set(ref, { ...p, nip: cleanNip });
        }
      });
      await batch.commit(); showToast("Data Pegawai Berhasil Ditambahkan/Sinkron!");
    } catch (e) { showToast("Gagal memperbarui data", "error"); }
    finally { setLoading(false); setPreviewData(null); }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showToast("Harap gunakan file CSV (Simpan Excel sebagai .csv)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const parsedData = [];

      // Mulai dari baris 1 (mengabaikan header baris 0)
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        // Asumsi format CSV standar: NIP, Nama, Bidang, Jabatan
        const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
        if (cols.length >= 3) {
          parsedData.push({
            nip: cols[0],
            nama: cols[1],
            bidang: cols[2],
            jabatan: cols[3] || 'Staf'
          });
        }
      }

      if (parsedData.length > 0) {
        setPreviewData(parsedData); // Tampilkan pratinjau sebelum commit
      } else {
        showToast("Format file kosong atau tidak valid", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = null; // Reset input
  };

  const exportToExcel = () => {
    if (pegawaiList.length === 0) return showToast("Tidak ada data untuk diekspor", "error");
    let csv = "NIP,Nama,Bidang,Jabatan\n";
    pegawaiList.forEach(p => {
      csv += `"${p.nip}","${p.nama}","${p.bidang}","${p.jabatan || '-'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Data_Pegawai_SatuKala.csv`; a.click();
    showToast("Data diekspor ke Excel!");
  };

  const exportToWord = () => {
    if (pegawaiList.length === 0) return showToast("Tidak ada data untuk diekspor", "error");
    let tableRows = pegawaiList.map(p => `<tr><td style="border: 1px solid black; padding: 5px;">${p.nip}</td><td style="border: 1px solid black; padding: 5px;">${p.nama}</td><td style="border: 1px solid black; padding: 5px;">${p.bidang}</td><td style="border: 1px solid black; padding: 5px;">${p.jabatan || '-'}</td></tr>`).join('');
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Data Pegawai</title></head><body>
    <h2 style="text-align: center; font-family: sans-serif;">Data Pegawai Lapas Kalabahi</h2>
    <table style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px;">
      <thead><tr><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">NIP</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Nama</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Bidang</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Jabatan</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Data_Pegawai_SatuKala.doc`; a.click();
    showToast("Data diekspor ke Word!");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-white/5 gap-6">
        <div>
          <h3 className="text-2xl font-black text-slate-950 dark:text-white">Database Pegawai</h3>
          <p className="text-[9px] font-bold text-slate-700 dark:text-slate-500 uppercase mt-1">Personel Terdaftar: {pegawaiList.length}</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Input Hidden untuk Impor File */}
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
          
          <button onClick={() => setPreviewData(dataAwal)} className="flex-1 md:flex-none px-5 py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d shadow-xl flex items-center justify-center gap-2">
            <Wand2 size={14}/> Sinkronisasi
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex-1 md:flex-none px-5 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d shadow-xl flex items-center justify-center gap-2">
            <Plus size={14}/> Tambah Personel
          </button>
          <button onClick={() => fileInputRef.current.click()} className="flex-1 md:flex-none px-5 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[9px] btn-3d shadow-xl flex items-center justify-center gap-2">
            <Upload size={14}/> Impor File (CSV)
          </button>
          <div className="h-full w-px bg-slate-200 dark:bg-slate-700 hidden md:block mx-1"></div>
          <button onClick={exportToExcel} className="flex-1 md:flex-none px-4 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d flex items-center justify-center gap-2">
            <FileSpreadsheet size={14}/> Excel
          </button>
          <button onClick={exportToWord} className="flex-1 md:flex-none px-4 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d flex items-center justify-center gap-2">
            <FileText size={14}/> Word
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pegawaiList.map(p => (
          <div key={p.nip} className="p-6 glass-card rounded-3xl flex justify-between items-center transition-transform hover:scale-[1.01]">
            <div className="text-left"><p className="font-black text-sm text-slate-950 dark:text-white leading-none">{p.nama}</p><p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-2 uppercase">{p.nip} | <span className="text-blue-600">{p.bidang}</span></p></div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setTargetPassUser(p)} className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl" title="Lihat/Ubah Sandi"><Key size={14}/></button>
              <button onClick={async () => { if(window.confirm(`Hapus ${p.nama}?`)) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pegawai', p.id)); }} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl"><Trash2 size={14}/></button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Modal Sinkronisasi / Impor */}
      {previewData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="glass-card w-full max-w-2xl max-h-[80vh] rounded-[3rem] overflow-hidden flex flex-col border border-white/10">
            <div className="p-10 border-b border-white/10 flex justify-between items-center text-white"><div><h3 className="text-2xl font-black">Pratinjau Impor Data</h3><p className="text-[9px] uppercase mt-2">Daftar Pegawai yang akan ditambahkan ({previewData.length} Data)</p></div><button onClick={() => setPreviewData(null)}><X size={24}/></button></div>
            <div className="flex-1 overflow-y-auto p-10 space-y-3 bg-slate-900/30">
              {previewData.slice(0, 50).map((p, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left"><p className="text-white font-bold text-xs">{p.nama}</p><p className="text-[9px] text-slate-500 mt-1 uppercase">NIP: {p.nip} | {p.bidang}</p></div>
              ))}
              {previewData.length > 50 && <p className="text-xs text-center text-slate-500 font-bold mt-4">... dan {previewData.length - 50} data lainnya.</p>}
            </div>
            <div className="p-10 border-t border-white/10 flex justify-end gap-4"><button onClick={() => setPreviewData(null)} className="text-slate-400 font-black uppercase text-[9px]">Batal</button><button onClick={handleGenerate} disabled={loading} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d shadow-xl shadow-blue-600/30">{loading ? 'Proses...' : 'Konfirmasi Impor'}</button></div>
          </div>
        </div>
      )}

      {/* Modal Tambah Manual */}
      {showAddModal && (
        <AddPegawaiModal db={db} appId={appId} showToast={showToast} onClose={() => setShowAddModal(false)} />
      )}

      {/* Modal Ubah Sandi Pegawai oleh Admin */}
      {targetPassUser && (
        <AdminEditPasswordModal targetUser={targetPassUser} credentials={credentials} db={db} appId={appId} onClose={() => setTargetPassUser(null)} showToast={showToast} />
      )}
    </div>
  );
}

// Modal Khusus Tambah Pegawai Manual
function AddPegawaiModal({ db, appId, onClose, showToast }) {
  const [nip, setNip] = useState('');
  const [nama, setNama] = useState('');
  const [bidang, setBidang] = useState('Tata Usaha');
  const [jabatan, setJabatan] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nip || !nama) return showToast("NIP dan Nama Wajib Diisi", "error");
    setLoading(true);
    try {
      const cleanNip = nip.replace(/\s+/g, '');
      const ref = doc(collection(db, 'artifacts', appId, 'public', 'data', 'pegawai'));
      await setDoc(ref, { nip: cleanNip, nama, bidang, jabatan });
      showToast("Personel berhasil ditambahkan!");
      onClose();
    } catch (error) {
      showToast("Gagal menambahkan pegawai", "error");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in">
        <UserPlus size={40} className="text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-1 text-center text-slate-950 dark:text-white">Tambah Personel</h2>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-6 text-center">Data Master Pegawai</p>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">NIP (Nomor Induk Pegawai)</label>
            <input type="text" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="Contoh: 1990..." className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold dark:text-white shadow-inner text-slate-950" />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Nama Lengkap & Gelar</label>
            <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Pegawai" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold dark:text-white shadow-inner text-slate-950" />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Bidang / Unit Kerja</label>
            <select value={bidang} onChange={(e) => setBidang(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 border-none rounded-2xl font-bold text-xs outline-none text-slate-950 dark:text-white shadow-inner">
              {['KALAPAS', 'Tata Usaha', 'KPLP', 'Adm Kamtib', 'Binadikgiatja'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Jabatan</label>
            <input type="text" value={jabatan} onChange={(e) => setJabatan(e.target.value)} placeholder="Contoh: Staf Kepegawaian" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold dark:text-white shadow-inner text-slate-950" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] mt-4 shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-transform btn-3d">{loading ? 'Menyimpan...' : 'Simpan Data Pegawai'}</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase mt-2">Batal</button>
        </form>
      </div>
    </div>
  );
}

// Modal Khusus Admin Mengubah Sandi Pegawai
function AdminEditPasswordModal({ targetUser, credentials, db, appId, onClose, showToast }) {
  const cred = credentials.find(c => c.username === targetUser.nip);
  const currentPass = cred?.password || '123456';
  
  const [newPass, setNewPass] = useState(currentPass);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!newPass) return showToast("Sandi tidak boleh kosong", "error");

    if (!window.confirm(`KONFIRMASI ADMIN:\n\nAnda yakin ingin mengubah kata sandi untuk akun milik:\n${targetUser.nama}?`)) {
      return;
    }

    setLoading(true);
    try {
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'credentials', targetUser.nip);
      await setDoc(ref, { username: targetUser.nip, password: newPass, updatedAt: Date.now() });
      showToast(`Sandi untuk ${targetUser.nama} berhasil diperbarui!`); 
      onClose();
    } catch (err) { showToast("Gagal memperbarui sandi", "error"); } 
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full text-center border border-white/10 shadow-2xl animate-in zoom-in">
        <Lock size={40} className="text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-1 text-slate-950 dark:text-white">Akses Admin</h2>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-8 leading-relaxed">Kelola Sandi: {targetUser.nama}</p>
        
        <form onSubmit={handleUpdate} className="space-y-4 text-left">
          <div className="relative">
            <input type={showPass ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full pl-5 pr-12 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-bold dark:text-white shadow-inner text-slate-950" />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500">{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>
          <button type="submit" disabled={loading} className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] mt-4 shadow-xl shadow-amber-500/30 hover:scale-[1.02] transition-transform">{loading ? 'Menyimpan...' : 'Simpan Sandi Baru'}</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase mt-2">Batal</button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// MODAL: UBAH SANDI (PRIBADI)
// ==========================================
function PasswordModal({ currentUser, credentials, db, appId, onClose, showToast }) {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassMap, setShowPassMap] = useState({ old: false, new: false, confirm: false }); 

  const toggleShow = (field) => setShowPassMap(prev => ({ ...prev, [field]: !prev[field] }));

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) return showToast("Konfirmasi sandi tidak cocok", "error");
    const cred = credentials.find(c => c.username === currentUser.rawUsername);
    const exp = cred?.password || (currentUser.rawUsername === '2001' ? 'november' : '123456');
    if (oldPass !== exp) return showToast("Sandi lama yang dimasukkan salah", "error");

    if (!window.confirm("PENGATURAN KEAMANAN:\n\nApakah Anda yakin ingin menyimpan kata sandi baru Anda?")) {
      return;
    }

    setLoading(true);
    try {
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'credentials', currentUser.rawUsername);
      await setDoc(ref, { username: currentUser.rawUsername, password: newPass, updatedAt: Date.now() });
      showToast("Kata Sandi Berhasil Diperbarui!"); onClose();
    } catch (err) { showToast("Gagal memperbarui sandi", "error"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full text-center border border-white/10 shadow-2xl animate-in zoom-in">
        <Key size={40} className="text-blue-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black mb-8 text-slate-950 dark:text-white">Ubah Kata Sandi</h2>
        <form onSubmit={handleUpdate} className="space-y-4 text-left">
          
          <div className="relative">
            <input type={showPassMap.old ? "text" : "password"} value={oldPass} onChange={(e) => setOldPass(e.target.value)} placeholder="Sandi Lama" className="w-full pl-5 pr-12 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold dark:text-white shadow-inner text-slate-950" />
            <button type="button" onClick={() => toggleShow('old')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500">{showPassMap.old ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>

          <div className="relative">
            <input type={showPassMap.new ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Sandi Baru" className="w-full pl-5 pr-12 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold dark:text-white shadow-inner text-slate-950" />
            <button type="button" onClick={() => toggleShow('new')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500">{showPassMap.new ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>

          <div className="relative">
            <input type={showPassMap.confirm ? "text" : "password"} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Ulangi Sandi Baru" className="w-full pl-5 pr-12 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold dark:text-white shadow-inner text-slate-950" />
            <button type="button" onClick={() => toggleShow('confirm')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500">{showPassMap.confirm ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>

          <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] mt-4 btn-3d shadow-xl shadow-blue-600/30">{loading ? 'Memproses...' : 'Simpan Perubahan Sandi'}</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase mt-2">Batal</button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// VIEW: RIWAYAT LIST (RIWAYAT ABSENSI)
// ==========================================
function HistoryList({ history, currentUser, db, appId, showToast }) {
  const [editingLog, setEditingLog] = useState(null);

  const handleDelete = async (id) => {
    if (window.confirm("Peringatan Admin: Yakin ingin MENGHAPUS log absensi ini?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absensi', id));
        showToast("Log absensi berhasil dihapus!", "success");
      } catch (err) {
        showToast("Gagal menghapus log", "error");
      }
    }
  };

  if (history.length === 0) return <div className="p-20 text-center opacity-30"><History size={60} className="mx-auto mb-6 text-slate-400" /><p className="text-[9px] font-black uppercase tracking-widest leading-loose text-slate-600">Log harian kosong</p></div>;
  
  const displayLimit = currentUser.role === 'admin' ? 100 : 20;

  return (
    <div className="space-y-4">
      {currentUser.role === 'admin' && (
        <div className="p-4 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50 rounded-2xl flex items-center gap-3 mb-6">
          <AlertTriangle size={20} className="text-amber-600 dark:text-amber-500" />
          <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest">Akses Admin: Menampilkan seluruh riwayat dan izinkan pengeditan</p>
        </div>
      )}

      {history.slice(0, displayLimit).map(item => (
        <div key={item.id} className="p-5 glass-card rounded-2xl flex items-center justify-between border border-white/5 transition-transform hover:translate-x-1">
          <div className="flex items-center gap-5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0 ${item.type === 'Masuk' ? 'bg-emerald-500/10 text-emerald-600' : (item.type === 'Sakit' || item.type === 'Cuti' ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600')}`}>
              {item.type === 'Masuk' ? <LogIn size={20}/> : (item.type === 'Keluar' ? <LogOut size={20}/> : <FileText size={20}/>)}
            </div>
            <div className="text-left">
              <p className="font-black text-sm text-slate-950 dark:text-white leading-none">{item.displayName}</p>
              <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-2 uppercase flex items-center gap-2 leading-relaxed">
                <span className="text-blue-600 font-black">{item.timeStr} WITA</span> | {item.dateStr} | {item.type}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {currentUser.role === 'admin' && (
              <div className="flex gap-2 mr-2">
                <button onClick={() => setEditingLog(item)} className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg" title="Edit Absensi"><Edit size={14}/></button>
                <button onClick={() => handleDelete(item.id)} className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg" title="Hapus Absensi"><Trash2 size={14}/></button>
              </div>
            )}
            {item.photoStr ? <img src={item.photoStr} className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-md" alt="Log" /> : <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 opacity-50 flex items-center justify-center"><User size={16} className="text-slate-400"/></div>}
          </div>
        </div>
      ))}

      {editingLog && (
        <AdminEditHistoryModal 
          log={editingLog} 
          db={db} 
          appId={appId} 
          onClose={() => setEditingLog(null)} 
          showToast={showToast} 
        />
      )}
    </div>
  );
}

// Modal Khusus Admin Mengubah Riwayat Absensi
function AdminEditHistoryModal({ log, db, appId, onClose, showToast }) {
  const [type, setType] = useState(log.type);
  const [timeStr, setTimeStr] = useState(log.timeStr);
  const [dateStr, setDateStr] = useState(log.dateStr);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'absensi', log.id);
      await updateDoc(ref, { type, timeStr, dateStr });
      showToast("Data riwayat absensi berhasil diubah!");
      onClose();
    } catch (err) {
      showToast("Gagal mengubah data absensi", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full text-center border border-white/10 shadow-2xl animate-in zoom-in">
        <Edit size={40} className="text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-1 text-slate-950 dark:text-white">Edit Absensi</h2>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-6 leading-relaxed">Personel: {log.displayName}</p>
        
        <form onSubmit={handleUpdate} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Status</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-900 border-none rounded-2xl font-bold text-xs outline-none text-slate-950 dark:text-white shadow-inner">
              {['Masuk', 'Keluar', 'Lepas Piket', 'Sakit', 'Cuti', 'Dinas Luar'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Jam (WITA)</label>
            <input type="text" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none font-bold dark:text-white shadow-inner text-slate-950" />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Tanggal (Format Indo)</label>
            <input type="text" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs outline-none font-bold dark:text-white shadow-inner text-slate-950" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] mt-4 shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-transform">{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase mt-2">Batal</button>
        </form>
      </div>
    </div>
  );
}
