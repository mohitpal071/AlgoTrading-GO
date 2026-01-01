import { useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { WatchlistItem } from '../../types/instrument';
import { formatPrice, formatNumber, formatChange, formatChangePercent, getPriceChangeClass } from '../../utils/formatters';
import { useWatchlistStore } from '../../store/watchlistStore';
import { WatchlistColumnKey } from '../panels/WatchlistColumnSelector';

interface WatchlistTableProps {
  watchlist: WatchlistItem[];
  visibleColumns: Set<WatchlistColumnKey>;
  onRowClick?: (symbol: string) => void;
}

export default function WatchlistTable({ watchlist, visibleColumns, onRowClick }: WatchlistTableProps) {
  const gridRef = useRef<AgGridReact>(null);
  const { toggleFavorite } = useWatchlistStore();

  const allColumnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Symbol',
      field: 'instrument.symbol',
      width: 150,
      minWidth: 120,
      pinned: 'left',
      colId: 'symbol',
      cellRenderer: (params: any) => {
        const instrument = params.data?.instrument;
        if (!instrument) return '-';
        return (
          <div>
            <div className="font-bold text-xs text-terminal-accent">
              {instrument.symbol}
            </div>
            <div className="text-[10px] text-terminal-text/70">
              {instrument.exchange}
            </div>
          </div>
        );
      },
    },
    {
      headerName: 'LTP',
      field: 'instrument.lastPrice',
      width: 120,
      minWidth: 100,
      colId: 'ltp',
      cellRenderer: (params: any) => {
        const price = params.data?.instrument?.lastPrice || 0;
        const change = params.data?.instrument?.change || 0;
        return (
          <span className={getPriceChangeClass(change)}>
            {formatPrice(price)}
          </span>
        );
      },
    },
    {
      headerName: 'Change',
      field: 'instrument.change',
      width: 120,
      minWidth: 100,
      colId: 'change',
      cellRenderer: (params: any) => {
        const change = params.data?.instrument?.change || 0;
        return (
          <span className={getPriceChangeClass(change)}>
            {formatChange(change)}
          </span>
        );
      },
    },
    {
      headerName: 'Change %',
      field: 'instrument.changePercent',
      width: 110,
      minWidth: 90,
      colId: 'changePercent',
      cellRenderer: (params: any) => {
        const changePercent = params.data?.instrument?.changePercent || 0;
        return (
          <span className={getPriceChangeClass(changePercent)}>
            {formatChangePercent(changePercent)}
          </span>
        );
      },
    },
    {
      headerName: 'Open',
      field: 'instrument.open',
      width: 100,
      minWidth: 80,
      colId: 'open',
      cellRenderer: (params: any) => {
        const open = params.data?.instrument?.open || 0;
        return open > 0 ? formatPrice(open) : '-';
      },
    },
    {
      headerName: 'High',
      field: 'instrument.high',
      width: 100,
      minWidth: 80,
      colId: 'high',
      cellRenderer: (params: any) => {
        const high = params.data?.instrument?.high || 0;
        return high > 0 ? formatPrice(high) : '-';
      },
    },
    {
      headerName: 'Low',
      field: 'instrument.low',
      width: 100,
      minWidth: 80,
      colId: 'low',
      cellRenderer: (params: any) => {
        const low = params.data?.instrument?.low || 0;
        return low > 0 ? formatPrice(low) : '-';
      },
    },
    {
      headerName: 'Close',
      field: 'instrument.close',
      width: 100,
      minWidth: 80,
      colId: 'close',
      cellRenderer: (params: any) => {
        const close = params.data?.instrument?.close || 0;
        return close > 0 ? formatPrice(close) : '-';
      },
    },
    {
      headerName: 'Volume',
      field: 'instrument.volume',
      width: 120,
      minWidth: 100,
      colId: 'volume',
      cellRenderer: (params: any) => {
        const volume = params.data?.instrument?.volume || 0;
        return volume > 0 ? formatNumber(volume) : '-';
      },
    },
    {
      headerName: 'Bid',
      field: 'instrument.bid',
      width: 120,
      minWidth: 100,
      colId: 'bid',
      cellRenderer: (params: any) => {
        const instrument = params.data?.instrument;
        if (!instrument || !instrument.bid || instrument.bid === 0) return '-';
        return (
          <div className="text-terminal-green text-xs">
            {formatPrice(instrument.bid)} × {formatNumber(instrument.bidSize || 0)}
          </div>
        );
      },
    },
    {
      headerName: 'Ask',
      field: 'instrument.ask',
      width: 120,
      minWidth: 100,
      colId: 'ask',
      cellRenderer: (params: any) => {
        const instrument = params.data?.instrument;
        if (!instrument || !instrument.ask || instrument.ask === 0) return '-';
        return (
          <div className="text-terminal-red text-xs">
            {formatPrice(instrument.ask)} × {formatNumber(instrument.askSize || 0)}
          </div>
        );
      },
    },
    {
      headerName: 'OI',
      field: 'instrument.oi',
      width: 100,
      minWidth: 80,
      colId: 'oi',
      cellRenderer: (params: any) => {
        const oi = params.data?.instrument?.oi || 0;
        return oi > 0 ? formatNumber(oi) : '-';
      },
    },
    {
      headerName: 'Favorite',
      field: 'isFavorite',
      width: 80,
      minWidth: 70,
      colId: 'favorite',
      cellRenderer: (params: any) => {
        const isFavorite = params.data?.isFavorite || false;
        const symbol = params.data?.instrument?.symbol;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (symbol) {
                toggleFavorite(symbol);
              }
            }}
            className={`text-xs transition-colors ${
              isFavorite
                ? 'text-terminal-yellow'
                : 'text-terminal-text/30 hover:text-terminal-yellow/50'
            }`}
          >
            ★
          </button>
        );
      },
    },
  ], [toggleFavorite]);

  // Filter columns based on visibility
  const columnDefs: ColDef[] = useMemo(() => {
    return allColumnDefs.filter(col => {
      const colId = col.colId as WatchlistColumnKey;
      // Always show symbol and favorite
      if (colId === 'symbol' || colId === 'favorite') {
        return true;
      }
      return visibleColumns.has(colId);
    });
  }, [allColumnDefs, visibleColumns]);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
  }), []);

  useEffect(() => {
    const handleResize = () => {
      if (gridRef.current?.api) {
        gridRef.current.api.sizeColumnsToFit();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [watchlist]);

  // Refresh grid when columns change
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.refreshHeader();
      gridRef.current.api.sizeColumnsToFit();
    }
  }, [columnDefs]);

  return (
    <div className="h-full w-full">
      <div className="ag-theme-alpine-dark h-full w-full" style={{ fontSize: '11px' }}>
        <AgGridReact
          ref={gridRef}
          rowData={watchlist}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={false}
          rowHeight={32}
          headerHeight={28}
          suppressRowClickSelection={false}
          pagination={false}
          suppressCellFocus={true}
          suppressHorizontalScroll={false}
          onGridReady={(params) => {
            params.api.sizeColumnsToFit();
          }}
          onRowClicked={(event) => {
            const symbol = event.data?.instrument?.symbol;
            if (symbol && onRowClick) {
              onRowClick(symbol);
            }
          }}
          getRowStyle={(params) => {
            if (params.node.rowIndex !== null && params.node.rowIndex % 2 === 0) {
              return { backgroundColor: '#0d1117' };
            }
            return { backgroundColor: '#161b22' };
          }}
          rowStyle={{ cursor: 'pointer', fontSize: '11px' }}
        />
      </div>
    </div>
  );
}

