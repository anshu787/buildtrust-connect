import React from "react";

const Globe: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <style>
        {`
          @keyframes globeSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes globePulse {
            0%, 100% { box-shadow: 0 0 60px hsl(25 95% 53% / 0.2), 0 0 120px hsl(25 95% 53% / 0.1); }
            50% { box-shadow: 0 0 80px hsl(25 95% 53% / 0.3), 0 0 160px hsl(25 95% 53% / 0.15); }
          }
          @keyframes orbitRing {
            0% { transform: rotateX(65deg) rotateZ(0deg); }
            100% { transform: rotateX(65deg) rotateZ(360deg); }
          }
          @keyframes twinkle1 { 0%,100% { opacity:0.1; } 50% { opacity:0.8; } }
          @keyframes twinkle2 { 0%,100% { opacity:0.2; } 50% { opacity:1; } }
          @keyframes twinkle3 { 0%,100% { opacity:0.05; } 50% { opacity:0.6; } }
        `}
      </style>

      {/* Stars */}
      <div className="absolute w-1 h-1 rounded-full bg-primary/50" style={{ top: '8%', left: '12%', animation: 'twinkle1 3s infinite' }} />
      <div className="absolute w-0.5 h-0.5 rounded-full bg-accent/60" style={{ top: '18%', left: '85%', animation: 'twinkle2 4.5s infinite' }} />
      <div className="absolute w-1.5 h-1.5 rounded-full bg-primary/30" style={{ top: '72%', left: '8%', animation: 'twinkle3 6s infinite' }} />
      <div className="absolute w-0.5 h-0.5 rounded-full bg-accent/40" style={{ top: '88%', left: '65%', animation: 'twinkle1 5s infinite' }} />
      <div className="absolute w-1 h-1 rounded-full bg-primary/40" style={{ top: '45%', left: '92%', animation: 'twinkle2 3.5s infinite' }} />
      <div className="absolute w-0.5 h-0.5 rounded-full bg-accent/50" style={{ top: '5%', left: '55%', animation: 'twinkle3 7s infinite' }} />
      <div className="absolute w-1 h-1 rounded-full bg-primary/60" style={{ top: '62%', left: '42%', animation: 'twinkle1 4s infinite' }} />

      {/* Globe container */}
      <div className="relative" style={{ width: '75%', paddingBottom: '75%' }}>
        {/* Outer glow ring */}
        <div
          className="absolute inset-[-15%] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(25 95% 53% / 0.08) 40%, transparent 70%)',
          }}
        />

        {/* Orbit ring */}
        <div
          className="absolute inset-[-10%] rounded-full border border-primary/10"
          style={{ animation: 'orbitRing 12s linear infinite' }}
        >
          <div className="absolute w-2 h-2 rounded-full bg-primary/60 shadow-[0_0_8px_hsl(25_95%_53%/0.5)]" style={{ top: '0%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>

        {/* Main globe sphere */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ animation: 'globePulse 4s ease-in-out infinite' }}
        >
          {/* Base gradient sphere */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                radial-gradient(circle at 30% 30%, hsl(25 95% 63% / 0.9) 0%, hsl(25 95% 53%) 25%, hsl(220 25% 20%) 60%, hsl(220 25% 10%) 100%)
              `,
            }}
          />

          {/* Continent-like patterns */}
          <div className="absolute inset-0 rounded-full overflow-hidden" style={{ animation: 'globeSpin 25s linear infinite' }}>
            {/* Land masses as abstract shapes */}
            <div className="absolute rounded-full bg-primary/40" style={{ width: '35%', height: '25%', top: '20%', left: '10%', filter: 'blur(4px)' }} />
            <div className="absolute rounded-full bg-primary/30" style={{ width: '25%', height: '30%', top: '40%', left: '55%', filter: 'blur(5px)' }} />
            <div className="absolute rounded-full bg-accent/25" style={{ width: '20%', height: '15%', top: '65%', left: '25%', filter: 'blur(3px)' }} />
            <div className="absolute rounded-full bg-primary/25" style={{ width: '30%', height: '20%', top: '15%', left: '60%', filter: 'blur(6px)' }} />
            <div className="absolute rounded-full bg-accent/20" style={{ width: '15%', height: '20%', top: '50%', left: '15%', filter: 'blur(4px)' }} />
            {/* Grid lines */}
            <div className="absolute inset-0 rounded-full border border-primary/5" style={{ width: '100%', height: '50%', top: '25%' }} />
            <div className="absolute inset-0 rounded-full border border-primary/5" style={{ width: '50%', height: '100%', left: '25%' }} />
          </div>

          {/* Specular highlight */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 30%, transparent 60%)',
            }}
          />

          {/* Atmosphere edge */}
          <div
            className="absolute inset-[-2px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, transparent 60%, hsl(25 95% 53% / 0.15) 80%, hsl(25 95% 53% / 0.05) 100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Globe;
