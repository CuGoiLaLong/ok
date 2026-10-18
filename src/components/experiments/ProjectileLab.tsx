import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Target, Sparkles, Sliders, Activity } from 'lucide-react';
import { playClickSound, playCannonSound, playSuccessChime } from '../../utils/audio';

interface ProjectileLabProps {
  onSendTelemetryToAI: (data: any) => void;
}

export const ProjectileLab: React.FC<ProjectileLabProps> = ({ onSendTelemetryToAI }) => {
  const [angle, setAngle] = useState(45); // degrees
  const [velocity, setVelocity] = useState(25); // m/s
  const [height, setHeight] = useState(5); // initial height in meters
  const [gravity, setGravity] = useState(9.8); // m/s^2
  const [airResistance, setAirResistance] = useState(0.02); // drag factor
  const [mass, setMass] = useState(2.0); // kg

  // Target coordinates
  const [targetX, setTargetX] = useState(55); // meters
  const [targetY, setTargetY] = useState(0); // ground
  const [targetHit, setTargetHit] = useState(false);

  // Flight simulation state
  const [isFlying, setIsFlying] = useState(false);
  const [flightMetrics, setFlightMetrics] = useState({
    time: 0,
    maxHeight: 5,
    range: 0,
    currentX: 0,
    currentY: 5,
    currentVx: 0,
    currentVy: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trajectoryRef = useRef<Array<{ x: number; y: number }>>([]);
  const pastTrajectoriesRef = useRef<Array<Array<{ x: number; y: number }>>>([]);

  const stateRef = useRef({
    x: 0,
    y: 5,
    vx: 0,
    vy: 0,
    t: 0,
    maxH: 5,
  });

  // Calculate theoretical values without drag
  const rad = (angle * Math.PI) / 180;
  const v0x = velocity * Math.cos(rad);
  const v0y = velocity * Math.sin(rad);
  const theoreticalMaxH = height + (v0y * v0y) / (2 * gravity);
  const theoreticalFlightTime = (v0y + Math.sqrt(v0y * v0y + 2 * gravity * height)) / gravity;
  const theoreticalRange = v0x * theoreticalFlightTime;

  // Fire Cannon
  const handleFire = () => {
    playCannonSound();
    setIsFlying(true);
    setTargetHit(false);

    if (trajectoryRef.current.length > 0) {
      pastTrajectoriesRef.current.push([...trajectoryRef.current]);
      if (pastTrajectoriesRef.current.length > 3) {
        pastTrajectoriesRef.current.shift();
      }
    }
    trajectoryRef.current = [];

    const radA = (angle * Math.PI) / 180;
    stateRef.current = {
      x: 0,
      y: height,
      vx: velocity * Math.cos(radA),
      vy: velocity * Math.sin(radA),
      t: 0,
      maxH: height,
    };
  };

  const handleReset = () => {
    playClickSound();
    setIsFlying(false);
    setTargetHit(false);
    trajectoryRef.current = [];
    pastTrajectoriesRef.current = [];
    stateRef.current = {
      x: 0,
      y: height,
      vx: 0,
      vy: 0,
      t: 0,
      maxH: height,
    };
    setFlightMetrics({
      time: 0,
      maxHeight: height,
      range: 0,
      currentX: 0,
      currentY: height,
      currentVx: 0,
      currentVy: 0,
    });
  };

  // Simulation physics frame loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dtReal = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      if (isFlying) {
        const s = stateRef.current;
        const steps = 8;
        const dt = dtReal / steps;

        for (let i = 0; i < steps; i++) {
          s.t += dt;

          const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
          const dragFx = -airResistance * speed * s.vx;
          const dragFy = -airResistance * speed * s.vy;

          const ax = dragFx / mass;
          const ay = -gravity + dragFy / mass;

          s.vx += ax * dt;
          s.vy += ay * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;

          if (s.y > s.maxH) s.maxH = s.y;

          // Target Hit detection
          const distToTarget = Math.hypot(s.x - targetX, s.y - targetY);
          if (distToTarget < 2.5 && !targetHit) {
            setTargetHit(true);
            playSuccessChime();
          }

          // Ground impact detection
          if (s.y <= 0) {
            s.y = 0;
            setIsFlying(false);
            break;
          }
        }

        trajectoryRef.current.push({ x: s.x, y: s.y });

        setFlightMetrics({
          time: s.t,
          maxHeight: s.maxH,
          range: s.x,
          currentX: s.x,
          currentY: s.y,
          currentVx: s.vx,
          currentVy: s.vy,
        });
      }

      renderCanvas();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isFlying, airResistance, mass, gravity, targetX, targetY, targetHit]);

  // Canvas Drawing
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const scaleX = (w - 70) / 100;
    const scaleY = (h - 60) / 45;
    const originX = 45;
    const groundY = h - 35;

    // Soft sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, '#090d16');
    skyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, groundY);

    // Subtle coordinate grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let meter = 0; meter <= 100; meter += 10) {
      const px = originX + meter * scaleX;
      ctx.beginPath();
      ctx.moveTo(px, 15);
      ctx.lineTo(px, groundY);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`${meter}m`, px - 8, groundY + 16);
    }

    for (let meter = 10; meter <= 40; meter += 10) {
      const py = groundY - meter * scaleY;
      ctx.beginPath();
      ctx.moveTo(originX, py);
      ctx.lineTo(w - 15, py);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`${meter}m`, originX - 30, py + 3);
    }

    // Ground platform
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // Launch cliff/stand if height > 0
    if (height > 0) {
      const cliffPixelH = height * scaleY;
      ctx.fillStyle = '#334155';
      ctx.fillRect(originX - 25, groundY - cliffPixelH, 25, cliffPixelH);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(originX - 25, groundY - cliffPixelH, 25, cliffPixelH);
    }

    // Draw Target
    const targetPx = originX + targetX * scaleX;
    const targetPy = groundY - targetY * scaleY;

    ctx.fillStyle = targetHit ? '#10b981' : '#ef4444';
    ctx.beginPath();
    ctx.arc(targetPx, targetPy, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(targetPx, targetPy, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = targetHit ? '#10b981' : '#ef4444';
    ctx.beginPath();
    ctx.arc(targetPx, targetPy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Target flag
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(targetPx, targetPy);
    ctx.lineTo(targetPx, targetPy - 22);
    ctx.stroke();

    ctx.fillStyle = targetHit ? '#34d399' : '#f87171';
    ctx.beginPath();
    ctx.moveTo(targetPx, targetPy - 22);
    ctx.lineTo(targetPx + 12, targetPy - 17);
    ctx.lineTo(targetPx, targetPy - 12);
    ctx.closePath();
    ctx.fill();

    // Draw past trajectories
    pastTrajectoriesRef.current.forEach((traj) => {
      if (traj.length < 2) return;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      traj.forEach((pt, idx) => {
        const px = originX + pt.x * scaleX;
        const py = groundY - pt.y * scaleY;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw active trajectory
    const currentTraj = trajectoryRef.current;
    if (currentTraj.length > 1) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      currentTraj.forEach((pt, idx) => {
        const px = originX + pt.x * scaleX;
        const py = groundY - pt.y * scaleY;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Cannon Barrel
    const barrelOriginX = originX;
    const barrelOriginY = groundY - height * scaleY;
    const barrelLen = 30;
    const radAng = (angle * Math.PI) / 180;
    const muzzleX = barrelOriginX + barrelLen * Math.cos(radAng);
    const muzzleY = barrelOriginY - barrelLen * Math.sin(radAng);

    ctx.save();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(barrelOriginX, barrelOriginY);
    ctx.lineTo(muzzleX, muzzleY);
    ctx.stroke();

    // Wheel
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(barrelOriginX, barrelOriginY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Projectile Ball
    const s = stateRef.current;
    const currentBallX = originX + s.x * scaleX;
    const currentBallY = groundY - s.y * scaleY;

    if (isFlying || s.t > 0) {
      const grad = ctx.createRadialGradient(currentBallX - 2, currentBallY - 2, 1, currentBallX, currentBallY, 7);
      grad.addColorStop(0, '#fde047');
      grad.addColorStop(1, '#ea580c');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(currentBallX, currentBallY, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handleConsultAI = () => {
    playClickSound();
    const telemetry = {
      type: 'Chuyển động Ném Xiên & Đạn Đạo (Projectile Motion)',
      parameters: {
        angle: `${angle}°`,
        velocity: `${velocity} m/s`,
        initialHeight: `${height} m`,
        gravity: `${gravity} m/s²`,
        airDragCoefficient: airResistance,
        mass: `${mass} kg`,
      },
      flightResults: {
        timeOfFlight: `${flightMetrics.time.toFixed(2)} s`,
        maxAltitudeAchieved: `${flightMetrics.maxHeight.toFixed(2)} m`,
        rangeAchieved: `${flightMetrics.range.toFixed(2)} m`,
        theoreticalVacuumRange: `${theoreticalRange.toFixed(2)} m`,
        theoreticalVacuumMaxH: `${theoreticalMaxH.toFixed(2)} m`,
        targetHit: targetHit ? 'Đã bắn trúng mục tiêu!' : 'Chưa bắn trúng mục tiêu',
      },
    };
    onSendTelemetryToAI(telemetry);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* Interactive Simulation Stage (Left Zone: Cols 8) */}
      <div className="lg:col-span-8 space-y-3 sm:space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
          {/* Card Bar */}
          <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white tracking-wide uppercase">
                Chuyển Động Ném Xiên & Khí Động Học
              </span>
            </div>
            {targetHit && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-bounce flex items-center gap-1 font-mono">
                🎯 BẮN TRÚNG MỤC TIÊU!
              </span>
            )}
          </div>

          {/* Clean 100% Unobstructed Canvas */}
          <div className="relative bg-slate-950 flex justify-center items-center overflow-hidden">
            <canvas ref={canvasRef} width={740} height={360} className="w-full max-w-full h-auto block" />
          </div>

          {/* Metrics Strip directly below canvas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200/80 dark:border-slate-800 text-xs font-mono">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Thời gian bay</span>
              <strong className="text-blue-600 dark:text-cyan-300 text-sm">{flightMetrics.time.toFixed(2)} s</strong>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Tầm xa đạt được</span>
              <strong className="text-amber-600 dark:text-amber-300 text-sm">{flightMetrics.range.toFixed(2)} m</strong>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Độ cao cực đại</span>
              <strong className="text-emerald-600 dark:text-emerald-300 text-sm">{flightMetrics.maxHeight.toFixed(2)} m</strong>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Tọa độ (x, y)</span>
              <strong className="text-slate-800 dark:text-slate-200 text-sm">
                ({flightMetrics.currentX.toFixed(1)}, {flightMetrics.currentY.toFixed(1)}) m
              </strong>
            </div>
          </div>

          {/* Action Controls Bar */}
          <div className="p-3 bg-white dark:bg-slate-950/90 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleFire}
                disabled={isFlying}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Bắn Đạn Pháo</span>
              </button>

              <button
                onClick={handleReset}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt Lại</span>
              </button>
            </div>

            <button
              onClick={handleConsultAI}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>Phân Tích Với AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Deck (Right Zone: Cols 4) */}
      <div className="lg:col-span-4 space-y-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 text-xs transition-colors">
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm">
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>Thông Số Bắn & Môi Trường</span>
          </div>

          {/* Angle */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
              <span>Góc bắn (α):</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{angle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="1"
              value={angle}
              onChange={(e) => setAngle(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Velocity */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
              <span>Vận tốc đầu nòng (v₀):</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{velocity} m/s</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={velocity}
              onChange={(e) => setVelocity(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Height */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
              <span>Độ cao bệ phóng (h₀):</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{height} m</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Drag */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
              <span>Hệ số cản khí (k):</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{airResistance.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.06"
              step="0.005"
              value={airResistance}
              onChange={(e) => setAirResistance(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Target X */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
              <span>Khoảng cách bia bắn:</span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">{targetX} m</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="1"
              value={targetX}
              onChange={(e) => {
                setTargetX(parseInt(e.target.value, 10));
                setTargetHit(false);
              }}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Gravity toggle */}
          <div>
            <span className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">Trọng lực:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setGravity(9.8)}
                className={`p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                  gravity === 9.8 ? 'bg-amber-50 dark:bg-amber-600/20 border-amber-500 text-amber-700 dark:text-amber-200 font-semibold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Trái Đất (9.8)
              </button>
              <button
                onClick={() => setGravity(1.62)}
                className={`p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                  gravity === 1.62 ? 'bg-amber-50 dark:bg-amber-600/20 border-amber-500 text-amber-700 dark:text-amber-200 font-semibold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Mặt Trăng (1.62)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
