import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { HistoricalCandle, HistoricalInterval } from '../../services/api';

export interface PriceDataPoint {
  time: string;
  ltp: number;
  bid: number;
  ask: number;
  timestamp: number;
  callPrice?: number;
  putPrice?: number;
}

interface StrategyPriceChartProps {
  data: PriceDataPoint[];
  historicalData?: HistoricalCandle[];
  interval?: HistoricalInterval;
  breakevenPoints?: { upper: number; lower: number }; // Breakeven price levels
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  ltp?: number;
  bid?: number;
  ask?: number;
  close?: number; // For historical data
  high?: number;
  low?: number;
  open?: number;
  volume?: number;
  callPrice?: number;
  putPrice?: number;
  type: 'historical' | 'realtime';
}

export default function StrategyPriceChart({ 
  data, 
  historicalData = [], 
  interval = 'minute',
  breakevenPoints
}: StrategyPriceChartProps) {
  // Combine historical and real-time data
  const chartData = useMemo(() => {
    const combined: ChartDataPoint[] = [];

    // Add historical data points
    historicalData.forEach((candle) => {
      const timestamp = new Date(candle.timestamp).getTime();
      combined.push({
        time: new Date(candle.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          ...(interval === 'minute' && { second: '2-digit' }),
        }),
        timestamp,
        close: candle.close,
        high: candle.high,
        low: candle.low,
        open: candle.open,
        volume: candle.volume,
        type: 'historical',
      });
    });

    // Add real-time data points
    data.forEach((point) => {
      combined.push({
        time: new Date(point.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        timestamp: point.timestamp,
        ltp: point.ltp,
        bid: point.bid,
        ask: point.ask,
        callPrice: point.callPrice,
        putPrice: point.putPrice,
        type: 'realtime',
      });
    });

    // Sort by timestamp
    combined.sort((a, b) => a.timestamp - b.timestamp);

    // Limit to last 200 points for performance
    return combined.slice(-200);
  }, [data, historicalData, interval]);

  if (chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-terminal-text/50 text-xs">
        Waiting for price data...
      </div>
    );
  }

  // Check if we have historical data
  const hasHistoricalData = historicalData.length > 0;

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            dataKey="time"
            stroke="#8b949e"
            style={{ fontSize: '10px' }}
            interval="preserveStartEnd"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#8b949e"
            style={{ fontSize: '10px' }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '4px',
              color: '#c9d1d9',
              fontSize: '11px',
            }}
            labelStyle={{ color: '#58a6ff' }}
            formatter={(value: number, name: string) => {
              if (typeof value === 'number') {
                return [value.toFixed(2), name];
              }
              return [value, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            iconType="line"
          />
          {/* Historical close price line - Only show this */}
          {hasHistoricalData && (
            <Line
              type="monotone"
              dataKey="close"
              stroke="#58a6ff"
              strokeWidth={2}
              dot={false}
              name="Historical Close"
              isAnimationActive={false}
              connectNulls={false}
            />
          )}
          {/* Breakeven Points - Upper */}
          {breakevenPoints && (
            <ReferenceLine
              y={breakevenPoints.upper}
              stroke="#fbbf24"
              strokeWidth={1.5}
              strokeDasharray="8 4"
              label={{ value: `Upper BE: ${breakevenPoints.upper.toFixed(2)}`, position: 'right', fill: '#fbbf24', fontSize: '10px' }}
            />
          )}
          {/* Breakeven Points - Lower */}
          {breakevenPoints && (
            <ReferenceLine
              y={breakevenPoints.lower}
              stroke="#fbbf24"
              strokeWidth={1.5}
              strokeDasharray="8 4"
              label={{ value: `Lower BE: ${breakevenPoints.lower.toFixed(2)}`, position: 'right', fill: '#fbbf24', fontSize: '10px' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

