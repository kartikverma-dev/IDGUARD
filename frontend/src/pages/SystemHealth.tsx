import { useState, useEffect, useCallback } from 'react';
import { Activity, CheckCircle2, XCircle, AlertCircle, RefreshCw, Server, ExternalLink } from 'lucide-react';
import { apiClient, getBackendUrl } from '../config/api';
import { Link } from 'react-router-dom';

interface HealthData {
  status: string;
  version: string;
  timestamp: string;
  modules: Record<string, string>;
}

export function SystemHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = useCallback(async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get('/api/health', { timeout: 8000 });
      if (res.data && typeof res.data === 'object' && res.data.modules) {
        setHealth(res.data);
      } else if (res.data?.detail) {
        setErrorMsg(typeof res.data.detail === 'string' ? res.data.detail : 'Unauthorized access to health check');
        setHealth(null);
      } else {
        setErrorMsg('Invalid response format received from backend API.');
        setHealth(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch health status:', err);
      const detail = err.response?.data?.detail || err.message || 'Could not connect to backend server';
      setErrorMsg(detail);
      setHealth(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const getStatusIcon = (status: string) => {
    if (status === 'online' || status === 'healthy') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (status === 'not_implemented' || status === 'degraded') return <AlertCircle className="w-5 h-5 text-amber-500" />;
    return <XCircle className="w-5 h-5 text-rose-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'online' || status === 'healthy') return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    if (status === 'not_implemented' || status === 'degraded') return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-rose-50 border-rose-200 text-rose-700';
  };

  const activeBackendUrl = getBackendUrl();
  const isOnline = health && (health.status === 'online' || health.status === 'healthy');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Health & Microservices</h1>
          <p className="text-slate-500 text-sm mt-0.5">Real-time status of backend AI vision, biometric, and security engines</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchHealth}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Checking...' : 'Refresh Status'}</span>
          </button>
        </div>
      </div>

      {/* Target Backend Info Banner */}
      <div className="bg-slate-100/80 border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span>Active Backend Target:</span>
          <span className="font-mono font-semibold text-slate-800 break-all">{activeBackendUrl}</span>
        </div>
        <Link to="/settings" className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center space-x-1 flex-shrink-0">
          <span>Configure in Settings</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Connecting to IDGUARD microservices...</p>
        </div>
      ) : !isOnline ? (
        <div className="bg-white p-8 rounded-xl border border-rose-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Backend API Unreachable / Offline</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {errorMsg || 'Could not establish connection to the backend server. Please check your Cloudflare tunnel or verify your backend is running.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={fetchHealth}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              Retry Connection
            </button>
            <Link
              to="/settings"
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              Update Tunnel URL in Settings
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Overall Status</div>
                <div className="text-xl font-bold text-slate-900 capitalize">{health?.status || 'Online'}</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500">Engine Build Version</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{health?.version || '2.0.0'}</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500">Last Telemetry Ping</div>
              <div className="text-sm font-semibold text-slate-700 mt-2">
                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Just now'}
              </div>
            </div>
          </div>

          {/* Microservices List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">AI Microservice Pipeline Engines</h2>
              <span className="text-[11px] font-medium text-slate-500">
                {Object.keys(health?.modules || {}).length} Microservices Active
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {Object.entries(health?.modules || {}).map(([moduleName, status]) => (
                <div key={moduleName} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status)}
                    <span className="text-xs font-semibold text-slate-800 capitalize">
                      {moduleName.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusColor(status)} uppercase tracking-wider`}>
                    {status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
