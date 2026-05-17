import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { Activity, Cpu, Fish, LogIn, Waves } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// 模拟用户类型
interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
}

export default function App() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查本地存储是否有登录状态
    const savedUser = localStorage.getItem('fish_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    // 模拟登录逻辑
    const mockUser = {
      uid: 'admin_001',
      email: 'admin@pond.local',
      displayName: '管理员'
    };
    localStorage.setItem('fish_user', JSON.stringify(mockUser));
    setUser(mockUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('fish_user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-4">
          <Waves className="w-12 h-12 text-emerald-500 animate-pulse" />
          <p className="text-sm uppercase tracking-widest text-emerald-500/50">系统启动中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 selection:bg-emerald-500 selection:text-emerald-950 font-sans">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
          >
            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff10 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

            <div className="max-w-md w-full glass-card p-10 rounded-2xl relative z-10">
              <div className="flex flex-col items-center text-center mb-10">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-6">
                  <Fish className="w-8 h-8 text-emerald-950" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-2 italic">智渔云 <span className="text-emerald-500 not-italic font-mono text-sm">PRO</span></h1>
                <p className="text-slate-500 text-sm font-mono uppercase tracking-[0.2em]">Aquaculture Intelligence OS</p>
              </div>

              <div className="space-y-4 mb-10">
                <div className="flex items-start gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
                  <Activity className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">实时水质遥测与边缘计算支持</p>
                </div>
                <div className="flex items-start gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
                  <Cpu className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">基于 ESP32-S3 的智能环境风险分析</p>
                </div>
              </div>

              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-3 font-sans font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-emerald-950 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-[0.98]"
                id="login-btn"
              >
                <LogIn className="w-4 h-4" />
                进入控制管理系统
              </button>
              
              <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center">
                <div className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">
                  Secure Local Instance // Offline Ready
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-emerald-500/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col min-h-screen"
          >
            <Dashboard user={user} onLogOut={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
