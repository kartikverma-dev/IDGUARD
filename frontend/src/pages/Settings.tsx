import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Sliders, 
  Bell, 
  Eye, 
  CheckCircle2, 
  AlertTriangle,
  Server,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { getBackendUrl } from '../config/api';

interface SettingsState {
  backendUrl: string;
  demoMode: boolean;
  faceThreshold: number;
  suspiciousThreshold: number;
  yoloConfidence: number;
  ocrConfidence: number;
  autoFlagSuspicious: boolean;
  autoFlagMismatch: boolean;
  alertOnMultipleFaces: boolean;
  maskAadhaar: boolean;
  zeroRetentionBiometrics: boolean;
  auditTrailLogging: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  backendUrl: getBackendUrl(),
  demoMode: true,
  faceThreshold: 0.40,
  suspiciousThreshold: 0.60,
  yoloConfidence: 0.25,
  ocrConfidence: 0.75,
  autoFlagSuspicious: true,
  autoFlagMismatch: true,
  alertOnMultipleFaces: true,
  maskAadhaar: true,
  zeroRetentionBiometrics: true,
  auditTrailLogging: true,
};

export function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'models' | 'alerts' | 'privacy'>('general');
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('idguard_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'online' | 'error'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  const handleSave = () => {
    localStorage.setItem('idguard_settings', JSON.stringify(settings));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem('idguard_settings', JSON.stringify(DEFAULT_SETTINGS));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const testApiPing = async () => {
    setPingStatus('testing');
    const start = performance.now();
    try {
      const apiKey = import.meta.env.VITE_API_KEY || 'sih2026-demo-key-change-me';
      const cleanUrl = settings.backendUrl.replace(/\/+$/, '');
      const resp = await axios.get(`${cleanUrl}/api/health`, {
        timeout: 5000,
        headers: { 'x-api-key': apiKey }
      });
      const elapsed = Math.round(performance.now() - start);
      if (resp.status === 200) {
        setPingStatus('online');
        setPingLatency(elapsed);
      } else {
        setPingStatus('error');
      }
    } catch (e) {
      setPingStatus('error');
      setPingLatency(null);
    }
  };

  useEffect(() => {
    // Auto-test ping on mount
    testApiPing();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 border-slate-200">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Control Panel & Settings</h1>
            <p className="text-xs text-slate-500">Configure AI model thresholds, privacy policies, and manual review escalation rules.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">Settings successfully updated and saved to session storage.</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-mono">Live Configuration Active</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar (Fully Interactive) */}
        <div className="col-span-1 space-y-1.5">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-xs flex items-center space-x-3 transition-colors ${
              activeTab === 'general'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>General & API</span>
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-xs flex items-center space-x-3 transition-colors ${
              activeTab === 'models'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Models & Thresholds</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-xs flex items-center space-x-3 transition-colors ${
              activeTab === 'alerts'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Alerts & Review</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-xs flex items-center space-x-3 transition-colors ${
              activeTab === 'privacy'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Privacy & Masking</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="col-span-1 md:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            
            {/* TAB 1: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">API Connection & Runtime Environment</h2>
                  <p className="text-xs text-slate-500">Configure connection to the FastAPI microservices.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      FastAPI Backend Gateway URL
                    </label>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        value={settings.backendUrl}
                        onChange={(e) => setSettings({ ...settings, backendUrl: e.target.value })}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                      <button
                        onClick={testApiPing}
                        disabled={pingStatus === 'testing'}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${pingStatus === 'testing' ? 'animate-spin' : ''}`} />
                        <span>Test Ping</span>
                      </button>
                    </div>

                    {/* Ping Status Banner */}
                    <div className="mt-2 flex items-center space-x-2 text-xs">
                      {pingStatus === 'online' && (
                        <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Connected to API Gateway ({pingLatency} ms latency)</span>
                        </span>
                      )}
                      {pingStatus === 'error' && (
                        <span className="text-red-600 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          <span>Connection Refused. Please start backend using `python start_backend.py`.</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                      <Server className="w-4 h-4 text-slate-500" />
                      <span>Runtime System Info</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>Execution Provider: <span className="font-semibold text-slate-800">CPU (AMD64)</span></div>
                      <div>Backend Engine: <span className="font-semibold text-slate-800">FastAPI / Uvicorn</span></div>
                      <div>Frontend Engine: <span className="font-semibold text-slate-800">React 18 + Vite 8</span></div>
                      <div>Pipeline Version: <span className="font-semibold text-slate-800">v2.0 Presentation Build</span></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <h3 className="font-semibold text-xs text-slate-900">Presentation Demo Mode Presets</h3>
                      <p className="text-xs text-slate-500">Enable 1-click sample document and selfie preloads in verification page.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.demoMode}
                        onChange={(e) => setSettings({ ...settings, demoMode: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MODELS & THRESHOLDS */}
            {activeTab === 'models' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Biometric & Computer Vision Thresholds</h2>
                  <p className="text-xs text-slate-500">Tune sensitivity and operational cutoffs across all pipeline stages.</p>
                </div>

                <div className="space-y-5">
                  {/* ArcFace Threshold */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-800">
                        1:1 Biometric Match Threshold (ArcFace Cosine Similarity)
                      </label>
                      <span className="text-xs font-mono font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                        {(settings.faceThreshold * 100).toFixed(0)}% ({settings.faceThreshold.toFixed(2)})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      Embeddings with cosine similarity above this value are marked as 1:1 MATCH.
                    </p>
                    <input 
                      type="range" 
                      min="0.10" 
                      max="0.80" 
                      step="0.05"
                      value={settings.faceThreshold}
                      onChange={(e) => setSettings({ ...settings, faceThreshold: parseFloat(e.target.value) })}
                      className="w-full accent-slate-900 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>10% (Permissive)</span>
                      <span>40% (Recommended Demo Cutoff)</span>
                      <span>80% (Strict)</span>
                    </div>
                  </div>

                  {/* Suspicious Score Flagging Threshold (Requirement 1) */}
                  <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-amber-900">
                        Automatic Suspicious Flagging Cutoff (Manual Review Queue)
                      </label>
                      <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        {(settings.suspiciousThreshold * 100).toFixed(0)}% ({settings.suspiciousThreshold.toFixed(2)})
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 mb-3">
                      Any transaction producing a similarity score below this threshold triggers an alert badge and enables the 1-click &quot;Flag as Suspicious &amp; Send to Manual Review&quot; action.
                    </p>
                    <input 
                      type="range" 
                      min="0.30" 
                      max="0.85" 
                      step="0.05"
                      value={settings.suspiciousThreshold}
                      onChange={(e) => setSettings({ ...settings, suspiciousThreshold: parseFloat(e.target.value) })}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-amber-700 mt-1">
                      <span>30%</span>
                      <span>60% (Default Suspicious Threshold)</span>
                      <span>85%</span>
                    </div>
                  </div>

                  {/* YOLO & OCR Cutoffs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-slate-800">YOLO Field Detector Conf</label>
                        <span className="text-xs font-mono font-bold text-slate-700">{(settings.yoloConfidence * 100).toFixed(0)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.10" 
                        max="0.60" 
                        step="0.05"
                        value={settings.yoloConfidence}
                        onChange={(e) => setSettings({ ...settings, yoloConfidence: parseFloat(e.target.value) })}
                        className="w-full accent-slate-900 cursor-pointer mt-2"
                      />
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-slate-800">PaddleOCR Confidence Min</label>
                        <span className="text-xs font-mono font-bold text-slate-700">{(settings.ocrConfidence * 100).toFixed(0)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.50" 
                        max="0.95" 
                        step="0.05"
                        value={settings.ocrConfidence}
                        onChange={(e) => setSettings({ ...settings, ocrConfidence: parseFloat(e.target.value) })}
                        className="w-full accent-slate-900 cursor-pointer mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ALERTS & MANUAL REVIEW */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Automated Review Escalation Rules</h2>
                  <p className="text-xs text-slate-500">Configure triggers that automatically divert sessions to the Human Auditor Queue.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <h3 className="font-semibold text-xs text-slate-900">Flag Low Biometric Confidence</h3>
                      <p className="text-xs text-slate-500">Automatically flag verifications when face similarity score &lt; { (settings.suspiciousThreshold * 100).toFixed(0) }%</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.autoFlagSuspicious}
                        onChange={(e) => setSettings({ ...settings, autoFlagSuspicious: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <h3 className="font-semibold text-xs text-slate-900">Flag Biometric Mismatches (NO MATCH)</h3>
                      <p className="text-xs text-slate-500">Escalate immediately when different persons or imposter attempts are detected</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.autoFlagMismatch}
                        onChange={(e) => setSettings({ ...settings, autoFlagMismatch: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <h3 className="font-semibold text-xs text-slate-900">Multiple Face Anomaly Detection</h3>
                      <p className="text-xs text-slate-500">Warn auditor when multiple individuals are detected in the selfie or document</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.alertOnMultipleFaces}
                        onChange={(e) => setSettings({ ...settings, alertOnMultipleFaces: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PRIVACY & MASKING */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Privacy & PII Protection Policies</h2>
                  <p className="text-xs text-slate-500">India DPDP & Aadhaar Regulations compliance controls.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <h3 className="font-semibold text-xs text-slate-900">Mandatory Aadhaar Redaction / Masking</h3>
                      <p className="text-xs text-slate-500">Mask first 8 digits as &apos;XXXX XXXX 1234&apos; before leaving backend memory</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.maskAadhaar}
                        onChange={(e) => setSettings({ ...settings, maskAadhaar: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <h3 className="font-semibold text-xs text-slate-900">Zero-Retention Biometrics Policy</h3>
                      <p className="text-xs text-slate-500">Ephemeral processing only: biometric embeddings are purged from memory after cosine comparison</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.zeroRetentionBiometrics}
                        onChange={(e) => setSettings({ ...settings, zeroRetentionBiometrics: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <h3 className="font-semibold text-xs text-slate-900">Immutable Session Audit Logs</h3>
                      <p className="text-xs text-slate-500">Record timestamped verification decisions with anonymized IDs for compliance tracking</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.auditTrailLogging}
                        onChange={(e) => setSettings({ ...settings, auditTrailLogging: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Action Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-400">Settings stored locally in browser session</span>
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
