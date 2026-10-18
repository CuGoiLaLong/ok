import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Activity, Gauge, Zap, Sparkles, Sliders, ChevronRight } from 'lucide-react';
import { playClickSound } from '../../utils/audio';

interface PendulumLabProps {
  onSendTelemetryToAI: (data: any) => void;
}

export const PendulumLab: React.FC<PendulumLabProps> = ({ onSendTelemetryToAI }) => {
  // Mode: pendulum (con lắc đơn) or spring (con lắc lò xo)
  const [mode, setMode] = useState<'pendulum' | 'spring'>('pendulum');
  const [isRunning, setIsRunning] = useState(true);
  const [timeScale, setTimeScale] = useState(1); // 0.25, 0.5, 1, 2

  // Pendulum Parameters
  const [length, setLength] = useState(1.5); // meters
  const [mass, setMass] = useState(1.0); // kg
  const [gravity, setGravity] = useState(9.8); // m/s^2
  const [damping, setDamping] = useState(0.05); // friction coefficient
  const [initialAngle, setInitialAngle] = useState(30); // degrees

  // Spring Parameters
  const [springK, setSpringK] = useState(25); // N/m
  const [springMass, setSpringMass] = useState(1.0); // kg
  const [springDamping, setSpringDamping] = useState(0.05);
  const [springInitX, setSpringInitX] = useState(0.4); // meters

  // Simulation state
  const stateRef = useRef({
    theta: (30 * Math.PI) / 180,
    omega: 0,
    springX: 0.4,
    springV: 0,
    time: 0,
    history: [] as Array<{ t: number; val: number; v: number; ke: number; pe: number; te: number }>,
  });

  const [displayMetrics, setDisplayMetrics] = useState({
    period: 0,
    currentVal: 0,
    velocity: 0,
    ke: 0,
    pe: 0,
    totalEnergy: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);

  // Celestial gravity presets
  const gravityPresets = [
    { name: 'Trái Đất', g: 9.8, icon: '🌍' },
    { name: 'Mặt Trăng', g: 1.62, icon: '🌕' },
    { name: 'Sao Hỏa', g: 3.72, icon: '🔴' },
    { name: 'Sao Mộc', g: 24.79, icon: '🪐' },
    { name: 'Chân không Zero-G', g: 0.0, icon: '🌌' },
  ];

  // Reset function
  const handleReset = () => {
    playClickSound();
    stateRef.current.theta = (initialAngle * Math.PI) / 180;
    stateRef.current.omega = 0;
    stateRef.current.springX = springInitX;
    stateRef.current.springV = 0;
    stateRef.current.time = 0;
    stateRef.current.history = [];
  };

  // Switch mode
  const handleModeChange = (newMode: 'pendulum' | 'spring') => {
    setMode(newMode);
    handleReset();
  };

  // Main simulation loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const updateSimulation = (timestamp: number) => {
      const dtReal = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;

      const s = stateRef.current;

      if (isRunning && !isDraggingRef.current) {
        // Multi-substep RK4 / Euler-Cromer for physics stability
        const steps = 4;
        const dt = (dtReal * timeScale) / steps;

        for (let i = 0; i < steps; i++) {
          s.time += dt;

          if (mode === 'pendulum') {
            // Pendulum ODE: d^2(theta)/dt^2 = -(g/L)*sin(theta) - (damping/m)*omega
            const alpha = -(gravity / Math.max(0.2, length)) * Math.sin(s.theta) - (damping / mass) * s.omega;
            s.omega += alpha * dt;
            s.theta += s.omega * dt;
          } else {
            // Spring Mass ODE: d^2(x)/dt^2 = -(k/m)*x - (damping/m)*v + g_effective (if vertical)
            const accel = -(springK / Math.max(0.1, springMass)) * s.springX - (springDamping / springMass) * s.springV;
            s.springV += accel * dt;
            s.springX += s.springV * dt;
          }
        }

        // Energies calculation
        let ke = 0;
        let pe = 0;
        let period = 0;

        if (mode === 'pendulum') {
          const v = s.omega * length;
          ke = 0.5 * mass * v * v;
          pe = mass * gravity * length * (1 - Math.cos(s.theta));
          // small angle approximation + first correction
          period = 2 * Math.PI * Math.sqrt(Math.max(0.1, length) / Math.max(0.1, gravity));
        } else {
          ke = 0.5 * springMass * s.springV * s.springV;
          pe = 0.5 * springK * s.springX * s.springX;
          period = 2 * Math.PI * Math.sqrt(Math.max(0.1, springMass) / Math.max(1, springK));
        }

        const te = ke + pe;

        // Keep last 150 points for real-time wave graph
        s.history.push({
          t: s.time,
          val: mode === 'pendulum' ? (s.theta * 180) / Math.PI : s.springX,
          v: mode === 'pendulum' ? s.omega * length : s.springV,
          ke,
          pe,
          te,
        });
        if (s.history.length > 180) s.history.shift();

        setDisplayMetrics({
          period,
          currentVal: mode === 'pendulum' ? (s.theta * 180) / Math.PI : s.springX,
          velocity: mode === 'pendulum' ? s.omega * length : s.springV,
          ke,
          pe,
          totalEnergy: te,
        });
      }

      // Draw Main Canvas
      renderCanvas();
      renderGraphCanvas();

      animId = requestAnimationFrame(updateSimulation);
    };

    animId = requestAnimationFrame(updateSimulation);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, timeScale, mode, length, mass, gravity, damping, springK, springMass, springDamping]);

  // Canvas drawing
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Subtle coordinate grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const s = stateRef.current;

    if (mode === 'pendulum') {
      const originX = width / 2;
      const originY = 60;
      const pixelLength = length * 120; // scale meters to pixels

      const bobX = originX + pixelLength * Math.sin(s.theta);
      const bobY = originY + pixelLength * Math.cos(s.theta);

      // Pivot Support mount
      ctx.fillStyle = '#334155';
      ctx.fillRect(originX - 60, originY - 12, 120, 12);
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(originX, originY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Dotted equilibrium line
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX, originY + pixelLength + 40);
      ctx.stroke();
      ctx.setLineDash([]);

      // Angular arc
      if (Math.abs(s.theta) > 0.02) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const startA = Math.PI / 2;
        const endA = Math.PI / 2 + s.theta;
        ctx.arc(originX, originY, 50, Math.min(startA, endA), Math.max(startA, endA));
        ctx.stroke();

        // Label theta
        const midA = (startA + endA) / 2;
        ctx.fillStyle = '#38bdf8';
        ctx.font = '12px JetBrains Mono, monospace';
        ctx.fillText(
          `${((s.theta * 180) / Math.PI).toFixed(1)}°`,
          originX + 65 * Math.cos(midA),
          originY + 65 * Math.sin(midA)
        );
      }

      // String (Dây treo)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();

      // Bob (Vật nặng)
      const bobRadius = 14 + mass * 6;
      const gradient = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, bobRadius);
      gradient.addColorStop(0, '#60a5fa');
      gradient.addColorStop(0.7, '#2563eb');
      gradient.addColorStop(1, '#1e3a8a');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vectors: Velocity vector (Cyan) and Gravitational force (Red)
      const v = s.omega * length;
      const vScale = 15;
      const vx = -v * Math.cos(s.theta) * vScale;
      const vy = v * Math.sin(s.theta) * vScale;

      // Draw Velocity Vector
      if (Math.abs(v) > 0.05) {
        drawArrow(ctx, bobX, bobY, bobX + vx, bobY + vy, '#06b6d4', 'v⃗');
      }

      // Draw Gravity Force Vector P = mg
      const gScale = 4;
      const fy = mass * gravity * gScale;
      if (gravity > 0) {
        drawArrow(ctx, bobX, bobY, bobX, bobY + fy, '#f43f5e', 'P⃗');
      }
    } else {
      // Spring simulation drawing
      const originX = width / 2;
      const originY = 50;
      const restLength = 140;
      const pixelX = s.springX * 180; // displacement
      const currentY = originY + restLength + pixelX;

      // Support top ceiling
      ctx.fillStyle = '#334155';
      ctx.fillRect(originX - 70, originY - 14, 140, 14);

      // Spring coil drawing
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(originX, originY);

      const coils = 14;
      const coilLength = currentY - originY - 20;
      const step = coilLength / coils;

      for (let i = 1; i <= coils; i++) {
        const xOffset = i % 2 === 0 ? 18 : -18;
        const yPos = originY + (i - 0.5) * step;
        ctx.lineTo(originX + (i === coils ? 0 : xOffset), yPos);
      }
      ctx.lineTo(originX, currentY - 18);
      ctx.stroke();

      // Block (Vật nặng lò xo)
      const blockSize = 36 + springMass * 10;
      ctx.fillStyle = '#3b82f6';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(originX - blockSize / 2, currentY - 18, blockSize, blockSize, 6);
      ctx.fill();
      ctx.stroke();

      // Equilibrium marker
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(originX - 80, originY + restLength);
      ctx.lineTo(originX + 80, originY + restLength);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('Vị trí cân bằng (x=0)', originX + 90, originY + restLength + 4);

      // Restoring force & velocity vector
      if (Math.abs(s.springV) > 0.05) {
        drawArrow(
          ctx,
          originX,
          currentY + blockSize / 2,
          originX,
          currentY + blockSize / 2 + s.springV * 25,
          '#06b6d4',
          'v⃗'
        );
      }
    }
  };

  // Helper arrow drawer
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    label: string
  ) => {
    const headLen = 8;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText(label, toX + 6, toY - 4);
  };

  // Graph Canvas drawing (Wave / Phase plot)
  const renderGraphCanvas = () => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const history = stateRef.current.history;
    if (history.length < 2) return;

    // Draw Amplitude waveform
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const maxAmp = mode === 'pendulum' ? Math.max(40, initialAngle * 1.2) : 0.6;

    history.forEach((pt, idx) => {
      const x = (idx / (history.length - 1)) * w;
      const normalized = pt.val / maxAmp;
      const y = h / 2 - normalized * (h * 0.4);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Latest value dot
    const last = history[history.length - 1];
    const lastY = h / 2 - (last.val / maxAmp) * (h * 0.4);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(w - 2, lastY, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  // Drag interaction for interactive release
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mode === 'pendulum') {
      const originX = canvas.width / 2;
      const originY = 60;
      const dx = mouseX - originX;
      const dy = mouseY - originY;
      const angle = Math.atan2(dx, dy);
      stateRef.current.theta = angle;
      stateRef.current.omega = 0;
      isDraggingRef.current = true;
    } else {
      const originY = 50;
      const restLength = 140;
      const disp = (mouseY - (originY + restLength)) / 180;
      stateRef.current.springX = Math.max(-0.6, Math.min(0.6, disp));
      stateRef.current.springV = 0;
      isDraggingRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mode === 'pendulum') {
      const originX = canvas.width / 2;
      const originY = 60;
      const dx = mouseX - originX;
      const dy = mouseY - originY;
      stateRef.current.theta = Math.atan2(dx, dy);
      stateRef.current.omega = 0;
    } else {
      const originY = 50;
      const restLength = 140;
      const disp = (mouseY - (originY + restLength)) / 180;
      stateRef.current.springX = Math.max(-0.6, Math.min(0.6, disp));
      stateRef.current.springV = 0;
    }
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      playClickSound();
    }
  };

  // Push current telemetry to AI
  const handleConsultAI = () => {
    playClickSound();
    const telemetry = {
      type: mode === 'pendulum' ? 'Con lắc đơn (Simple Pendulum)' : 'Con lắc lò xo (Mass-Spring Oscillator)',
      params:
        mode === 'pendulum'
          ? { length: `${length} m`, mass: `${mass} kg`, gravity: `${gravity} m/s²`, damping, initialAngle: `${initialAngle}°` }
          : { springK: `${springK} N/m`, springMass: `${springMass} kg`, damping: springDamping, initDisp: `${springInitX} m` },
      liveMetrics: {
        displacement: mode === 'pendulum' ? `${displayMetrics.currentVal.toFixed(2)}°` : `${displayMetrics.currentVal.toFixed(3)} m`,
        velocity: `${displayMetrics.velocity.toFixed(3)} m/s`,
        period: `${displayMetrics.period.toFixed(3)} s`,
        kineticEnergy: `${displayMetrics.ke.toFixed(4)} J`,
        potentialEnergy: `${displayMetrics.pe.toFixed(4)} J`,
        totalEnergy: `${displayMetrics.totalEnergy.toFixed(4)} J`,
      },
      observation:
        damping > 0
          ? 'Dao động đang tắt dần theo hàm mũ do lực cản môi trường.'
          : 'Dao động điều hòa bảo toàn cơ năng lý tưởng.',
    };
    onSendTelemetryToAI(telemetry);
  };

  const [showGraph, setShowGraph] = useState(true);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* Simulation Viewport & Canvas (Cols 8) */}
      <div className="lg:col-span-8 space-y-3 sm:space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
          {/* Viewport Top Bar */}
          <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white tracking-wide uppercase">
                {mode === 'pendulum' ? 'Con Lắc Đơn' : 'Con Lắc Lò Xo'}
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 font-mono border border-blue-200 dark:border-blue-500/20">
                Euler-Cromer RK4
              </span>
            </div>

            {/* Mode Toggle Switch */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleModeChange('pendulum')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'pendulum'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Con lắc đơn
              </button>
              <button
                onClick={() => handleModeChange('spring')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'spring'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Con lắc lò xo
              </button>
            </div>
          </div>

          {/* Interactive HTML5 Canvas */}
          <div className="relative bg-slate-950 flex justify-center items-center select-none overflow-hidden cursor-grab active:cursor-grabbing">
            <canvas
              ref={canvasRef}
              width={720}
              height={380}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full max-w-full h-auto block"
            />
          </div>

          {/* Clean Energy & Motion Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200/80 dark:border-slate-800 text-xs font-mono">
            <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Li độ {mode === 'pendulum' ? 'góc (θ)' : '(x)'}</div>
              <div className="text-blue-600 dark:text-cyan-300 font-bold text-sm">
                {displayMetrics.currentVal.toFixed(1)}{mode === 'pendulum' ? '°' : ' m'}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Vận tốc (v)</div>
              <div className="text-emerald-600 dark:text-emerald-300 font-bold text-sm">{displayMetrics.velocity.toFixed(2)} m/s</div>
            </div>
            <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>Động năng Wđ</span>
                <span className="text-blue-600 dark:text-cyan-300 font-semibold">{displayMetrics.ke.toFixed(2)}J</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-blue-600 dark:bg-cyan-400 h-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, displayMetrics.totalEnergy > 0 ? (displayMetrics.ke / displayMetrics.totalEnergy) * 100 : 0)}%`,
                  }}
                />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>Thế năng Wt</span>
                <span className="text-amber-600 dark:text-amber-300 font-semibold">{displayMetrics.pe.toFixed(2)}J</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-amber-500 dark:bg-amber-400 h-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, displayMetrics.totalEnergy > 0 ? (displayMetrics.pe / displayMetrics.totalEnergy) * 100 : 0)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Canvas Bottom Controls & Slow Motion */}
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-950/90 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsRunning(!isRunning);
                  playClickSound();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? 'Tạm Dừng' : 'Tiếp Tục'}</span>
              </button>

              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt Lại</span>
              </button>
            </div>

            {/* Time speed selector */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-xl text-xs">
              <span className="text-slate-500 dark:text-slate-400 mr-1 font-medium text-[11px]">Tốc độ:</span>
              {[0.25, 0.5, 1, 2].map((scale) => (
                <button
                  key={scale}
                  onClick={() => {
                    setTimeScale(scale);
                    playClickSound();
                  }}
                  className={`px-2 py-0.5 rounded-md font-mono text-xs transition-all cursor-pointer ${
                    timeScale === scale
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {scale}x
                </button>
              ))}
            </div>

            {/* Send to AI Assistant Button */}
            <button
              onClick={handleConsultAI}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>Gửi Dữ Liệu Cho AI</span>
            </button>
          </div>
        </div>

        {/* Real-time Oscillation Waveform Graph (Collapsible) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span>Đồ thị dao động: {mode === 'pendulum' ? 'θ(t) [độ]' : 'x(t) [m]'}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>T ≈ <strong className="text-slate-800 dark:text-white">{displayMetrics.period.toFixed(2)}s</strong></span>
              <span>f ≈ <strong className="text-slate-800 dark:text-white">{(1 / Math.max(0.01, displayMetrics.period)).toFixed(2)}Hz</strong></span>
              <button
                onClick={() => setShowGraph(!showGraph)}
                className="text-xs text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                {showGraph ? 'Thu gọn' : 'Xem đồ thị'}
              </button>
            </div>
          </div>
          {showGraph && (
            <canvas ref={graphCanvasRef} width={700} height={110} className="w-full h-24 sm:h-28 bg-slate-950 rounded-xl" />
          )}
        </div>
      </div>

      {/* Control Panel & Physics Parameters (Cols 4) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Bảng Tham Số Mô Phỏng</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              Hệ SI
            </span>
          </div>

          {mode === 'pendulum' ? (
            /* Pendulum Parameters */
            <div className="space-y-4 text-xs">
              {/* Length L */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Chiều dài dây treo (L):</span>
                  <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{length.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  value={length}
                  onChange={(e) => setLength(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Mass m */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Khối lượng vật nặng (m):</span>
                  <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{mass.toFixed(2)} kg</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={mass}
                  onChange={(e) => setMass(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Initial Angle */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Góc lệch ban đầu (α₀):</span>
                  <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{initialAngle}°</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="85"
                  step="1"
                  value={initialAngle}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setInitialAngle(val);
                    stateRef.current.theta = (val * Math.PI) / 180;
                    stateRef.current.omega = 0;
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Damping / Air Resistance */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Hệ số cản môi trường (γ):</span>
                  <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{damping.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.3"
                  step="0.01"
                  value={damping}
                  onChange={(e) => setDamping(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Chân không (0)</span>
                  <span>Không khí</span>
                  <span>Chất nhớt</span>
                </div>
              </div>

              {/* Celestial Gravity Preset */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                  Trường trọng lực hành tinh (g):
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {gravityPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setGravity(preset.g);
                        playClickSound();
                      }}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        gravity === preset.g
                          ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-200'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                        <span>{preset.icon}</span>
                        <span>{preset.name}</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        g = {preset.g} m/s²
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Spring Mass Parameters */
            <div className="space-y-4 text-xs">
              {/* Spring constant k */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Độ cứng lò xo (k):</span>
                  <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{springK} N/m</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={springK}
                  onChange={(e) => setSpringK(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Spring Mass */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Khối lượng quả nặng (m):</span>
                  <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{springMass.toFixed(2)} kg</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="5.0"
                  step="0.1"
                  value={springMass}
                  onChange={(e) => setSpringMass(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Spring Damping */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Hệ số cản dao động:</span>
                  <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{springDamping.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.2"
                  step="0.005"
                  value={springDamping}
                  onChange={(e) => setSpringDamping(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Initial displacement */}
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <span>Li độ kéo dãn ban đầu (x₀):</span>
                  <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{springInitX.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="-0.5"
                  max="0.5"
                  step="0.05"
                  value={springInitX}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSpringInitX(val);
                    stateRef.current.springX = val;
                    stateRef.current.springV = 0;
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Formulas and Theoretical Reference Card */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-blue-900/40 text-xs space-y-2">
            <div className="font-bold text-blue-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Công thức vật lý cốt lõi:</span>
            </div>
            <div className="font-mono text-[11px] text-slate-300 space-y-1">
              {mode === 'pendulum' ? (
                <>
                  <div>• Chu kỳ: T = 2π√(l / g)</div>
                  <div>• Cơ năng: W = mgl(1 - cosα₀)</div>
                  <div>• Vận tốc tại vị trí bất kì: v = √(2gl(cosα - cosα₀))</div>
                </>
              ) : (
                <>
                  <div>• Chu kỳ: T = 2π√(m / k)</div>
                  <div>• Tần số góc: ω = √(k / m)</div>
                  <div>• Cơ năng: W = 1/2 k A² = Wđ + Wt</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
