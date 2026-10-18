import React, { useState, useEffect, useRef } from 'react';
import { Waves, Sparkles, Sliders, Activity, Zap, Play, Pause, RotateCcw } from 'lucide-react';
import { playClickSound } from '../../utils/audio';

interface WaveInterferenceLabProps {
  onSendTelemetryToAI: (data: any) => void;
}

export const WaveInterferenceLab: React.FC<WaveInterferenceLabProps> = ({ onSendTelemetryToAI }) => {
  const [subMode, setSubMode] = useState<'interference' | 'standing'>('interference');
  const [isRunning, setIsRunning] = useState(true);

  // Interference parameters
  const [sourceDist, setSourceDist] = useState(160); // pixels distance
  const [wavelength, setWavelength] = useState(30); // pixels
  const [phaseDiff, setPhaseDiff] = useState(0); // degrees (0 = cùng pha, 180 = ngược pha)
  const [frequency, setFrequency] = useState(2); // Hz

  // Standing wave parameters
  const [harmonicN, setHarmonicN] = useState(3); // n = 1, 2, 3, 4, 5, 6
  const [waveSpeed, setWaveSpeed] = useState(120); // m/s
  const [stringLength, setStringLength] = useState(1.2); // meters

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation frame loop
  useEffect(() => {
    let animId: number;
    let t = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      if (isRunning) {
        t += 0.04;
      }

      ctx.clearRect(0, 0, w, h);

      if (subMode === 'interference') {
        renderInterference(ctx, w, h, t);
      } else {
        renderStandingWave(ctx, w, h, t);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [subMode, isRunning, sourceDist, wavelength, phaseDiff, frequency, harmonicN, waveSpeed, stringLength]);

  // 2D Wave Interference Renderer
  const renderInterference = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const s1X = w / 2 - sourceDist / 2;
    const s1Y = h / 2;
    const s2X = w / 2 + sourceDist / 2;
    const s2Y = h / 2;

    const k = (2 * Math.PI) / wavelength;
    const omega = 2 * Math.PI * frequency;
    const dPhi = (phaseDiff * Math.PI) / 180;

    // Fast pixel field rendering using imageData
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    // Render low-res step for 60fps performance
    const step = 4;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const d1 = Math.hypot(x - s1X, y - s1Y);
        const d2 = Math.hypot(x - s2X, y - s2Y);

        const amp1 = Math.cos(k * d1 - omega * t);
        const amp2 = Math.cos(k * d2 - omega * t + dPhi);
        const totalAmp = (amp1 + amp2) / 2; // -1 to 1

        // Color mapping: Cyan for crest (+1), Navy for equilibrium (0), Indigo/Red for trough (-1)
        const val = Math.max(-1, Math.min(1, totalAmp));
        const r = val > 0 ? Math.floor(10 + val * 30) : Math.floor(20 - val * 90);
        const g = val > 0 ? Math.floor(50 + val * 160) : Math.floor(20);
        const b = val > 0 ? Math.floor(100 + val * 155) : Math.floor(80 - val * 120);

        for (let dy = 0; dy < step; dy++) {
          for (let dx = 0; dx < step; dx++) {
            if (x + dx < w && y + dy < h) {
              const idx = ((y + dy) * w + (x + dx)) * 4;
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = 255;
            }
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Draw Sources S1 and S2
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(s1X, s1Y, 7, 0, Math.PI * 2);
    ctx.arc(s2X, s2Y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px JetBrains Mono';
    ctx.fillText('S₁', s1X - 8, s1Y - 12);
    ctx.fillText('S₂', s2X - 8, s2Y - 12);
  };

  // Standing Wave on a String Renderer
  const renderStandingWave = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const midY = h / 2;
    const startX = 60;
    const endX = w - 60;
    const stringW = endX - startX;

    // Clamped fixed ends
    ctx.fillStyle = '#475569';
    ctx.fillRect(startX - 12, midY - 30, 12, 60);
    ctx.fillRect(endX, midY - 30, 12, 60);

    // Equilibrium line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, midY);
    ctx.lineTo(endX, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Standing wave equation: y(x, t) = 2A * sin(n * pi * x / L) * cos(omega * t)
    const ampMax = 65;
    const omega = 3;
    const timeFactor = Math.cos(omega * t);

    // Envelope boundaries (Dải bao cực đại)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let px = 0; px <= stringW; px += 2) {
      const normX = px / stringW;
      const envY = midY - ampMax * Math.sin(harmonicN * Math.PI * normX);
      if (px === 0) ctx.moveTo(startX + px, envY);
      else ctx.lineTo(startX + px, envY);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let px = 0; px <= stringW; px += 2) {
      const normX = px / stringW;
      const envY = midY + ampMax * Math.sin(harmonicN * Math.PI * normX);
      if (px === 0) ctx.moveTo(startX + px, envY);
      else ctx.lineTo(startX + px, envY);
    }
    ctx.stroke();

    // Active Wave String
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let px = 0; px <= stringW; px += 2) {
      const normX = px / stringW;
      const y = midY - ampMax * Math.sin(harmonicN * Math.PI * normX) * timeFactor;
      if (px === 0) ctx.moveTo(startX + px, y);
      else ctx.lineTo(startX + px, y);
    }
    ctx.stroke();

    // Mark Nodes (Nút sóng) and Antinodes (Bụng sóng)
    for (let i = 0; i <= harmonicN; i++) {
      const nodeX = startX + (i / harmonicN) * stringW;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(nodeX, midY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(`Nút ${i}`, nodeX - 12, midY + 18);
    }

    for (let i = 0; i < harmonicN; i++) {
      const antinodeX = startX + ((i + 0.5) / harmonicN) * stringW;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(antinodeX, midY, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#10b981';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(`Bụng ${i + 1}`, antinodeX - 14, midY - 20);
    }
  };

  const handleConsultAI = () => {
    playClickSound();
    const standingLambda = (2 * stringLength) / harmonicN;
    const standingFreq = (harmonicN * waveSpeed) / (2 * stringLength);

    const telemetry =
      subMode === 'interference'
        ? {
            type: 'Giao Thoa Sóng Cơ Học 2D (Wave Interference)',
            sourceDistance: `${sourceDist} px`,
            wavelength: `${wavelength} px`,
            phaseDifference: `${phaseDiff}° (${phaseDiff === 0 ? 'Hai nguồn cùng pha' : phaseDiff === 180 ? 'Hai nguồn ngược pha' : 'Lệch pha'})`,
            frequency: `${frequency} Hz`,
            conditionForMax: 'd2 - d1 = k * λ (Cực đại giao thoa)',
            conditionForMin: 'd2 - d1 = (k + 0.5) * λ (Cực tiểu giao thoa)',
          }
        : {
            type: 'Sóng Dừng Trên Dây Cố Định (Standing Waves on a String)',
            harmonicModeN: `${harmonicN} (Họa âm bậc ${harmonicN})`,
            numberOfAntinodes: harmonicN,
            numberOfNodes: harmonicN + 1,
            stringLength: `${stringLength} m`,
            waveSpeed: `${waveSpeed} m/s`,
            wavelength: `${standingLambda.toFixed(3)} m`,
            frequency: `${standingFreq.toFixed(2)} Hz`,
            condition: 'L = k * λ / 2',
          };

    onSendTelemetryToAI(telemetry);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Simulation Viewport (Cols 8) */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                {subMode === 'interference' ? 'Trường Giao Thoa Sóng 2D' : 'Mô Hình Sóng Dừng Trên Dây'}
              </h2>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setSubMode('interference');
                  playClickSound();
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  subMode === 'interference' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Giao thoa 2 nguồn
              </button>
              <button
                onClick={() => {
                  setSubMode('standing');
                  playClickSound();
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  subMode === 'standing' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sóng dừng
              </button>
            </div>
          </div>

          <div className="relative bg-slate-950 flex justify-center items-center overflow-hidden">
            <canvas ref={canvasRef} width={740} height={360} className="w-full max-w-full h-auto block" />
          </div>

          <div className="p-3 sm:p-4 bg-white dark:bg-slate-950/90 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsRunning(!isRunning);
                  playClickSound();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isRunning ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? 'Tạm Dừng' : 'Tiếp Tục'}</span>
              </button>
            </div>

            <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
              {subMode === 'interference' ? (
                <span>
                  Khoảng vân i = λ·D/a | Độ lệch pha: {phaseDiff}°
                </span>
              ) : (
                <span>
                  Số bụng: <strong className="text-emerald-600 dark:text-emerald-400">{harmonicN}</strong> | Số nút:{' '}
                  <strong className="text-rose-600 dark:text-red-400">{harmonicN + 1}</strong>
                </span>
              )}
            </div>

            <button
              onClick={handleConsultAI}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>Hỏi AI Về Sóng & Giao Thoa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel (Cols 4) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 text-xs transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              <span>Tham Số Sóng Cơ Học</span>
            </h3>
          </div>

          {subMode === 'interference' ? (
            <div className="space-y-4">
              {/* Distance d */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Khoảng cách 2 nguồn (S₁S₂):</span>
                  <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{sourceDist} px</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="260"
                  step="10"
                  value={sourceDist}
                  onChange={(e) => setSourceDist(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Wavelength lambda */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Bước sóng (λ):</span>
                  <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{wavelength} px</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="1"
                  value={wavelength}
                  onChange={(e) => setWavelength(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Phase Difference */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">Độ lệch pha hai nguồn (Δφ):</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => {
                      setPhaseDiff(0);
                      playClickSound();
                    }}
                    className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      phaseDiff === 0 ? 'bg-blue-50 dark:bg-cyan-600/20 border-blue-500 text-blue-600 dark:text-cyan-200 font-semibold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Cùng pha (0°)
                  </button>
                  <button
                    onClick={() => {
                      setPhaseDiff(180);
                      playClickSound();
                    }}
                    className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      phaseDiff === 180 ? 'bg-blue-50 dark:bg-cyan-600/20 border-blue-500 text-blue-600 dark:text-cyan-200 font-semibold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Ngược pha (180°)
                  </button>
                  <button
                    onClick={() => {
                      setPhaseDiff(90);
                      playClickSound();
                    }}
                    className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      phaseDiff === 90 ? 'bg-blue-50 dark:bg-cyan-600/20 border-blue-500 text-blue-600 dark:text-cyan-200 font-semibold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Vuông pha (90°)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Harmonic n */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Bậc họa âm (Số bó sóng n):</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{harmonicN}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={harmonicN}
                  onChange={(e) => setHarmonicN(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Wave Speed */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Tốc độ truyền sóng (v):</span>
                  <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{waveSpeed} m/s</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="240"
                  step="10"
                  value={waveSpeed}
                  onChange={(e) => setWaveSpeed(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* String Length */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Chiều dài sợi dây (L):</span>
                  <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{stringLength.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={stringLength}
                  onChange={(e) => setStringLength(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
