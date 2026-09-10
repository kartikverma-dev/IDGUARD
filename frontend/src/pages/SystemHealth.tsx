import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { getApiUrl } from '../config/api';

interface HealthData {
  status: string;
  version: string;
  timestamp: string;
  modules: Record<string, string>;
}

export function SystemHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl('/api/health'))
      .then(res => res.json())
      .then(data => {
        setHealth(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch health status", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading system health...</div>;
  }

  if (!health) {
    return (
      <div className="p-8 text-center text-red-500 flex flex-col items-center">
        <XCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold">System Offline</h2>
        <p>Could not connect to the backend server.</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    if (status === 'online') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === 'not_implemented') return <AlertCircle className="w-5 h-5 text-amber-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'online') return 'bg-green-50 border-green-200 text-green-700';
    if (status === 'not_implemented') return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-red-50 border-red-200 text-red-700';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Health</h1>
        <p className="text-slate-500">Monitor status of backend models and microservices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${health.status === 'healthy' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Overall Status</div>
            <div className="text-2xl font-bold text-slate-900 capitalize">{health.status}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500">System Version</div>
          <div className="text-2xl font-bold text-slate-900">{health.version}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Last Checked</div>
          <div className="text-sm font-semibold text-slate-700 mt-2">{new Date(health.timestamp).toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Microservice Pipeline Status</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {Object.entries(health.modules).map(([moduleName, status]) => (
            <div key={moduleName} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(status)}
                <span className="font-medium text-slate-900 capitalize">
                  {moduleName.replace(/_/g, ' ')}
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(status)} uppercase`}>
                {status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
