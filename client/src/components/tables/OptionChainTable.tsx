import { useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { OptionChainRow } from '../../types/option';
import { formatPrice, formatStrike, formatNumber, formatChange, getPriceChangeClass } from '../../utils/formatters';
import { ColumnKey } from '../panels/ColumnSelector';

interface OptionChainTableProps {
  chain: OptionChainRow[];
  underlying: string;
  visibleColumns: Set<ColumnKey>;
  onRowClick?: (token: number) => void;
}

export default function OptionChainTable({ chain, underlying, visibleColumns, onRowClick }: OptionChainTableProps) {
  const gridRef = useRef<AgGridReact>(null);

  const allColumnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Strike',
      field: 'strike',
      width: 100,
      minWidth: 80,
      pinned: 'left',
      cellRenderer: (params: any) => (
        <span className="font-semibold">{formatStrike(params.value)}</span>
      ),
    },
    {
      headerName: 'Straddle',
      field: 'straddlePrice',
      width: 100,
      minWidth: 90,
      pinned: 'left',
      cellRenderer: (params: any) => {
        const callPrice = params.data?.call?.lastPrice || 0;
        const putPrice = params.data?.put?.lastPrice || 0;
        const straddlePrice = callPrice + putPrice;
        return straddlePrice > 0 ? formatPrice(straddlePrice) : '-';
      },
    },
    {
      headerName: 'Straddle Chg',
      field: 'straddleChange',
      width: 100,
      minWidth: 90,
      pinned: 'left',
      cellRenderer: (params: any) => {
        const callPrice = params.data?.call?.lastPrice || 0;
        const putPrice = params.data?.put?.lastPrice || 0;
        const callOpen = params.data?.call?.openPrice || 0;
        const putOpen = params.data?.put?.openPrice || 0;
        const currentStraddle = callPrice + putPrice;
        const openStraddle = callOpen + putOpen;
        const change = currentStraddle - openStraddle;
        
        if (openStraddle === 0 || currentStraddle === 0) return '-';
        
        return (
          <span className={getPriceChangeClass(change)}>
            {formatChange(change)}
          </span>
        );
      },
    },
    {
      headerName: 'Call',
      children: [
        {
          headerName: 'Gamma',
          field: 'call.gamma',
          flex: 1,
          minWidth: 80,
          cellRenderer: (params: any) => {
            const gamma = params.data?.call?.gamma || 0;
            return gamma !== 0 ? gamma.toFixed(4) : '-';
          },
        },
        {
          headerName: 'Theta',
          field: 'call.theta',
          flex: 1,
          minWidth: 80,
          cellRenderer: (params: any) => {
            const theta = params.data?.call?.theta || 0;
            return theta !== 0 ? theta.toFixed(2) : '-';
          },
        },
        {
          headerName: 'Vega',
          field: 'call.vega',
          flex: 1,
          minWidth: 80,
          cellRenderer: (params: any) => {
            const vega = params.data?.call?.vega || 0;
            return vega !== 0 ? vega.toFixed(2) : '-';
          },
        },
        {
          headerName: 'IV',
          field: 'call.iv',
          flex: 1,
          minWidth: 80,
          cellRenderer: (params: any) => {
            const iv = params.data?.call?.iv || 0;
            return iv > 0 ? `${(iv * 100).toFixed(2)}%` : '-';
          },
        },
        {
          headerName: 'LTP',
          field: 'call.lastPrice',
          flex: 1.2,
          minWidth: 100,
          cellRenderer: (params: any) => {
            const price = params.data?.call?.lastPrice || 0;
            return <span className={getPriceChangeClass(price)}>{formatPrice(price)}</span>;
          },
        },
        {
          headerName: 'Volume',
          field: 'call.volume',
          flex: 1,
          minWidth: 80,
          cellRenderer: (params: any) => {
            const volume = params.data?.call?.volume || 0;
            return volume > 0 ? formatNumber(volume) : '-';
          },
        },
        {
          headerName: 'OI',
          field: 'call.oi',
          flex: 1,
          minWidth: 80,
          cellRenderer: (params: any) => {
            const oi = params.data?.call?.oi || 0;
            return oi > 0 ? formatNumber(oi) : '-';
          },
        },
        {
          headerName: 'Chg in OI',
          field: 'call.changeInOI',
          flex: 1,
          minWidth: 90,
          cellRenderer: (params: any) => {
            const call = params.data?.call;
            if (!call || call.oi === 0) return '-';
            const changeInOI = call.oi - (call.previousOI || 0);
            if (changeInOI === 0) return '-';
            return (
              <span className={getPriceChangeClass(changeInOI)}>
                {formatNumber(Math.abs(changeInOI))}
              </span>
            );
          },
        },
      ],
    },
    {
      headerName: 'Put',
      children: [
        {
          headerName: 'LTP',
          field: 'put.lastPrice',
          flex: 1.2,
          minWidth: 100,
          cellRenderer: (params: any) => {
            const price = params.data?.put?.lastPrice || 0;
            return <span className={getPriceChangeClass(price)}>{formatPrice(price)}</span>;
          },
        },
        {
          headerName: 'Volume',
          field: 'put.volume',
          flex: 1,
          minWidth: 80,
          cellRenderer: (params: any) => {
            const volume = params.data?.put?.volume || 0;
            return volume > 0 ? formatNumber(volume) : '-';
          },
        },
        {
          headerName: 'OI',
          field: 'put.oi',
          flex: 1,
          minWidth: 80,
          cellRenderer: (params: any) => {
            const oi = params.data?.put?.oi || 0;
            return oi > 0 ? formatNumber(oi) : '-';
          },
        },
        {
          headerName: 'Chg in OI',
          field: 'put.changeInOI',
          flex: 1,
          minWidth: 90,
          cellRenderer: (params: any) => {
            const put = params.data?.put;
            if (!put || put.oi === 0) return '-';
            const changeInOI = put.oi - (put.previousOI || 0);
            if (changeInOI === 0) return '-';
            return (
              <span className={getPriceChangeClass(changeInOI)}>
                {formatNumber(Math.abs(changeInOI))}
              </span>
            );
          },
        },
        {
          headerName: 'Theta',
          field: 'put.theta',
          flex: 1,
          minWidth: 80,
          cellRenderer: (params: any) => {
            const theta = params.data?.put?.theta || 0;
            return theta !== 0 ? theta.toFixed(2) : '-';
          },
        },
        {
          headerName: 'IV',
          field: 'put.iv',
          flex: 1,
          minWidth: 80,
          cellRenderer: (params: any) => {
            const iv = params.data?.put?.iv || 0;
            return iv > 0 ? `${(iv * 100).toFixed(2)}%` : '-';
          },
        },
        {
          headerName: 'Vega',
          field: 'put.vega',
          flex: 1,
          minWidth: 80,
          cellRenderer: (params: any) => {
            const vega = params.data?.put?.vega || 0;
            return vega !== 0 ? vega.toFixed(2) : '-';
          },
        },
        {
          headerName: 'Gamma',
          field: 'put.gamma',
          flex: 1,
          minWidth: 80,
          cellRenderer: (params: any) => {
            const gamma = params.data?.put?.gamma || 0;
            return gamma !== 0 ? gamma.toFixed(4) : '-';
          },
        },
      ],
    },
  ], []);

  // Filter columns based on visibility
  const columnDefs: ColDef[] = useMemo(() => {
    const filtered = allColumnDefs.map(col => {
      if (col.headerName === 'Strike' || col.headerName === 'Straddle' || col.headerName === 'Straddle Chg') {
        return col; // Always show strike and straddle columns
      }
      
      if (col.headerName === 'Call' && col.children) {
        const filteredChildren = col.children.filter((child: ColDef) => {
          const field = child.field as string;
          if (field === 'call.gamma') return visibleColumns.has('call.gamma');
          if (field === 'call.theta') return visibleColumns.has('call.theta');
          if (field === 'call.vega') return visibleColumns.has('call.vega');
          if (field === 'call.iv') return visibleColumns.has('call.iv');
          if (field === 'call.lastPrice') return visibleColumns.has('call.ltp');
          if (field === 'call.volume') return visibleColumns.has('call.volume');
          if (field === 'call.oi') return visibleColumns.has('call.oi');
          if (field === 'call.changeInOI') return visibleColumns.has('call.changeInOI');
          return false;
        });
        
        if (filteredChildren.length === 0) {
          return null; // Hide entire Call group if no columns visible
        }
        
        return {
          ...col,
          children: filteredChildren,
        };
      }
      
      if (col.headerName === 'Put' && col.children) {
        const filteredChildren = col.children.filter((child: ColDef) => {
          const field = child.field as string;
          if (field === 'put.lastPrice') return visibleColumns.has('put.ltp');
          if (field === 'put.volume') return visibleColumns.has('put.volume');
          if (field === 'put.oi') return visibleColumns.has('put.oi');
          if (field === 'put.changeInOI') return visibleColumns.has('put.changeInOI');
          if (field === 'put.theta') return visibleColumns.has('put.theta');
          if (field === 'put.iv') return visibleColumns.has('put.iv');
          if (field === 'put.vega') return visibleColumns.has('put.vega');
          if (field === 'put.gamma') return visibleColumns.has('put.gamma');
          return false;
        });
        
        if (filteredChildren.length === 0) {
          return null; // Hide entire Put group if no columns visible
        }
        
        return {
          ...col,
          children: filteredChildren,
        };
      }
      
      return col;
    }).filter((col): col is ColDef => col !== null);
    
    return filtered;
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
  }, [chain]);

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
          rowData={chain}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={false}
          rowHeight={24}
          headerHeight={28}
          suppressRowClickSelection={false}
          pagination={false}
          suppressCellFocus={true}
          suppressHorizontalScroll={false}
          onGridReady={(params) => {
            params.api.sizeColumnsToFit();
          }}
          onRowClicked={(event) => {
            const token = event.data?.call?.instrumentToken || event.data?.put?.instrumentToken;
            if (token && onRowClick) {
              onRowClick(token);
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

