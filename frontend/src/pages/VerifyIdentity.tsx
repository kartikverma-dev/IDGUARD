import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  UploadCloud, 
  File as FileIcon, 
  AlertCircle, 
  Loader2, 
  UserCheck, 
  X, 
  Camera, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck,
  GitBranch,
  Timer,
  CheckCircle2,
  SunMedium,
  Lock,
  Focus,
  ScanLine
} from 'lucide-react';
import { apiClient, getApiUrl } from '../config/api';
import { PipelineVisualizer } from '../components/pipeline/PipelineVisualizer';

export function VerifyIdentity() {
  const navigate = useNavigate();
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isDocLiveCapture, setIsDocLiveCapture] = useState<boolean>(false);
  const [isSelfieLiveCapture, setIsSelfieLiveCapture] = useState<boolean>(false);
  
  // Document Live Camera states
  const [isDocCameraOpen, setIsDocCameraOpen] = useState(false);
  const [isDocCameraStarting, setIsDocCameraStarting] = useState(false);
  const [docCameraError, setDocCameraError] = useState<string | null>(null);
  const [docCountdown, setDocCountdown] = useState<number | null>(null);
  const [isDocShutterActive, setIsDocShutterActive] = useState(false);

  // Selfie Live Camera states
  const [isSelfieCameraOpen, setIsSelfieCameraOpen] = useState(false);
  const [isSelfieCameraStarting, setIsSelfieCameraStarting] = useState(false);
  const [selfieCameraError, setSelfieCameraError] = useState<string | null>(null);
  const [selfieCountdown, setSelfieCountdown] = useState<number | null>(null);
  const [isSelfieShutterActive, setIsSelfieShutterActive] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  const docInputRef = useRef<HTMLInputElement>(null);
  const docVideoRef = useRef<HTMLVideoElement>(null);
  const docStreamRef = useRef<MediaStream | null>(null);
  const selfieVideoRef = useRef<HTMLVideoElement>(null);
  const selfieStreamRef = useRef<MediaStream | null>(null);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (docStreamRef.current) {
        docStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (selfieStreamRef.current) {
        selfieStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (docPreview) URL.revokeObjectURL(docPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, []);

  // Attach Document stream to video element when camera opens
  useEffect(() => {
    if (isDocCameraOpen && docStreamRef.current && docVideoRef.current) {
      docVideoRef.current.srcObject = docStreamRef.current;
      docVideoRef.current.play().catch((err) => {
        console.warn('Doc video play prevented:', err);
      });
    }
  }, [isDocCameraOpen]);

  // Attach Selfie stream to video element when camera opens
  useEffect(() => {
    if (isSelfieCameraOpen && selfieStreamRef.current && selfieVideoRef.current) {
      selfieVideoRef.current.srcObject = selfieStreamRef.current;
      selfieVideoRef.current.play().catch((err) => {
        console.warn('Selfie video play prevented:', err);
      });
    }
  }, [isSelfieCameraOpen]);

  // ==================== DOCUMENT CAMERA HANDLERS ====================
  const startDocCamera = async () => {
    setDocCameraError(null);
    setIsDocCameraStarting(true);
    stopSelfieCamera(); // stop selfie camera if active

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setDocCameraError('Live camera access is not supported by your browser environment.');
      setIsDocCameraStarting(false);
      return;
    }

    try {
      if (docStreamRef.current) {
        docStreamRef.current.getTracks().forEach((t) => t.stop());
        docStreamRef.current = null;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      }

      docStreamRef.current = stream;
      setIsDocCameraOpen(true);
    } catch (err: any) {
      console.error('Failed to access camera for document:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setDocCameraError('Camera access denied. Please allow camera permissions in your browser address bar.');
      } else {
        setDocCameraError(err.message || 'Unable to open camera feed.');
      }
    } finally {
      setIsDocCameraStarting(false);
    }
  };

  const stopDocCamera = () => {
    setDocCountdown(null);
    setIsDocShutterActive(false);
    if (docStreamRef.current) {
      docStreamRef.current.getTracks().forEach((track) => track.stop());
      docStreamRef.current = null;
    }
    if (docVideoRef.current) {
      docVideoRef.current.srcObject = null;
    }
    setIsDocCameraOpen(false);
  };

  const captureDocPhoto = () => {
    if (!docVideoRef.current) return;
    const video = docVideoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Do NOT mirror horizontally for documents: text reads left-to-right!
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const filename = `live_aadhaar_${Date.now()}.jpg`;
        const file = new File([blob], filename, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        setDocFile(file);
        if (docPreview) URL.revokeObjectURL(docPreview);
        setDocPreview(URL.createObjectURL(file));
        setIsDocLiveCapture(true);
        setError(null);
        stopDocCamera();
      },
      'image/jpeg',
      0.95
    );
  };

  const triggerDocCapture = () => {
    setIsDocShutterActive(true);
    setTimeout(() => {
      setIsDocShutterActive(false);
      captureDocPhoto();
    }, 150);
  };

  const startDocCountdown = () => {
    if (docCountdown !== null) return;
    setDocCountdown(3);
  };

  useEffect(() => {
    if (docCountdown === null) return;
    if (docCountdown > 0) {
      const timer = setTimeout(() => {
        setDocCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (docCountdown === 0) {
      setDocCountdown(null);
      triggerDocCapture();
    }
  }, [docCountdown]);

  // ==================== SELFIE CAMERA HANDLERS ====================
  const startSelfieCamera = async () => {
    setSelfieCameraError(null);
    setIsSelfieCameraStarting(true);
    stopDocCamera(); // stop doc camera if active

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSelfieCameraError('Live camera access is not supported by your browser environment.');
      setIsSelfieCameraStarting(false);
      return;
    }

    try {
      if (selfieStreamRef.current) {
        selfieStreamRef.current.getTracks().forEach((t) => t.stop());
        selfieStreamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      selfieStreamRef.current = stream;
      setIsSelfieCameraOpen(true);
    } catch (err: any) {
      console.error('Failed to access camera for selfie:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setSelfieCameraError('Camera access denied. Please allow camera permissions in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setSelfieCameraError('No webcam device detected on your computer.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setSelfieCameraError('Camera hardware is currently in use by another application.');
      } else {
        setSelfieCameraError(err.message || 'Unable to open camera feed.');
      }
    } finally {
      setIsSelfieCameraStarting(false);
    }
  };

  const stopSelfieCamera = () => {
    setSelfieCountdown(null);
    setIsSelfieShutterActive(false);
    if (selfieStreamRef.current) {
      selfieStreamRef.current.getTracks().forEach((track) => track.stop());
      selfieStreamRef.current = null;
    }
    if (selfieVideoRef.current) {
      selfieVideoRef.current.srcObject = null;
    }
    setIsSelfieCameraOpen(false);
  };

  const captureSelfiePhoto = () => {
    if (!selfieVideoRef.current) return;
    const video = selfieVideoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror horizontally so the captured photo matches the mirror preview shown to user
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const filename = `live_selfie_${Date.now()}.jpg`;
        const file = new File([blob], filename, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        setSelfieFile(file);
        if (selfiePreview) URL.revokeObjectURL(selfiePreview);
        setSelfiePreview(URL.createObjectURL(file));
        setIsSelfieLiveCapture(true);
        setError(null);
        stopSelfieCamera();
      },
      'image/jpeg',
      0.95
    );
  };

  const triggerSelfieCapture = () => {
    setIsSelfieShutterActive(true);
    setTimeout(() => {
      setIsSelfieShutterActive(false);
      captureSelfiePhoto();
    }, 150);
  };

  const startSelfieCountdown = () => {
    if (selfieCountdown !== null) return;
    setSelfieCountdown(3);
  };

  useEffect(() => {
    if (selfieCountdown === null) return;
    if (selfieCountdown > 0) {
      const timer = setTimeout(() => {
        setSelfieCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (selfieCountdown === 0) {
      setSelfieCountdown(null);
      triggerSelfieCapture();
    }
  }, [selfieCountdown]);

  // ==================== DOCUMENT FILE UPLOAD HANDLERS ====================
  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      stopDocCamera();
      const selected = e.target.files[0];
      setDocFile(selected);
      if (docPreview) URL.revokeObjectURL(docPreview);
      setDocPreview(URL.createObjectURL(selected));
      setIsDocLiveCapture(false);
      setError(null);
    }
  };

  const handleRemoveDoc = () => {
    stopDocCamera();
    setDocFile(null);
    if (docPreview) URL.revokeObjectURL(docPreview);
    setDocPreview(null);
    setIsDocLiveCapture(false);
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handleRemoveSelfie = () => {
    stopSelfieCamera();
    setSelfieFile(null);
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    setSelfiePreview(null);
    setIsSelfieLiveCapture(false);
  };

  const handleLoadDemo = async (type: 'match' | 'mismatch') => {
    try {
      setIsLoadingDemo(true);
      setError(null);
      stopDocCamera();
      stopSelfieCamera();

      // Fetch demo document
      const docRes = await fetch(getApiUrl('/api/demo/sample-document'));
      if (!docRes.ok) throw new Error('Demo document asset not reachable');
      const docBlob = await docRes.blob();
      const docF = new File([docBlob], 'sample_aadhaar.jpg', { type: 'image/jpeg' });
      setDocFile(docF);
      if (docPreview) URL.revokeObjectURL(docPreview);
      setDocPreview(URL.createObjectURL(docF));
      setIsDocLiveCapture(false);

      // Fetch demo selfie
      const selfieEndpoint = type === 'match' 
        ? getApiUrl('/api/demo/sample-selfie-match')
        : getApiUrl('/api/demo/sample-selfie-mismatch');
      const selfieRes = await fetch(selfieEndpoint);
      if (!selfieRes.ok) throw new Error('Demo selfie asset not reachable');
      const selfieBlob = await selfieRes.blob();
      const selfieF = new File([selfieBlob], type === 'match' ? 'sample_selfie_match.jpg' : 'sample_selfie_mismatch.jpg', { type: 'image/jpeg' });
      setSelfieFile(selfieF);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
      setSelfiePreview(URL.createObjectURL(selfieF));
      setIsSelfieLiveCapture(false);
    } catch (err: any) {
      setError('Could not load demo sample assets: ' + (err.message || 'Network error'));
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleUpload = async () => {
    if (!docFile || isUploading) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', docFile);
    if (selfieFile) {
      formData.append('selfie', selfieFile);
    }

    try {
      const response = await apiClient.post('/api/verification/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 45000,
      });
      
      const { verification_id } = response.data;
      navigate(`/result/${verification_id}`, { 
        state: { 
          fileUrl: docPreview,
          selfieUrl: selfiePreview 
        } 
      });
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.code === 'ECONNABORTED') {
        setError('Verification request timed out. Please retry with a lighter image.');
      } else {
        setError('Failed to reach verification service. Please ensure the backend is running.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header and Presentation Demo Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-900 text-white rounded uppercase tracking-wider">
              Pipeline v2.0
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 text-green-800 rounded uppercase tracking-wider flex items-center">
              <ShieldCheck className="w-3 h-3 mr-1 text-green-600" />
              Live AI Pipeline + Passive PAD
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">Identity Document & Biometric Verification</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Capture or upload Aadhaar ID card for YOLO field detection and PaddleOCR extraction, with mandatory live webcam selfie capture for 1:1 ArcFace verification & anti-spoofing.
          </p>
        </div>

        {/* Presentation Fast Presets */}
        <div className="flex items-center space-x-2 self-start sm:self-auto bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 px-2 flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" /> Demo Presets:
          </span>
          <button
            type="button"
            onClick={() => handleLoadDemo('match')}
            disabled={isLoadingDemo || isUploading}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            title="Load sample Aadhaar and matching selfie"
          >
            {isLoadingDemo ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Load Match'}
          </button>
          <button
            type="button"
            onClick={() => handleLoadDemo('mismatch')}
            disabled={isLoadingDemo || isUploading}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            title="Load sample Aadhaar and mismatching selfie"
          >
            Load Mismatch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ========================================================= */}
        {/* BOX 1: Identity Document (Live Camera + Upload Option)   */}
        {/* ========================================================= */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center">
              <FileIcon className="w-5 h-5 text-primary-600 mr-2" />
              1. Identity Document <span className="text-red-500 ml-1">*</span>
            </h2>
            <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded flex items-center">
              <ScanLine className="w-3.5 h-3.5 mr-1" /> Live Capture or File
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {docCameraError && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                  <span>{docCameraError}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setDocCameraError(null)}
                  className="text-amber-500 hover:text-amber-700 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isDocCameraOpen ? (
              /* Live Document Camera Stream View */
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center shadow-lg">
                <div className="w-full px-3 py-2 bg-slate-900/90 text-white flex items-center justify-between text-xs border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                    </span>
                    <span className="font-semibold tracking-wide uppercase text-[11px] text-primary-400">Aadhaar Camera Active</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">Align card in rectangle</span>
                </div>

                <div className="relative w-full h-64 bg-black flex items-center justify-center overflow-hidden">
                  <video
                    ref={docVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Shutter flash effect */}
                  {isDocShutterActive && (
                    <div className="absolute inset-0 bg-white/90 z-30 transition-opacity duration-150 pointer-events-none" />
                  )}

                  {/* Card Viewfinder Overlay (ID-1 Aspect Ratio ~ 1.59:1) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                    <div className="relative w-[90%] max-w-[340px] aspect-[1.586/1] border-2 border-dashed border-primary-400/90 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.3)]">
                      {/* Corner alignment brackets */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-primary-400 rounded-tl" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-primary-400 rounded-tr" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-primary-400 rounded-bl" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-primary-400 rounded-br" />

                      {/* Countdown Overlay */}
                      {docCountdown !== null ? (
                        <div className="z-20 bg-slate-900/85 backdrop-blur-md rounded-full w-16 h-16 flex items-center justify-center border-2 border-primary-400 text-white font-extrabold text-3xl shadow-2xl animate-bounce">
                          {docCountdown}
                        </div>
                      ) : (
                        <div className="text-center px-3 py-1 bg-black/70 text-primary-300 rounded-md backdrop-blur-sm border border-primary-500/30">
                          <p className="text-[10px] font-bold uppercase tracking-wider">Aadhaar Card Framing</p>
                          <p className="text-[9px] text-slate-300">Keep edges inside box</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Real-time Guidance Tips Ribbon */}
                <div className="w-full px-3 py-1.5 bg-slate-950 text-[11px] flex items-center justify-around border-t border-slate-800/80">
                  <span className="flex items-center text-primary-400 font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> HD Stream
                  </span>
                  <span className="flex items-center text-slate-300">
                    <Focus className="w-3 h-3 mr-1 text-amber-400" /> Hold Steady
                  </span>
                  <span className="flex items-center text-slate-300">
                    <ShieldCheck className="w-3 h-3 mr-1 text-teal-400" /> Auto-Deskew
                  </span>
                </div>

                {/* Camera Actions Bar */}
                <div className="w-full p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={stopDocCamera}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={startDocCountdown}
                    disabled={docCountdown !== null}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                    title="Start 3-second auto-capture countdown"
                  >
                    <Timer className="w-3.5 h-3.5 text-amber-400" />
                    <span>3s Timer</span>
                  </button>

                  <button
                    type="button"
                    onClick={triggerDocCapture}
                    disabled={docCountdown !== null}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Card Photo</span>
                  </button>
                </div>
              </div>
            ) : docPreview ? (
              /* Document Preview View */
              <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-2 flex flex-col items-center">
                <div className="relative w-full flex justify-center">
                  <img 
                    src={docPreview} 
                    alt="Document preview" 
                    className="max-h-56 object-contain rounded" 
                  />
                  <div className="absolute top-2 left-2">
                    {isDocLiveCapture ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-primary-600 text-white shadow">
                        <Camera className="w-3 h-3 mr-1" /> Live Camera Capture
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-900/80 text-white shadow">
                        <FileIcon className="w-3 h-3 mr-1" /> Uploaded File
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full flex items-center justify-between mt-3 pt-2 border-t border-slate-200">
                  <div className="truncate text-xs text-slate-600 max-w-[170px]">
                    {docFile?.name} ({(docFile ? docFile.size / 1024 / 1024 : 0).toFixed(2)} MB)
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={startDocCamera}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center"
                      type="button"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retake
                    </button>
                    <button 
                      onClick={handleRemoveDoc}
                      className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center"
                      type="button"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* No Document Chosen Yet - Live Camera + File Upload Options */
              <div className="space-y-3">
                {/* Primary Action: Live Document Camera */}
                <button
                  type="button"
                  onClick={startDocCamera}
                  disabled={isDocCameraStarting}
                  className="w-full p-4 rounded-xl border-2 border-primary-500/40 bg-gradient-to-br from-primary-50/70 to-blue-50/40 hover:from-primary-100/70 hover:to-blue-100/50 hover:border-primary-500 flex items-center space-x-4 text-left transition-all group shadow-sm cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center flex-shrink-0 shadow group-hover:scale-105 transition-transform">
                    {isDocCameraStarting ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">Take Live Aadhaar Photo</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-100 text-primary-800">
                        Live Camera
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Capture physical card with guided rectangle & automatic perspective deskew
                    </p>
                  </div>
                </button>

                <div className="flex items-center my-2">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Or Upload File
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Secondary Action: File Upload Dropzone */}
                <div
                  onClick={() => docInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-3.5 flex items-center justify-center space-x-2 text-center hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <UploadCloud className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-700">Choose document image from computer</span>
                </div>
              </div>
            )}

            <input 
              ref={docInputRef}
              type="file" 
              className="hidden" 
              accept="image/*"
              onChange={handleDocChange}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOX 2: Live Facial Selfie (Mandatory Live Camera - File Upload Disabled) */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center">
              <UserCheck className="w-5 h-5 text-emerald-600 mr-2" />
              2. Live Facial Selfie <span className="text-red-500 ml-1">*</span>
            </h2>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Live Camera Only
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {selfieCameraError && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                  <span>{selfieCameraError}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelfieCameraError(null)}
                  className="text-amber-500 hover:text-amber-700 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isSelfieCameraOpen ? (
              /* Live Camera Stream View */
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center shadow-lg">
                <div className="w-full px-3 py-2 bg-slate-900/90 text-white flex items-center justify-between text-xs border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-semibold tracking-wide uppercase text-[11px] text-emerald-400">Live Biometric Stream</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">Position face inside oval</span>
                </div>

                <div className="relative w-full h-64 bg-black flex items-center justify-center overflow-hidden">
                  <video
                    ref={selfieVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />

                  {/* Shutter flash effect */}
                  {isSelfieShutterActive && (
                    <div className="absolute inset-0 bg-white/90 z-30 transition-opacity duration-150 pointer-events-none" />
                  )}

                  {/* Biometric Oval Guide Overlay with Corner Reticles */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-40 h-52 flex items-center justify-center">
                      {/* SVG Precision Oval */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 208" fill="none">
                        <ellipse 
                          cx="80" 
                          cy="104" 
                          rx="70" 
                          ry="94" 
                          stroke="rgba(16, 185, 129, 0.85)" 
                          strokeWidth="2.5" 
                          strokeDasharray="6 6"
                          className="animate-pulse"
                        />
                      </svg>
                      {/* High-tech corner alignment brackets */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />

                      {/* Countdown Overlay */}
                      {selfieCountdown !== null ? (
                        <div className="z-20 bg-slate-900/85 backdrop-blur-md rounded-full w-16 h-16 flex items-center justify-center border-2 border-emerald-400 text-white font-extrabold text-3xl shadow-2xl animate-bounce">
                          {selfieCountdown}
                        </div>
                      ) : (
                        <span className="absolute bottom-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-black/75 text-emerald-300 rounded backdrop-blur-sm border border-emerald-500/30">
                          Align Face
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Real-time Guidance Tips Ribbon */}
                <div className="w-full px-3 py-1.5 bg-slate-950 text-[11px] flex items-center justify-around border-t border-slate-800/80">
                  <span className="flex items-center text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> HD Stream
                  </span>
                  <span className="flex items-center text-slate-300">
                    <SunMedium className="w-3 h-3 mr-1 text-amber-400" /> Good Lighting
                  </span>
                  <span className="flex items-center text-slate-300">
                    <ShieldCheck className="w-3 h-3 mr-1 text-teal-400" /> Passive PAD
                  </span>
                </div>

                {/* Camera Actions Bar */}
                <div className="w-full p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={stopSelfieCamera}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={startSelfieCountdown}
                    disabled={selfieCountdown !== null}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                    title="Start 3-second auto-capture countdown"
                  >
                    <Timer className="w-3.5 h-3.5 text-amber-400" />
                    <span>3s Timer</span>
                  </button>

                  <button
                    type="button"
                    onClick={triggerSelfieCapture}
                    disabled={selfieCountdown !== null}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Live Selfie</span>
                  </button>
                </div>
              </div>
            ) : selfiePreview ? (
              /* Photo Preview View */
              <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-2 flex flex-col items-center">
                <div className="relative">
                  <img 
                    src={selfiePreview} 
                    alt="Selfie preview" 
                    className="max-h-56 object-contain rounded" 
                  />
                  <div className="absolute top-2 left-2">
                    {isSelfieLiveCapture ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-600 text-white shadow">
                        <Camera className="w-3 h-3 mr-1" /> Live Capture
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-900/80 text-white shadow">
                        <FileIcon className="w-3 h-3 mr-1" /> Demo Preset
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full flex items-center justify-between mt-3 pt-2 border-t border-slate-200">
                  <div className="truncate text-xs text-slate-600 max-w-[180px]">
                    {selfieFile?.name} ({(selfieFile ? selfieFile.size / 1024 / 1024 : 0).toFixed(2)} MB)
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={startSelfieCamera}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center"
                      type="button"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retake
                    </button>
                    <button 
                      onClick={handleRemoveSelfie}
                      className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center"
                      type="button"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* No Photo Chosen Yet - Live Webcam ONLY with Security Enforcement Notice */
              <div className="space-y-3">
                {/* Security Policy Banner */}
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
                  <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-950">Anti-Spoofing Policy Enforcement:</span> Static photo file uploads are disabled to prevent deepfakes and presentation replay attacks. Live biometric capture is required for real-time PAD.
                  </div>
                </div>

                {/* Primary Action: Live Camera */}
                <button
                  type="button"
                  onClick={startSelfieCamera}
                  disabled={isSelfieCameraStarting}
                  className="w-full p-4 rounded-xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 hover:from-emerald-100/70 hover:to-teal-100/50 hover:border-emerald-500 flex items-center space-x-4 text-left transition-all group shadow-sm cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow group-hover:scale-105 transition-transform">
                    {isSelfieCameraStarting ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">Take Live Selfie</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Live Webcam Required
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Capture live photo with webcam for real-time PAD anti-spoofing & 1:1 match
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start space-x-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Verification Notice</p>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          <p className="font-medium text-slate-700">Privacy-Aware Processing</p>
          <p>Aadhaar numbers are masked upon OCR extraction. Biometrics are processed in-memory only.</p>
        </div>

        <button
          onClick={handleUpload}
          disabled={!docFile || isUploading}
          className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-xl shadow-sm text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Verification Pipeline...
            </>
          ) : (
            'Run Identity Verification'
          )}
        </button>
      </div>

      {/* Embedded Graphical Pipeline Visualizer Section */}
      <div className="pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold text-slate-900">AI Verification Pipeline Architecture & Flow</h2>
          </div>
          <Link
            to="/pipeline"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center"
          >
            Full Architecture Deep-Dive &rarr;
          </Link>
        </div>
        <PipelineVisualizer isCompact={true} />
      </div>
    </div>
  );
}
