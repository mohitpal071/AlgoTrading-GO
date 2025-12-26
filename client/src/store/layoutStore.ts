import { create } from 'zustand';
import { Layout } from 'react-grid-layout';

export type PanelId = 'watchlist' | 'optionChain' | 'positions' | 'orders';

export interface PanelConfig {
  id: PanelId;
  title: string;
  visible: boolean;
  minimized: boolean;
  maximized: boolean;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
  };
  savedLayout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

interface LayoutStore {
  panels: Map<PanelId, PanelConfig>;
  layouts: { lg: Layout[] };
  maximizedPanel: PanelId | null;
  availableHeight: number;
  
  // Actions
  togglePanel: (id: PanelId) => void;
  minimizePanel: (id: PanelId) => void;
  maximizePanel: (id: PanelId) => void;
  restorePanel: (id: PanelId) => void;
  updateLayout: (layouts: Layout[]) => void;
  setAvailableHeight: (height: number) => void;
  resetLayout: () => void;
}

const defaultPanels: PanelConfig[] = [
  {
    id: 'watchlist',
    title: 'WATCHLIST',
    visible: true,
    minimized: false,
    maximized: false,
    layout: { x: 0, y: 0, w: 12, h: 3, minW: 6, minH: 2, maxW: 12 },
  },
  {
    id: 'optionChain',
    title: 'OPTION CHAIN',
    visible: true,
    minimized: false,
    maximized: false,
    layout: { x: 0, y: 3, w: 12, h: 7, minW: 6, minH: 4, maxW: 12 },
  },
  {
    id: 'positions',
    title: 'POSITIONS',
    visible: true,
    minimized: false,
    maximized: false,
    layout: { x: 0, y: 10, w: 6, h: 2, minW: 2, minH: 2, maxW: 12 },
  },
  {
    id: 'orders',
    title: 'ORDERS',
    visible: true,
    minimized: false,
    maximized: false,
    layout: { x: 6, y: 10, w: 6, h: 2, minW: 4, minH: 1, maxW: 12 },
  },
];

function createLayouts(panels: PanelConfig[], maximizedPanel: PanelId | null, availableHeight: number = 600): Layout[] {
  if (maximizedPanel) {
    // When a panel is maximized, only show that panel - take full screen
    const maximized = Array.from(panels.values()).find(p => p.id === maximizedPanel && p.visible);
    if (maximized) {
      // Calculate rows needed to fill available height (assuming 30px row height)
      const rows = Math.ceil(availableHeight / 30);
      return [{
        i: maximized.id,
        x: 0,
        y: 0,
        w: 12,
        h: rows,
        minW: 12,
        minH: rows,
        maxW: 12,
        maxH: rows,
        static: false,
      }];
    }
  }
  
  return Array.from(panels.values())
    .filter(p => p.visible && !p.minimized && !p.maximized)
    .map(p => ({
      i: p.id,
      x: p.layout.x,
      y: p.layout.y,
      w: p.layout.w,
      h: p.layout.h,
      minW: p.layout.minW,
      minH: p.layout.minH,
      maxW: p.layout.maxW,
      maxH: p.layout.maxH,
    }));
}

