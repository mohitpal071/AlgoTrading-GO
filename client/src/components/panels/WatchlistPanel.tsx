import { useWatchlistStore } from '../../store/watchlistStore';
import { formatPrice, formatNumber, formatPercentage, getPriceChangeClass } from '../../utils/formatters';
import WatchlistGroupSelector from './WatchlistGroupSelector';

export default function WatchlistPanel() {
  const { getWatchlist, toggleFavorite, selectedGroupId } = useWatchlistStore();
  const watchlist = getWatchlist(selectedGroupId);

  return (
    <div className="h-full overflow-auto flex flex-col">
      {/* Group Selector */}
      <WatchlistGroupSelector />
      
      {/* Header Row */}
      <div className="sticky top-0 bg-terminal-border z-10 px-2 py-1 border-b border-terminal-border">
        <div className="grid grid-cols-12 gap-1 text-[10px] font-semibold text-terminal-accent">
          <div className="col-span-2">SYMBOL</div>
          <div className="col-span-2 text-right">LTP</div>
          <div className="col-span-2 text-right">CHANGE</div>
          <div className="col-span-1 text-right">%</div>
          <div className="col-span-2 text-right">VOLUME</div>
          <div className="col-span-2 text-right">BID/ASK</div>
          <div className="col-span-1 text-center">★</div>
        </div>
      </div>

      {/* Watchlist Items */}
      <div className="divide-y divide-terminal-border/30">
        {watchlist.map((item) => {
          const { instrument, isFavorite } = item;
          const changeClass = getPriceChangeClass(instrument.change);
          const changePercentClass = getPriceChangeClass(instrument.changePercent);

          return (
            <div
              key={instrument.symbol}
              className="grid grid-cols-12 gap-1 px-2 py-1.5 hover:bg-terminal-border/50 cursor-pointer transition-colors group"
            >
              {/* Symbol */}
              <div className="col-span-2">
                <div className="font-bold text-xs text-terminal-accent truncate">
                  {instrument.symbol}
                </div>
                <div className="text-[10px] text-terminal-text/70 truncate">
                  {instrument.exchange}
                </div>
              </div>

              {/* Last Price */}
              <div className="col-span-2 text-right">
                <div className={`font-semibold text-xs ${changeClass}`}>
                  {formatPrice(instrument.lastPrice)}
                </div>
              </div>

              {/* Change */}
              <div className="col-span-2 text-right">
                <div className={`font-semibold text-xs ${changeClass}`}>
                  {instrument.change >= 0 ? '+' : ''}{formatPrice(instrument.change)}
                </div>
              </div>

              {/* Change % */}
              <div className="col-span-1 text-right">
                <div className={`font-semibold text-xs ${changePercentClass}`}>
                  {instrument.changePercent >= 0 ? '+' : ''}{formatPercentage(instrument.changePercent)}
                </div>
              </div>

              {/* Volume */}
              <div className="col-span-2 text-right">
                <div className="text-xs text-terminal-text">
                  {formatNumber(instrument.volume)}
                </div>
              </div>

              {/* Bid/Ask */}
              <div className="col-span-2 text-right">
                <div className="text-[10px]">
                  <div className="text-terminal-green">
                    {formatPrice(instrument.bid)} × {instrument.bidSize}
                  </div>
                  <div className="text-terminal-red">
                    {formatPrice(instrument.ask)} × {instrument.askSize}
                  </div>
                </div>
              </div>

              {/* Favorite */}
              <div className="col-span-1 text-center flex items-center justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(instrument.symbol);
                  }}
                  className={`text-xs transition-colors ${
                    isFavorite
                      ? 'text-terminal-yellow'
                      : 'text-terminal-text/30 hover:text-terminal-yellow/50'
                  }`}
                >
                  ★
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {watchlist.length === 0 && (
        <div className="p-4 text-center text-terminal-text/50 text-xs">
          No instruments in watchlist
        </div>
      )}
    </div>
  );
}
