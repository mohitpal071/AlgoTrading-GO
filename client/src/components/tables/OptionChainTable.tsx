import { useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { OptionChainRow } from '../../types/option';
import { formatPrice, formatStrike, getPriceChangeClass } from '../../utils/formatters';

interface OptionChainTableProps {
  chain: OptionChainRow[];
  underlying: string;
  onRowClick?: (token: number) => void;
}

export default function OptionChainTable({ chain, underlying, onRowClick }: OptionChainTableProps) {
  const gridRef = useRef<AgGridReact>(null);

  const columnDefs: ColDef[] = useMemo(() => [
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
          headerName: 'LTP',
          field: 'call.lastPrice',
          flex: 1.2,
          minWidth: 100,
          cellRenderer: (params: any) => {
            const price = params.data?.call?.lastPrice || 0;
            return <span className={getPriceChangeClass(price)}>{formatPrice(price)}</span>;
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

