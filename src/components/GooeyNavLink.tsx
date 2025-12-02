import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

interface GooeyNavLinkProps {
  label: string;
  href: string;
  icon?: LucideIcon;
  onClick?: () => void;
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
}

export function GooeyNavLink({
  label,
  href,
  icon: Icon,
  onClick,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
}: GooeyNavLinkProps) {
  const containerRef = useRef<HTMLLIElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isActive, setIsActive] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  const noise = (n = 1) => n / 2 - Math.random() * n;
  
  const getXY = (distance: number, pointIndex: number, totalPoints: number) => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (i: number, t: number, d: [number, number], r: number) => {
    let rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    };
  };

  const makeParticles = (element: HTMLElement) => {
    const d = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);
    
    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);
      element.classList.remove('active');
      
      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', `${p.scale}`);
        
        // Adapt colors based on theme
        const isDark = resolvedTheme === 'dark';
        const colorMap: Record<number, string> = {
          1: isDark ? '#4CC9E9' : '#0B1247', // cyan or navy
          2: isDark ? '#73EDCF' : '#4CC9E9', // aqua or cyan
          3: isDark ? '#0B1247' : '#73EDCF', // navy or aqua
          4: isDark ? '#FFFFFF' : '#0B1247', // white or navy
        };
        particle.style.setProperty('--color', colorMap[p.color] || (isDark ? '#4CC9E9' : '#0B1247'));
        particle.style.setProperty('--rotate', `${p.rotate}deg`);
        
        point.classList.add('point');
        particle.appendChild(point);
        element.appendChild(particle);
        
        requestAnimationFrame(() => {
          element.classList.add('active');
        });
        
        setTimeout(() => {
          try {
            element.removeChild(particle);
          } catch {
            // do nothing
          }
        }, t);
      }, 30);
    }
  };

  const updateEffectPosition = (element: HTMLElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    
    // Find the parent card container
    const cardContainer = containerRef.current.closest('[data-card-container]');
    if (!cardContainer) return;
    
    const containerRect = (cardContainer as HTMLElement).getBoundingClientRect();
    const pos = element.getBoundingClientRect();
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    };
    
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.innerText = label;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isActive) return;
    
    setIsActive(true);
    const liEl = containerRef.current;
    if (liEl) {
      updateEffectPosition(liEl);
      
      if (filterRef.current) {
        const particles = filterRef.current.querySelectorAll('.particle');
        particles.forEach(p => filterRef.current?.removeChild(p));
      }
      
      if (textRef.current) {
        textRef.current.classList.remove('active');
        void textRef.current.offsetWidth;
        textRef.current.classList.add('active');
      }
      
      if (filterRef.current) {
        makeParticles(filterRef.current);
      }
      
      // Navigate after a short delay to allow animation
      setTimeout(() => {
        navigate(href);
        onClick?.();
        setIsActive(false);
      }, 200);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e as any);
    }
  };

  useEffect(() => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      if (isActive && containerRef.current) {
        const activeLi = containerRef.current;
        updateEffectPosition(activeLi);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [isActive]);

  const isDark = resolvedTheme === 'dark';
  
  return (
    <>
      <style>
        {`
          .gooey-nav-link-${label.replace(/\s+/g, '-').toLowerCase()} {
            position: relative;
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 8px;
            color: hsl(var(--foreground));
            text-shadow: none;
            padding: 0.5rem 0.75rem;
          }
          .gooey-nav-link-${label.replace(/\s+/g, '-').toLowerCase()}:hover {
            background: hsl(var(--muted));
          }
          .gooey-nav-link-${label.replace(/\s+/g, '-').toLowerCase()}.active {
            color: hsl(var(--accent-foreground));
            background: hsl(var(--accent));
          }
          .gooey-nav-link-${label.replace(/\s+/g, '-').toLowerCase()}::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: 8px;
            background: hsl(var(--accent));
            opacity: 0;
            transform: scale(0.95);
            transition: all 0.3s ease;
            z-index: -1;
          }
          .gooey-nav-link-${label.replace(/\s+/g, '-').toLowerCase()}.active::after {
            opacity: 1;
            transform: scale(1);
          }
          .gooey-effect {
            position: absolute;
            opacity: 1;
            pointer-events: none;
            display: grid;
            place-items: center;
            z-index: 1;
          }
          .gooey-effect.text {
            color: hsl(var(--foreground));
            transition: color 0.3s ease;
          }
          .gooey-effect.text.active {
            color: hsl(var(--accent-foreground));
          }
          .gooey-effect.filter {
            filter: blur(7px) contrast(100);
            mix-blend-mode: ${isDark ? 'screen' : 'multiply'};
            opacity: 0.8;
          }
          .gooey-effect.filter::before {
            content: "";
            position: absolute;
            inset: -75px;
            z-index: -2;
            background: transparent;
          }
          .gooey-effect.filter::after {
            content: "";
            position: absolute;
            inset: 0;
            background: hsl(var(--accent));
            transform: scale(0);
            opacity: 0;
            z-index: -1;
            border-radius: 9999px;
          }
          .gooey-effect.active::after {
            animation: pill 0.3s ease both;
          }
          @keyframes pill {
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          .particle,
          .point {
            display: block;
            opacity: 0;
            width: 20px;
            height: 20px;
            border-radius: 9999px;
            transform-origin: center;
          }
          .particle {
            --time: 5s;
            position: absolute;
            top: calc(50% - 8px);
            left: calc(50% - 8px);
            animation: particle calc(var(--time)) ease 1 -350ms;
          }
          .point {
            background: var(--color);
            opacity: 1;
            animation: point calc(var(--time)) ease 1 -350ms;
          }
          @keyframes particle {
            0% {
              transform: rotate(0deg) translate(calc(var(--start-x)), calc(var(--start-y)));
              opacity: 1;
              animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
            }
            70% {
              transform: rotate(calc(var(--rotate) * 0.5)) translate(calc(var(--end-x) * 1.2), calc(var(--end-y) * 1.2));
              opacity: 1;
              animation-timing-function: ease;
            }
            85% {
              transform: rotate(calc(var(--rotate) * 0.66)) translate(calc(var(--end-x)), calc(var(--end-y)));
              opacity: 1;
            }
            100% {
              transform: rotate(calc(var(--rotate) * 1.2)) translate(calc(var(--end-x) * 0.5), calc(var(--end-y) * 0.5));
              opacity: 1;
            }
          }
          @keyframes point {
            0% {
              transform: scale(0);
              opacity: 0;
              animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
            }
            25% {
              transform: scale(calc(var(--scale) * 0.25));
            }
            38% {
              opacity: 1;
            }
            65% {
              transform: scale(var(--scale));
              opacity: 1;
              animation-timing-function: ease;
            }
            85% {
              transform: scale(var(--scale));
              opacity: 1;
            }
            100% {
              transform: scale(0);
              opacity: 0;
            }
          }
        `}
      </style>
      <li
        ref={containerRef}
        className={`gooey-nav-link-${label.replace(/\s+/g, '-').toLowerCase()} ${isActive ? 'active' : ''}`}
        style={{ transform: 'translate3d(0,0,0.01px)', position: 'relative', zIndex: 2 }}
      >
        <a
          href={href}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className="outline-none py-[0.6em] px-[1em] inline-flex items-center gap-1.5 relative z-[3] text-sm sm:text-base w-full max-w-full"
        >
          {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />}
          <span className="truncate block overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
        </a>
        <span className="gooey-effect filter" ref={filterRef} />
        <span className="gooey-effect text" ref={textRef} />
      </li>
    </>
  );
}

