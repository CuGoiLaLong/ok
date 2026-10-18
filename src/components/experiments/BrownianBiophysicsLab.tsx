import React, { useState, useEffect, useRef } from 'react';
import { Dna, Sparkles, Sliders, Activity, Thermometer, Info, BookOpen, RotateCcw } from 'lucide-react';
import { playClickSound } from '../../utils/audio';

interface BrownianBiophysicsLabProps {
  onSendTelemetryToAI: (data: any) => void;
}

export const BrownianBiophysicsLab: React.FC<BrownianBiophysicsLabProps> = ({ onSendTelemetryToAI }) => {
  const [temperature, setTemperature] = useState(310); // Kelvin (37°C - human body temperature)
  const [fluidPreset, setFluidPreset] = useState('cytoplasm');
  const [viscosity, setViscosity] = useState(2.5); // mPa.s
  const [particleRadius, setParticleRadius] = useState(15); // nm (size of typical macromolecule)
  const [showWaterMolecules, setShowWaterMolecules] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const msdCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Constants
  const kB = 1.380649e-23; // J/K

  // Diffusion coefficient D in m^2/s
  // D = kB * T / (6 * pi * eta * r)
  const eta_SI = viscosity * 1e-3; // Pa.s
  const r_SI = particleRadius * 1e-9; // meters
  const diffusionCoeff_D = (kB * temperature) / (6 * Math.PI * eta_SI * r_SI);
  // D in um^2/s
  const D_microns = diffusionCoeff_D * 1e12;

  // Fluids library
  const fluidOptions = [
    { id: 'water', name: 'Nước tinh khiết 20°C', eta: 1.0, desc: 'Dung môi cơ bản của sự sống' },
    { id: 'plasma', name: 'Huyết tương người (37°C)', eta: 1.5, desc: 'Môi trường tuần hoàn mao mạch' },
    { id: 'cytoplasm', name: 'Bào tương tế bào (Cytoplasm)', eta: 2.5, desc: 'Môi trường nội bào giàu đại phân tử' },
    { id: 'glycerol', name: 'Dịch nhầy màng nhầy (Glycerol 50%)', eta: 6.0, desc: 'Môi trường độ nhớt cao' },
  ];

  // Particle tracking state
  const stateRef = useRef({
    // Main Brownian particle
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    path: [] as Array<{ x: number; y: number }>,
    msdHistory: [] as Array<{ t: number; msd: number }>,
    time: 0,
    // Solvent molecules
    solvents: [] as Array<{ x: number; y: number; vx: number; vy: number }>,
  });

  // Initialize simulation
  const handleReset = () => {
    playClickSound();
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 700;
    const h = canvas ? canvas.height : 360;

    const solvents: Array<{ x: number; y: number; vx: number; vy: number }> = [];
    for (let i = 0; i < 90; i++) {
      const speed = Math.sqrt(temperature / 300) * 3;
      const angle = Math.random() * Math.PI * 2;
      solvents.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
      });
    }

    stateRef.current = {
      x: w / 2,
      y: h / 2,
      vx: 0,
      vy: 0,
      path: [{ x: w / 2, y: h / 2 }],
      msdHistory: [{ t: 0, msd: 0 }],
      time: 0,
      solvents,
    };
  };

  useEffect(() => {
    handleReset();
  }, [fluidPreset, particleRadius]);

  // Main animation frame loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const s = stateRef.current;

      s.time += 0.05;

      // Update solvent molecules
      const thermalSpeed = Math.sqrt(temperature / 300) * 3;
      s.solvents.forEach((sol) => {
        sol.x += sol.vx;
        sol.y += sol.vy;

        if (sol.x < 5 || sol.x > w - 5) sol.vx *= -1;
        if (sol.y < 5 || sol.y > h - 5) sol.vy *= -1;

        // Collision with main particle
        const dx = sol.x - s.x;
        const dy = sol.y - s.y;
        const dist = Math.hypot(dx, dy);
        const particleR = 12 + particleRadius * 0.4;

        if (dist < particleR) {
          // Momentum transfer from solvent collision
          const impulse = (thermalSpeed / (viscosity * 2)) * 0.8;
          const ang = Math.atan2(dy, dx);
          s.vx -= Math.cos(ang) * impulse;
          s.vy -= Math.sin(ang) * impulse;

          sol.vx = Math.cos(ang) * thermalSpeed;
          sol.vy = Math.sin(ang) * thermalSpeed;
        }
      });

      // Viscous drag on Brownian particle: F = -6 * pi * eta * r * v
      const drag = Math.min(0.9, 0.08 * (viscosity / 2));
      s.vx *= 1 - drag;
      s.vy *= 1 - drag;

      // Also inject stochastic Langevin thermal kick
      const kick = (Math.sqrt(D_microns) * (temperature / 300) * 0.4) / viscosity;
      s.vx += (Math.random() - 0.5) * kick;
      s.vy += (Math.random() - 0.5) * kick;

      s.x += s.vx;
      s.y += s.vy;

      // Boundary bounds
      s.x = Math.max(25, Math.min(w - 25, s.x));
      s.y = Math.max(25, Math.min(h - 25, s.y));

      s.path.push({ x: s.x, y: s.y });
      if (s.path.length > 250) s.path.shift();

      // Record MSD
      const initPt = s.path[0];
      const r2 = (s.x - initPt.x) ** 2 + (s.y - initPt.y) ** 2;
      s.msdHistory.push({ t: s.time, msd: r2 });
      if (s.msdHistory.length > 120) s.msdHistory.shift();

      // Draw Main Chamber
      ctx.clearRect(0, 0, w, h);

      // Microscopic viewport background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // Nanometer grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 35) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 35) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw Random Walk Trajectory trace
      if (s.path.length > 1) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        s.path.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }

      // Draw Solvent Molecules (H2O water dots)
      if (showWaterMolecules) {
        ctx.fillStyle = '#93c5fd';
        s.solvents.forEach((sol) => {
          ctx.beginPath();
          ctx.arc(sol.x, sol.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw Main Brownian Macromolecule (Protein / Colloid particle)
      const particleR = 12 + particleRadius * 0.4;
      const grad = ctx.createRadialGradient(s.x - 3, s.y - 3, 2, s.x, s.y, particleR);
      grad.addColorStop(0, '#f472b6');
      grad.addColorStop(0.7, '#ec4899');
      grad.addColorStop(1, '#9d174d');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, particleR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fbcfe8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw MSD Graph
      drawMSDGraph();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [temperature, viscosity, particleRadius, showWaterMolecules, D_microns]);

  // Draw MSD graph
  const drawMSDGraph = () => {
    const canvas = msdCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const hist = stateRef.current.msdHistory;
    if (hist.length < 2) return;

    // Axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(30, 10);
    ctx.lineTo(30, h - 20);
    ctx.lineTo(w - 10, h - 20);
    ctx.stroke();

    // Plot <r^2> vs t
    const maxMSD = Math.max(500, ...hist.map((item) => item.msd));

    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.beginPath();
    hist.forEach((pt, idx) => {
      const px = 30 + (idx / (hist.length - 1)) * (w - 40);
      const py = h - 20 - (pt.msd / maxMSD) * (h - 30);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    ctx.fillStyle = '#ec4899';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText('MSD ⟨r²⟩ = 4Dt', 40, 20);
  };

  const handleConsultAI = () => {
    playClickSound();
    const telemetry = {
      type: 'Lý Sinh Học: Chuyển động Brown & Khuếch tán Phân tử (Brownian Motion & Biophysical Diffusion)',
      biologicalEnvironment: {
        medium: fluidOptions.find((f) => f.id === fluidPreset)?.name,
        temperatureK: `${temperature} K (${temperature - 273}°C)`,
        viscosityEta: `${viscosity} mPa·s`,
        hydrodynamicRadiusR: `${particleRadius} nm`,
      },
      einsteinSmoluchowskiResults: {
        theoreticalDiffusionCoefficientD: `${diffusionCoeff_D.toExponential(3)} m²/s`,
        diffusionRateMicronsSqPerSec: `${D_microns.toFixed(3)} µm²/s`,
        boltzmannConstant: '1.380649e-23 J/K',
        biologicalSignificance:
          'Quyết định tốc độ vận chuyển thụ động các enzyme, protein và chất dẫn truyền thần kinh trong dịch nội bào và màng tế bào.',
      },
    };
    onSendTelemetryToAI(telemetry);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* Simulation Viewport (Cols 8) */}
      <div className="lg:col-span-8 space-y-3 sm:space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
          <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dna className="w-4 h-4 text-pink-500" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase">
                Buồng Kính Hiển Vi Lý Sinh: Chuyển Động Brown
              </h2>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-300 border border-pink-200 dark:border-pink-500/20 font-mono">
              Einstein-Smoluchowski (1905)
            </span>
          </div>

          <div className="relative bg-slate-950 flex justify-center items-center overflow-hidden">
            <canvas ref={canvasRef} width={740} height={360} className="w-full max-w-full h-auto block" />
          </div>

          {/* Clean Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200/80 dark:border-slate-800 text-xs font-mono">
            <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Hệ số khuếch tán (D)</div>
              <div className="text-pink-600 dark:text-pink-400 font-bold text-sm">
                {D_microns.toFixed(2)} <span className="text-[11px] text-slate-400 font-normal">µm²/s</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Độ nhớt dung môi (η)</div>
              <div className="text-blue-600 dark:text-cyan-300 font-bold text-sm">{viscosity.toFixed(2)} mPa·s</div>
            </div>
            <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Định luật Einstein</div>
              <div className="text-slate-800 dark:text-slate-300 font-bold text-xs truncate">D = k_B·T / (6πηr)</div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-950/90 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thả Lại Hạt</span>
              </button>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWaterMolecules}
                  onChange={(e) => setShowWaterMolecules(e.target.checked)}
                  className="rounded text-pink-600 focus:ring-0"
                />
                <span>Hiện phân tử H₂O</span>
              </label>
            </div>

            <button
              onClick={handleConsultAI}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>Hỏi AI Về Ý Nghĩa Lý Sinh</span>
            </button>
          </div>
        </div>

        {/* Real-time Mean Squared Displacement (MSD) Plot */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-pink-500" />
              <span>Đồ thị dịch chuyển bình phương trung bình: ⟨r²(t)⟩ theo thời gian</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Định luật Fick: slope ~ 4D
            </span>
          </div>
          <canvas ref={msdCanvasRef} width={700} height={110} className="w-full bg-slate-950 rounded-xl" />
        </div>
      </div>

      {/* Control Panel (Cols 4) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 text-xs transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-pink-500" />
              <span>Môi Trường & Đại Phân Tử</span>
            </h3>
          </div>

          {/* Temperature Slider */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
              <span className="flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                Nhiệt độ dung dịch (T):
              </span>
              <span className="font-mono text-pink-600 dark:text-pink-400 font-semibold">
                {temperature} K ({temperature - 273}°C)
              </span>
            </div>
            <input
              type="range"
              min="275"
              max="370"
              step="1"
              value={temperature}
              onChange={(e) => setTemperature(parseInt(e.target.value, 10))}
              className="w-full accent-pink-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>Đóng băng (0°C)</span>
              <span>Thân nhiệt (37°C)</span>
              <span>Sôi (97°C)</span>
            </div>
          </div>

          {/* Biological Fluid Preset */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
              Dung môi & Dịch sinh học (Độ nhớt η):
            </label>
            <div className="space-y-1.5">
              {fluidOptions.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFluidPreset(f.id);
                    setViscosity(f.eta);
                    playClickSound();
                  }}
                  className={`w-full p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                    fluidPreset === f.id
                      ? 'bg-pink-50 dark:bg-pink-600/20 border-pink-500 text-pink-700 dark:text-pink-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between font-semibold text-[11px]">
                    <span>{f.name}</span>
                    <span className="font-mono text-pink-600 dark:text-pink-300">η = {f.eta} mPa·s</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Particle Radius */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
              <span>Bán kính hạt (r):</span>
              <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{particleRadius} nm</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={particleRadius}
              onChange={(e) => setParticleRadius(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>Protein (5nm)</span>
              <span>Kháng thể (15nm)</span>
              <span>Bào quan (40nm)</span>
            </div>
          </div>

          {/* Science Skill Historical Citation Card */}
          <div className="p-3 bg-pink-50/60 dark:bg-slate-950/80 rounded-xl border border-pink-200/80 dark:border-pink-900/40 text-[11px] text-slate-700 dark:text-slate-300 space-y-1.5">
            <div className="font-bold text-pink-700 dark:text-pink-300 flex items-center gap-1 font-sans">
              <BookOpen className="w-3.5 h-3.5 text-pink-500" />
              <span>Nền tảng Khoa học Tự nhiên:</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[10px]">
              Albert Einstein (1905) đã sử dụng chuyển động Brown để chứng minh nguyên tử và phân tử thực sự tồn tại,
              mở đường cho ngành Lý sinh phân tử hiện đại.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
