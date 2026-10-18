import React, { useState, useRef, useEffect } from 'react';
import { Sun, Sparkles, Sliders, Zap, Eye, RotateCcw } from 'lucide-react';
import { playClickSound, playLaserSound } from '../../utils/audio';

interface OpticsLabProps {
  onSendTelemetryToAI: (data: any) => void;
}

export const OpticsLab: React.FC<OpticsLabProps> = ({ onSendTelemetryToAI }) => {
  const [subMode, setSubMode] = useState<'refraction' | 'lens'>('refraction');

  // Refraction Parameters
  const [incidentAngle, setIncidentAngle] = useState(45); // degrees
  const [medium1Name, setMedium1Name] = useState('Thủy tinh');
  const [n1, setN1] = useState(1.5);
  const [medium2Name, setMedium2Name] = useState('Không khí');
  const [n2, setN2] = useState(1.0);

  // Lens Parameters
  const [lensType, setLensType] = useState<'converging' | 'diverging'>('converging');
  const [focalLength, setFocalLength] = useState(25); // cm
  const [objectDist, setObjectDist] = useState(50); // cm
  const [objectHeight, setObjectHeight] = useState(15); // cm

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Media presets
  const mediaList = [
    { name: 'Không khí (Air)', n: 1.0 },
    { name: 'Nước (Water)', n: 1.33 },
    { name: 'Dầu thực vật (Oil)', n: 1.47 },
    { name: 'Thủy tinh (Glass)', n: 1.5 },
    { name: 'Kim cương (Diamond)', n: 2.42 },
  ];

  // Refraction calculations
  const radI = (incidentAngle * Math.PI) / 180;
  const sinR = (n1 / n2) * Math.sin(radI);
  const isTIR = sinR > 1.0; // Total internal reflection
  const refractedAngle = isTIR ? null : (Math.asin(sinR) * 180) / Math.PI;
  const criticalAngle = n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null;

  // Lens calculations
  // 1/f = 1/d + 1/d' => d' = d*f / (d - f)
  const actualF = lensType === 'converging' ? focalLength : -focalLength;
  const imageDist = (objectDist * actualF) / (objectDist - actualF);
  const magnification = -imageDist / objectDist;
  const imageHeight = objectHeight * magnification;
  const isRealImage = imageDist > 0;

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (subMode === 'refraction') {
      renderRefractionCanvas(ctx, w, h);
    } else {
      renderLensCanvas(ctx, w, h);
    }
  }, [subMode, incidentAngle, n1, n2, lensType, focalLength, objectDist, objectHeight, isTIR, refractedAngle]);

  const renderRefractionCanvas = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const midY = h / 2;
    const midX = w / 2;

    // Top medium background (Medium 1)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, midY);

    // Bottom medium background (Medium 2) with slight tint based on index
    const blueAlpha = Math.min(0.4, (n2 - 1) * 0.25);
    ctx.fillStyle = `rgba(30, 58, 138, ${0.15 + blueAlpha})`;
    ctx.fillRect(0, midY, w, midY);

    // Interface boundary line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    // Normal line (Pháp tuyến)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(midX, 20);
    ctx.lineTo(midX, h - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Protractor markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(midX, midY, 90, 0, Math.PI * 2);
    ctx.stroke();

    // Labels for mediums
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`Môi trường 1: ${medium1Name} (n₁ = ${n1})`, 20, 30);
    ctx.fillText(`Môi trường 2: ${medium2Name} (n₂ = ${n2})`, 20, midY + 30);

    // Incident Ray (Tia tới màu đỏ laser hoặc xanh)
    const rayLength = 220;
    const incRad = (incidentAngle * Math.PI) / 180;
    const startX = midX - rayLength * Math.sin(incRad);
    const startY = midY - rayLength * Math.cos(incRad);

    // Laser glow
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(midX, midY);
    ctx.stroke();

    // Laser emitter box
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(startX, startY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Reflected Ray (Tia phản xạ)
    const reflX = midX + rayLength * Math.sin(incRad);
    const reflY = midY - rayLength * Math.cos(incRad);

    const reflIntensity = isTIR ? 1.0 : 0.35;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = isTIR ? 14 : 4;
    ctx.strokeStyle = `rgba(239, 68, 68, ${reflIntensity})`;
    ctx.lineWidth = isTIR ? 3.5 : 2;
    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(reflX, reflY);
    ctx.stroke();

    // Refracted Ray (Tia khúc xạ) if not TIR
    if (!isTIR && refractedAngle !== null) {
      const refrRad = (refractedAngle * Math.PI) / 180;
      const refrX = midX + rayLength * Math.sin(refrRad);
      const refrY = midY + rayLength * Math.cos(refrRad);

      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(refrX, refrY);
      ctx.stroke();

      // Angle arc for r
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(midX, midY, 40, Math.PI / 2, Math.PI / 2 - refrRad, true);
      ctx.stroke();
      ctx.fillStyle = '#06b6d4';
      ctx.font = '11px JetBrains Mono';
      ctx.fillText(`r = ${refractedAngle.toFixed(1)}°`, midX + 10, midY + 55);
    }

    ctx.shadowBlur = 0;

    // Angle arc for i
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(midX, midY, 45, -Math.PI / 2, -Math.PI / 2 + incRad);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = '11px JetBrains Mono';
    ctx.fillText(`i = ${incidentAngle}°`, midX - 55, midY - 25);
  };

  const renderLensCanvas = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const midX = w / 2;
    const midY = h / 2;
    const scale = 5; // pixels per cm

    // Optical Axis (Trục chính)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, midY);
    ctx.lineTo(w - 20, midY);
    ctx.stroke();

    // Lens Center line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(midX, 30);
    ctx.lineTo(midX, h - 30);
    ctx.stroke();

    // Lens arrows (Convex > < or Concave < >)
    ctx.fillStyle = '#38bdf8';
    if (lensType === 'converging') {
      drawLensArrow(ctx, midX, 30, true);
      drawLensArrow(ctx, midX, h - 30, false);
    } else {
      drawLensArrow(ctx, midX, 30, false);
      drawLensArrow(ctx, midX, h - 30, true);
    }

    // Focal Points F and F'
    const fPx = focalLength * scale;
    const fLeftX = midX - fPx;
    const fRightX = midX + fPx;

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(fLeftX, midY, 4, 0, Math.PI * 2);
    ctx.arc(fRightX, midY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '12px JetBrains Mono';
    ctx.fillText(lensType === 'converging' ? 'F' : "F'", fLeftX - 6, midY + 18);
    ctx.fillText(lensType === 'converging' ? "F'" : 'F', fRightX - 6, midY + 18);
    ctx.fillText('O', midX + 6, midY + 18);

    // Object Arrow AB
    const objPx = objectDist * scale;
    const objX = midX - objPx;
    const objHPx = objectHeight * scale;
    const objTopY = midY - objHPx;

    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = '#3b82f6';
    ctx.lineWidth = 3;
    drawArrowVector(ctx, objX, midY, objX, objTopY, 'Vật AB');

    // Image Arrow A'B'
    if (Math.abs(objectDist - actualF) > 0.5) {
      const imgPx = imageDist * scale;
      const imgX = midX + imgPx;
      const imgHPx = imageHeight * scale;
      const imgTopY = midY - imgHPx;

      ctx.strokeStyle = isRealImage ? '#10b981' : '#f43f5e';
      ctx.fillStyle = isRealImage ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 3;
      if (!isRealImage) ctx.setLineDash([4, 4]);
      drawArrowVector(ctx, imgX, midY, imgX, imgTopY, isRealImage ? "Ảnh A'B' (Thật)" : "Ảnh A'B' (Ảo)");
      ctx.setLineDash([]);

      // Ray 1: Parallel to axis, refracts through F'
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(objX, objTopY);
      ctx.lineTo(midX, objTopY);
      ctx.stroke();

      if (lensType === 'converging') {
        ctx.beginPath();
        ctx.moveTo(midX, objTopY);
        ctx.lineTo(w - 20, objTopY + ((w - 20 - midX) * (midY - objTopY)) / fPx);
        ctx.stroke();
      }

      // Ray 2: Through optical center O straight
      ctx.strokeStyle = '#ec4899';
      ctx.beginPath();
      ctx.moveTo(objX, objTopY);
      ctx.lineTo(midX, midY);
      ctx.lineTo(w - 20, midY + ((w - 20 - midX) * (midY - objTopY)) / objPx);
      ctx.stroke();
    }
  };

  const drawLensArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, pointingUp: boolean) => {
    const size = 10;
    const dy = pointingUp ? -size : size;
    ctx.beginPath();
    ctx.moveTo(x - size, y - dy);
    ctx.lineTo(x, y);
    ctx.lineTo(x + size, y - dy);
    ctx.stroke();
  };

  const drawArrowVector = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string
  ) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const headLen = 8;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.font = '11px JetBrains Mono';
    ctx.fillText(label, x2 - 20, y2 - 8);
  };

  const handleConsultAI = () => {
    playClickSound();
    const telemetry =
      subMode === 'refraction'
        ? {
            type: 'Khúc xạ Ánh sáng & Phản xạ Toàn phần (Snell-Descartes Law)',
            medium1: `${medium1Name} (n1 = ${n1})`,
            medium2: `${medium2Name} (n2 = ${n2})`,
            incidentAngle: `${incidentAngle}°`,
            refractedAngle: refractedAngle !== null ? `${refractedAngle.toFixed(2)}°` : 'Không có (Phản xạ toàn phần)',
            isTotalInternalReflection: isTIR,
            criticalAngle: criticalAngle !== null ? `${criticalAngle.toFixed(2)}°` : 'Không có (n1 <= n2)',
          }
        : {
            type: 'Thấu Kính Mỏng (Thin Lens Geometric Optics)',
            lensType: lensType === 'converging' ? 'Thấu kính Hội tụ' : 'Thấu kính Phân kỳ',
            focalLength: `${focalLength} cm`,
            objectDistance: `${objectDist} cm`,
            objectHeight: `${objectHeight} cm`,
            imageDistance: `${imageDist.toFixed(2)} cm`,
            magnification: `${magnification.toFixed(2)}`,
            imageNature: isRealImage ? 'Ảnh thật (Real)' : 'Ảnh ảo (Virtual)',
            imageOrientation: magnification > 0 ? 'Cùng chiều' : 'Ngược chiều',
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
              <Sun className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                {subMode === 'refraction' ? 'Băng Quang Học: Khúc Xạ & Phản Xạ Toàn Phần' : 'Thấu Kính Hình Học & Tạo Ảnh'}
              </h2>
            </div>

            {/* SubMode selector */}
            <div className="flex items-center gap-2">
              {subMode === 'refraction' && isTIR && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/40 animate-pulse flex items-center gap-1">
                  <Zap className="w-3 h-3 text-red-400" />
                  <span>PHẢN XẠ TOÀN PHẦN</span>
                </span>
              )}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setSubMode('refraction');
                    playClickSound();
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    subMode === 'refraction' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Khúc xạ Snell
                </button>
                <button
                  onClick={() => {
                    setSubMode('lens');
                    playClickSound();
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    subMode === 'lens' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Thấu kính mỏng
                </button>
              </div>
            </div>
          </div>

          <div className="relative bg-slate-950 flex justify-center items-center overflow-hidden">
            <canvas ref={canvasRef} width={740} height={380} className="w-full max-w-full h-auto block" />
          </div>

          {/* Action Bar */}
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-950/90 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-mono text-slate-700 dark:text-slate-300 space-x-3">
              {subMode === 'refraction' ? (
                <>
                  <span>Góc tới i: <strong className="text-rose-600 dark:text-red-400">{incidentAngle}°</strong></span>
                  <span>Góc khúc xạ r: <strong className="text-blue-600 dark:text-cyan-400">{isTIR ? 'Không có' : `${refractedAngle?.toFixed(1)}°`}</strong></span>
                  {criticalAngle && (
                    <span>Góc giới hạn: <strong className="text-amber-600 dark:text-amber-400">{criticalAngle.toFixed(1)}°</strong></span>
                  )}
                </>
              ) : (
                <>
                  <span>Khoảng cách ảnh d': <strong className="text-emerald-600 dark:text-emerald-400">{imageDist.toFixed(1)} cm</strong></span>
                  <span>Độ phóng đại k: <strong className="text-amber-600 dark:text-amber-400">{magnification.toFixed(2)}</strong></span>
                  <span>Bản chất: <strong className={isRealImage ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{isRealImage ? 'Ảnh Thật' : 'Ảnh Ảo'}</strong></span>
                </>
              )}
            </div>

            <button
              onClick={handleConsultAI}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>Hỏi AI Về Hiện Tượng</span>
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
              <span>Thiết Lập Quang Học</span>
            </h3>
          </div>

          {subMode === 'refraction' ? (
            <div className="space-y-4">
              {/* Incident Angle Slider */}
              <div>
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Góc tới (i):</span>
                  <span className="font-mono text-red-400">{incidentAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="89"
                  step="1"
                  value={incidentAngle}
                  onChange={(e) => {
                    setIncidentAngle(parseInt(e.target.value, 10));
                    playLaserSound();
                  }}
                  className="w-full accent-red-500 cursor-pointer"
                />
              </div>

              {/* Medium 1 Select */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Môi trường tới 1 (n₁ = {n1}):
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {mediaList.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => {
                        setMedium1Name(m.name);
                        setN1(m.n);
                        playClickSound();
                      }}
                      className={`p-2 rounded-xl text-left border cursor-pointer transition-all ${
                        n1 === m.n ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-200 font-semibold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-semibold text-[11px] truncate">{m.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">n = {m.n}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Medium 2 Select */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Môi trường khúc xạ 2 (n₂ = {n2}):
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {mediaList.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => {
                        setMedium2Name(m.name);
                        setN2(m.n);
                        playClickSound();
                      }}
                      className={`p-2 rounded-xl text-left border cursor-pointer transition-all ${
                        n2 === m.n ? 'bg-blue-50 dark:bg-cyan-600/20 border-blue-500 text-blue-600 dark:text-cyan-200 font-semibold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-semibold text-[11px] truncate">{m.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">n = {m.n}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theory box */}
              <div className="p-3 bg-blue-50/60 dark:bg-slate-950/80 rounded-xl border border-blue-200/80 dark:border-blue-900/40 text-[11px] font-mono text-slate-700 dark:text-slate-300 space-y-1">
                <div className="text-blue-600 dark:text-cyan-400 font-bold font-sans">Định luật Snell - Descartes:</div>
                <div>n₁ · sin(i) = n₂ · sin(r)</div>
                <div>sin(i_gh) = n₂ / n₁ (khi n₁ &gt; n₂)</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Lens Type */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">Loại thấu kính:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setLensType('converging');
                      playClickSound();
                    }}
                    className={`p-2.5 rounded-xl border font-semibold cursor-pointer transition-all ${
                      lensType === 'converging'
                        ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-200'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Hội tụ (Convex)
                  </button>
                  <button
                    onClick={() => {
                      setLensType('diverging');
                      playClickSound();
                    }}
                    className={`p-2.5 rounded-xl border font-semibold cursor-pointer transition-all ${
                      lensType === 'diverging'
                        ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-200'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Phân kỳ (Concave)
                  </button>
                </div>
              </div>

              {/* Focal Length f */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Tiêu cự (|f|):</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{focalLength} cm</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="40"
                  step="1"
                  value={focalLength}
                  onChange={(e) => setFocalLength(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Object Distance d */}
              <div>
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Khoảng cách vật (d):</span>
                  <span className="font-mono text-blue-400">{objectDist} cm</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="70"
                  step="1"
                  value={objectDist}
                  onChange={(e) => setObjectDist(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Formula box */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-blue-900/40 text-[11px] font-mono text-slate-300 space-y-1">
                <div className="text-blue-400 font-bold font-sans">Công thức thấu kính mỏng:</div>
                <div>1/f = 1/d + 1/d'</div>
                <div>k = -d' / d = A'B' / AB</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
