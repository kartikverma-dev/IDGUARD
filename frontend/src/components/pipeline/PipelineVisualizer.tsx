import { useState } from 'react';
import { 
  Camera, 
  Scan, 
  FileText, 
  ShieldAlert, 
  UserCheck, 
  ShieldCheck, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Cpu, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  Activity
} from 'lucide-react';

export interface PipelineStage {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  icon: any;
  color: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  techStack: string;
  latency: string;
  description: string;
  input: string;
  output: string;
  algorithm: string;
  privacy: string;
  simulatedData: string;
}

const STAGES: PipelineStage[] = [
  {
    id: 1,
    title: 'Input Ingestion & Live Capture',
    subtitle: 'Dual Stream Acquisition',
    category: 'Ingestion Layer',
    icon: Camera,
    color: 'text-blue-600',
    borderColor: 'border-blue-500',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    techStack: 'HTML5 WebRTC + MIME Gate',
    latency: '< 5 ms',
    description: 'Acquires high-resolution document photo and real-time live webcam selfie. Validates MIME headers, image dimensions, and enforces a 15MB file size boundary in memory.',
    input: 'Multipart image upload (ID card) + WebRTC live video frame (JPEG)',
    output: 'Validated binary byte-buffer streams in server RAM',
    algorithm: 'Header sanitization, binary buffer validation, memory-only session isolation',
    privacy: 'Zero temporary disk persistence before authorization. Files held only in ephemeral RAM.',
    simulatedData: 'Uploaded: aadhaar_card.jpg (2.1 MB) | Captured: live_selfie.jpg (720p 60fps)'
  },
  {
    id: 2,
    title: 'YOLOv8 Field Localization',
    subtitle: 'Deep ROI Object Detection',
    category: 'Computer Vision',
    icon: Scan,
    color: 'text-indigo-600',
    borderColor: 'border-indigo-500',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    techStack: 'Ultralytics YOLOv8 PyTorch',
    latency: '~90 - 140 ms',
    description: 'Custom-trained deep convolutional neural network locates the ID card orientation and segments 5 critical Field Regions of Interest (ROIs) with high spatial confidence.',
    input: 'Full document image (RGB 640x640 normalized tensor)',
    output: 'Bounding box coordinates (x1, y1, x2, y2) and cropped tensors for 5 detected fields',
    algorithm: 'YOLOv8 multi-scale anchorless feature pyramid network (FPN + PAN)',
    privacy: 'Localized crops isolate only relevant text fields; non-essential visual details discarded.',
    simulatedData: 'Detected: Aadhaar_Number (0.96), Name (0.94), DOB (0.92), Gender (0.95), Face (0.97)'
  },
  {
    id: 3,
    title: 'PaddleOCR & UIDAI Masking',
    subtitle: 'Text Extraction & Redaction',
    category: 'Optical Recognition',
    icon: FileText,
    color: 'text-amber-600',
    borderColor: 'border-amber-500',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    techStack: 'PaddleOCR DBNet + SVTR',
    latency: '~250 - 380 ms',
    description: 'High-accuracy optical character recognition pipeline detects and parses alphanumeric text characters across multiple scripts, followed by real-time regulatory Aadhaar number masking.',
    input: 'Cropped ROI image tensors for Name, DOB, Gender, and Aadhaar number',
    output: 'Structured key-value demographic dictionary with first 8 digits masked',
    algorithm: 'Differentiable Binarization (DBNet) text detection + MobileNetV3 / SVTR recognition',
    privacy: 'Strict Section 29 compliance: First 8 Aadhaar digits are masked into "XXXX XXXX 1234" before any ledger logging.',
    simulatedData: 'Name: "SURESH KUMAR" | DOB: "12/04/1998" | Aadhaar: "XXXX XXXX 8912"'
  },
  {
    id: 4,
    title: 'Passive Anti-Spoofing (PAD)',
    subtitle: 'Frequency & Texture Liveness',
    category: 'Biometric Security',
    icon: ShieldAlert,
    color: 'text-cyan-600',
    borderColor: 'border-cyan-500',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-700',
    techStack: '2D FFT + Laplacian + YCrCb',
    latency: '< 10 ms (CPU)',
    description: 'Multi-factor anti-spoofing engine analyzes the live selfie for high-frequency screen Moire interference patterns, print texture blurring, specular backlight glare, and chrominance entropy.',
    input: 'Live selfie image tensor (OpenCV BGR + YCrCb representation)',
    output: 'Liveness decision: "LIVE" vs "SPOOF_SUSPECTED" with 4 diagnostic sub-scores',
    algorithm: '2D Fast Fourier Transform (FFT) high-pass filter + Laplacian variance σ² + Chrominance histogram entropy',
    privacy: 'Executed entirely in-memory on CPU without cloud transmission of biometric vectors.',
    simulatedData: 'Sharpness: 362.4 (Pass) | Moire Ratio: 0.04 (Pass) | Glare: 0.008 (Pass) → LIVE'
  },
  {
    id: 5,
    title: '1:1 ArcFace Biometric Match',
    subtitle: 'Deep Cosine Verification',
    category: 'Deep Biometrics',
    icon: UserCheck,
    color: 'text-emerald-600',
    borderColor: 'border-emerald-500',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    techStack: 'ArcFace ResNet-50 / InsightFace',
    latency: '~60 - 90 ms',
    description: 'Extracts 512-dimensional normalized biometric feature embeddings from the cropped document photo and live selfie, computing the angular cosine similarity metric.',
    input: 'Aligned face crop from ID card + Aligned face crop from live webcam selfie',
    output: 'Cosine similarity score (0.0 to 1.0) and 1:1 match classification',
    algorithm: 'Additive Angular Margin Loss (ArcFace) ResNet-50 embedding distance: cos(θ) = (u · v) / (||u|| ||v||)',
    privacy: 'Biometric embeddings are ephemeral; raw vector weights are purged after similarity computation.',
    simulatedData: 'ArcFace Cosine Similarity: 0.868 (Threshold >= 0.70) → 1:1 MATCH CONFIRMED'
  },
  {
    id: 6,
    title: 'Risk Engine & Audit Ledger',
    subtitle: 'Multi-Signal Verification Ledger',
    category: 'Governance & Audit',
    icon: ShieldCheck,
    color: 'text-purple-600',
    borderColor: 'border-purple-500',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    techStack: 'Weighted Risk Engine + SHA-256',
    latency: '< 15 ms',
    description: 'Synthesizes OCR confidence, PAD anti-spoofing flags, and face similarity. Emits an automated VERIFIED status, routes ambiguous cases to the Manual Review Queue, and seals the audit record.',
    input: 'Combined outputs from YOLOv8, PaddleOCR, PAD Liveness, and ArcFace modules',
    output: 'Verification verdict ("document_detected" / "manual_review"), SHA-256 hash, and printable audit certificate',
    algorithm: 'Deterministic multi-signal decision matrix with automated threshold escalations',
    privacy: 'Permanent ledger stores strictly masked demographic records and cryptographic session signatures.',
    simulatedData: 'Verdict: VERIFIED_APPROVED | ID: VER-2026-B812 | Integrity: SHA-256 Sealed'
  }
];

