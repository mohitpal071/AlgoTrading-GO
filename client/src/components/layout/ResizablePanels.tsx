import { ReactNode, useState, useRef, useEffect } from 'react';

interface Panel {
  id: string;
  title: string;
  component: ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
}

interface ResizablePanelsProps {
  panels: Panel[];
  layout?: 'horizontal' | 'vertical' | 'grid';
}

export default function ResizablePanels({ panels, layout = 'grid' }: ResizablePanelsProps) {
  const [sizes, setSizes] = useState<Map<string, { width: number; height: number }>>(
    new Map(panels.map(p => [p.id, { width: p.defaultWidth || 400, height: p.defaultHeight || 300 }]))
  );
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (panelId: string, edge: 'right' | 'bottom' | 'corner') => {
    setIsDragging(`${panelId}-${edge}`);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const [panelId, edge] = isDragging.split('-');
      const containerRect = containerRef.current.getBoundingClientRect();
      const currentSize = sizes.get(panelId) || { width: 400, height: 300 };

      if (edge === 'right' || edge === 'corner') {
        const newWidth = e.clientX - containerRect.left;
        if (newWidth > 200 && newWidth < containerRect.width - 200) {
          setSizes(new Map(sizes).set(panelId, { ...currentSize, width: newWidth }));
        }
      }
      if (edge === 'bottom' || edge === 'corner') {
        const newHeight = e.clientY - containerRect.top;
        if (newHeight > 150 && newHeight < containerRect.height - 150) {
          setSizes(new Map(sizes).set(panelId, { ...currentSize, height: newHeight }));
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, sizes]);

  if (layout === 'grid') {
    return (
      <div ref={containerRef} className="h-full w-full grid grid-cols-2 grid-rows-2 gap-1 p-1 bg-terminal-bg">
        {panels.map((panel, index) => {
          const size = sizes.get(panel.id) || { width: 400, height: 300 };
          return (
            <div
              key={panel.id}
              className="panel relative overflow-hidden"
              style={{ width: '100%', height: '100%' }}
            >
              <div className="h-8 bg-terminal-border flex items-center justify-between px-2 border-b border-terminal-border">
                <span className="text-xs font-semibold text-terminal-accent">{panel.title}</span>
                <div className="flex gap-1">
                  <button className="w-3 h-3 bg-terminal-green rounded"></button>
                  <button className="w-3 h-3 bg-terminal-red rounded"></button>
                </div>
              </div>
              <div className="h-[calc(100%-2rem)] overflow-auto">
                {panel.component}
              </div>
              {/* Resize handles */}
              {index % 2 === 0 && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-terminal-accent opacity-0 hover:opacity-50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleMouseDown(panel.id, 'right');
                  }}
                />
              )}
              {index < 2 && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-terminal-accent opacity-0 hover:opacity-50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleMouseDown(panel.id, 'bottom');
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col bg-terminal-bg">
      {panels.map((panel) => (
        <div key={panel.id} className="panel flex-1 min-h-0">
          {panel.component}
        </div>
      ))}
    </div>
  );
}

