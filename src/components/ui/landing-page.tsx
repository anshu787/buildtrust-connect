import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Globe from "@/components/ui/globe";
import { cn } from "@/lib/utils";

interface ScrollGlobeProps {
  sections: {
    id: string;
    badge?: string;
    title: string;
    subtitle?: string;
    description: string;
    align?: 'left' | 'center' | 'right';
    features?: { title: string; description: string }[];
    actions?: { label: string; variant: 'primary' | 'secondary'; onClick?: () => void }[];
  }[];
  globeConfig?: {
    positions: {
      top: string;
      left: string;
      scale: number;
    }[];
  };
  className?: string;
}

const defaultGlobeConfig = {
  positions: [
    { top: "50%", left: "75%", scale: 1.4 },
    { top: "25%", left: "50%", scale: 0.9 },
    { top: "15%", left: "90%", scale: 2 },
    { top: "50%", left: "50%", scale: 1.8 },
  ]
};

const parsePercent = (str: string): number => parseFloat(str.replace('%', ''));

function ScrollGlobe({ sections, globeConfig = defaultGlobeConfig, className }: ScrollGlobeProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [globeTransform, setGlobeTransform] = useState("");
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationFrameId = useRef<number>();

  const calculatedPositions = useMemo(() => {
    return globeConfig.positions.map(pos => ({
      top: parsePercent(pos.top),
      left: parsePercent(pos.left),
      scale: pos.scale
    }));
  }, [globeConfig.positions]);

  const updateScrollPosition = useCallback(() => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = Math.min(Math.max(scrollTop / docHeight, 0), 1);
    setScrollProgress(progress);

    const viewportCenter = window.innerHeight / 2;
    let newActiveSection = 0;
    let minDistance = Infinity;

    sectionRefs.current.forEach((ref, index) => {
      if (ref) {
        const rect = ref.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const distance = Math.abs(sectionCenter - viewportCenter);
        if (distance < minDistance) {
          minDistance = distance;
          newActiveSection = index;
        }
      }
    });

    const currentPos = calculatedPositions[newActiveSection];
    const transform = `translate3d(${currentPos.left}vw, ${currentPos.top}vh, 0) translate3d(-50%, -50%, 0) scale3d(${currentPos.scale}, ${currentPos.scale}, 1)`;
    setGlobeTransform(transform);
    setActiveSection(newActiveSection);
  }, [calculatedPositions]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        animationFrameId.current = requestAnimationFrame(() => {
          updateScrollPosition();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    updateScrollPosition();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [updateScrollPosition]);

  useEffect(() => {
    const initialPos = calculatedPositions[0];
    const initialTransform = `translate3d(${initialPos.left}vw, ${initialPos.top}vh, 0) translate3d(-50%, -50%, 0) scale3d(${initialPos.scale}, ${initialPos.scale}, 1)`;
    setGlobeTransform(initialTransform);
  }, [calculatedPositions]);

  return (
    <div ref={undefined} className={cn("relative bg-background text-foreground overflow-x-hidden", className)}>
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-50 bg-muted/30">
        <div
          className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* Navigation dots */}
      <div className="fixed right-3 sm:right-5 lg:right-8 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end gap-3 sm:gap-4">
        <div className="flex flex-col items-end gap-3 sm:gap-4">
          {sections.map((section, index) => (
            <div key={section.id} className="flex items-center gap-2 group">
              <div className="overflow-hidden">
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 transition-all duration-300",
                  activeSection === index ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                )}>
                  <div className={cn("w-1 h-1 rounded-full", activeSection === index ? "bg-primary" : "bg-muted-foreground/40")} />
                  <span className="text-[10px] sm:text-xs font-medium text-foreground/80 whitespace-nowrap">
                    {section.badge || `Section ${index + 1}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={cn(
                  "relative w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 rounded-full border-2 transition-all duration-300 hover:scale-125",
                  "before:absolute before:inset-0 before:rounded-full before:transition-all before:duration-300",
                  activeSection === index
                    ? "bg-primary border-primary shadow-lg before:animate-ping before:bg-primary/20"
                    : "bg-transparent border-muted-foreground/40 hover:border-primary/60 hover:bg-primary/10"
                )}
                aria-label={`Go to ${section.badge || `section ${index + 1}`}`}
              />
            </div>
          ))}
        </div>
        <div className="absolute top-0 bottom-0 right-[3.5px] sm:right-[4.5px] lg:right-[5.5px] w-px bg-gradient-to-b from-transparent via-muted-foreground/20 to-transparent -z-10" />
      </div>

      {/* Globe */}
      <div
        className="fixed inset-0 z-10 pointer-events-none will-change-transform"
        style={{
          transform: globeTransform,
          transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="w-[250px] h-[250px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px] -translate-x-1/2 -translate-y-1/2 opacity-30 sm:opacity-40">
          <Globe />
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, index) => (
        <div
          key={section.id}
          ref={(el) => (sectionRefs.current[index] = el)}
          className={cn(
            "relative min-h-screen flex flex-col justify-center px-4 sm:px-6 md:px-8 lg:px-12 z-20 py-12 sm:py-16 lg:py-20",
            "w-full max-w-full overflow-hidden",
            section.align === 'center' && "items-center text-center",
            section.align === 'right' && "items-end text-right",
            section.align !== 'center' && section.align !== 'right' && "items-start text-left"
          )}
        >
          <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl space-y-4 sm:space-y-6 lg:space-y-8">
            {section.badge && (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-medium text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {section.badge}
              </span>
            )}

            <div>
              {section.subtitle ? (
                <div className="space-y-1 sm:space-y-2">
                  <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
                    {section.title}
                  </h2>
                  <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-primary">
                    {section.subtitle}
                  </h2>
                </div>
              ) : (
                <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
                  {section.title}
                </h2>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed max-w-lg sm:max-w-xl">
                {section.description}
              </p>
              {index === 0 && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground/60">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-accent" />
                    Interactive Experience
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    Scroll to Explore
                  </span>
                </div>
              )}
            </div>

            {section.features && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-2 sm:pt-4">
                {section.features.map((feature, featureIndex) => (
                  <div
                    key={featureIndex}
                    className="group p-3 sm:p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary mt-1.5 sm:mt-2 group-hover:scale-125 transition-transform" />
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-foreground">{feature.title}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {section.actions && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                {section.actions.map((action, actionIndex) => (
                  <button
                    key={actionIndex}
                    onClick={action.onClick}
                    className={cn(
                      "relative px-5 sm:px-6 lg:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 overflow-hidden",
                      action.variant === 'primary'
                        ? "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 hover:scale-105"
                        : "border border-border/50 text-foreground hover:bg-card/80 hover:border-primary/30 backdrop-blur-sm"
                    )}
                  >
                    {action.label}
                    {action.variant === 'primary' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export { ScrollGlobe };
export type { ScrollGlobeProps };
export default ScrollGlobe;
