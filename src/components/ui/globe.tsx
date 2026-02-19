import React from "react";

const Globe: React.FC = () => {
  return (
    <>
      <style>
        {`
          @keyframes earthRotate {
            0% { background-position: 0 0; }
            100% { background-position: 400px 0; }
          }
          @keyframes twinkling { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          @keyframes twinkling-slow { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          @keyframes twinkling-long { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          @keyframes twinkling-fast { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
        `}
      </style>
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="relative w-[200px] h-[200px]">
          {/* Stars */}
          <div className="absolute w-1 h-1 bg-primary/60 rounded-full top-[10%] left-[15%]" style={{ animation: 'twinkling 3s infinite' }} />
          <div className="absolute w-0.5 h-0.5 bg-accent/50 rounded-full top-[30%] left-[80%]" style={{ animation: 'twinkling-slow 5s infinite' }} />
          <div className="absolute w-1 h-1 bg-primary/40 rounded-full top-[70%] left-[20%]" style={{ animation: 'twinkling-long 7s infinite' }} />
          <div className="absolute w-0.5 h-0.5 bg-accent/60 rounded-full top-[85%] left-[60%]" style={{ animation: 'twinkling-fast 2s infinite' }} />
          <div className="absolute w-1.5 h-1.5 bg-primary/30 rounded-full top-[50%] left-[90%]" style={{ animation: 'twinkling 4s infinite' }} />
          <div className="absolute w-0.5 h-0.5 bg-accent/40 rounded-full top-[15%] left-[50%]" style={{ animation: 'twinkling-slow 6s infinite' }} />
          <div className="absolute w-1 h-1 bg-primary/50 rounded-full top-[60%] left-[45%]" style={{ animation: 'twinkling-long 3.5s infinite' }} />

          {/* Globe */}
          <div
            className="w-full h-full rounded-full overflow-hidden shadow-[0_0_80px_hsl(var(--primary)/0.3),inset_0_0_40px_hsl(var(--primary)/0.1)]"
            style={{
              background: `radial-gradient(circle at 35% 35%, hsl(var(--accent)) 0%, hsl(var(--primary)) 40%, hsl(var(--secondary)) 100%)`,
              animation: 'earthRotate 20s linear infinite',
            }}
          />
          {/* Glow overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>
    </>
  );
};

export default Globe;
