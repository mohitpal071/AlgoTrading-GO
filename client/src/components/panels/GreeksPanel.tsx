import { useOptionStore } from '../../store/optionStore';
import { formatPrice } from '../../utils/formatters';

interface GreeksPanelProps {
  selectedToken?: number;
}

export default function GreeksPanel({ selectedToken }: GreeksPanelProps) {
  const { getOptionData } = useOptionStore();
  
  if (!selectedToken) {
    return (
      <div className="h-full flex items-center justify-center text-terminal-text">
        <p>Select an option to view Greeks</p>
      </div>
    );
  }

  const option = getOptionData(selectedToken);
  
  if (!option) {
    return (
      <div className="h-full flex items-center justify-center text-terminal-text">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="h-full p-4 space-y-4">
      <div>
        <div className="text-xs text-terminal-text mb-1">Symbol</div>
        <div className="text-sm font-semibold text-terminal-accent">{option.tradingSymbol}</div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-terminal-text mb-1">Last Price</div>
          <div className="text-lg font-bold">{formatPrice(option.lastPrice)}</div>
        </div>
        <div>
          <div className="text-xs text-terminal-text mb-1">IV</div>
          <div className="text-lg font-bold">
            {option.iv > 0 ? `${(option.iv * 100).toFixed(2)}%` : 'N/A'}
          </div>
        </div>
      </div>

      <div className="border-t border-terminal-border pt-4">
        <div className="text-xs text-terminal-accent mb-2 font-semibold">GREEKS</div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-xs text-terminal-text">Delta</span>
            <span className="text-sm font-semibold">{option.delta.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-terminal-text">Gamma</span>
            <span className="text-sm font-semibold">{option.gamma.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-terminal-text">Theta</span>
            <span className="text-sm font-semibold text-terminal-red">
              {option.theta.toFixed(2)}/day
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-terminal-text">Vega</span>
            <span className="text-sm font-semibold">{option.vega.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-terminal-border pt-4">
        <div className="text-xs text-terminal-accent mb-2 font-semibold">VALUE</div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-xs text-terminal-text">Intrinsic</span>
            <span className="text-sm font-semibold">{formatPrice(option.intrinsicValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-terminal-text">Time Value</span>
            <span className="text-sm font-semibold">{formatPrice(option.timeValue)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-terminal-border pt-4">
        <div className="text-xs text-terminal-accent mb-2 font-semibold">MARKET DATA</div>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="text-terminal-text">Bid</span>
            <span>{formatPrice(option.bidPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-text">Ask</span>
            <span>{formatPrice(option.askPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-text">OI</span>
            <span>{option.oi.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-text">Volume</span>
            <span>{option.volume.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

