import React, { useState, useEffect } from 'react';
import { db, lafService } from '../services/lafService';
import { 
  Activity, 
  AlertTriangle, 
  Cpu, 
  LayoutDashboard, 
  Settings, 
  Thermometer, 
  Wind, 
  Zap, 
  Power, 
  RefreshCw, 
  LogOut, 
  Droplet, 
  Waves,
  LineChart as LucideChart 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { format } from 'date-fns';
import { SensorData, Equipment, Alert, Pond } from '../types';
import { analyzeWaterQuality } from '../services/aiService';
import { motion } from 'motion/react';

interface Props {
  user: { uid: string; displayName: string };
  onLogOut: () => void;
}

export default function Dashboard({ user, onLogOut }: Props) {
  // 状态初始化：优先从 localStorage 读取
  const [pond, setPond] = useState<Pond | null>(() => {
    const saved = localStorage.getItem('local_pond');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return { ...parsed, createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date() };
  });
  
  const [sensorData, setSensorData] = useState<SensorData | null>(() => {
    const saved = localStorage.getItem('local_sensors');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return { ...parsed, updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date() };
  });
  
  const [equipment, setEquipment] = useState<Equipment[]>(() => {
    const saved = localStorage.getItem('local_equipment');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    const saved = localStorage.getItem('local_alerts');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((a: any) => ({
        ...a,
        createdAt: { toDate: () => new Date(a.createdAt_raw || Date.now()) }
      }));
    } catch (e) {
      return [];
    }
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'1m' | '5m' | '1h' | '3h' | '24h'>('1h');
  const [trends, setTrends] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'logs' | 'system'>('overview');
  const [aiSettings, setAiSettings] = useState({
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: 'gemini-1.5-flash'
  });
  const [aiError, setAiError] = useState<string | null>(null);

  // Load AI settings from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ai_gateway_settings');
    if (saved) {
      try {
        setAiSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse AI settings");
      }
    }
  }, []);

  const saveAiSettings = (newSettings: typeof aiSettings) => {
    setAiSettings(newSettings);
    localStorage.setItem('ai_gateway_settings', JSON.stringify(newSettings));
  };

  // Function to generate pseudo-realistic historical data
  const generateTrends = (range: string) => {
    const points = range === '1m' ? 10 : range === '5m' ? 15 : range === '1h' ? 20 : range === '3h' ? 30 : 50;
    const now = new Date();
    const mockTrends = [];
    
    for (let i = points; i >= 0; i--) {
      const interval = range === '1m' ? 6000 : range === '5m' ? 20000 : range === '1h' ? 180000 : 360000;
      const time = new Date(now.getTime() - i * interval);
      const hour = time.getHours();
      const sinOsc = Math.sin((hour - 6) * Math.PI / 12);
      
      mockTrends.push({
        time: format(time, range === '1m' || range === '5m' ? 'HH:mm:ss' : 'HH:mm'),
        temp: 26 + sinOsc * 2 + (Math.random() - 0.5),
        do: 5.5 + sinOsc * 1.5 + (Math.random() - 0.5),
        ph: 7.8 + (Math.random() - 0.5) * 0.2,
        ammonia: 0.01 + Math.random() * 0.02
      });
    }
    setTrends(mockTrends);
  };

  useEffect(() => {
    generateTrends(timeRange);
  }, [timeRange, sensorData]);

  // Automatic AI Analysis Logic
  useEffect(() => {
    if (!sensorData || analyzing) return;
    const shouldAnalyze = 
      sensorData.dissolvedOxygen < 5 || 
      sensorData.temperature > 32 || 
      sensorData.temperature < 15 || 
      sensorData.pH < 6.5 || 
      sensorData.pH > 9 || 
      sensorData.ammonia > 0.05;

    if (shouldAnalyze) {
      const timer = setTimeout(() => {
        runAIAnalysis();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sensorData]);

  // 持久化监听：当状态改变时保存到本地
  useEffect(() => {
    if (pond) localStorage.setItem('local_pond', JSON.stringify(pond));
  }, [pond]);

  useEffect(() => {
    if (sensorData) localStorage.setItem('local_sensors', JSON.stringify(sensorData));
  }, [sensorData]);

  useEffect(() => {
    if (equipment.length > 0) localStorage.setItem('local_equipment', JSON.stringify(equipment));
  }, [equipment]);

  useEffect(() => {
    if (alerts.length > 0) {
      const toSave = alerts.map(a => ({
        ...a,
        createdAt_raw: (a.createdAt as any).toDate().getTime(),
        createdAt: undefined // 不直接存储带有方法的对象
      }));
      localStorage.setItem('local_alerts', JSON.stringify(toSave));
    }
  }, [alerts]);

  // 模拟数据初始化逻辑 - 适配 Laf/本地运行
  useEffect(() => {
    // 1. 初始化鱼塘信息
    if (!pond) {
      setPond({
        id: 'default_pond',
        name: "福建理工大学养殖基地 #1",
        location: "福建省福州市",
        ownerId: user.uid,
        createdAt: new Date()
      });
    }

    // 2. 初始化传感器数据
    if (!sensorData) {
      setSensorData({
        temperature: 28.5,
        dissolvedOxygen: 6.2,
        pH: 7.8,
        ammonia: 0.01,
        nitrite: 0.005,
        updatedAt: new Date()
      });
    }

    // 3. 初始化设备
    if (equipment.length === 0) {
      setEquipment([
        { id: 'e1', type: 'aerator', status: 'off', mode: 'auto', lastActionAt: new Date() },
        { id: 'e2', type: 'feeder', status: 'off', mode: 'auto', lastActionAt: new Date() },
        { id: 'e3', type: 'pump', status: 'off', mode: 'auto', lastActionAt: new Date() },
      ]);
    }
  }, [user.uid]);

  // 定时尝试与 Laf 同步的逻辑 (如果配置了 AppID)
  useEffect(() => {
    const appId = import.meta.env.VITE_LAF_APP_ID;
    if (!appId || appId === "你的Laf_AppID") return;

    const timer = setInterval(async () => {
      try {
        // 这里可以执行与 Laf 的数据交互
        // 例如：const res = await lafService.getPondStatus('default_pond');
      } catch (e) {
        console.warn("Laf Sync Error: ", e);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const runAIAnalysis = async () => {
    if (!sensorData || analyzing) return;
    setAnalyzing(true);
    setAiError(null);
    try {
      const result = await analyzeWaterQuality(sensorData, aiSettings);
      if (result) {
        setAiAnalysis(result);
        if (result.status === 'warning' || result.status === 'critical') {
          const newAlert: Alert = {
            id: Date.now().toString(),
            type: result.status,
            message: result.summary,
            severity: result.status,
            handled: false,
            createdAt: { toDate: () => new Date() }
          };
          setAlerts(prev => [newAlert, ...prev].slice(0, 15));
          
    if (lafService.isConfigured()) {
      lafService.logAlert(newAlert).catch(() => {});
    }
        }
      } else {
        setAiError("无法获取 AI 响应，请检查模型接入设置。");
      }
    } catch (err) {
      setAiError("AI 引擎调用异常，请重试。");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleEquipment = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'on' ? 'off' : 'on';
    
    // 更新本地 UI 状态
    setEquipment(prev => prev.map(eq => 
      eq.id === id ? { ...eq, status: newStatus as any, lastActionAt: new Date() } : eq
    ));

    // 尝试同步到 Laf
    if (lafService.isConfigured()) {
      lafService.toggleEquipment(id, newStatus).catch(() => {});
    }
  };

  const simulateData = async () => {
    const mockData: SensorData = {
      temperature: 26 + Math.random() * 4,
      dissolvedOxygen: 4 + Math.random() * 3,
      pH: 7.2 + Math.random() * 1.5,
      ammonia: Math.random() * 0.05,
      nitrite: Math.random() * 0.2,
      updatedAt: new Date()
    };
    setSensorData(mockData);

    // 尝试同步到 Laf
    if (lafService.isConfigured()) {
      lafService.updateSensors('default_pond', mockData).catch(() => {});
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0B0F1A] pb-16 md:pb-0">
      <header className="h-14 border-b border-white/5 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500 rounded text-emerald-950">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-sans font-bold text-lg tracking-tight leading-none">智渔云</h1>
            {!lafService.isConfigured() && (
              <span className="text-[7px] text-amber-500 font-mono uppercase tracking-widest mt-1">Local Storage Mode</span>
            )}
          </div>
          
          <div className="flex ml-2 bg-slate-950 border border-white/5 p-0.5 rounded-md self-center">
            {(["1m", "5m", "1h", "3h", "24h"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-1.5 py-0.5 rounded-sm font-mono text-[7px] uppercase transition-all ${
                  timeRange === range 
                  ? "bg-emerald-500 text-emerald-950 font-bold" 
                  : "text-slate-500"
                }`}
              >
                {range === "1m" ? "1分" : range === "5m" ? "5分" : range === "1h" ? "1时" : range === "3h" ? "3时" : "24时"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-mono text-slate-500 uppercase leading-none mb-1">当前渔场</p>
            <p className="text-xs font-medium text-slate-200">{pond?.name || "加载中..."}</p>
          </div>
          <button 
            onClick={onLogOut}
            className="p-1.5 rounded-md hover:bg-white/5 transition-all text-slate-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 custom-scrollbar">
        {activeTab === "overview" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 shrink-0">
              <MetricCard 
                label="当前水温" 
                value={sensorData?.temperature.toFixed(1) || "--"} 
                unit="°C" 
                icon={<Thermometer className="w-4 h-4" />} 
                color="emerald"
                data={trends.map(t => ({ val: t.temp }))}
              />
              <MetricCard 
                label="溶解氧含量" 
                value={sensorData?.dissolvedOxygen.toFixed(1) || "--"} 
                unit="mg/L" 
                icon={<Droplet className="w-4 h-4" />} 
                color={sensorData && sensorData.dissolvedOxygen < 5 ? "rose" : "emerald"}
                alert={sensorData && sensorData.dissolvedOxygen < 5}
                data={trends.map(t => ({ val: t.do }))}
              />
              <MetricCard 
                label="水体pH值" 
                value={sensorData?.pH.toFixed(1) || "--"} 
                unit="pH" 
                icon={<Waves className="w-4 h-4" />} 
                color="cyan"
                data={trends.map(t => ({ val: t.ph }))}
              />
              <MetricCard 
                label="氨氮指标" 
                value={sensorData?.ammonia.toFixed(2) || "--"} 
                unit="mg/L" 
                icon={<Activity className="w-4 h-4" />} 
                color="amber"
                data={trends.map(t => ({ val: t.ammonia }))}
              />
            </div>

            <div className="grid grid-cols-12 gap-3 h-[240px]">
              {/* Device Matrix Left */}
              <div className="col-span-4 glass-card p-2 flex flex-col overflow-hidden">
                <h3 className="text-[9px] font-bold font-mono text-slate-500 uppercase tracking-widest mb-2 text-center">系统受控组件</h3>
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">
                  {equipment.map(eq => (
                    <div key={eq.id} className="p-2 bg-slate-950/40 border border-slate-800 rounded-lg flex items-center justify-between gap-2 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-slate-300 leading-tight">
                          {eq.type === "aerator" ? "高频增氧机" : eq.type === "feeder" ? "自动投饵机" : "抽水泵"}
                        </span>
                      </div>
                      <button 
                        onClick={() => toggleEquipment(eq.id, eq.status)}
                        className={`relative w-8 h-4 rounded-full shrink-0 transition-all duration-300 ${eq.status === "on" ? "bg-emerald-500" : "bg-slate-700"}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${eq.status === "on" ? "translate-x-4" : ""}`} />
                      </button>
                    </div>
                  ))}
                  {equipment.length === 0 && <div className="text-[9px] text-slate-600 text-center py-4">无受控端连接</div>}
                </div>
              </div>

              {/* AI Expert Warning Right */}
              <div className="col-span-8 flex flex-col">
                <div className={`flex-1 p-4 rounded-xl border flex flex-col justify-between transition-all overflow-hidden ${
                  analyzing ? 'bg-slate-900 border-slate-700' : 
                  aiError ? 'bg-rose-500/5 border-rose-500/20' :
                  aiAnalysis?.status === "critical" ? "bg-rose-500/10 border-rose-500/20" : 
                  aiAnalysis?.status === "warning" ? "bg-amber-500/10 border-amber-500/20" :
                  "bg-emerald-500/5 border-emerald-500/20"
                }`}>
                  <div className="space-y-2 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between sticky top-0 bg-inherit py-1">
                      <div className="flex items-center gap-2">
                        <Cpu className={`w-4 h-4 text-emerald-400 ${analyzing ? 'animate-spin' : ''}`} />
                        <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-slate-400">AI 专家预警建议</span>
                      </div>
                    </div>

                    {aiError ? (
                      <p className="text-xs text-rose-400 font-medium leading-relaxed italic">{aiError}</p>
                    ) : aiAnalysis ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                           <span className={`w-1.5 h-1.5 rounded-full ${aiAnalysis.status === 'critical' ? 'bg-rose-500' : aiAnalysis.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                           <p className={`text-[13px] font-bold ${aiAnalysis.status === 'critical' ? 'text-rose-100' : 'text-slate-100'}`}>{aiAnalysis.summary}</p>
                        </div>
                        <div className="space-y-2">
                           <div className="flex flex-wrap gap-1.5">
                              {aiAnalysis.actions?.map((action: string, i: number) => (
                                <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-black/30 border border-white/5 text-slate-300 font-medium">#{action}</span>
                              ))}
                           </div>
                           <div className="flex flex-wrap gap-1.5">
                              {aiAnalysis.risks?.map((risk: string, i: number) => (
                                <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300/80 italic font-mono">! {risk}</span>
                              ))}
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-40">
                         <RefreshCw className="w-6 h-6 text-slate-500 animate-spin-slow" />
                         <p className="text-[10px] text-slate-500 tracking-wider uppercase">系统就绪，等待触发分析...</p>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={runAIAnalysis}
                    disabled={analyzing || !sensorData}
                    className="mt-3 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded font-mono text-[9px] uppercase tracking-widest transition-all text-emerald-400 disabled:opacity-30"
                  >
                    {analyzing ? '推演解析中...' : '手动刷新诊断控制台'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "trends" && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest">环境遥测历史</h3>
            </div>

            <div className="glass-card p-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="time" fontSize={8} fontFamily="monospace" axisLine={false} tickLine={false} tick={{ fill: "#475569" }} />
                  <YAxis fontSize={8} fontFamily="monospace" axisLine={false} tickLine={false} tick={{ fill: "#475569" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "4px", border: "1px solid #1e293b", fontSize: "10px", color: "#f1f5f9" }} />
                  <Area type="monotone" dataKey="do" stroke="#10b981" fillOpacity={1} fill="url(#chartGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[8px] font-mono text-slate-600 uppercase">
               <span>! 传感器节点 A-12 信号强度 98%</span>
               <span>! 同步偏移 2.4ms</span>
            </div>
          </motion.div>
        )}

        {activeTab === "logs" && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col h-[65vh]"
          >
            <h3 className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest mb-3">系统告警与操作日志</h3>
            <div className="flex-1 glass-card overflow-y-auto p-4 font-mono text-[10px] space-y-3 text-slate-400 custom-scrollbar">
               {alerts.length === 0 ? (
                 <p className="opacity-20 italic font-sans text-center mt-10">等待系统事件上传...</p>
               ) : alerts.map(alert => (
                 <div key={alert.id} className="flex gap-4 border-b border-white/5 pb-2">
                    <span className="text-slate-600 flex-shrink-0">[{format(alert.createdAt?.toDate() || new Date(), "HH:mm:ss")}]</span>
                    <span className={`${alert.type === "critical" ? "text-rose-400 font-bold" : "text-amber-400"}`}>
                      {alert.message}
                    </span>
                 </div>
               ))}
            </div>
          </motion.div>
        )}

        {activeTab === "system" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="glass-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                <h3 className="text-[10px] font-bold font-sans text-slate-100 uppercase tracking-widest">AI 推理模型桥接设置</h3>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase">供应商通道</label>
                  <select 
                    value={aiSettings.provider}
                    onChange={(e) => saveAiSettings({...aiSettings, provider: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500/30 transition-all font-sans"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="deepseek">DeepSeek (深度求索)</option>
                    <option value="zhipu">清华智谱 (GLM)</option>
                    <option value="doubao">字节跳动 (豆包/Ark)</option>
                    <option value="claude">Anthropic Claude</option>
                    <option value="openai">OpenAI 兼容协议</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase">身份令牌 (API KEY)</label>
                  <input 
                    type="password"
                    value={aiSettings.apiKey}
                    onChange={(e) => saveAiSettings({...aiSettings, apiKey: e.target.value})}
                    placeholder="输入秘钥密钥"
                    className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500/30 transition-all font-mono"
                  />
                  {aiSettings.provider === 'gemini' && !aiSettings.apiKey && (
                    <p className="text-[8px] text-slate-600">默认使用系统内置 Gemini 接口资源</p>
                  )}
                </div>

                {aiSettings.provider !== 'gemini' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-slate-500 uppercase">网关地址 (BASE URL)</label>
                      <input 
                        type="text"
                        value={aiSettings.baseUrl}
                        onChange={(e) => saveAiSettings({...aiSettings, baseUrl: e.target.value})}
                        placeholder={
                          aiSettings.provider === 'deepseek' ? 'https://api.deepseek.com/v1' :
                          aiSettings.provider === 'zhipu' ? 'https://open.bigmodel.cn/api/paas/v4' :
                          aiSettings.provider === 'doubao' ? 'https://ark.cn-beijing.volces.com/api/v3' :
                          'https://api.openai.com/v1'
                        }
                        className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500/30 transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-slate-500 uppercase">内核模型 (MODEL NAME)</label>
                      <input 
                        type="text"
                        value={aiSettings.model}
                        onChange={(e) => saveAiSettings({...aiSettings, model: e.target.value})}
                        placeholder="gpt-3.5-turbo"
                        className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500/30 transition-all font-mono"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="glass-card p-6 bg-slate-900/40 border-dashed border-white/5 space-y-4">
                <div className="flex flex-col items-center text-center space-y-3">
                   <Zap className="w-6 h-6 text-emerald-400" />
                   <div>
                      <h4 className="text-[10px] font-bold text-slate-100 uppercase tracking-widest">底层边缘节点：ACTIVE</h4>
                      <p className="text-[9px] text-slate-500 max-w-xs mt-1">
                        边缘解析网关正常。AI 推理流正常托管。外设逻辑通过 5G/LoRa 链路稳定交互。
                      </p>
                   </div>
                </div>
                <button 
                  onClick={simulateData}
                  className="w-full py-3 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  强制触发遥测数据同步
                </button>
            </div>
          </motion.div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-lg border-t border-white/5 flex items-center justify-around px-2 z-20">
        <NavButton active={activeTab === "overview"} icon={<LayoutDashboard className="w-5 h-5" />} label="实时概览" onClick={() => setActiveTab("overview")} />
        <NavButton active={activeTab === "trends"} icon={<LucideChart className="w-5 h-5" />} label="历程趋势" onClick={() => setActiveTab("trends")} />
        <NavButton active={activeTab === "logs"} icon={<AlertTriangle className="w-5 h-5" />} label="告警日志" onClick={() => setActiveTab("logs")} />
        <NavButton active={activeTab === "system"} icon={<Cpu className="w-5 h-5" />} label="系统拓扑" onClick={() => setActiveTab("system")} />
      </nav>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 transition-all ${active ? "text-emerald-400 scale-110" : "text-slate-500"}`}
    >
      {icon}
      <span className="text-[9px] font-bold tracking-tighter">{label}</span>
    </button>
  );
}

function MetricCard({ label, value, unit, icon, data, color = "emerald", alert = false }: any) {
  const colorMap: any = {
    emerald: "#10b981",
    rose: "#f43f5e",
    amber: "#f59e0b",
    cyan: "#06b6d4",
  };
  const activeColor = colorMap[color];

  return (
    <div className={`glass-card p-2 flex flex-col relative h-24 overflow-hidden ${alert ? "ring-2 ring-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]" : ""}`}>
      <div className="flex items-center justify-between mb-0.5 relative z-10">
        <span className="text-[9px] text-slate-400 font-bold tracking-widest truncate">{label}</span>
        <div className={`p-1 rounded bg-slate-800/50`} style={{ color: activeColor }}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-1 relative z-10 mt-0.5">
        <span className="text-2xl font-mono font-black tracking-tighter text-white">{value}</span>
        <span className="text-[9px] font-mono text-slate-500 font-bold">{unit}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-10 opacity-30">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <Area 
              type="monotone" 
              dataKey="val" 
              stroke={activeColor} 
              fill={activeColor} 
              fillOpacity={0.1}
              strokeWidth={1}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
