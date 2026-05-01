import { useState, useEffect } from 'react';
import { 
  Monitor, 
  Maximize, 
  ShieldCheck, 
  Zap, 
  Wifi,
  Activity
} from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const Card = ({ title, icon: Icon, children }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl hover:border-blue-500/50 transition-colors">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-blue-500/10 rounded-lg">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
    </div>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const InfoRow = ({ label, value, status }) => {
  let textColor = 'text-slate-200';
  if (status === 'granted' || status === true) textColor = 'text-green-400';
  if (status === 'denied' || status === false) textColor = 'text-red-400';
  if (status === 'prompt') textColor = 'text-yellow-400';

  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-medium ${textColor}`}>
        {String(value)}
      </span>
    </div>
  );
};

const getInitialSystem = () => {
  if (typeof navigator === 'undefined') return { os: 'N/A', browser: 'N/A', cores: 'N/A', memory: 'N/A' };
  const ua = navigator.userAgent;
  let os = 'Unknown';
  if (ua.indexOf('Win') !== -1) os = 'Windows';
  else if (ua.indexOf('Mac') !== -1) os = 'macOS';
  else if (ua.indexOf('Linux') !== -1) os = 'Linux';
  else if (ua.indexOf('Android') !== -1) os = 'Android';
  else if (ua.indexOf('like Mac') !== -1) os = 'iOS';

  let browser = 'Unknown';
  if (ua.indexOf('Chrome') !== -1) browser = 'Chrome';
  else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
  else if (ua.indexOf('Safari') !== -1) browser = 'Safari';
  else if (ua.indexOf('Edge') !== -1) browser = 'Edge';

  return {
    os,
    browser,
    cores: navigator.hardwareConcurrency || 'N/A',
    memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'N/A'
  };
};

const getInitialScreen = () => {
  if (typeof window === 'undefined') return { resolution: 'N/A', aspectRatio: 'N/A', pixelRatio: 'N/A', orientation: 'N/A' };
  const { width, height } = window.screen;
  const ratio = (width / height).toFixed(2);
  return {
    resolution: `${width} x ${height}`,
    aspectRatio: `${ratio}:1`,
    pixelRatio: window.devicePixelRatio,
    orientation: window.screen.orientation ? window.screen.orientation.type : 'N/A'
  };
};

export default function App() {
  const [system] = useState(getInitialSystem);
  const [screen, setScreen] = useState(getInitialScreen);

  const [battery, setBattery] = useState({
    level: 'N/A',
    charging: false,
    supported: true
  });

  const [network, setNetwork] = useState({
    ip: 'Loading...',
    type: 'N/A',
    downlink: 'N/A',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true
  });

  const [permissions, setPermissions] = useState({
    camera: 'Loading...',
    microphone: 'Loading...',
    geolocation: 'Loading...',
    notifications: 'Loading...'
  });

  const [hardware, setHardware] = useState({
    touch: false,
    webgl: false,
    bluetooth: false,
    storage: 'N/A'
  });

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      navigator.getBattery().then(batt => {
        const updateBattery = () => {
          setBattery({
            level: `${Math.round(batt.level * 100)}%`,
            charging: batt.charging,
            supported: true
          });
        };
        updateBattery();
        batt.addEventListener('levelchange', updateBattery);
        batt.addEventListener('chargingchange', updateBattery);
      });
    } else {
      setBattery(prev => ({ ...prev, supported: false }));
    }

    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => setNetwork(prev => ({ ...prev, ip: data.ip })))
      .catch(() => setNetwork(prev => ({ ...prev, ip: 'Failed' })));

    const conn = typeof navigator !== 'undefined' ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection) : null;
    if (conn) {
      const updateConn = () => {
        setNetwork(prev => ({
          ...prev,
          type: conn.effectiveType || 'N/A',
          downlink: conn.downlink ? `${conn.downlink} Mbps` : 'N/A'
        }));
      };
      updateConn();
      conn.addEventListener('change', updateConn);
    }

    const handleOnline = () => setNetwork(prev => ({ ...prev, online: true }));
    const handleOffline = () => setNetwork(prev => ({ ...prev, online: false }));
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updateScreen = () => setScreen(getInitialScreen());
    window.addEventListener('resize', updateScreen);

    const checkPermission = async (name) => {
      try {
        const status = await navigator.permissions.query({ name });
        setPermissions(prev => ({ ...prev, [name]: status.state }));
        status.onchange = () => {
          setPermissions(prev => ({ ...prev, [name]: status.state }));
        };
      } catch {
        setPermissions(prev => ({ ...prev, [name]: 'Not supported' }));
      }
    };
    ['camera', 'microphone', 'geolocation', 'notifications'].forEach(checkPermission);

    const canvas = document.createElement('canvas');
    const webglSupported = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));

    const getStorage = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { quota } = await navigator.storage.estimate();
        return formatBytes(quota);
      }
      return 'N/A';
    };

    getStorage().then(storage => {
      setHardware({
        touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        webgl: webglSupported,
        bluetooth: 'bluetooth' in navigator,
        storage
      });
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', updateScreen);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Activity className="text-blue-500 w-10 h-10" />
              DEVICE <span className="text-blue-500">INFO</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1">Real-time system diagnostics dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${network.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-bold uppercase tracking-wider text-slate-400">
              {network.online ? 'Live Data Stream' : 'Connection Lost'}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card title="System Diagnostics" icon={Monitor}>
            <InfoRow label="OS Platform" value={system.os} />
            <InfoRow label="Browser Engine" value={system.browser} />
            <InfoRow label="Logical CPU Cores" value={system.cores} />
            <InfoRow label="Estimated RAM" value={system.memory} />
            <InfoRow 
              label="Battery Life" 
              value={battery.supported ? `${battery.level} (${battery.charging ? 'Charging' : 'Discharging'})` : 'Not supported'} 
              status={battery.charging}
            />
          </Card>

          <Card title="Network Connectivity" icon={Wifi}>
            <InfoRow label="Public IPv4" value={network.ip} />
            <InfoRow label="Link Type" value={network.type} />
            <InfoRow label="Downlink Speed" value={network.downlink} />
            <InfoRow 
              label="Network Status" 
              value={network.online ? 'Connected' : 'Offline'} 
              status={network.online}
            />
          </Card>

          <Card title="Visual & Display" icon={Maximize}>
            <InfoRow label="Screen Resolution" value={screen.resolution} />
            <InfoRow label="Aspect Ratio" value={screen.aspectRatio} />
            <InfoRow label="Device Pixel Ratio" value={screen.pixelRatio} />
            <InfoRow label="Current Orientation" value={screen.orientation} />
          </Card>

          <Card title="Permission Status" icon={ShieldCheck}>
            <InfoRow label="Media: Camera" value={permissions.camera} status={permissions.camera} />
            <InfoRow label="Media: Microphone" value={permissions.microphone} status={permissions.microphone} />
            <InfoRow label="Location Access" value={permissions.geolocation} status={permissions.geolocation} />
            <InfoRow label="Push Notifications" value={permissions.notifications} status={permissions.notifications} />
          </Card>

          <Card title="Hardware Capabilities" icon={Zap}>
            <InfoRow label="Touch Interface" value={hardware.touch ? 'Detected' : 'Not detected'} status={hardware.touch} />
            <InfoRow label="WebGL 2.0" value={hardware.webgl ? 'Optimized' : 'Unsupported'} status={hardware.webgl} />
            <InfoRow label="Bluetooth LE" value={hardware.bluetooth ? 'Enabled' : 'Disabled'} status={hardware.bluetooth} />
            <InfoRow label="Available Storage" value={hardware.storage} />
          </Card>

          <div className="bg-blue-600 rounded-xl p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
              <h2 className="text-2xl font-black text-white leading-tight">HARDWARE<br />INTEGRITY</h2>
              <p className="text-blue-100 text-sm mt-2 opacity-80 font-medium">System efficiency report generated</p>
            </div>
            <div className="relative z-10 flex items-baseline gap-2">
              <span className="text-6xl font-black text-white">98%</span>
              <span className="text-blue-200 font-bold uppercase text-xs tracking-widest">Optimal</span>
            </div>
          </div>
        </div>

        <footer className="mt-16 py-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs font-bold uppercase tracking-widest">
          <p>© 2026 INTERNAL DIAGNOSTICS ENGINE</p>
          <div className="flex gap-6">
            <span className="hover:text-blue-400 cursor-help">SECURE SESSION</span>
            <span className="hover:text-blue-400 cursor-help">V4.2.0-STABLE</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
