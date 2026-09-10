import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  ArrowRight,
  FileCheck,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitBranch
} from 'lucide-react';
import { apiClient, getApiUrl } from '../config/api';
import type { VerificationResponse } from '../types';
import { PipelineVisualizer } from '../components/pipeline/PipelineVisualizer';

export function Dashboard() {
  const [analytics, setAnalytics] = useState({
    total_verifications: '0',
    successful: '0',
    manual_review: '0',
    avg_processing_time: '0 ms'
  });
  const [recentVerifications, setRecentVerifications] = useState<VerificationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [analyticsRes, ledgerRes] = await Promise.all([
        apiClient.get('/api/analytics'),
        apiClient.get('/api/verifications')
      ]);

      const data = analyticsRes.data;
      setAnalytics({
        total_verifications: (data.total_verifications ?? 0).toString(),
        successful: (data.successful ?? 0).toString(),
        manual_review: (data.manual_review ?? 0).toString(),
        avg_processing_time: `${data.avg_processing_time ?? 0} ms`
      });

      if (Array.isArray(ledgerRes.data)) {
        setRecentVerifications(ledgerRes.data.slice(0, 5));
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and live auto-poll every 3 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    const onFocus = () => fetchDashboardData();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchDashboardData]);

  const stats = [
    { 
      name: 'Total Verifications', 
      value: analytics.total_verifications, 
      icon: Activity, 
      label: 'Live Stream', 
      to: '/history',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      name: 'Successful Verifications', 
      value: analytics.successful, 
      icon: ShieldCheck, 
      label: 'Verified & Approved', 
      to: '/history?tab=approved',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    { 
      name: 'Manual Review Queue', 
      value: analytics.manual_review, 
      icon: ShieldAlert, 
      label: parseInt(analytics.manual_review) > 0 ? 'Action Required' : 'Queue Clear', 
      to: '/history?tab=review', 
      alert: parseInt(analytics.manual_review) > 0,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    { 
      name: 'Avg Processing Latency', 
      value: analytics.avg_processing_time, 
      icon: Clock, 
      label: 'CPU Inference', 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
  ];

  const pendingReviewCount = parseInt(analytics.manual_review) || 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Overview Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time biometric and document verification metrics • Auto-refreshing every 3s
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-[11px] text-slate-400 font-mono">
            Updated {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Manual Review Callout Banner if Pending */}
      {pendingReviewCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                🚨 {pendingReviewCount} Verification(s) Awaiting Human Manual Review
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Records flagged for low biometric match (&lt; 60%) or visual discrepancies require immediate auditor disposition.
              </p>
            </div>
          </div>
          <Link
            to="/history?tab=review"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 whitespace-nowrap"
          >
            <span>Open Review Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Content = (
            <div className={`bg-white p-5 rounded-2xl border shadow-xs transition-all h-full flex flex-col justify-between ${
              stat.alert ? 'border-amber-300 ring-2 ring-amber-200' : 'border-slate-200'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.name}</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.bgColor} ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  stat.alert 
                    ? 'text-amber-800 bg-amber-100 font-bold' 
                    : 'text-slate-600 bg-slate-100'
                }`}>
                  {stat.label}
                </span>
                {stat.to && (
                  <span className="text-xs text-primary-600 font-semibold hover:underline flex items-center">
                    View list →
                  </span>
                )}
              </div>
            </div>
          );

          return stat.to ? (
            <Link key={stat.name} to={stat.to} className="block hover:scale-[1.01] transition-transform">
              {Content}
            </Link>
          ) : (
            <div key={stat.name}>{Content}</div>
          );
        })}
      </div>

      {/* Quick Launch Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link 
          to="/verify" 
          className="p-5 bg-gradient-to-br from-primary-900 to-slate-900 rounded-2xl text-white shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div>
            <div className="flex items-center space-x-2 text-primary-300 text-xs font-bold uppercase tracking-wider">
              <FileCheck className="w-4 h-4" />
              <span>Identity Verification</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">Start Verification</h3>
            <p className="text-xs text-slate-300 mt-0.5">Live webcam & ID card matching</p>
          </div>
          <ArrowRight className="w-5 h-5 text-primary-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link 
          to="/pipeline" 
          className="p-5 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl text-white shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div>
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <GitBranch className="w-4 h-4" />
              <span>AI Architecture</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">Pipeline Flow</h3>
            <p className="text-xs text-slate-300 mt-0.5">Interactive 6-stage AI flow</p>
          </div>
          <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link 
          to="/history?tab=review" 
          className="p-5 bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl text-white shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div>
            <div className="flex items-center space-x-2 text-amber-200 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Human Review</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">Review Queue</h3>
            <p className="text-xs text-amber-100 mt-0.5">{pendingReviewCount} case(s) pending</p>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-200 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link 
          to="/history" 
          className="p-5 bg-white border border-slate-200 rounded-2xl text-slate-900 shadow-xs hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div>
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <UserCheck className="w-4 h-4" />
              <span>Audit Trail</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-slate-800">Verification Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">Inspect historical sessions</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Recent Verification Activity</h2>
            <p className="text-xs text-slate-500">Live stream of the latest identity verification requests</p>
          </div>
          <Link 
            to="/history" 
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentVerifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No verification sessions recorded yet. Start a verification to view live metrics!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-3.5 pl-5">Session</th>
                  <th className="p-3.5">Document</th>
                  <th className="p-3.5">Biometric Match</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentVerifications.map((v) => {
                  const face = v.face_verification;
                  const sim = face?.similarity;
                  const isReview = v.status === 'manual_review';

                  return (
                    <tr key={v.verification_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-mono font-bold text-slate-900">{v.verification_id}</div>
                        <div className="text-[10px] text-slate-400">{v.processing_time_ms.toFixed(0)} ms latency</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2">
                          {v.document_image_url && (
                            <img 
                              src={getApiUrl(v.document_image_url)} 
                              alt="Doc" 
                              className="w-8 h-8 object-cover rounded-lg border border-slate-200" 
                            />
                          )}
                          {v.selfie_image_url && (
                            <img 
                              src={getApiUrl(v.selfie_image_url)} 
                              alt="Selfie" 
                              className="w-8 h-8 object-cover rounded-lg border border-slate-200" 
                            />
                          )}
                          <span className="font-medium text-slate-700">{v.document_type}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        {sim !== undefined && sim !== null ? (
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800">{(sim * 100).toFixed(1)}%</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              sim >= 0.60 ? 'bg-emerald-100 text-emerald-800' :
                              sim >= 0.40 ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {face?.result || 'SCORE'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No selfie</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {isReview && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                            IN REVIEW
                          </span>
                        )}
                        {v.status === 'manual_approved' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            APPROVED
                          </span>
                        )}
                        {v.status === 'document_detected' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            VERIFIED
                          </span>
                        )}
                        {v.status === 'manual_rejected' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1 text-red-600" />
                            REJECTED
                          </span>
                        )}
                        {v.status === 'failed' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700">
                            <XCircle className="w-3 h-3 mr-1 text-red-600" />
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <Link 
                          to={`/result/${v.verification_id}`}
                          className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          Inspect →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Verification Pipeline Flow Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <GitBranch className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-slate-900">Live AI Verification Pipeline Flow</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Real-time multi-stage neural vision, OCR extraction, anti-spoofing, and biometric verification architecture</p>
          </div>
          <Link 
            to="/pipeline" 
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center"
          >
            Full Architecture View &rarr;
          </Link>
        </div>
        <PipelineVisualizer />
      </div>
    </div>
  );
}

