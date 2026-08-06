'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface ResizablePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  storageKey: string;
}

export default function ResizablePanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  storageKey,
}: ResizablePanelProps) {
  const [size, setSize] = useState({ width: 450, height: 650 }); // Default
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [prevDimensions, setPrevDimensions] = useState({ width: 450, height: 650, x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  // Restore sizes from LocalStorage on mount
  useEffect(() => {
    const handleRestore = setTimeout(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        const minW = Math.max(380, Math.round(window.innerWidth * 0.45));
        let currentWidth = minW;
        let currentHeight = 650;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.width && parsed.height) {
            currentWidth = Math.max(minW, Math.min(window.innerWidth * 0.9, parsed.width));
            currentHeight = Math.max(400, Math.min(window.innerHeight * 0.9, parsed.height));
            setSize({ width: currentWidth, height: currentHeight });
          }
          if (parsed.x !== undefined && parsed.y !== undefined) {
            setPosition({
              x: Math.max(10, Math.min(window.innerWidth - currentWidth - 20, parsed.x)),
              y: Math.max(10, Math.min(window.innerHeight - currentHeight - 20, parsed.y)),
            });
          }
        } else {
          // Position on right side of screen
          const startX = Math.max(20, window.innerWidth - currentWidth - 30);
          const startY = 90;
          setPosition({ x: startX, y: startY });
          setSize({ width: currentWidth, height: currentHeight });
        }
      } catch (e) {
        console.error(e);
      }
      setIsInitialized(true);
    }, 0);
    return () => clearTimeout(handleRestore);
  }, [storageKey]);

  const saveDimensions = (w: number, h: number, x: number, y: number) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ width: w, height: h, x, y }));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, action: 'drag' | 'resize', direction?: string) => {
    if (isMaximized && action === 'drag') return;
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.width;
    const startH = size.height;
    const startPosX = position.x;
    const startPosY = position.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (action === 'drag') {
        const newX = Math.max(10, Math.min(window.innerWidth - size.width - 10, startPosX + deltaX));
        const newY = Math.max(10, Math.min(window.innerHeight - size.height - 10, startPosY + deltaY));
        setPosition({ x: newX, y: newY });
      } else if (action === 'resize' && direction) {
        let newW = startW;
        let newH = startH;
        let newX = startPosX;
        let newY = startPosY;

        const minW = Math.max(380, Math.round(window.innerWidth * 0.45));
        const minH = 400;
        const maxW = window.innerWidth * 0.9;
        const maxH = window.innerHeight * 0.9;

        if (direction.includes('e')) {
          newW = Math.max(minW, Math.min(maxW, startW + deltaX));
        }
        if (direction.includes('w')) {
          const possibleW = startW - deltaX;
          if (possibleW >= minW && possibleW <= maxW) {
            newW = possibleW;
            newX = startPosX + deltaX;
          }
        }
        if (direction.includes('s')) {
          newH = Math.max(minH, Math.min(maxH, startH + deltaY));
        }
        if (direction.includes('n')) {
          const possibleH = startH - deltaY;
          if (possibleH >= minH && possibleH <= maxH) {
            newH = possibleH;
            newY = startPosY + deltaY;
          }
        }

        setSize({ width: newW, height: newH });
        setPosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      saveDimensions(size.width, size.height, position.x, position.y);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      setSize({ width: prevDimensions.width, height: prevDimensions.height });
      setPosition({ x: prevDimensions.x, y: prevDimensions.y });
      setIsMaximized(false);
      saveDimensions(prevDimensions.width, prevDimensions.height, prevDimensions.x, prevDimensions.y);
    } else {
      setPrevDimensions({ width: size.width, height: size.height, x: position.x, y: position.y });
      const maxW = Math.round(window.innerWidth * 0.9);
      const maxH = Math.round(window.innerHeight * 0.9);
      const centerX = Math.round((window.innerWidth - maxW) / 2);
      const centerY = Math.round((window.innerHeight - maxH) / 2);
      
      setSize({ width: maxW, height: maxH });
      setPosition({ x: centerX, y: centerY });
      setIsMaximized(true);
    }
  };

  if (!isOpen || !isInitialized) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 1000,
        transition: 'box-shadow 0.2s ease',
      }}
      className="glass-panel-floating rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl select-none"
    >
      {/* Drag title bar header */}
      <div
        onPointerDown={(e) => handlePointerDown(e, 'drag')}
        onDoubleClick={toggleMaximize}
        className="flex justify-between items-center border-b border-white/10 p-4 cursor-move bg-zinc-950/40 select-none flex-shrink-0"
      >
        <div>
          <h3 className="font-bold text-xs uppercase text-white tracking-widest">
            {title}
          </h3>
          <span className="text-[8px] text-zinc-500 uppercase block tracking-wider mt-0.5">
            {subtitle}
          </span>
        </div>
        <div className="flex items-center space-x-2.5 pointer-events-auto">
          <button
            onClick={toggleMaximize}
            className="p-1 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition"
            title={isMaximized ? "Restore Size" : "Maximize Panel"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dynamic Content Body */}
      <div className="flex-1 overflow-y-auto p-5 min-h-0 relative select-text">
        {children}
      </div>

      {/* Resize Borders (Visible handles on hover) */}
      {!isMaximized && (
        <>
          {/* Edge guides */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'resize', 'n')}
            className="absolute top-0 left-2 right-2 h-1 cursor-ns-resize hover:bg-cyan-500/30 transition duration-150 z-[1002]"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'resize', 's')}
            className="absolute bottom-0 left-2 right-2 h-1 cursor-ns-resize hover:bg-cyan-500/30 transition duration-150 z-[1002]"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'resize', 'w')}
            className="absolute top-2 bottom-2 left-0 w-1 cursor-ew-resize hover:bg-cyan-500/30 transition duration-150 z-[1002]"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'resize', 'e')}
            className="absolute top-2 bottom-2 right-0 w-1 cursor-ew-resize hover:bg-cyan-500/30 transition duration-150 z-[1002]"
          />

          {/* Corners border handles with hover transitions */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'resize', 'nw')}
            className="absolute top-0 left-0 w-3.5 h-3.5 cursor-nwse-resize hover:border-t-2 hover:border-l-2 hover:border-cyan-400 rounded-tl transition-all duration-150 z-[1003]"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'resize', 'ne')}
            className="absolute top-0 right-0 w-3.5 h-3.5 cursor-nesw-resize hover:border-t-2 hover:border-r-2 hover:border-cyan-400 rounded-tr transition-all duration-150 z-[1003]"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'resize', 'sw')}
            className="absolute bottom-0 left-0 w-3.5 h-3.5 cursor-nesw-resize hover:border-b-2 hover:border-l-2 hover:border-cyan-400 rounded-bl transition-all duration-150 z-[1003]"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'resize', 'se')}
            className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-nwse-resize hover:border-b-2 hover:border-r-2 hover:border-cyan-400 rounded-br transition-all duration-150 z-[1003]"
          />
        </>
      )}
    </div>
  );
}
