import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, LogIn, LogOut, User, Lock, CheckCircle2, AlertCircle, 
  RefreshCcw, History, Clock, Users, Shield, MapPin, ExternalLink, 
  FileText, Check, X, PieChart, TrendingUp, Key, Save, Scan, 
  Loader2, Download, Printer, Edit, Trash2, Plus, UserPlus, 
  FileSpreadsheet, MessageCircle, Moon, Sun, ChevronRight, Activity,
  LayoutDashboard, Database, BarChart3, Settings, Wand2, Eye, EyeOff, MapPinOff,
  ShieldAlert, HelpCircle, AlertTriangle, MessageSquare, BellRing, Upload, Megaphone,
  Trophy, ThumbsDown, CalendarDays
} from 'lucide-react';

// ==========================================
// KONFIGURASI DATABASE & FIREBASE
// ==========================================
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, writeBatch, setDoc } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "", 
  authDomain: "default-app-id.firebaseapp.com",
  projectId: "default-app-id",
  storageBucket: "default-app-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'lapas-kalabahi-v2';

const TARGET_LAT = -8.219515;
const TARGET_LNG = 124.513346;
const PETA_DARURAT_URL = "https://maps.app.goo.gl/kndHbFguLbkCowxf8";

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

const getMinutesDiff = (limitH, limitM, actualH, actualM) => {
  return (actualH * 60 + actualM) - (limitH * 60 + limitM);
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
  const [passRequests, setPassRequests] = useState([]); 
  
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
      const providers = [
        'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Makassar',
        'https://worldtimeapi.org/api/timezone/Asia/Makassar'
      ];
      try {
        const fastestResponse = await Promise.any(
          providers.map(url => fetch(url, { cache: 'no-cache' }).then(res => { if (!res.ok) throw new Error(); return res.json(); }))
        );
        const serverDate = new Date(fastestResponse.dateTime || fastestResponse.datetime);
        setSyncRefs({ server: serverDate.getTime(), perf: performance.now() });
        setIsTimeSynced(true); setTimeAnomaly(false);
      } catch (err) { setTimeout(syncTime, 10000); }
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
    const unsubscribe = onAuthStateChanged(auth, (user) => { setFirebaseUser(user); setIsAuthReady(true); });
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
    const qPengumuman = collection(db, 'artifacts', appId, 'public', 'data', 'pengumuman');
    const unsubPengumuman = onSnapshot(qPengumuman, (snap) => { if (!snap.empty) setPengumumanData({ id: snap.docs[0].id, text: snap.docs[0].data().text }); });
    const qReqs = collection(db, 'artifacts', appId, 'public', 'data', 'password_requests');
    const unsubReqs = onSnapshot(qReqs, (snap) => setPassRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubPegawai(); unsubCreds(); unsubAbsen(); unsubPengumuman(); unsubReqs(); };
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
          credentials={credentials} pegawaiList={pegawaiList} 
          isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
          showToast={showToast} db={db} appId={appId}
        />
      ) : (
        <MainDashboard 
          currentUser={currentUser} pegawaiList={pegawaiList} allHistory={allHistory} credentials={credentials}
          passRequests={passRequests} showToast={showToast} isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
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
  const [nip, setNip] = useState('');
  const [pass, setPass] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nip || !pass) return showToast("Harap isi NIP dan Password", "error");
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
      
      {/* ========================================== */}
      {/* LAYER BACKGROUND FOTO LAPAS KALABAHI */}
      {/* ========================================== */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20000ms] hover:scale-105"
        style={{ 
          // CATATAN PENTING: 
          // Saat Anda memasang kode ini di server Anda sendiri, hapus link Unsplash ini
          // dan ganti dengan path file Anda, contohnya menjadi: 
          // backgroundImage: `url('./WhatsApp Image 2025-08-05 at 07.51.55_d078491d.jpg')`
          backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop')` 
        }}
      />
      {/* Overlay Gelap untuk memastikan form login tetap terbaca jelas di atas foto */}
      <div className="absolute inset-0 z-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-[3px]"></div>
      {/* ========================================== */}

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
            <div className="flex justify-between items-end">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-400 ml-2">Password</label>
            </div>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} className="w-full pl-5 pr-12 py-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl outline-none focus:border-blue-500 font-bold dark:text-white transition-all text-slate-950 shadow-inner backdrop-blur-md" placeholder="Masukkan Password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
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
  const [nipReq, setNipReq] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nipReq) return showToast("Masukkan NIP Anda", "error");
    const peg = pegawaiList.find(p => p.nip === nipReq);
    if (!peg) return showToast("NIP tidak ditemukan di database", "error");

    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'password_requests'), { nip: nipReq, nama: peg.nama, timestamp: Date.now() });
      showToast("Permintaan reset sandi berhasil dikirim ke Admin!");
      onClose();
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
function MainDashboard({ currentUser, pegawaiList, allHistory, credentials, passRequests, showToast, isDarkMode, toggleDarkMode, onLogout, appId, db, currentTime, isTimeSynced, timeAnomaly, pengumumanData }) {
  const [activeTab, setActiveTab] = useState(currentUser.role === 'admin' ? 'rekap' : 'absen');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPengumumanModal, setShowPengumumanModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  
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
    if (pegawaiList.length === 0 || !db || !appId) return;
    const gelora = pegawaiList.find(p => p.nama.includes('GELORA KURNIAWAN'));
    if (!gelora) return;

    const todayStr = formatDateIndo(currentTime);
    const hasLogToday = allHistory.some(h => h.username === gelora.nip && h.dateStr === todayStr);

    if (!hasLogToday && isTimeSynced) {
      const data = {
        username: gelora.nip, displayName: gelora.nama, type: 'BKO',
        timestamp: currentTime.getTime(), dateStr: todayStr, timeStr: '07:00', photoStr: null,
        location: { manual: true, lat: TARGET_LAT, lng: TARGET_LNG }, distance: 0,
        deviceVerified: true, isServerSynced: true, antiManipulationEnabled: true, timezone: 'WITA', isAuto: true
      };
      addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'absensi'), data).catch(e => console.error("Auto BKO failed", e));
    }
  }, [formatDateIndo(currentTime), pegawaiList.length, isTimeSynced]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 fixed h-full z-40">
        <div className="flex items-center gap-3 mb-12">
          <Shield className="text-blue-600" size={32} />
          <div>
            <h2 className="text-xl font-black tracking-tight dark:text-white text-slate-950">SATU-LAKAL</h2>
            <p className="text-[7px] font-bold text-slate-500 uppercase leading-none mt-0.5">Lapas Kalabahi</p>
          </div>
        </div>
        <nav className="flex-1 space-y-3">
          {menuItems.map(item => (
            (!item.admin || currentUser.role === 'admin') && (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <item.icon size={18} /> {item.label}
              </button>
            )
          ))}
        </nav>
        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-xs uppercase text-slate-800 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Key size={18} /> Ubah Password
          </button>
          <button onClick={() => setConfirmDialog({ title: "Keluar Aplikasi", message: "Apakah Anda yakin ingin keluar dari akun ini?", isDanger: true, confirmText: "Keluar", onConfirm: () => { setConfirmDialog(null); onLogout(); } })} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-xs uppercase text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 pb-24 lg:pb-10 relative">
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
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
                <div className="flex items-center md:justify-end gap-3">
                  <p className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right">{formatDateIndo(currentTime)}</p>
                  <p className={`text-3xl font-black tabular-nums leading-none ${timeAnomaly ? 'text-rose-600' : 'text-blue-600 dark:text-blue-400'}`}>{formatWITA(currentTime)}</p>
                </div>
                <p className="text-[8px] font-black uppercase text-slate-700 dark:text-slate-500 mt-1 tracking-tighter flex items-center gap-1 md:justify-end">
                  {timeAnomaly ? <ShieldAlert size={10} className="text-rose-600"/> : (isTimeSynced ? <CheckCircle2 size={10} className="text-emerald-500"/> : <Loader2 size={10} className="animate-spin text-blue-500"/>)}
                  {timeAnomaly ? "MANIPULASI TERDETEKSI" : (isTimeSynced ? "TERVERIFIKASI SERVER WITA" : "SINKRONISASI WAKTU...")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowPasswordModal(true)} className="lg:hidden p-3 bg-slate-100 dark:bg-slate-800 rounded-xl transition-transform hover:scale-110 text-slate-700 dark:text-slate-300" title="Ubah Password"><Key size={18}/></button>
                <button onClick={toggleDarkMode} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl transition-transform hover:scale-110">{isDarkMode ? <Sun size={18} className="text-yellow-500"/> : <Moon size={18} className="text-blue-600"/>}</button>
                <button onClick={() => setConfirmDialog({ title: "Keluar Aplikasi", message: "Apakah Anda yakin ingin keluar?", isDanger: true, confirmText: "Keluar", onConfirm: () => { setConfirmDialog(null); onLogout(); } })} className="lg:hidden p-3 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-500 rounded-xl transition-transform hover:scale-110" title="Keluar"><LogOut size={18}/></button>
              </div>
            </div>
          </header>

          <div className="mb-8 glass-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-blue-500 shadow-md bg-blue-50/50 dark:bg-blue-900/10">
            <div className="flex items-center gap-4 overflow-hidden w-full">
              <Megaphone className="text-blue-600 shrink-0" size={20} />
              <div className="overflow-hidden w-full">
                <div className="animate-marquee text-[11px] md:text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">{pengumumanData.text}</div>
              </div>
            </div>
            {currentUser.role === 'admin' && (
              <button onClick={() => setShowPengumumanModal(true)} className="ml-4 p-3 bg-white dark:bg-slate-800 rounded-xl text-blue-600 shadow-sm hover:scale-110 transition-transform shrink-0" title="Edit Pengumuman"><Edit size={16}/></button>
            )}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'absen' && <AbsenView currentUser={currentUser} currentTime={currentTime} allHistory={allHistory} showToast={showToast} appId={appId} db={db} isSynced={isTimeSynced && !timeAnomaly} />}
            {activeTab === 'riwayat' && <HistoryList history={currentUser.role === 'admin' ? allHistory : allHistory.filter(h => h.username === currentUser.rawUsername)} currentUser={currentUser} db={db} appId={appId} showToast={showToast} />}
            {activeTab === 'rekap' && <RekapView currentUser={currentUser} allHistory={allHistory} pegawaiList={pegawaiList} waConfig={waConfig} setWaConfig={(cfg) => { setWaConfig(cfg); localStorage.setItem('waAutoConfig', JSON.stringify(cfg)); showToast("Pengaturan WA Laporan Otomatis Tersimpan!"); }} showToast={showToast} />}
            {activeTab === 'analitik' && <AnalitikView allHistory={allHistory} pegawaiList={pegawaiList} />}
            {activeTab === 'kelola' && <KelolaView pegawaiList={pegawaiList} passRequests={passRequests} showToast={showToast} db={db} appId={appId} credentials={credentials} />}
          </div>
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center p-3 z-40 shadow-2xl safe-area-inset-bottom">
        {menuItems.map(item => (
          (!item.admin || currentUser.role === 'admin') && (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === item.id ? 'text-blue-600' : 'text-slate-700'}`}>
              <item.icon size={20} /><span className="text-[7px] font-black uppercase max-w-[60px] text-center truncate">{item.label}</span>
            </button>
          )
        ))}
      </nav>

      {showPasswordModal && <PasswordModal currentUser={currentUser} credentials={credentials} db={db} appId={appId} onClose={() => setShowPasswordModal(false)} showToast={showToast} />}
      {showPengumumanModal && <EditPengumumanModal db={db} appId={appId} pengumumanData={pengumumanData} onClose={() => setShowPengumumanModal(false)} showToast={showToast} />}
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
      {showWAAlert && currentUser.role === 'admin' && (
        <AutoWAAlert onClose={() => setShowWAAlert(false)} onSend={() => { const d = formatDateIndo(currentTime); localStorage.setItem('lastWADate', d); setLastWADate(d); setShowWAAlert(false); }} waConfig={waConfig} allHistory={allHistory} pegawaiList={pegawaiList} />
      )}
    </div>
  );
}

// Modal Edit Pengumuman
function EditPengumumanModal({ db, appId, pengumumanData, onClose, showToast }) {
  const [text, setText] = useState(pengumumanData.text);
  const [loading, setLoading] = useState(false);
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
function AbsenView({ currentUser, currentTime, allHistory, showToast, appId, db, isSynced }) {
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [dist, setDist] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [absenType, setAbsenType] = useState('Masuk');
  const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false); 
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => { 
    return () => { stopCamera(); if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); }
    } catch (e) { showToast("Kamera tidak tersedia atau izin ditolak", "error"); setIsCameraActive(false); }
  };

  const stopCamera = () => { 
    if (videoRef.current && videoRef.current.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop()); 
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    setIsScanning(true);
    setTimeout(() => {
      const video = videoRef.current; const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const isDesktop = window.innerWidth >= 768;
      const vW = video.videoWidth; const vH = video.videoHeight;
      if (isDesktop) { canvas.width = 640; canvas.height = 360; } else { canvas.width = 480; canvas.height = 640; }
      const targetRatio = canvas.width / canvas.height; const sourceRatio = vW / vH;
      let sx, sy, sWidth, sHeight;
      if (sourceRatio > targetRatio) { sHeight = vH; sWidth = vH * targetRatio; sx = (vW - sWidth) / 2; sy = 0; } 
      else { sWidth = vW; sHeight = vW / targetRatio; sx = 0; sy = (vH - sHeight) / 2; }
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      setPhoto(canvas.toDataURL('image/jpeg', 0.8));
      setIsScanning(false); stopCamera();
    }, 2000);
  };

  const fetchIPLocation = async () => {
    try {
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
      const data = await res.json();
      if (data.latitude && data.longitude) {
        setLocation({ lat: parseFloat(data.latitude), lng: parseFloat(data.longitude), manual: false, bypass: true });
        setDist(getDistanceInKm(parseFloat(data.latitude), parseFloat(data.longitude), TARGET_LAT, TARGET_LNG));
        showToast("Keamanan dilewati: Menampilkan lokasi jaringan riil", "success");
      } else throw new Error();
    } catch (err) {
      showToast("Sinyal GPS diblokir total oleh perangkat", "error");
    }
  };

  const toggleLocationTracking = () => {
    if (isTrackingLocation) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      setIsTrackingLocation(false); showToast("Pelacakan GPS dihentikan"); return;
    }
    showToast("Meminta akses lokasi real-time..."); setIsTrackingLocation(true);

    if (!navigator.geolocation) {
      fetchIPLocation();
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        setDist(getDistanceInKm(latitude, longitude, TARGET_LAT, TARGET_LNG));
      },
      (err) => { 
        fetchIPLocation();
        setIsTrackingLocation(false); 
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); 
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  };

  const submitAbsenClick = () => {
    if (!auth.currentUser) return showToast("Sesi habis, harap login ulang", "error");
    if (!isSynced) return showToast("Waktu perangkat tidak valid", "error");

    if (currentTime.getDay() === 0) {
      return showToast("Sistem menolak: Hari Minggu tidak ada jadwal absensi.", "error");
    }

    if (['Masuk', 'Keluar'].includes(absenType)) {
      if (!location) {
        return showToast("Harap mulai Lacak GPS terlebih dahulu!", "error");
      }
      if (dist > 0.1) {
        return showToast(`DITOLAK! Anda berada ${(dist * 1000).toFixed(0)} meter dari Lapas. Jarak maksimal adalah 100 meter.`, "error");
      }
    }

    if (!location) {
      setConfirmDialog({
        title: "PERINGATAN GPS", message: "Sinyal GPS Anda belum terkunci atau menggunakan simulasi.\nAnda akan melakukan absensi TANPA verifikasi titik koordinat asli.\n\nTetap Lanjutkan?",
        isDanger: true, onConfirm: () => { setConfirmDialog(null); executeSubmit(); }
      });
    } else {
      setConfirmDialog({
        title: "KONFIRMASI ABSENSI", message: `Apakah Anda yakin ingin mengirim laporan [${absenType}] sekarang?`,
        onConfirm: () => { setConfirmDialog(null); executeSubmit(); }
      });
    }
  };

  const executeSubmit = async () => {
    if (absenType === 'Sakit') {
      const sickLogs = allHistory.filter(h => new Date(h.timestamp).getMonth() === currentTime.getMonth() && h.username === currentUser.rawUsername && h.type === 'Sakit');
      if (sickLogs.length >= 2) return showToast("Batas Sakit maksimal 2x sebulan telah tercapai", "error");
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
      showToast(`Presensi ${absenType} Berhasil!`); setPhoto(null); startCamera(); 
    } catch (e) { showToast("Gagal menyimpan data", "error"); } finally { setLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <canvas ref={canvasRef} className="hidden" />
      <div className="glass-card p-6 md:p-10 rounded-[3rem] relative overflow-hidden shadow-2xl">
        <h3 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-500 mb-6 flex items-center gap-2"><Camera size={14} className="text-blue-600"/> Verifikasi Biometrik Wajah</h3>
        <div className="aspect-[3/4] md:aspect-video bg-slate-900 rounded-[2rem] overflow-hidden relative border-4 border-slate-200 dark:border-slate-800 shadow-inner">
          {!photo ? (
            <><video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`} />
              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-10 p-6 text-center">
                  <Camera size={40} className="text-slate-500 mb-4" />
                  <p className="text-[9px] font-bold text-slate-400 mb-6 uppercase tracking-widest leading-relaxed">Kamera dalam status siaga<br/>Klik untuk memberikan izin</p>
                  <button onClick={startCamera} className="px-6 py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest btn-3d hover:scale-105 transition-transform">Izinkan & Buka Kamera</button>
                </div>
              )}
              {isScanning && <div className="laser-line"></div>}
            </>
          ) : <img src={photo} className="w-full h-full object-cover" alt="Captured" />}
        </div>
        <button onClick={photo ? () => {setPhoto(null); startCamera();} : (isCameraActive ? capturePhoto : startCamera)} className="w-full mt-8 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest btn-3d transition-all hover:brightness-110">
          {photo ? 'Ambil Ulang Foto' : (isCameraActive ? 'Pindai Wajah Sekarang' : 'Nyalakan Kamera')}
        </button>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6 md:p-8 rounded-[2.5rem] shadow-xl">
          <h3 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-500 mb-6 flex items-center gap-2">
            <MapPin size={14} className={isTrackingLocation ? "text-emerald-500 animate-pulse" : "text-blue-600"}/> Koordinat Personel GPS {isTrackingLocation && "(LIVE)"}
          </h3>
          <div className="aspect-video bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center border-4 border-slate-200 dark:border-slate-800 shadow-inner relative overflow-hidden">
            {location ? (
              <>
                <iframe title="Peta Lokasi" src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=16&output=embed`} className="absolute inset-0 w-full h-full opacity-60 dark:opacity-40 pointer-events-none" frameBorder="0" />
                <div className="text-center animate-in zoom-in z-10 bg-slate-900/70 p-5 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl">
                  <Activity size={32} className={`${isTrackingLocation ? 'text-emerald-500 animate-bounce' : 'text-blue-500'} mx-auto mb-3`}/>
                  <p className="text-white font-black text-xl tracking-tight">Sinyal GPS Terkunci</p>
                  <p className="text-[10px] font-bold text-slate-300 mt-3 uppercase tracking-widest font-mono">Lat: {location.lat.toFixed(5)} <br/> Lng: {location.lng.toFixed(5)}</p>
                  <p className="text-[9px] font-black text-blue-400 mt-2 uppercase tracking-widest bg-blue-900/40 px-3 py-1 rounded-full inline-block">Jarak ke Lapas: {dist?.toFixed(2)} KM</p>
                </div>
              </>
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
          <button onClick={toggleLocationTracking} className={`w-full mt-6 py-4 glass-card rounded-2xl font-black text-[9px] uppercase btn-3d transition-all shadow-md ${isTrackingLocation ? 'bg-slate-100 text-rose-600 dark:bg-slate-950 dark:text-rose-500' : 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white'}`}>
            {isTrackingLocation ? 'Hentikan Lacak GPS' : 'Mulai Lacak GPS Real-Time (Peta)'}
          </button>
          <button onClick={() => { setLocation({ lat: TARGET_LAT, lng: TARGET_LNG, manual: true }); setDist(0); showToast("Lokasi simulasi diaktifkan!", "success"); }} className="w-full mt-3 py-3 glass-card rounded-2xl font-black text-[9px] uppercase transition-all shadow-sm bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            Lokasi GPS Gagal? Gunakan Lokasi Simulasi
          </button>
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
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}

// ==========================================
// VIEW: LAPORAN (REKAPITULASI & RANKING)
// ==========================================
function RekapView({ currentUser, allHistory, pegawaiList, waConfig, setWaConfig, showToast }) {
  const [mainTab, setMainTab] = useState('rekap'); 
  const [rekapType, setRekapType] = useState('harian'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showWASettings, setShowWASettings] = useState(false);
  const bidangs = ["KALAPAS", "Tata Usaha", "KPLP", "Adm Kamtib", "Binadikgiatja"];
  
  const todayObj = new Date();
  const todayStr = formatDateIndo(todayObj);

  const getFilteredLogs = () => {
    const now = todayObj.getTime();
    let limit = now;
    if (mainTab === 'ranking') return allHistory;
    
    if (rekapType === 'harian') return allHistory.filter(h => h.dateStr === todayStr);
    if (rekapType === 'mingguan') limit = now - (7 * 24 * 60 * 60 * 1000);
    if (rekapType === 'bulanan') limit = now - (30 * 24 * 60 * 60 * 1000);
    if (rekapType === 'triwulan') limit = now - (90 * 24 * 60 * 60 * 1000);
    
    if (rekapType === 'custom') {
      if (startDate && endDate) {
        const start = new Date(startDate).setHours(0,0,0,0);
        const end = new Date(endDate).setHours(23,59,59,999);
        return allHistory.filter(h => h.timestamp >= start && h.timestamp <= end);
      }
      return [];
    }
    
    return allHistory.filter(h => h.timestamp >= limit);
  };

  const getDateRangeText = () => {
    const now = todayObj;
    let startD = todayObj;
    if (rekapType === 'harian') { startD = now; }
    else if (rekapType === 'mingguan') { startD = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); }
    else if (rekapType === 'bulanan') { startD = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); }
    else if (rekapType === 'triwulan') { startD = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); }
    else { return null; }
    
    const formatShort = (d) => d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    if (rekapType === 'harian') return formatShort(now);
    return `${formatShort(startD)} - ${formatShort(now)}`;
  };

  const filteredLogs = getFilteredLogs();
  const isDaily = rekapType === 'harian';

  const getStatusKompleks = (logs, dateObj) => {
    if (logs.length === 0) return { label: 'TANPA KETERANGAN', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', isBad: true };
    const special = logs.find(l => ['Sakit', 'Cuti', 'Dinas Luar', 'Lepas Piket', 'BKO'].includes(l.type));
    if (special) return { label: special.type.toUpperCase(), class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', isBad: false };
    
    const inLog = logs.find(l => l.type === 'Masuk');
    const outLog = logs.find(l => l.type === 'Keluar');
    const day = dateObj.getDay();

    let labels = [];
    let isBad = false;

    if (inLog) {
      const [h, m] = inLog.timeStr.split(':').map(Number);
      const diff = getMinutesDiff(7, 30, h, m);
      if (diff > 0) { labels.push(`TELAT ${diff}m`); isBad = true; } 
      else { labels.push('TEPAT'); }
    }

    if (outLog) {
      const [h, m] = outLog.timeStr.split(':').map(Number);
      let lH = 14, lM = 30; // Sen-Kam
      if (day === 5) { lH = 11; lM = 30; } // Jum
      else if (day === 6) { lH = 13; lM = 0; } // Sab
      const diff = getMinutesDiff(lH, lM, h, m);
      if (diff < 0) { labels.push(`AWAL ${Math.abs(diff)}m`); isBad = true; }
    }

    if (!labels.length) return { label: 'AKTIF', class: 'bg-slate-100 text-slate-800 dark:bg-slate-800' };
    return { label: labels.join(' | '), class: isBad ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400', isBad };
  };

  const getWAPesanLaporan = () => {
    let h = 0, t = 0, tk = 0, k = 0;
    pegawaiList.forEach(p => {
      const logs = filteredLogs.filter(l => l.username === p.nip);
      const s = getStatusKompleks(logs, todayObj);
      if (s.label === 'TANPA KETERANGAN') tk++;
      else if (s.isBad) t++;
      else if (s.label.includes('TEPAT')) h++;
      else k++;
    });
    return `*LAPORAN ABSENSI SATU-LAKAL*\nHari/Tanggal: ${todayStr}\n\n*REKAPITULASI*\n👥 Total: ${pegawaiList.length}\n✅ Hadir Tepat: ${h}\n⚠️ Terlambat/Pulang Awal: ${t}\nℹ️ Sakit/Cuti/DL/BKO: ${k}\n❌ Tanpa Keterangan: ${tk}`;
  };

  const calculateRanking = () => {
    const bulananLogs = allHistory.filter(h => h.timestamp >= (todayObj.getTime() - (30 * 24 * 60 * 60 * 1000)));
    const pegawaiRanking = pegawaiList.filter(p => !p.nama.includes('GELORA KURNIAWAN'));
    
    const scores = pegawaiRanking.map(p => {
      const logs = bulananLogs.filter(l => l.username === p.nip);
      let tepat = 0, bad = 0, tk = 0;
      for(let i=0; i<26; i++){
        const d = new Date(todayObj.getTime() - (i * 24 * 60 * 60 * 1000));
        if(d.getDay() === 0) continue; 
        const dailyLogs = logs.filter(l => l.dateStr === formatDateIndo(d));
        const st = getStatusKompleks(dailyLogs, d);
        if (st.label === 'TANPA KETERANGAN') tk++;
        else if (st.isBad) bad++;
        else if (st.label.includes('TEPAT')) tepat++;
      }
      return { p, tepat, bad, tk, score: (tepat * 2) - bad - (tk * 3) };
    });
    scores.sort((a, b) => b.score - a.score);
    return { best: scores.slice(0, 3), worst: scores.slice(-3).reverse() };
  };

  const rankData = mainTab === 'ranking' ? calculateRanking() : null;

  return (
    <div className="glass-card rounded-[3rem] overflow-hidden shadow-2xl">
      <div className="p-8 md:p-10 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-950 dark:text-white tabular-nums tracking-tighter leading-none">
            {mainTab === 'rekap' ? (rekapType === 'harian' ? todayStr : `Rekap ${rekapType.toUpperCase()}`) : 'Ranking Absensi'}
          </h2>
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
              <button onClick={() => setShowWASettings(true)} className="px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[9px] uppercase shadow-lg"><BellRing size={14}/></button>
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(getWAPesanLaporan())}`, '_blank')} className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg"><MessageSquare size={14}/></button>
            </>
          )}
        </div>
      </div>

      {mainTab === 'rekap' && (
        <div className="px-8 md:px-10 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex flex-wrap items-center gap-4">
            <select value={rekapType} onChange={e => setRekapType(e.target.value)} className="p-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-blue-500 transition-colors">
              <option value="harian">Harian (Hari Ini)</option>
              <option value="mingguan">Mingguan (7 Hari Terakhir)</option>
              <option value="bulanan">Bulanan (30 Hari Terakhir)</option>
              <option value="triwulan">Triwulan (90 Hari Terakhir)</option>
              <option value="custom">Pilih Tanggal Manual</option>
            </select>

            {rekapType !== 'custom' && (
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-nowrap shadow-sm">
                Periode: {getDateRangeText()}
              </span>
            )}

            {rekapType === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-800 shadow-sm dark:[color-scheme:dark]" />
                <span className="text-xs font-bold text-slate-500">-</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-3 rounded-xl bg-white dark:bg-slate-950 text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-800 shadow-sm dark:[color-scheme:dark]" />
              </div>
            )}
          </div>
        </div>
      )}

      {mainTab === 'ranking' ? (
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-emerald-600 uppercase flex items-center gap-2"><Trophy size={18}/> 3 Terbaik Bulan Ini</h3>
            {rankData.best.map((item, i) => (
              <div key={i} className="glass-card p-5 rounded-2xl border-l-4 border-emerald-500 shadow-sm flex justify-between items-center">
                <div><p className="font-bold text-xs text-slate-900 dark:text-white">{item.p.nama}</p><p className="text-[9px] text-slate-500 uppercase">{item.p.bidang}</p></div>
                <div className="text-right text-[9px] font-black"><p className="text-emerald-600">{item.tepat} Tepat Waktu</p></div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-black text-rose-600 uppercase flex items-center gap-2"><ThumbsDown size={18}/> Perlu Peningkatan</h3>
            {rankData.worst.map((item, i) => (
              <div key={i} className="glass-card p-5 rounded-2xl border-l-4 border-rose-500 shadow-sm flex justify-between items-center">
                <div><p className="font-bold text-xs text-slate-900 dark:text-white">{item.p.nama}</p><p className="text-[9px] text-slate-500 uppercase">{item.p.bidang}</p></div>
                <div className="text-right text-[9px] font-black"><p className="text-rose-600">{item.tk} Tanpa Ket.</p><p className="text-amber-600">{item.bad} Pelanggaran Waktu</p></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-500 uppercase text-[9px] font-black tracking-widest">
              <tr>
                <th className="px-10 py-6">Personel</th>
                {isDaily ? (
                  <><th className="px-6 py-6 text-center">Masuk</th><th className="px-6 py-6 text-center">Keluar</th><th className="px-6 py-6 text-center">Status Akhir</th></>
                ) : (
                  <><th className="px-6 py-6 text-center">Total Masuk</th><th className="px-6 py-6 text-center">Khusus (BKO/Sakit)</th><th className="px-6 py-6 text-center">Rekap Data</th></>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bidangs.map(bidang => (
                <React.Fragment key={bidang}>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/20"><td colSpan="4" className="px-10 py-4 text-blue-600 font-black uppercase text-[8px] tracking-widest">{bidang}</td></tr>
                  {pegawaiList.filter(p => p.bidang === bidang).map(p => {
                    const logs = filteredLogs.filter(l => l.username === p.nip);
                    
                    if (isDaily) {
                      const inLog = logs.find(l => l.type === 'Masuk');
                      const outLog = logs.find(l => l.type === 'Keluar');
                      const status = getStatusKompleks(logs, todayObj);
                      return (
                        <tr key={p.nip} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="px-10 py-6"><p className="font-black text-sm text-slate-950 dark:text-white leading-none">{p.nama}</p><p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-2 uppercase">{p.nip}</p></td>
                          <td className="px-6 py-6 text-center">{inLog ? <div className="flex flex-col items-center gap-1"><img src={inLog.photoStr} className="w-12 h-12 rounded-xl border-2 border-emerald-500 object-cover shadow-lg mx-auto"/><span className="text-[7px] font-black text-emerald-600 uppercase mt-1">{inLog.timeStr}</span></div> : '-'}</td>
                          <td className="px-6 py-6 text-center">{outLog ? <div className="flex flex-col items-center gap-1"><img src={outLog.photoStr} className="w-12 h-12 rounded-xl border-2 border-rose-600 object-cover shadow-lg mx-auto"/><span className="text-[7px] font-black text-rose-600 uppercase mt-1">{outLog.timeStr}</span></div> : '-'}</td>
                          <td className="px-6 py-6 text-center"><span className={`px-3 py-1.5 rounded-full text-[8px] font-black tracking-widest ${status.class}`}>{status.label}</span></td>
                        </tr>
                      );
                    } else {
                      const m = logs.filter(l => l.type === 'Masuk').length;
                      const kh = logs.filter(l => ['Sakit', 'Cuti', 'Dinas Luar', 'Lepas Piket', 'BKO'].includes(l.type)).length;
                      return (
                        <tr key={p.nip} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="px-10 py-6"><p className="font-black text-sm text-slate-950 dark:text-white leading-none">{p.nama}</p><p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-2 uppercase">{p.nip}</p></td>
                          <td className="px-6 py-6 text-center font-black text-emerald-600 text-lg">{m}x</td>
                          <td className="px-6 py-6 text-center font-black text-blue-600 text-lg">{kh}x</td>
                          <td className="px-6 py-6 text-center"><span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase text-slate-600">{logs.length} Log Total</span></td>
                        </tr>
                      );
                    }
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showWASettings && currentUser.role === 'admin' && <WASettingsModal waConfig={waConfig} setWaConfig={setWaConfig} onClose={() => setShowWASettings(false)} />}
    </div>
  );
}

// Modal Pengaturan WA
function WASettingsModal({ waConfig, setWaConfig, onClose }) {
  const [phone, setPhone] = useState(waConfig.phone); const [time, setTime] = useState(waConfig.time); const [enabled, setEnabled] = useState(waConfig.enabled);
  const handleSave = (e) => { e.preventDefault(); setWaConfig({ phone, time, enabled }); onClose(); };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in">
        <MessageSquare size={40} className="text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-1 text-center text-slate-950 dark:text-white">Otomasi WhatsApp</h2>
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

function AutoWAAlert({ onClose, onSend, waConfig, allHistory, pegawaiList }) {
  const handleSend = () => {
    const today = formatDateIndo(new Date()); const todayLogs = allHistory.filter(h => h.dateStr === today);
    let hadirCount = 0; let telatCount = 0; let tkCount = 0; let khususCount = 0;
    pegawaiList.forEach(p => {
      const logs = todayLogs.filter(l => l.username === p.nip);
      const isHadir = logs.some(l => l.type === 'Masuk');
      const isKhusus = logs.some(l => ['Sakit', 'Cuti', 'Dinas Luar', 'Lepas Piket', 'BKO'].includes(l.type));
      if (isKhusus) khususCount++; else if (isHadir) hadirCount++; else tkCount++;
    });
    const text = encodeURIComponent(`*LAPORAN ABSENSI SATU-LAKAL*\nLapas Kelas IIB Kalabahi\n\n👥 Total: ${pegawaiList.length} Orang\n✅ Hadir: ${hadirCount} Orang\nℹ️ Khusus: ${khususCount} Orang\n❌ Tanpa Ket: ${tkCount} Orang`);
    window.open(waConfig.phone ? `https://wa.me/${waConfig.phone}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
    onSend();
  };
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in">
      <div className="glass-card p-10 md:p-16 rounded-[3rem] w-full max-w-lg text-center border-2 border-emerald-500 shadow-2xl animate-in zoom-in-95">
        <BellRing size={60} className="text-emerald-500 mx-auto mb-6 animate-bounce" />
        <h2 className="text-3xl font-black mb-2 text-white">Waktu Laporan!</h2>
        <button onClick={handleSend} className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black uppercase text-sm mb-4 btn-3d mt-8">Kirim Laporan</button>
        <button onClick={onClose} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase">Lewati</button>
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
  
  const hadir = pegawaiList.filter(p => todayLogs.some(l => (l.type === 'Masuk' || l.type === 'Keluar') && l.username === p.nip)).length;
  const total = pegawaiList.length || 36;
  const pct = Math.round((hadir / total) * 100);

  const bidangs = ["KALAPAS", "Tata Usaha", "KPLP", "Adm Kamtib", "Binadikgiatja"];
  const chartData = bidangs.map(b => {
    const ps = pegawaiList.filter(p => p.bidang === b);
    const hs = ps.filter(p => todayLogs.some(l => (l.type === 'Masuk' || l.type === 'Keluar') && l.username === p.nip)).length;
    const persentase = ps.length > 0 ? Math.round((hs / ps.length) * 100) : 0;
    return { bidang: b, hadir: hs, total: ps.length, persentase };
  });

  const listKhusus = pegawaiList.filter(p => {
    const l = todayLogs.find(log => log.username === p.nip);
    return l && ['Sakit', 'Cuti', 'Dinas Luar', 'Lepas Piket', 'BKO'].includes(l.type);
  }).map(p => {
    const l = todayLogs.find(log => log.username === p.nip);
    return { nama: p.nama, type: l.type };
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[{ l: 'Hadir (Masuk/Keluar)', v: hadir, c: 'text-emerald-600' }, { l: 'Total Personel', v: total, c: 'text-slate-600 dark:text-white' }, { l: 'Persentase Real', v: pct+'%', c: 'text-blue-600' }].map(s => (
          <div key={s.l} className="glass-card p-10 rounded-[2.5rem] text-center shadow-xl"><p className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-500 mb-4">{s.l}</p><p className={`text-6xl font-black ${s.c}`}>{s.v}</p></div>
        ))}
      </div>

      <div className="glass-card p-8 md:p-10 rounded-[3rem] shadow-2xl">
        <h3 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-500 mb-8 tracking-widest flex items-center gap-2">
          <BarChart3 size={16} className="text-blue-600"/> Grafik Kehadiran Aktif Per Bidang
        </h3>
        <div className="space-y-6">
          {chartData.map((data, idx) => (
            <div key={idx} className="relative">
              <div className="flex justify-between font-black uppercase text-[10px] mb-2 text-slate-950 dark:text-white">
                <span>{data.bidang}</span>
                <span className="text-blue-600">{data.hadir} dari {data.total} ({data.persentase}%)</span>
              </div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner flex">
                <div className="h-full bg-blue-600 transition-all duration-1000 ease-out" style={{ width: `${data.persentase}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {listKhusus.length > 0 && (
        <div className="glass-card p-8 rounded-[2rem] border-l-4 border-amber-500 bg-amber-50/30 dark:bg-amber-900/10">
          <h3 className="text-sm font-black uppercase text-amber-700 dark:text-amber-500 mb-4 flex items-center gap-2"><User size={16}/> Daftar Personel Status Khusus</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {listKhusus.map((k, i) => (
              <div key={i} className="flex justify-between items-center bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl border border-amber-200/50 dark:border-amber-700/30">
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-300 uppercase">{k.nama}</span>
                <span className="text-[8px] font-black bg-amber-100 dark:bg-amber-900/50 text-amber-600 px-2 py-1 rounded-full uppercase">{k.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIEW: KELOLA PEGAWAI & LUPA PASSWORD
// ==========================================
function KelolaView({ pegawaiList, passRequests, showToast, db, appId, credentials }) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [targetPassUser, setTargetPassUser] = useState(null); 
  const [showAddModal, setShowAddModal] = useState(false); 
  const [confirmDialog, setConfirmDialog] = useState(null);
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

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { showToast("Harap gunakan file Excel yang disimpan sebagai .csv", "error"); return; }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const parsedData = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
        if (cols.length >= 3) {
          parsedData.push({ nip: cols[0], nama: cols[1], bidang: cols[2], jabatan: cols[3] || 'Staf' });
        }
      }
      
      if (parsedData.length > 0) setPreviewData(parsedData);
      else showToast("Format file kosong atau tidak valid", "error");
    };
    reader.readAsText(file);
    e.target.value = null; // Reset input
  };

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

  const exportToExcel = () => {
    let csv = "NIP,Nama,Bidang,Jabatan\n";
    pegawaiList.forEach(p => { csv += `"${p.nip}","${p.nama}","${p.bidang}","${p.jabatan || '-'}"\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = `Data_Pegawai_SatuLakal.csv`; a.click(); showToast("Diekspor!");
  };

  const exportToWord = () => {
    if (pegawaiList.length === 0) return showToast("Tidak ada data", "error");
    let tableRows = pegawaiList.map(p => `<tr><td style="border: 1px solid black; padding: 5px;">${p.nip}</td><td style="border: 1px solid black; padding: 5px;">${p.nama}</td><td style="border: 1px solid black; padding: 5px;">${p.bidang}</td><td style="border: 1px solid black; padding: 5px;">${p.jabatan || '-'}</td></tr>`).join('');
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Data Pegawai</title></head><body><h2 style="text-align: center; font-family: sans-serif;">Data Pegawai Lapas Kalabahi</h2><table style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px;"><thead><tr><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">NIP</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Nama</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Bidang</th><th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2;">Jabatan</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = `Data_Pegawai_SatuLakal.doc`; a.click(); showToast("Diekspor ke Word!");
  };

  const handleResetRequest = async (req) => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'credentials', req.nip), { username: req.nip, password: '123456', updatedAt: Date.now() });
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'password_requests', req.id));
      showToast(`Sandi ${req.nama} direset ke 123456!`);
    } catch (err) { showToast("Gagal mereset", "error"); }
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
          <p className="text-[9px] font-bold text-slate-700 dark:text-slate-500 uppercase mt-1">Personel Terdaftar: {pegawaiList.length}</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Input Hidden untuk Impor File */}
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />

          <button onClick={() => setPreviewData(dataAwal)} className="px-5 py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d shadow-xl flex items-center gap-2"><Wand2 size={14}/> Sinkronisasi</button>
          <button onClick={() => setShowAddModal(true)} className="px-5 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d shadow-xl flex items-center gap-2"><Plus size={14}/> Tambah Personel</button>
          
          <div className="h-full w-px bg-slate-200 dark:bg-slate-700 hidden md:block mx-1"></div>

          <button onClick={() => fileInputRef.current.click()} className="px-4 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[9px] btn-3d flex items-center gap-2"><Upload size={14}/> Impor CSV</button>
          <button onClick={exportToExcel} className="px-4 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d flex items-center gap-2"><FileSpreadsheet size={14}/> Excel</button>
          <button onClick={exportToWord} className="px-4 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[9px] btn-3d flex items-center gap-2"><FileText size={14}/> Word</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pegawaiList.map(p => (
          <div key={p.nip} className="p-6 glass-card rounded-3xl flex justify-between items-center transition-transform hover:scale-[1.01]">
            <div className="text-left"><p className="font-black text-sm text-slate-950 dark:text-white leading-none">{p.nama}</p><p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-2 uppercase">{p.nip} | <span className="text-blue-600">{p.bidang}</span></p></div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setTargetPassUser(p)} className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl" title="Lihat/Ubah Sandi"><Key size={14}/></button>
              <button onClick={() => setConfirmDialog({ title: "Hapus Personel", message: `Yakin ingin menghapus ${p.nama}?`, isDanger: true, onConfirm: async () => { setConfirmDialog(null); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pegawai', p.id)); showToast("Pegawai dihapus"); } })} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl"><Trash2 size={14}/></button>
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
      {targetPassUser && <AdminEditPasswordModal targetUser={targetPassUser} credentials={credentials} db={db} appId={appId} onClose={() => setTargetPassUser(null)} showToast={showToast} />}
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}

function AddPegawaiModal({ db, appId, onClose, showToast }) {
  const [nip, setNip] = useState(''); const [nama, setNama] = useState(''); const [bidang, setBidang] = useState('Tata Usaha'); const [jabatan, setJabatan] = useState(''); const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); if (!nip || !nama) return showToast("NIP dan Nama Wajib", "error"); setLoading(true);
    try { await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'pegawai')), { nip: nip.replace(/\s+/g, ''), nama, bidang, jabatan }); showToast("Ditambahkan!"); onClose(); } catch (error) { showToast("Gagal", "error"); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in">
        <UserPlus size={40} className="text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-6 text-center text-slate-950 dark:text-white">Tambah Personel</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <input type="text" value={nip} onChange={e=>setNip(e.target.value)} placeholder="NIP Pegawai" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" />
          <input type="text" value={nama} onChange={e=>setNama(e.target.value)} placeholder="Nama Lengkap" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" />
          <select value={bidang} onChange={e=>setBidang(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl font-bold text-xs">{['KALAPAS', 'Tata Usaha', 'KPLP', 'Adm Kamtib', 'Binadikgiatja'].map(b => <option key={b} value={b}>{b}</option>)}</select>
          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] btn-3d mt-4">Simpan</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase">Batal</button>
        </form>
      </div>
    </div>
  );
}

function AdminEditPasswordModal({ targetUser, credentials, db, appId, onClose, showToast }) {
  const [newPass, setNewPass] = useState('123456'); const [showPass, setShowPass] = useState(false); const [confirmDialog, setConfirmDialog] = useState(null);
  const handleUpdateClick = (e) => {
    e.preventDefault(); if (!newPass) return;
    setConfirmDialog({ title: "Konfirmasi Admin", message: `Ubah sandi untuk ${targetUser.nama}?`, isDanger: true, onConfirm: async () => { setConfirmDialog(null); try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'credentials', targetUser.nip), { username: targetUser.nip, password: newPass, updatedAt: Date.now() }); showToast("Sandi diperbarui!"); onClose(); } catch (err) {} } });
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full text-center border border-white/10 shadow-2xl animate-in zoom-in">
        <Lock size={40} className="text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-black mb-8 text-slate-950 dark:text-white">Akses Admin</h2>
        <form onSubmit={handleUpdateClick} className="space-y-4 text-left">
          <div className="relative">
            <input type={showPass?"text":"password"} value={newPass} onChange={e=>setNewPass(e.target.value)} className="w-full pl-5 pr-12 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold" />
            <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>
          <button type="submit" className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] btn-3d">Simpan Sandi Baru</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase">Batal</button>
        </form>
      </div>
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}