export const useLayoutStore = create<LayoutStore>((set, get) => {
  const panelsMap = new Map<PanelId, PanelConfig>();
  defaultPanels.forEach(p => panelsMap.set(p.id, p));
  
  return {
    panels: panelsMap,
    layouts: { lg: createLayouts(defaultPanels, null, 600) },
    maximizedPanel: null,
    availableHeight: 600,

    togglePanel: (id: PanelId) => {
      const { panels, maximizedPanel } = get();
      const panel = panels.get(id);
      if (panel) {
        const updated = new Map(panels);
        const newVisible = !panel.visible;
        updated.set(id, { 
          ...panel, 
          visible: newVisible, 
          minimized: false,
          maximized: false,
        });
        const newMaximized = newVisible && maximizedPanel === id ? null : maximizedPanel;
        const { availableHeight } = get();
        set({
          panels: updated,
          maximizedPanel: newMaximized,
          layouts: { lg: createLayouts(Array.from(updated.values()), newMaximized, availableHeight) },
        });
      }
    },

    minimizePanel: (id: PanelId) => {
      const { panels, maximizedPanel } = get();
      const panel = panels.get(id);
      if (panel && panel.visible && !panel.minimized) {
        const updated = new Map(panels);
        updated.set(id, { ...panel, minimized: true, maximized: false });
        const newMaximized = maximizedPanel === id ? null : maximizedPanel;
        const { availableHeight } = get();
        set({
          panels: updated,
          maximizedPanel: newMaximized,
          layouts: { lg: createLayouts(Array.from(updated.values()), newMaximized, availableHeight) },
        });
      }
    },

    maximizePanel: (id: PanelId) => {
      const { panels, maximizedPanel } = get();
      const panel = panels.get(id);
      if (panel && panel.visible) {
        const updated = new Map(panels);
        
        // Save current layout if not already maximized
        if (!panel.maximized && !maximizedPanel) {
          updated.set(id, {
            ...panel,
            savedLayout: { ...panel.layout },
            maximized: true,
            minimized: false,
          });
        } else if (maximizedPanel === id) {
          // Restore from maximized
          const savedLayout = panel.savedLayout || defaultPanels.find(p => p.id === id)!.layout;
          updated.set(id, {
            ...panel,
            layout: savedLayout,
            maximized: false,
          });
        } else {
          // Maximize different panel
          // Restore previously maximized panel
          if (maximizedPanel) {
            const prevPanel = updated.get(maximizedPanel);
            if (prevPanel && prevPanel.savedLayout) {
              updated.set(maximizedPanel, {
                ...prevPanel,
                layout: prevPanel.savedLayout,
                maximized: false,
              });
            }
          }
          // Maximize new panel
          updated.set(id, {
            ...panel,
            savedLayout: { ...panel.layout },
            maximized: true,
            minimized: false,
          });
        }
        
        const newMaximized = updated.get(id)?.maximized ? id : null;
        const { availableHeight } = get();
        set({
          panels: updated,
          maximizedPanel: newMaximized,
          layouts: { lg: createLayouts(Array.from(updated.values()), newMaximized, availableHeight) },
        });
      }
    },

    restorePanel: (id: PanelId) => {
      const { panels, maximizedPanel } = get();
      const panel = panels.get(id);
      if (panel) {
        const updated = new Map(panels);
        const savedLayout = panel.savedLayout || defaultPanels.find(p => p.id === id)!.layout;
        updated.set(id, { 
          ...panel, 
          visible: true, 
          minimized: false,
          maximized: false,
          layout: savedLayout,
        });
        const newMaximized = maximizedPanel === id ? null : maximizedPanel;
        const { availableHeight } = get();
        set({
          panels: updated,
          maximizedPanel: newMaximized,
          layouts: { lg: createLayouts(Array.from(updated.values()), newMaximized, availableHeight) },
        });
      }
    },

    setAvailableHeight: (height: number) => {
      const { panels, maximizedPanel } = get();
      set({
        availableHeight: height,
        layouts: { lg: createLayouts(Array.from(panels.values()), maximizedPanel, height) },
      });
    },

    updateLayout: (layouts: Layout[]) => {
      const { panels, maximizedPanel } = get();
      const updated = new Map(panels);
      
      layouts.forEach(layout => {
        const panel = updated.get(layout.i as PanelId);
        if (panel && !panel.maximized) {
          updated.set(layout.i as PanelId, {
            ...panel,
            layout: {
              ...panel.layout,
              x: layout.x,
              y: layout.y,
              w: layout.w,
              h: layout.h,
            },
          });
        }
      });

      set({
        panels: updated,
        layouts: { lg: layouts },
      });
    },

    resetLayout: () => {
      const panelsMap = new Map<PanelId, PanelConfig>();
      defaultPanels.forEach(p => panelsMap.set(p.id, { 
        ...p, 
        visible: true, 
        minimized: false,
        maximized: false,
        savedLayout: undefined,
      }));
      set({
        panels: panelsMap,
        maximizedPanel: null,
        layouts: { lg: createLayouts(defaultPanels, null, 600) },
      });
    },
  };
});

