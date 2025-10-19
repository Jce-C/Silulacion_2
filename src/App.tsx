import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Ship {
  position: Vector3;
  progress: number;
  path: Vector3[];
  color: string;
  name: string;
  timeElapsed: number;
  timeDilation: number;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [ship1Time, setShip1Time] = useState(0);
  const [ship2Time, setShip2Time] = useState(0);
  const animationRef = useRef<number>();
  const shipRef = useRef<{ ship1: Ship; ship2: Ship }>();

  const toIsometric = (x: number, y: number, z: number): { x: number; y: number } => {
    const isoX = (x - z) * Math.cos(Math.PI / 6);
    const isoY = y + (x + z) * Math.sin(Math.PI / 6);
    return { x: isoX, y: isoY };
  };

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    time: number
  ) => {
    const gridSize = 20;
    const spacing = 30;
    const deformCenterX = 0;
    const deformCenterZ = 5;
    const deformRadius = 6;

    for (let z = -gridSize; z <= gridSize; z++) {
      for (let x = -gridSize; x <= gridSize; x++) {
        const distToDeform = Math.sqrt(
          Math.pow(x - deformCenterX, 2) + Math.pow(z - deformCenterZ, 2)
        );

        let yOffset = 0;
        if (distToDeform < deformRadius) {
          const deformStrength = 1 - distToDeform / deformRadius;
          yOffset = -Math.sin(deformStrength * Math.PI) * 8;
        }

        const opacity = Math.max(0.1, 1 - Math.abs(z) / gridSize * 0.7);

        if (x < gridSize) {
          const distToDeform2 = Math.sqrt(
            Math.pow(x + 1 - deformCenterX, 2) + Math.pow(z - deformCenterZ, 2)
          );
          let yOffset2 = 0;
          if (distToDeform2 < deformRadius) {
            const deformStrength2 = 1 - distToDeform2 / deformRadius;
            yOffset2 = -Math.sin(deformStrength2 * Math.PI) * 8;
          }

          const start = toIsometric(x * spacing, yOffset, z * spacing);
          const end = toIsometric((x + 1) * spacing, yOffset2, z * spacing);

          ctx.strokeStyle = `rgba(100, 200, 255, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(centerX + start.x, centerY - start.y);
          ctx.lineTo(centerX + end.x, centerY - end.y);
          ctx.stroke();
        }

        if (z < gridSize) {
          const distToDeform3 = Math.sqrt(
            Math.pow(x - deformCenterX, 2) + Math.pow(z + 1 - deformCenterZ, 2)
          );
          let yOffset3 = 0;
          if (distToDeform3 < deformRadius) {
            const deformStrength3 = 1 - distToDeform3 / deformRadius;
            yOffset3 = -Math.sin(deformStrength3 * Math.PI) * 8;
          }

          const start = toIsometric(x * spacing, yOffset, z * spacing);
          const end = toIsometric(x * spacing, yOffset3, (z + 1) * spacing);

          ctx.strokeStyle = `rgba(100, 200, 255, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(centerX + start.x, centerY - start.y);
          ctx.lineTo(centerX + end.x, centerY - end.y);
          ctx.stroke();
        }
      }
    }
  };

  const drawShip = (
    ctx: CanvasRenderingContext2D,
    position: Vector3,
    centerX: number,
    centerY: number,
    color: string,
    time: number
  ) => {
    const scale = 30;
    const iso = toIsometric(position.x * scale, position.y, position.z * scale);
    const x = centerX + iso.x;
    const y = centerY - iso.y;

    ctx.save();
    ctx.translate(x, y);

    ctx.shadowBlur = 15;
    ctx.shadowColor = color;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-8, 5);
    ctx.lineTo(-4, 8);
    ctx.lineTo(0, 6);
    ctx.lineTo(4, 8);
    ctx.lineTo(8, 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    const trailLength = 20;
    const gradient = ctx.createLinearGradient(0, 6, 0, 6 + trailLength);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-2, 6, 4, trailLength);

    ctx.restore();
  };

  const initShips = () => {
    const path1: Vector3[] = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      path1.push({
        x: -6 + t * 6,
        y: 0,
        z: -10 + t * 30,
      });
    }

    const path2: Vector3[] = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      path2.push({
        x: 6 - t * 6,
        y: 0,
        z: -10 + t * 30,
      });
    }

    shipRef.current = {
      ship1: {
        position: path1[0],
        progress: 0,
        path: path1,
        color: '#ff4466',
        name: 'Nave A (Espacio Deformado)',
        timeElapsed: 0,
        timeDilation: 1,
      },
      ship2: {
        position: path2[0],
        progress: 0,
        path: path2,
        color: '#44ff88',
        name: 'Nave B (Espacio Normal)',
        timeElapsed: 0,
        timeDilation: 1,
      },
    };
  };

  const updateShips = (deltaTime: number) => {
    if (!shipRef.current || !isRunning) return;

    const speed = 0.2;
    const { ship1, ship2 } = shipRef.current;

    if (ship1.progress < 1) {
      ship1.progress += speed * deltaTime / 1000;
      if (ship1.progress > 1) ship1.progress = 1;
    }

    if (ship2.progress < 1) {
      ship2.progress += speed * deltaTime / 1000;
      if (ship2.progress > 1) ship2.progress = 1;
    }

    const idx1 = Math.floor(ship1.progress * (ship1.path.length - 1));
    const idx2 = Math.floor(ship2.progress * (ship2.path.length - 1));

    ship1.position = ship1.path[idx1];
    ship2.position = ship2.path[idx2];

    const deformCenterX = 0;
    const deformCenterZ = 5;
    const deformRadius = 6;
    const distToDeform = Math.sqrt(
      Math.pow(ship1.position.x - deformCenterX, 2) +
        Math.pow(ship1.position.z - deformCenterZ, 2)
    );

    if (distToDeform < deformRadius) {
      const deformStrength = 1 - distToDeform / deformRadius;
      ship1.timeDilation = 1 - deformStrength * 0.6;
    } else {
      ship1.timeDilation = 1;
    }

    ship2.timeDilation = 1;

    ship1.timeElapsed += (deltaTime / 1000) * ship1.timeDilation;
    ship2.timeElapsed += (deltaTime / 1000) * ship2.timeDilation;

    setShip1Time(ship1.timeElapsed);
    setShip2Time(ship2.timeElapsed);
  };

  const lastTimeRef = useRef<number>(0);

  const animate = (currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 100;

    drawGrid(ctx, centerX, centerY, currentTime);

    if (shipRef.current && isRunning) {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      updateShips(deltaTime);
      drawShip(ctx, shipRef.current.ship1.position, centerX, centerY, shipRef.current.ship1.color, currentTime);
      drawShip(ctx, shipRef.current.ship2.position, centerX, centerY, shipRef.current.ship2.color, currentTime);
    } else if (shipRef.current && shipRef.current.ship1.progress > 0) {
      drawShip(ctx, shipRef.current.ship1.position, centerX, centerY, shipRef.current.ship1.color, currentTime);
      drawShip(ctx, shipRef.current.ship2.position, centerX, centerY, shipRef.current.ship2.color, currentTime);
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  const handleReset = () => {
    setIsRunning(false);
    initShips();
    setShip1Time(0);
    setShip2Time(0);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);
    initShips();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning) {
      lastTimeRef.current = performance.now();
    }
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const timeDifference = Math.abs(ship2Time - ship1Time);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />

      <div className="absolute top-8 left-8 space-y-4 z-10">
        <div className="bg-black/80 backdrop-blur-sm border border-red-500/30 rounded-lg p-4 min-w-[280px]">
          <div className="text-red-400 text-sm font-medium mb-1">Nave A - Espacio Deformado</div>
          <div className="text-red-500 text-4xl font-mono font-bold tracking-wider">
            {formatTime(ship1Time)}
          </div>
        </div>

        <div className="bg-black/80 backdrop-blur-sm border border-green-500/30 rounded-lg p-4 min-w-[280px]">
          <div className="text-green-400 text-sm font-medium mb-1">Nave B - Espacio Normal</div>
          <div className="text-green-500 text-4xl font-mono font-bold tracking-wider">
            {formatTime(ship2Time)}
          </div>
        </div>

        <div className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-4 min-w-[280px]">
          <div className="text-yellow-400 text-sm font-medium mb-1">Diferencia Temporal</div>
          <div className="text-yellow-500 text-3xl font-mono font-bold tracking-wider">
            +{timeDifference.toFixed(2)}s
          </div>
        </div>
      </div>

      <div className="absolute top-8 right-8 space-y-3 z-10">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {isRunning ? (
            <>
              <Pause size={20} />
              <span>Pausar</span>
            </>
          ) : (
            <>
              <Play size={20} />
              <span>Iniciar</span>
            </>
          )}
        </button>

        <button
          onClick={handleReset}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <RotateCcw size={20} />
          <span>Reiniciar</span>
        </button>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm border border-blue-500/30 rounded-lg px-6 py-3 z-10">
        <div className="text-blue-400 text-sm text-center">
          Simulación de Dilatación Temporal Relativista
        </div>
        <div className="text-gray-400 text-xs text-center mt-1">
          La Nave A experimenta tiempo más lento al atravesar el espacio curvado
        </div>
      </div>
    </div>
  );
}

export default App;
