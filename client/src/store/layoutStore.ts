import { create } from 'zustand';
import { Layout } from 'react-grid-layout';

export type PanelId = 'watchlist' | 'greeks' | 'optionChain' | 'positions' | 'orders';

export interface PanelConfig {
  id: PanelId;
  title: string;
  visible: boolean;
  minimized: boolean;
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
}

interface LayoutStore {
  panels: Map<PanelId, PanelConfig>;
  layouts: { lg: Layout[] };
  
  // Actions
  togglePanel: (id: PanelId) => void;
  minimizePanel: (id: PanelId) => void;
  restorePanel: (id: PanelId) => void;
  updateLayout: (layouts: Layout[]) => void;
  resetLayout: () => void;
}

const defaultPanels: PanelConfig[] = [
  {
    id: 'watchlist',
    title: 'WATCHLIST',
    visible: true,
    minimized: false,
    layout: { x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 1 },
  },
  {
    id: 'greeks',
    title: 'GREEKS',
    visible: true,
    minimized: false,
    layout: { x: 0, y: 2, w: 2, h: 4, minW: 2, minH: 2 },
  },
  {
    id: 'optionChain',
    title: 'OPTION CHAIN',
    visible: true,
    minimized: false,
    layout: { x: 2, y: 2, w: 8, h: 4, minW: 4, minH: 2 },
  },
  {
    id: 'positions',
    title: 'POSITIONS',
    visible: true,
    minimized: false,
    layout: { x: 10, y: 2, w: 2, h: 2, minW: 2, minH: 1 },
  },
  {
    id: 'orders',
    title: 'ORDERS',
    visible: true,
    minimized: false,
    layout: { x: 10, y: 4, w: 2, h: 2, minW: 2, minH: 1 },
  },
];

function createLayouts(panels: PanelConfig[]): Layout[] {
  return panels
    .filter(p => p.visible && !p.minimized)
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
    layouts: { lg: createLayouts(defaultPanels) },

    togglePanel: (id: PanelId) => {
      const { panels } = get();
      const panel = panels.get(id);
      if (panel) {
        const updated = new Map(panels);
        updated.set(id, { ...panel, visible: !panel.visible, minimized: false });
        set({
          panels: updated,
          layouts: { lg: createLayouts(Array.from(updated.values())) },
        });
      }
    },

    minimizePanel: (id: PanelId) => {
      const { panels } = get();
      const panel = panels.get(id);
      if (panel && panel.visible && !panel.minimized) {
        const updated = new Map(panels);
        updated.set(id, { ...panel, minimized: true });
        set({
          panels: updated,
          layouts: { lg: createLayouts(Array.from(updated.values())) },
        });
      }
    },

    restorePanel: (id: PanelId) => {
      const { panels } = get();
      const panel = panels.get(id);
      if (panel) {
        const updated = new Map(panels);
        updated.set(id, { ...panel, visible: true, minimized: false });
        set({
          panels: updated,
          layouts: { lg: createLayouts(Array.from(updated.values())) },
        });
      }
    },

    updateLayout: (layouts: Layout[]) => {
      const { panels } = get();
      const updated = new Map(panels);
      
      layouts.forEach(layout => {
        const panel = updated.get(layout.i as PanelId);
        if (panel) {
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
      defaultPanels.forEach(p => panelsMap.set(p.id, { ...p, visible: true, minimized: false }));
      set({
        panels: panelsMap,
        layouts: { lg: createLayouts(defaultPanels) },
      });
    },
  };
});

