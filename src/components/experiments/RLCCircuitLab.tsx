import React, { useState, useEffect, useRef } from 'react';
import { Zap, Activity, Sliders, Sparkles, Gauge, RefreshCw } from 'lucide-react';
import { playClickSound } from '../../utils/audio';

interface RLCCircuitLabProps {
  onSendTelemetryToAI: (data: any) => void;
}

export const RLCCircuitLab: React.FC<RLCCircuitLabProps> = ({ onSendTelemetryToAI }) => {
  const [R, setR] = useState(40); // Ohms
  const [L, setL] = useState(80); // mH (0.08 H)
  const [C, setC] = useState(25); // uF (25e-6 F)
  const [freq, setFreq] = useState(112); // Hz
  const [voltageU0, setVoltageU0] = useState(100); // Volts

  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const phasorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const resonanceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Electrical computations
  const L_H = L * 1e-3;
  const C_F = C * 1e-6;
  const omega = 2 * Math.PI * freq;
  const ZL = omega * L_H;
  const ZC = 1 / (omega * C_F);
  const Z = Math.sqrt(R * R + (ZL - ZC) * (ZL - ZC));
  const I0 = voltageU0 / Z;
  const phi = Math.atan2(ZL - ZC, R); // radians: phase of u relative to i (u = U0 cos(wt), i = I0 cos(wt - phi))
  const cosPhi = R / Z;
  const resFreq = 1 / (2 * Math.PI * Math.sqrt(L_H * C_F));
  const isResonant = Math.abs(freq - resFreq) < 2;

  // Jump to resonance
  const handleSnapResonance = () => {
    playClickSound();
    setFreq(Math.round(resFreq));
  };

  // Oscilloscope animation loop
  useEffect(() => {
    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.001;
      drawOscilloscope(t);
      drawPhasor();
      drawResonanceCurve();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [R, L, C, freq, voltageU0, Z, I0, phi, resFreq]);

  // Draw Dual-channel Oscilloscope
  const drawOscilloscope = (timeOffset: number) => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Oscilloscope phosphor grid
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Central Axis
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Channel 1: Voltage u(t) (Yellow wave)
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const periodPx = 140;
    const numPoints = w;

    for (let x = 0; x < numPoints; x++) {
      const phase = (x / periodPx) * 2 * Math.PI - timeOffset * omega;
      const uVal = Math.cos(phase);
      const y = h / 2 - uVal * (h * 0.35);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Channel 2: Current i(t) (Cyan wave)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const iScale = Math.min(1.0, I0 / (voltageU0 / Math.max(10, R)));

    for (let x = 0; x < numPoints; x++) {
      const phase = (x / periodPx) * 2 * Math.PI - timeOffset * omega - phi;
      const iVal = Math.cos(phase);
      const y = h / 2 - iVal * (h * 0.35 * iScale);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  // Draw Fresnel Phasor Diagram
  const drawPhasor = () => {
    const canvas = phasorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const originX = 50;
    const originY = h / 2;

    // Grid center
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(originX, 10);
    ctx.lineTo(originX, h - 10);
    ctx.moveTo(10, originY);
    ctx.lineTo(w - 10, originY);
    ctx.stroke();

    // Scale vectors
    const vScale = 1.0;
    const UR = I0 * R * vScale;
    const UL = I0 * ZL * vScale;
    const UC = I0 * ZC * vScale;

    // UR along horizontal (Green)
    drawVector(ctx, originX, originY, originX + UR, originY, '#10b981', 'U⃗R');

    // UL vertically UP (Red)
    drawVector(ctx, originX, originY, originX, originY - UL, '#ef4444', 'U⃗L');

    // UC vertically DOWN (Blue)
    drawVector(ctx, originX, originY, originX, originY + UC, '#3b82f6', 'U⃗C');

    // Total U vector (Yellow)
    const totalX = originX + UR;
    const totalY = originY - (UL - UC);
    drawVector(ctx, originX, originY, totalX, totalY, '#facc15', 'U⃗');
  };

  // Draw Resonance Frequency Peak Curve
  const drawResonanceCurve = () => {
    const canvas = resonanceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const maxF = Math.max(300, resFreq * 2);
    const maxI = voltageU0 / R;

    // Axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(30, 10);
    ctx.lineTo(30, h - 25);
    ctx.lineTo(w - 10, h - 25);
    ctx.stroke();

    // Curve I(f)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let px = 30; px < w - 10; px++) {
      const fVal = ((px - 30) / (w - 40)) * maxF;
      if (fVal <= 1) continue;
      const wVal = 2 * Math.PI * fVal;
      const zLVal = wVal * L_H;
      const zCVal = 1 / (wVal * C_F);
      const zVal = Math.sqrt(R * R + (zLVal - zCVal) * (zLVal - zCVal));
      const iVal = voltageU0 / zVal;

      const py = h - 25 - (iVal / maxI) * (h - 40);
      if (px === 30) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Mark current frequency dot
    const curPx = 30 + (freq / maxF) * (w - 40);
    const curPy = h - 25 - (I0 / maxI) * (h - 40);

    ctx.fillStyle = isResonant ? '#10b981' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(curPx, curPy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Resonant marker line
    const resPx = 30 + (resFreq / maxF) * (w - 40);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(resPx, 10);
    ctx.lineTo(resPx, h - 25);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#10b981';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText(`f₀=${resFreq.toFixed(0)}Hz`, resPx - 20, 18);
  };

  const drawVector = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    label: string
  ) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const headLen = 6;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.font = '10px JetBrains Mono';
    ctx.fillText(label, x2 + 4, y2 - 4);
  };

  const handleConsultAI = () => {
    playClickSound();
    const telemetry = {
      type: 'Mạch R-L-C Xoay Chiều & Hiện Tượng Cộng Hưởng Điện (AC Circuit Resonance)',
      circuitParameters: {
        resistorR: `${R} Ω`,
        inductorL: `${L} mH (${L_H} H)`,
        capacitorC: `${C} µF (${C_F} F)`,
        sourceFrequency: `${freq} Hz`,
        sourceVoltageU0: `${voltageU0} V`,
      },
      calculatedValues: {
        inductiveReactanceZL: `${ZL.toFixed(2)} Ω`,
        capacitiveReactanceZC: `${ZC.toFixed(2)} Ω`,
        totalImpedanceZ: `${Z.toFixed(2)} Ω`,
        peakCurrentI0: `${I0.toFixed(3)} A`,
        phaseShiftPhi: `${((phi * 180) / Math.PI).toFixed(2)}°`,
        powerFactorCosPhi: `${cosPhi.toFixed(3)}`,
        resonantFrequencyF0: `${resFreq.toFixed(2)} Hz`,
        resonanceState: isResonant ? 'Đang xảy ra CỘNG HƯỞNG ĐIỆN (Z = R tối thiểu, I cực đại)' : 'Chưa cộng hưởng',
      },
    };
    onSendTelemetryToAI(telemetry);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* Simulation Viewports (Cols 8) */}
      <div className="lg:col-span-8 space-y-3 sm:space-y-4">
        {/* Dual Oscilloscope */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
          <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase">
                Máy Hiện Sóng Dao Động Điện (Oscilloscope)
              </h2>
            </div>
            {isResonant && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/40 animate-pulse">
                ⚡ CỘNG HƯỞNG ĐIỆN (Z_L = Z_C)
              </span>
            )}
          </div>

          <div className="p-3 sm:p-4 bg-slate-950 flex flex-col items-center">
            <canvas ref={scopeCanvasRef} width={720} height={220} className="w-full max-w-full h-auto block rounded-xl" />
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-yellow-400">
                <span className="w-3 h-1 bg-yellow-400 inline-block rounded" /> u(t) ({voltageU0}V)
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-3 h-1 bg-cyan-400 inline-block rounded" /> i(t) ({I0.toFixed(2)}A)
              </span>
              <span className="text-slate-400">
                Lệch pha φ: <strong className="text-white">{((phi * 180) / Math.PI).toFixed(1)}°</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Dual sub-plots: Fresnel Phasor + Resonance Peak Curve */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-colors">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span>Giản đồ vectơ Fresnel</span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">cosφ = {cosPhi.toFixed(2)}</span>
            </div>
            <canvas ref={phasorCanvasRef} width={340} height={160} className="w-full bg-slate-950 rounded-xl" />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-colors">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span>Đường cong cộng hưởng I(f)</span>
              <button
                onClick={handleSnapResonance}
                className="text-[11px] font-mono text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                Nhảy đến f₀ ({resFreq.toFixed(0)}Hz)
              </button>
            </div>
            <canvas ref={resonanceCanvasRef} width={340} height={160} className="w-full bg-slate-950 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Control Panel (Cols 4) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 text-xs transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              <span>Tham Số Linh Kiện Mạch R-L-C</span>
            </h3>
          </div>

          {/* R */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
              <span>Điện trở (R):</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{R} Ω</span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={R}
              onChange={(e) => setR(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* L */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
              <span>Độ tự cảm cuộn dây (L):</span>
              <span className="font-mono text-rose-600 dark:text-red-400 font-semibold">{L} mH</span>
            </div>
            <input
              type="range"
              min="10"
              max="300"
              step="5"
              value={L}
              onChange={(e) => setL(parseInt(e.target.value, 10))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* C */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
              <span>Điện dung tụ điện (C):</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{C} µF</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="1"
              value={C}
              onChange={(e) => setC(parseInt(e.target.value, 10))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Generator Frequency */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
              <span>Tần số dòng điện (f):</span>
              <span className="font-mono text-amber-600 dark:text-yellow-400 font-semibold">{freq} Hz</span>
            </div>
            <input
              type="range"
              min="20"
              max="300"
              step="1"
              value={freq}
              onChange={(e) => setFreq(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Live readouts */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span>Trở kháng ZL:</span>
              <span className="text-rose-600 dark:text-red-400">{ZL.toFixed(1)} Ω</span>
            </div>
            <div className="flex justify-between">
              <span>Dung kháng ZC:</span>
              <span className="text-blue-600 dark:text-blue-400">{ZC.toFixed(1)} Ω</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Tổng trở Z:</span>
              <span className="text-slate-900 dark:text-white">{Z.toFixed(1)} Ω</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Cường độ cực đại I₀:</span>
              <span className="text-blue-600 dark:text-cyan-400">{I0.toFixed(2)} A</span>
            </div>
          </div>

          <button
            onClick={handleConsultAI}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-cyan-200" />
            <span>Phân Tích Mạch Với Trợ Lý AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
