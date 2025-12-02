import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GooeyNavLink } from "./GooeyNavLink";

export interface NavCard {
  label: string;
  links: Array<{
    label: string;
    href: string;
    icon?: LucideIcon;
  }>;
  color?: string;
}

interface CardNavigationProps {
  navCards?: NavCard[];
  ctaButton?: {
    label: string;
    onClick: () => void;
  };
  showOnScroll?: boolean;
  scrollThreshold?: number;
}

export function CardNavigation({
  navCards = [],
  ctaButton,
  showOnScroll = true,
  scrollThreshold = 100,
}: CardNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(!showOnScroll);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? "/dr_logo_branca.png" : "/dr_logo.png";

  // Scroll reveal logic
  useEffect(() => {
    if (!showOnScroll) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < scrollThreshold) {
        setIsVisible(false);
      } else {
        // Hide on scroll down, show on scroll up
        if (currentScrollY > lastScrollY && currentScrollY > scrollThreshold) {
          setIsVisible(false);
        } else if (currentScrollY < lastScrollY) {
          setIsVisible(true);
        }
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showOnScroll, scrollThreshold, lastScrollY]);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  if (!isVisible || navCards.length === 0) {
    return null;
  }

  return (
    <div
      ref={navRef}
      className={cn(
        "fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[800px] z-[100] box-border transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
      )}
    >
      <div
        className={cn(
          "block h-[60px] p-0 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-lg relative transition-[height] duration-300 ease-out",
          isOpen && "h-auto min-h-[60px] max-h-[calc(100vh-48px)] overflow-hidden"
        )}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 h-[60px] flex items-center justify-between px-3 sm:px-[1.1rem] py-2 z-10">
          {/* Hamburger menu */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "h-full flex flex-col items-center justify-center cursor-pointer gap-1.5 p-2 rounded-lg hover:bg-muted/50 transition-all duration-200 order-2 sm:order-1",
              isOpen && "open"
            )}
            aria-label="Toggle navigation menu"
          >
            <span
              className={cn(
                "w-[30px] h-0.5 bg-foreground transition-all duration-300 origin-center",
                isOpen && "translate-y-[8px] rotate-45"
              )}
            />
            <span
              className={cn(
                "w-[30px] h-0.5 bg-foreground transition-all duration-300 origin-center",
                isOpen && "opacity-0"
              )}
            />
            <span
              className={cn(
                "w-[30px] h-0.5 bg-foreground transition-all duration-300 origin-center",
                isOpen && "-translate-y-[8px] -rotate-45"
              )}
            />
          </button>

          {/* Logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center drop-shadow-sm order-1 sm:order-none">
            <img
              src={logoSrc}
              alt="Dr. HO Logo"
              className="h-6 sm:h-7 object-contain"
            />
          </div>

          {/* CTA Button */}
          {ctaButton && (
            <button
              onClick={ctaButton.onClick}
              className="hidden sm:flex bg-foreground text-background border-none rounded-[calc(0.75rem-0.35rem)] px-4 h-full font-medium cursor-pointer transition-colors hover:bg-foreground/90 items-center"
            >
              {ctaButton.label}
            </button>
          )}
        </div>

        {/* Navigation content */}
        <div
          className={cn(
            "absolute left-0 right-0 top-[60px] p-2 flex flex-col sm:flex-row items-stretch sm:items-start gap-2 sm:gap-3 transition-[opacity,visibility,max-height] duration-300 ease-out",
            isOpen
              ? "visible opacity-100 pointer-events-auto max-h-[calc(100vh-120px)] sm:max-h-[calc(100vh-140px)] overflow-y-auto"
              : "invisible opacity-0 pointer-events-none max-h-0 overflow-hidden"
          )}
        >
          {navCards.map((card, index) => (
            <div
              key={index}
              data-card-container
              className="h-auto sm:h-full flex-1 min-w-0 max-w-full min-h-[120px] sm:min-h-[180px] rounded-[calc(0.75rem-0.2rem)] relative flex flex-col p-3 sm:p-4 gap-2 select-none bg-card/95 backdrop-blur-sm border border-border/20 hover:bg-card transition-colors duration-200 overflow-hidden"
              style={{ minHeight: 'fit-content' }}
            >
              <h3 className="font-normal text-lg sm:text-xl md:text-[22px] leading-tight tracking-[-0.5px] text-foreground truncate">
                {card.label}
              </h3>
              <ul className="mt-auto flex flex-col gap-0.5 list-none p-0 m-0 relative overflow-hidden">
                {card.links.map((link, linkIndex) => (
                  <GooeyNavLink
                    key={linkIndex}
                    label={link.label}
                    href={link.href}
                    icon={link.icon}
                    onClick={() => setIsOpen(false)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