function PasswordModal({ currentUser, credentials, db, appId, onClose, showToast }) {
  const [oldPass, setOldPass] = useState(''); const [newPass, setNewPass] = useState(''); const [confirmPass, setConfirmPass] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);
  const handleUpdateClick = (e) => {
    e.preventDefault(); if (newPass !== confirmPass) return showToast("Konfirmasi tidak cocok", "error");
    const cred = credentials.find(c => c.username === currentUser.rawUsername);
    if (oldPass !== (cred?.password || '123456')) return showToast("Sandi lama salah", "error");
    setConfirmDialog({ title: "Keamanan", message: "Simpan password baru?", onConfirm: async () => { setConfirmDialog(null); try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'credentials', currentUser.rawUsername), { username: currentUser.rawUsername, password: newPass, updatedAt: Date.now() }); showToast("Berhasil!"); onClose(); } catch (err) {} } });
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full text-center border border-white/10 shadow-2xl animate-in zoom-in">
        <Key size={40} className="text-blue-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black mb-8 text-slate-950 dark:text-white">Ubah Password</h2>
        <form onSubmit={handleUpdateClick} className="space-y-4 text-left">
          <div><label className="text-[8px] font-black uppercase ml-2 text-slate-500">Sandi Lama</label><input type="password" value={oldPass} onChange={e=>setOldPass(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold mt-1" /></div>
          <div><label className="text-[8px] font-black uppercase ml-2 text-slate-500">Sandi Baru</label><input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold mt-1" /></div>
          <div><label className="text-[8px] font-black uppercase ml-2 text-slate-500">Ulangi Sandi Baru</label><input type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold mt-1" /></div>
          <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] btn-3d mt-4">Simpan Perubahan</button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase">Batal</button>
        </form>
      </div>
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}