export function PipelineVisualizer({ isCompact: _isCompact = false }: { isCompact?: boolean }) {
  const [selectedStage, setSelectedStage] = useState<PipelineStage>(STAGES[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSimStage, setActiveSimStage] = useState<number | null>(null);

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setActiveSimStage(1);
    setSelectedStage(STAGES[0]);

    const stepDelay = 800; // ms per stage in demo

    STAGES.forEach((stage, idx) => {
      setTimeout(() => {
        setActiveSimStage(stage.id);
        setSelectedStage(stage);
        if (idx === STAGES.length - 1) {
          setTimeout(() => {
            setIsSimulating(false);
          }, 1200);
        }
      }, idx * stepDelay);
    });
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setActiveSimStage(null);
    setSelectedStage(STAGES[0]);
  };

  return (
    <div className="space-y-6">
      {/* Simulation Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold shadow">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm tracking-wide text-white">IDGUARD End-to-End AI Verification Pipeline</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                v2.0 Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              6-stage asynchronous computer vision, neural OCR, passive anti-spoofing, and biometric verification pipeline.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={runSimulation}
            disabled={isSimulating}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            {isSimulating ? (
              <>
                <Activity className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Simulating Stage {activeSimStage}/6...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                Run Pipeline Simulation
              </>
            )}
          </button>
          {activeSimStage !== null && (
            <button
              type="button"
              onClick={resetSimulation}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Reset Simulation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Graphical Pipeline Flow Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAGES.map((stage, idx) => {
          const isSelected = selectedStage.id === stage.id;
          const isCurrentlyActiveInSim = activeSimStage === stage.id;
          const isPassedInSim = activeSimStage !== null && activeSimStage > stage.id;
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              onClick={() => setSelectedStage(stage)}
              className={`relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 flex flex-col justify-between border ${
                isSelected 
                  ? 'bg-white shadow-md border-primary-500 ring-2 ring-primary-500/20' 
                  : isCurrentlyActiveInSim
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 animate-pulse'
                  : isPassedInSim
                  ? 'bg-slate-50 border-emerald-300'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Connector Arrow for larger displays */}
              {idx < STAGES.length - 1 && (
                <div className="hidden xl:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-slate-400">
                  <div className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                    <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                    isPassedInSim
                      ? 'bg-emerald-500 text-white'
                      : isCurrentlyActiveInSim
                      ? 'bg-emerald-600 text-white animate-bounce'
                      : isSelected
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isPassedInSim ? <CheckCircle2 className="w-3.5 h-3.5" /> : stage.id}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${stage.badgeBg} ${stage.badgeText}`}>
                    {stage.latency}
                  </span>
                </div>

                <div className="flex items-center space-x-2 mb-1.5">
                  <Icon className={`w-4 h-4 ${stage.color}`} />
                  <span className="text-xs font-bold text-slate-900 truncate" title={stage.title}>
                    {stage.title}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                  {stage.subtitle}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate max-w-[90px]">{stage.techStack}</span>
                <span className="text-primary-600 font-medium">Inspect &rarr;</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Stage Detail Inspector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${selectedStage.badgeBg} ${selectedStage.color}`}>
              {<selectedStage.icon className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                  Stage {selectedStage.id} of 6
                </span>
                <h4 className="text-base font-bold text-slate-900">{selectedStage.title}</h4>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${selectedStage.badgeBg} ${selectedStage.badgeText}`}>
                  {selectedStage.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedStage.subtitle} &bull; Engine: <strong className="text-slate-700">{selectedStage.techStack}</strong> &bull; Latency: <strong className="text-slate-700">{selectedStage.latency}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Fully Operational
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Description and Architecture */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Module Functionality & Design
              </h5>
              <p className="text-sm text-slate-700 leading-relaxed">
                {selectedStage.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 mb-1">
                  <ArrowRight className="w-3.5 h-3.5 text-primary-600" />
                  <span>Input Ingestion</span>
                </div>
                <p className="text-xs text-slate-600 leading-normal">
                  {selectedStage.input}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Output Emission</span>
                </div>
                <p className="text-xs text-slate-600 leading-normal">
                  {selectedStage.output}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-primary-50/50 border border-primary-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-primary-900 mb-1">
                <Cpu className="w-4 h-4 text-primary-600" />
                <span>Underlying Mathematical & Algorithmic Formulation</span>
              </div>
              <p className="text-xs text-primary-800 leading-relaxed font-mono">
                {selectedStage.algorithm}
              </p>
            </div>
          </div>

          {/* Privacy Guarantees & Live Simulated Output */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-900 mb-1">
                <Lock className="w-4 h-4 text-amber-700" />
                <span>Privacy & Regulatory Compliance</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {selectedStage.privacy}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-white shadow-inner font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 pb-2 mb-2 border-b border-slate-800 text-[11px]">
                <span className="flex items-center">
                  <Sparkles className="w-3 h-3 mr-1 text-emerald-400" /> Live Telemetry Output
                </span>
                <span className="text-emerald-400">200 OK</span>
              </div>
              <p className="text-slate-300 leading-relaxed break-all">
                {selectedStage.simulatedData}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
