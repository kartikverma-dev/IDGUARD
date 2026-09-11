import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import type { VerificationResponse } from '../types';
import { 
  History as HistoryIcon, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Check,
  X,
  Trash2
} from 'lucide-react';
import { apiClient, getApiUrl } from '../config/api';

export function History() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'all' | 'review' | 'approved' | 'rejected') || 'all';
  const [currentTab, setCurrentTab] = useState<'all' | 'review' | 'approved' | 'rejected'>(initialTab);

  const [verifications, setVerifications] = useState<VerificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchVerifications = () => {
    setLoading(true);
    apiClient.get('/api/verifications')
      .then(res => {
        setVerifications(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch verifications", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleTabChange = (tab: 'all' | 'review' | 'approved' | 'rejected') => {
    setCurrentTab(tab);
    setSearchParams(tab === 'all' ? {} : { tab });
  };

  const handleReviewDecision = async (id: string, decision: 'approve' | 'reject') => {
    setActionLoadingId(id);
    try {
      await apiClient.post(`/api/verification/${id}/review-decision`, { decision });
      // Refresh list
      fetchVerifications();
    } catch (err) {
      console.error("Failed to submit decision:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Counts
  const reviewCount = verifications.filter(v => v.status === 'manual_review').length;
  const approvedCount = verifications.filter(v => v.status === 'document_detected' || v.status === 'manual_approved').length;
  const rejectedCount = verifications.filter(v => v.status === 'failed' || v.status === 'manual_rejected').length;

  const handleDeleteSingle = async (id: string) => {
    if (!window.confirm(`Are you sure you want to permanently remove verification case '${id}'?`)) {
      return;
    }
    setActionLoadingId(id);
    try {
      await apiClient.delete(`/api/verification/${id}`);
      fetchVerifications();
    } catch (err) {
      console.error("Failed to delete verification case:", err);
      alert("Failed to delete verification case.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClear = async (scope: 'review' | 'all') => {
    const confirmMsg = scope === 'review'
      ? `Are you sure you want to clear all ${reviewCount} pending case(s) from the manual review queue?`
      : `Are you sure you want to permanently purge all ${verifications.length} case(s) from the audit ledger? This cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      await apiClient.post('/api/verifications/clear', { scope });
      fetchVerifications();
    } catch (err) {
      console.error("Failed to clear verifications:", err);
      alert("Failed to clear verifications.");
    } finally {
      setLoading(false);
    }
  };

  // Filtered list
  const filtered = verifications.filter(v => {
    if (currentTab === 'review') return v.status === 'manual_review';
    if (currentTab === 'approved') return v.status === 'document_detected' || v.status === 'manual_approved';
    if (currentTab === 'rejected') return v.status === 'failed' || v.status === 'manual_rejected';
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 border-slate-200">
        <div className="flex items-center space-x-3">
          <HistoryIcon className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Audit Ledger & Manual Review</h1>
            <p className="text-xs text-slate-500">Chronological verification history and active human auditor queue.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchVerifications}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {currentTab === 'review' ? (
            <button
              onClick={() => handleClear('review')}
              disabled={loading || reviewCount === 0}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Clear all cases waiting in the manual review queue"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-700" />
              <span>Clear Review Queue ({reviewCount})</span>
            </button>
          ) : (
            <button
              onClick={() => handleClear('all')}
              disabled={loading || verifications.length === 0}
              className="px-3.5 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Purge all verification records from the ledger"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Ledger</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => handleTabChange('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            currentTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span>All Verifications</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            currentTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {verifications.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('review')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            currentTab === 'review'
              ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400'
              : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>🚨 Manual Review Queue</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            currentTab === 'review' ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-900'
          }`}>
            {reviewCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('approved')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            currentTab === 'approved'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approved</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            currentTab === 'approved' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {approvedCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('rejected')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            currentTab === 'rejected'
              ? 'bg-red-700 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Rejected</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            currentTab === 'rejected' ? 'bg-red-800 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {rejectedCount}
          </span>
        </button>
      </div>

      {/* Special Context Banner when in Manual Review Queue */}
      {currentTab === 'review' && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-amber-900">Active Human Auditor Decision Queue</h2>
              <p className="text-xs text-amber-800 mt-0.5">
                Sessions flagged due to low biometric match scores (&lt; 60%), document detection edge cases, or manual auditor escalation. Review evidence and approve or reject.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="text-xs font-bold px-3 py-1 bg-amber-200 text-amber-900 rounded-full whitespace-nowrap">
              {reviewCount} {reviewCount === 1 ? 'Case Pending' : 'Cases Pending'}
            </span>
            {reviewCount > 0 && (
              <button
                onClick={() => handleClear('review')}
                disabled={loading}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors shadow-xs"
                title="Dismiss and clear all pending review cases"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Dismiss All</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium">Loading ledger records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
          <p className="font-semibold text-base text-slate-700">No records found in this queue.</p>
          <p className="text-xs text-slate-400 mt-1">
            {currentTab === 'review' 
              ? 'Great news! All suspicious cases have been reviewed and resolved.'
              : 'Run a verification to record audit sessions.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Session ID</th>
                <th className="p-4">Document</th>
                <th className="p-4">Biometric Similarity</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Latency</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v) => {
                const face = v.face_verification;
                const sim = face?.similarity;
                const isReview = v.status === 'manual_review';

                return (
                  <tr key={v.verification_id} className={`hover:bg-slate-50/80 transition-colors ${
                    isReview ? 'bg-amber-50/40' : ''
                  }`}>
                    <td className="p-4">
                      <div className="font-mono text-xs font-bold text-slate-900">{v.verification_id}</div>
                      <div className="text-[10px] text-slate-400">YOLOv8 + ArcFace</div>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-700">
                      <div className="flex items-center space-x-2">
                        {v.document_image_url && (
                          <img 
                            src={getApiUrl(v.document_image_url)} 
                            alt="Document" 
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-xs flex-shrink-0" 
                          />
                        )}
                        {v.selfie_image_url && (
                          <img 
                            src={getApiUrl(v.selfie_image_url)} 
                            alt="Selfie" 
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-xs flex-shrink-0" 
                          />
                        )}
                        <div>
                          <div className="font-semibold text-slate-800">{v.document_type}</div>
                          <div className="text-[10px] text-slate-400">
                            {v.document_image_url ? 'Media attached' : 'Record only'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {sim !== undefined && sim !== null ? (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-900">{(sim * 100).toFixed(1)}%</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              sim >= 0.60 ? 'bg-emerald-100 text-emerald-800' :
                              sim >= 0.40 ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {face?.result || 'SCORE'}
                            </span>
                          </div>
                          <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full ${sim >= 0.60 ? 'bg-emerald-500' : sim >= 0.40 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.max(5, Math.min(100, sim * 100))}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No selfie attached</span>
                      )}
                    </td>
                    <td className="p-4">
                      {v.status === 'manual_review' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                          IN REVIEW QUEUE
                        </span>
                      )}
                      {v.status === 'manual_approved' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          AUDITOR APPROVED
                        </span>
                      )}
                      {v.status === 'document_detected' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" />
                          VERIFIED
                        </span>
                      )}
                      {v.status === 'manual_rejected' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                          <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
                          AUDITOR REJECTED
                        </span>
                      )}
                      {v.status === 'failed' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                          <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
                          DETECTION FAILED
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{v.processing_time_ms.toFixed(0)} ms</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {isReview && (
                          <>
                            <button
                              onClick={() => handleReviewDecision(v.verification_id, 'approve')}
                              disabled={actionLoadingId === v.verification_id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors disabled:opacity-50"
                              title="Approve verification record"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReviewDecision(v.verification_id, 'reject')}
                              disabled={actionLoadingId === v.verification_id}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors disabled:opacity-50"
                              title="Reject verification record"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                        <Link 
                          to={`/result/${v.verification_id}`} 
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                        >
                          <span>Inspect →</span>
                        </Link>
                        <button
                          onClick={() => handleDeleteSingle(v.verification_id)}
                          disabled={actionLoadingId === v.verification_id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          title={`Remove verification case ${v.verification_id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
