import { useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ArbitrageStock } from '../../store/arbitrageStore';
import { formatPrice, formatNumber } from '../../utils/formatters';
import { ArbitrageColumnKey } from '../panels/ArbitrageColumnSelector';

interface ArbitrageTableProps {
  stocks: ArbitrageStock[];
  visibleColumns: Set<ArbitrageColumnKey>;
  onRowClick?: (symbol: string) => void;
}

export default function ArbitrageTable({ stocks, visibleColumns, onRowClick }: ArbitrageTableProps) {
  const gridRef = useRef<AgGridReact>(null);

  const getArbitrageColor = (opportunity: string) => {
    switch (opportunity) {
      case 'BUY_NSE_SELL_BSE':
      case 'BUY_BSE_SELL_NSE':
        return 'text-terminal-green';
      case 'NO_ARBITRAGE':
        return 'text-terminal-text/50';
      default:
        return 'text-terminal-red';
    }
  };

  const getArbitrageText = (opportunity: string) => {
    switch (opportunity) {
      case 'BUY_NSE_SELL_BSE':
        return 'Buy NSE, Sell BSE';
      case 'BUY_BSE_SELL_NSE':
        return 'Buy BSE, Sell NSE';
      case 'NO_ARBITRAGE':
        return 'No Arbitrage';
      case 'NSE_NOT_AVAILABLE':
        return 'NSE Not Available';
      case 'BSE_NOT_AVAILABLE':
        return 'BSE Not Available';
      case 'NO_DATA':
        return 'No Data';
      default:
        return opportunity;
    }
  };

  const allColumnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Symbol',
      field: 'symbol',
      width: 120,
      minWidth: 100,
      pinned: 'left',
      colId: 'symbol',
      cellRenderer: (params: any) => (
        <span className="font-semibold text-terminal-accent">{params.value}</span>
      ),
    },
    {
      headerName: 'Name',
      field: 'name',
      width: 200,
      minWidth: 150,
      colId: 'name',
      cellRenderer: (params: any) => (
        <span className="text-terminal-text/80">{params.value || '-'}</span>
      ),
    },
    {
      headerName: 'NSE Price',
      field: 'nse.lastPrice',
      width: 120,
      minWidth: 100,
      colId: 'nsePrice',
      cellRenderer: (params: any) => {
        const price = params.data?.nse?.lastPrice;
        return price ? formatPrice(price) : '-';
      },
    },
    {
      headerName: 'BSE Price',
      field: 'bse.lastPrice',
      width: 120,
      minWidth: 100,
      colId: 'bsePrice',
      cellRenderer: (params: any) => {
        const price = params.data?.bse?.lastPrice;
        return price ? formatPrice(price) : '-';
      },
    },
    {
      headerName: 'Difference',
      field: 'priceDiff',
      width: 120,
      minWidth: 100,
      colId: 'difference',
      cellRenderer: (params: any) => {
        const stock = params.data as ArbitrageStock;
        if (!stock.nse || !stock.bse) return '-';
        const diff = Math.abs(stock.priceDiff);
        const colorClass = stock.priceDiff > 0 ? 'text-terminal-green' : stock.priceDiff < 0 ? 'text-terminal-red' : 'text-terminal-text';
        return <span className={`font-semibold ${colorClass}`}>{formatPrice(diff)}</span>;
      },
    },
    {
      headerName: 'Diff %',
      field: 'priceDiffPercent',
      width: 110,
      minWidth: 90,
      colId: 'diffPercent',
      cellRenderer: (params: any) => {
        const stock = params.data as ArbitrageStock;
        if (!stock.nse || !stock.bse) return '-';
        const sign = stock.priceDiffPercent > 0 ? '+' : '';
        const colorClass = stock.priceDiffPercent > 0 ? 'text-terminal-green' : stock.priceDiffPercent < 0 ? 'text-terminal-red' : 'text-terminal-text';
        return (
          <span className={`font-semibold ${colorClass}`}>
            {sign}{stock.priceDiffPercent.toFixed(2)}%
          </span>
        );
      },
    },
    {
      headerName: 'Opportunity',
      field: 'arbitrageOpportunity',
      width: 180,
      minWidth: 150,
      colId: 'opportunity',
      cellRenderer: (params: any) => {
        const opportunity = params.value || 'NO_DATA';
        return (
          <span className={getArbitrageColor(opportunity)}>
            {getArbitrageText(opportunity)}
          </span>
        );
      },
    },
    {
      headerName: 'NSE Volume',
      field: 'nse.volume',
      width: 130,
      minWidth: 110,
      colId: 'nseVolume',
      cellRenderer: (params: any) => {
        const volume = params.data?.nse?.volume;
        return volume ? formatNumber(volume) : '-';
      },
    },
    {
      headerName: 'BSE Volume',
      field: 'bse.volume',
      width: 130,
      minWidth: 110,
      colId: 'bseVolume',
      cellRenderer: (params: any) => {
        const volume = params.data?.bse?.volume;
        return volume ? formatNumber(volume) : '-';
      },
    },
  ], []);

  // Filter columns based on visibility
  const columnDefs: ColDef[] = useMemo(() => {
    return allColumnDefs.filter(col => {
      const colId = col.colId as ArbitrageColumnKey;
      // Always show symbol
      if (colId === 'symbol') {
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
  }, [stocks]);

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
          rowData={stocks}
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
            const symbol = event.data?.symbol;
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

