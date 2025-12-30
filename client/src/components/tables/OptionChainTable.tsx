import { useMemo } from 'react';
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
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Strike',
      field: 'strike',
      width: 100,
      pinned: 'left',
      cellRenderer: (params: any) => (
        <span className="font-semibold">{formatStrike(params.value)}</span>
      ),
    },
    {
      headerName: 'Call',
      children: [
        {
          headerName: 'LTP',
          field: 'call.lastPrice',
          width: 100,
          cellRenderer: (params: any) => {
            const price = params.data?.call?.lastPrice || 0;
            return <span className={getPriceChangeClass(price)}>{formatPrice(price)}</span>;
          },
        },
        {
          headerName: 'IV',
          field: 'call.iv',
          width: 80,
          cellRenderer: (params: any) => {
            const iv = params.data?.call?.iv || 0;
            return iv > 0 ? `${(iv * 100).toFixed(2)}%` : '-';
          },
        },
        {
          headerName: 'Delta',
          field: 'call.delta',
          width: 80,
          cellRenderer: (params: any) => {
            const delta = params.data?.call?.delta || 0;
            return delta !== 0 ? delta.toFixed(3) : '-';
          },
        },
        {
          headerName: 'Gamma',
          field: 'call.gamma',
          width: 80,
          cellRenderer: (params: any) => {
            const gamma = params.data?.call?.gamma || 0;
            return gamma !== 0 ? gamma.toFixed(4) : '-';
          },
        },
        {
          headerName: 'Theta',
          field: 'call.theta',
          width: 80,
          cellRenderer: (params: any) => {
            const theta = params.data?.call?.theta || 0;
            return theta !== 0 ? theta.toFixed(2) : '-';
          },
        },
        {
          headerName: 'Vega',
          field: 'call.vega',
          width: 80,
          cellRenderer: (params: any) => {
            const vega = params.data?.call?.vega || 0;
            return vega !== 0 ? vega.toFixed(2) : '-';
          },
        },
        {
          headerName: 'OI',
          field: 'call.oi',
          width: 100,
          cellRenderer: (params: any) => {
            const oi = params.data?.call?.oi || 0;
            return oi > 0 ? oi.toLocaleString() : '-';
          },
        },
        {
          headerName: 'Volume',
          field: 'call.volume',
          width: 100,
          cellRenderer: (params: any) => {
            const volume = params.data?.call?.volume || 0;
            return volume > 0 ? volume.toLocaleString() : '-';
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
          width: 100,
          cellRenderer: (params: any) => {
            const price = params.data?.put?.lastPrice || 0;
            return <span className={getPriceChangeClass(price)}>{formatPrice(price)}</span>;
          },
        },
        {
          headerName: 'IV',
          field: 'put.iv',
          width: 80,
          cellRenderer: (params: any) => {
            const iv = params.data?.put?.iv || 0;
            return iv > 0 ? `${(iv * 100).toFixed(2)}%` : '-';
          },
        },
        {
          headerName: 'Delta',
          field: 'put.delta',
          width: 80,
          cellRenderer: (params: any) => {
            const delta = params.data?.put?.delta || 0;
            return delta !== 0 ? delta.toFixed(3) : '-';
          },
        },
        {
          headerName: 'Gamma',
          field: 'put.gamma',
          width: 80,
          cellRenderer: (params: any) => {
            const gamma = params.data?.put?.gamma || 0;
            return gamma !== 0 ? gamma.toFixed(4) : '-';
          },
        },
        {
          headerName: 'Theta',
          field: 'put.theta',
          width: 80,
          cellRenderer: (params: any) => {
            const theta = params.data?.put?.theta || 0;
            return theta !== 0 ? theta.toFixed(2) : '-';
          },
        },
        {
          headerName: 'Vega',
          field: 'put.vega',
          width: 80,
          cellRenderer: (params: any) => {
            const vega = params.data?.put?.vega || 0;
            return vega !== 0 ? vega.toFixed(2) : '-';
          },
        },
        {
          headerName: 'OI',
          field: 'put.oi',
          width: 100,
          cellRenderer: (params: any) => {
            const oi = params.data?.put?.oi || 0;
            return oi > 0 ? oi.toLocaleString() : '-';
          },
        },
        {
          headerName: 'Volume',
          field: 'put.volume',
          width: 100,
          cellRenderer: (params: any) => {
            const volume = params.data?.put?.volume || 0;
            return volume > 0 ? volume.toLocaleString() : '-';
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

  return (
    <div className="h-full w-full">
      <div className="ag-theme-alpine-dark h-full w-full" style={{ fontSize: '11px' }}>
        <AgGridReact
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
          onRowClicked={(event) => {
            const token = event.data?.call?.instrumentToken || event.data?.put?.instrumentToken;
            if (token && onRowClick) {
              onRowClick(token);
            }
          }}
          getRowStyle={(params) => {
            if (params.node.rowIndex % 2 === 0) {
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