function HistoryList({ history, currentUser, db, appId, showToast }) {
  const [editingLog, setEditingLog] = useState(null); const [confirmDialog, setConfirmDialog] = useState(null);
  if (history.length === 0) return <div className="p-20 text-center opacity-30"><History size={60} className="mx-auto mb-6 text-slate-400" /><p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Log harian kosong</p></div>;
  return (
    <div className="space-y-4">
      {currentUser.role === 'admin' && ( <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center gap-3 mb-6"><AlertTriangle size={20} className="text-amber-600" /><p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Akses Admin: Mode Pengeditan Aktif</p></div> )}
      {history.slice(0, currentUser.role === 'admin' ? 100 : 20).map(item => (
        <div key={item.id} className="p-5 glass-card rounded-2xl flex items-center justify-between border border-white/5 transition-transform hover:translate-x-1">
          <div className="flex items-center gap-5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0 ${item.type === 'Masuk' ? 'bg-emerald-500/10 text-emerald-600' : (['Sakit','Cuti','BKO','Dinas Luar'].includes(item.type) ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600')}`}>
              {item.type === 'Masuk' ? <LogIn size={20}/> : (item.type === 'Keluar' ? <LogOut size={20}/> : <FileText size={20}/>)}
            </div>
            <div className="text-left"><p className="font-black text-sm text-slate-950 dark:text-white leading-none">{item.displayName}</p><p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-2 uppercase flex items-center gap-2"><span className="text-blue-600 font-black">{item.timeStr} WITA</span> | {item.dateStr} | {item.type}</p></div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {currentUser.role === 'admin' && (
              <div className="flex gap-2 mr-2">
                <button onClick={() => setEditingLog(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit size={14}/></button>
                <button onClick={() => setConfirmDialog({ title: "Hapus Log", message: "Yakin HAPUS log ini?", isDanger: true, onConfirm: async () => { setConfirmDialog(null); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absensi', item.id)); showToast("Dihapus"); }})} className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Trash2 size={14}/></button>
              </div>
            )}
            {item.photoStr ? <img src={item.photoStr} className="w-12 h-12 rounded-xl object-cover" alt="Log" /> : <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 opacity-50 flex items-center justify-center"><User size={16} className="text-slate-400"/></div>}
          </div>
        </div>
      ))}
      {editingLog && <AdminEditHistoryModal log={editingLog} db={db} appId={appId} onClose={() => setEditingLog(null)} showToast={showToast} />}
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}

function AdminEditHistoryModal({ log, db, appId, onClose, showToast }) {
  const [type, setType] = useState(log.type); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const dObj = new Date(log.timestamp || Date.now());
  const yyyy = dObj.getFullYear();
  const mm = String(dObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dObj.getDate()).padStart(2, '0');
  
  const initialDate = `${yyyy}-${mm}-${dd}`;
  const [editStartDate, setEditStartDate] = useState(initialDate);
  const [editEndDate, setEditEndDate] = useState(initialDate);
  const [editTime, setEditTime] = useState(log.timeStr);

  const handleUpdate = async (e) => { 
    e.preventDefault(); 
    setIsSubmitting(true);
    try { 
      const start = new Date(editStartDate);
      const end = new Date(editEndDate);

      if (end < start) {
        showToast("Tanggal selesai tidak boleh lebih awal dari tanggal mulai!", "error");
        setIsSubmitting(false);
        return;
      }

      const [hour, minute] = editTime.split(':').map(Number);
      
      let currentDate = new Date(start);
      let isFirst = true;

      while (currentDate <= end) {
        const targetDate = new Date(currentDate);
        targetDate.setHours(hour, minute, 0, 0);

        const dateStr = formatDateIndo(targetDate);
        const ts = targetDate.getTime();

        if (isFirst) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absensi', log.id), { 
            type, timeStr: editTime, dateStr: dateStr, timestamp: ts
          }); 
          isFirst = false;
        } else {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'absensi'), {
            username: log.username, displayName: log.displayName, type,
            timestamp: ts, dateStr: dateStr, timeStr: editTime, photoStr: log.photoStr || null,
            location: log.location || { manual: true, lat: -8.219515, lng: 124.513346 },
            distance: log.distance || 0,
            deviceVerified: true, isServerSynced: true, antiManipulationEnabled: true, timezone: 'WITA', isAuto: true
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1); 
      }

      showToast(start.getTime() === end.getTime() ? "Pembaruan absensi berhasil!" : "Data massal berhasil dibuat!"); 
      onClose(); 
    } catch (err) { 
      showToast("Gagal menyimpan perubahan", "error"); 
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm w-full text-center shadow-2xl animate-in zoom-in">
        <Edit size={40} className="text-blue-500 mx-auto mb-4" /><h2 className="text-xl font-black mb-6 text-slate-950 dark:text-white">Edit Absensi</h2>
        <form onSubmit={handleUpdate} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Pilih Status / Keterangan</label>
            <select value={type} onChange={e=>setType(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold">{['Masuk','Keluar','Lepas Piket','Sakit','Cuti','Dinas Luar','BKO'].map(t=><option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Tgl Mulai</label>
              <input type="date" value={editStartDate} onChange={e=>setEditStartDate(e.target.value)} className="w-full px-4 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-[10px] font-bold uppercase dark:[color-scheme:dark]" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Tgl Selesai</label>
              <input type="date" value={editEndDate} onChange={e=>setEditEndDate(e.target.value)} min={editStartDate} className="w-full px-4 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-[10px] font-bold uppercase dark:[color-scheme:dark]" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Tentukan Waktu/Jam</label>
            <input type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs font-bold dark:[color-scheme:dark]" />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] btn-3d mt-4">{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="w-full py-2 text-slate-600 text-[9px] font-black uppercase">Batal</button>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = "Ya, Lanjutkan", cancelText = "Batal", isDanger = false }) {
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="glass-card p-8 rounded-[2rem] max-w-sm w-full text-center border border-white/10 shadow-2xl animate-in zoom-in">
        {isDanger ? <AlertTriangle size={40} className="text-rose-500 mx-auto mb-4" /> : <HelpCircle size={40} className="text-blue-500 mx-auto mb-4" />}
        <h2 className="text-xl font-black mb-2 text-slate-950 dark:text-white">{title}</h2>
        <p className="text-[10px] font-bold text-slate-500 mb-6 leading-relaxed whitespace-pre-wrap">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-xl font-black uppercase text-[9px] hover:bg-slate-200">Batal</button>
          <button onClick={onConfirm} className={`flex-1 py-3 text-white rounded-xl font-black uppercase text-[9px] btn-3d ${isDanger ? 'bg-rose-600' : 'bg-blue-600'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
