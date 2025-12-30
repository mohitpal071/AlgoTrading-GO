import { useEffect, useState, useRef } from 'react';
import OptionChainSearch from '../components/panels/OptionChainSearch';
import { useOptionStore } from '../store/optionStore';
import { useInstrumentStore } from '../store/instrumentStore';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { ParsedInstrument } from '../services/api';
import { OptionData } from '../types/option';
import { formatPrice, formatStrike } from '../utils/formatters';

type StrategyType = 'straddle' | 'strangle';

interface StrategyPrice {
  ltp: number;
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  totalIV: number;
  call?: OptionData;
  put?: OptionData;
}

export default function StraddleStranglePage() {
  const { getOptionData, setOptionData } = useOptionStore();
  const { instruments: allInstruments } = useInstrumentStore();
  const { subscribe, unsubscribe, status: wsStatus } = useWebSocketContext();
  
  const [selectedUnderlying, setSelectedUnderlying] = useState<string | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);
  const [availableExpiries, setAvailableExpiries] = useState<string[]>([]);
  const [strategyType, setStrategyType] = useState<StrategyType>('straddle');
  const [strike, setStrike] = useState<number | null>(null);
  const [callStrike, setCallStrike] = useState<number | null>(null);
  const [putStrike, setPutStrike] = useState<number | null>(null);
  const [availableStrikes, setAvailableStrikes] = useState<number[]>([]);
  
  const currentSubscribedTokensRef = useRef<number[]>([]);

  // Helper function to get the search name for options
  const getOptionSearchName = (underlying: string): string => {
    if (underlying === 'NIFTY 50') {
      return 'NIFTY';
    }
    return underlying;
  };

  // Get available expiries when underlying is selected
  useEffect(() => {
    if (!selectedUnderlying || allInstruments.length === 0) return;

    const optionSearchName = getOptionSearchName(selectedUnderlying);

    const optionInstruments = allInstruments.filter(
      (inst) =>
        (inst.instrumentType === 'CE' || inst.instrumentType === 'PE') &&
        inst.exchange === 'NFO' &&
        inst.name === optionSearchName &&
        inst.strikePrice !== undefined &&
        inst.expiry !== undefined
    );

    if (optionInstruments.length === 0) {
      return;
    }

    const expirySet = new Set<string>();
    optionInstruments.forEach((inst) => {
      if (inst.expiry) {
        expirySet.add(inst.expiry);
      }
    });

    const availableExpiriesList = Array.from(expirySet).sort();
    setAvailableExpiries(availableExpiriesList);

    if (!selectedExpiry && availableExpiriesList.length > 0) {
      setSelectedExpiry(availableExpiriesList[0]);
    }
  }, [selectedUnderlying, allInstruments, selectedExpiry]);

  // Get available strikes when expiry is selected
  useEffect(() => {
    if (!selectedUnderlying || !selectedExpiry || allInstruments.length === 0) return;

    const optionSearchName = getOptionSearchName(selectedUnderlying);

    const optionInstruments = allInstruments.filter(
      (inst) =>
        (inst.instrumentType === 'CE' || inst.instrumentType === 'PE') &&
        inst.exchange === 'NFO' &&
        inst.name === optionSearchName &&
        inst.expiry === selectedExpiry &&
        inst.strikePrice !== undefined
    );

    if (optionInstruments.length === 0) {
      setAvailableStrikes([]);
      return;
    }

    const strikeSet = new Set<number>();
    optionInstruments.forEach((inst) => {
      if (inst.strikePrice !== undefined) {
        strikeSet.add(inst.strikePrice);
      }
    });

    const strikesList = Array.from(strikeSet).sort((a, b) => a - b);
    setAvailableStrikes(strikesList);

    // Auto-select first strike for straddle
    if (strategyType === 'straddle' && strikesList.length > 0 && !strike) {
      setStrike(strikesList[Math.floor(strikesList.length / 2)]);
    }
  }, [selectedUnderlying, selectedExpiry, allInstruments, strategyType, strike]);

  // Subscribe to options and populate store
  useEffect(() => {
    if (wsStatus !== 'connected' || !selectedUnderlying || !selectedExpiry || allInstruments.length === 0) {
      return;
    }

    const optionSearchName = getOptionSearchName(selectedUnderlying);
    const tokensToSubscribe: number[] = [];

    if (strategyType === 'straddle' && strike) {
      const callInst = allInstruments.find(
        (inst) =>
          inst.instrumentType === 'CE' &&
          inst.exchange === 'NFO' &&
          inst.name === optionSearchName &&
          inst.expiry === selectedExpiry &&
          inst.strikePrice === strike
      );
      const putInst = allInstruments.find(
        (inst) =>
          inst.instrumentType === 'PE' &&
          inst.exchange === 'NFO' &&
          inst.name === optionSearchName &&
          inst.expiry === selectedExpiry &&
          inst.strikePrice === strike
      );

      if (callInst?.instrumentToken) tokensToSubscribe.push(callInst.instrumentToken);
      if (putInst?.instrumentToken) tokensToSubscribe.push(putInst.instrumentToken);
    } else if (strategyType === 'strangle' && callStrike && putStrike) {
      const callInst = allInstruments.find(
        (inst) =>
          inst.instrumentType === 'CE' &&
          inst.exchange === 'NFO' &&
          inst.name === optionSearchName &&
          inst.expiry === selectedExpiry &&
          inst.strikePrice === callStrike
      );
      const putInst = allInstruments.find(
        (inst) =>
          inst.instrumentType === 'PE' &&
          inst.exchange === 'NFO' &&
          inst.name === optionSearchName &&
          inst.expiry === selectedExpiry &&
          inst.strikePrice === putStrike
      );

      if (callInst?.instrumentToken) tokensToSubscribe.push(callInst.instrumentToken);
      if (putInst?.instrumentToken) tokensToSubscribe.push(putInst.instrumentToken);
    }

    // Unsubscribe from previous tokens
    if (currentSubscribedTokensRef.current.length > 0) {
      unsubscribe(currentSubscribedTokensRef.current);
    }

    if (tokensToSubscribe.length > 0) {
      subscribe(tokensToSubscribe);
      currentSubscribedTokensRef.current = tokensToSubscribe;

      // Populate option store
      tokensToSubscribe.forEach((token) => {
        const inst = allInstruments.find((i) => i.instrumentToken === token);
        if (inst && (inst.instrumentType === 'CE' || inst.instrumentType === 'PE')) {
          const optionData: OptionData = {
            instrumentToken: inst.instrumentToken,
            tradingSymbol: inst.tradingsymbol,
            type: inst.instrumentType as 'CE' | 'PE',
            strike: inst.strikePrice!,
            expiry: selectedExpiry,
            lastPrice: 0,
            bidPrice: 0,
            askPrice: 0,
            bidQty: 0,
            askQty: 0,
            volume: 0,
            oi: 0,
            lastUpdated: Date.now(),
            iv: 0,
            delta: 0,
            gamma: 0,
            theta: 0,
            vega: 0,
            intrinsicValue: 0,
            timeValue: 0,
            underlying: selectedUnderlying,
            underlyingPrice: 0,
          };
          setOptionData(optionData.instrumentToken, optionData);
        }
      });
    } else {
      currentSubscribedTokensRef.current = [];
    }
  }, [wsStatus, selectedUnderlying, selectedExpiry, allInstruments, strategyType, strike, callStrike, putStrike, subscribe, unsubscribe, setOptionData]);

  // Cleanup: Unsubscribe when component unmounts
  useEffect(() => {
    return () => {
      if (currentSubscribedTokensRef.current.length > 0 && wsStatus === 'connected') {
        unsubscribe(currentSubscribedTokensRef.current);
        currentSubscribedTokensRef.current = [];
      }
    };
  }, [unsubscribe, wsStatus]);

  // Calculate strategy price
  const calculateStrategyPrice = (): StrategyPrice | null => {
    if (!selectedUnderlying || !selectedExpiry) return null;

    let call: OptionData | undefined;
    let put: OptionData | undefined;

    if (strategyType === 'straddle' && strike) {
      const callToken = allInstruments.find(
        (inst) =>
          inst.instrumentType === 'CE' &&
          inst.exchange === 'NFO' &&
          inst.name === getOptionSearchName(selectedUnderlying) &&
          inst.expiry === selectedExpiry &&
          inst.strikePrice === strike
      )?.instrumentToken;
      const putToken = allInstruments.find(
        (inst) =>
          inst.instrumentType === 'PE' &&
          inst.exchange === 'NFO' &&
          inst.name === getOptionSearchName(selectedUnderlying) &&
          inst.expiry === selectedExpiry &&
          inst.strikePrice === strike
      )?.instrumentToken;

      if (callToken) call = getOptionData(callToken);
      if (putToken) put = getOptionData(putToken);
    } else if (strategyType === 'strangle' && callStrike && putStrike) {
      const callToken = allInstruments.find(
        (inst) =>
          inst.instrumentType === 'CE' &&
          inst.exchange === 'NFO' &&
          inst.name === getOptionSearchName(selectedUnderlying) &&
          inst.expiry === selectedExpiry &&
          inst.strikePrice === callStrike
      )?.instrumentToken;
      const putToken = allInstruments.find(
        (inst) =>
          inst.instrumentType === 'PE' &&
          inst.exchange === 'NFO' &&
          inst.name === getOptionSearchName(selectedUnderlying) &&
          inst.expiry === selectedExpiry &&
          inst.strikePrice === putStrike
      )?.instrumentToken;

      if (callToken) call = getOptionData(callToken);
      if (putToken) put = getOptionData(putToken);
    }

    if (!call || !put) return null;

    return {
      ltp: call.lastPrice + put.lastPrice,
      bid: call.bidPrice + put.bidPrice,
      ask: call.askPrice + put.askPrice,
      bidQty: Math.min(call.bidQty, put.bidQty),
      askQty: Math.min(call.askQty, put.askQty),
      totalDelta: call.delta + put.delta,
      totalGamma: call.gamma + put.gamma,
      totalTheta: call.theta + put.theta,
      totalVega: call.vega + put.vega,
      totalIV: (call.iv + put.iv) / 2,
      call,
      put,
    };
  };

  const strategyPrice = calculateStrategyPrice();

  const handleUnderlyingChange = (params: { name: string }) => {
    if (currentSubscribedTokensRef.current.length > 0 && wsStatus === 'connected') {
      unsubscribe(currentSubscribedTokensRef.current);
      currentSubscribedTokensRef.current = [];
    }
    setSelectedUnderlying(params.name);
    setSelectedExpiry(null);
    setAvailableExpiries([]);
    setStrike(null);
    setCallStrike(null);
    setPutStrike(null);
  };

  const handleStrategyTypeChange = (type: StrategyType) => {
    setStrategyType(type);
    setStrike(null);
    setCallStrike(null);
    setPutStrike(null);
  };

  return (
    <div className="h-full w-full bg-terminal-bg flex flex-col">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border/50 bg-terminal-border/30 gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-xs min-w-0">
          {selectedUnderlying ? (
            <>
              <span className="font-bold text-terminal-accent truncate max-w-[160px]">
                {selectedUnderlying}
              </span>
              {selectedExpiry && (
                <>
                  <span className="text-terminal-text opacity-50">|</span>
                  <span className="text-terminal-text">
                    {new Date(selectedExpiry).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-terminal-text/60 text-[11px]">
              Select an underlying to view strategy prices
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <OptionChainSearch
            onSelectUnderlying={handleUnderlyingChange}
          />
          {availableExpiries.length > 0 && (
            <select
              value={selectedExpiry || ''}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className="bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text h-7 rounded hover:border-terminal-accent transition-colors"
            >
              {availableExpiries.map((expiry: string) => (
                <option key={expiry} value={expiry}>
                  {new Date(expiry).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1 border border-terminal-border rounded p-0.5">
            <button
              onClick={() => handleStrategyTypeChange('straddle')}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                strategyType === 'straddle'
                  ? 'bg-terminal-accent text-terminal-bg'
                  : 'text-terminal-text hover:bg-terminal-border/50'
              }`}
            >
              STRADDLE
            </button>
            <button
              onClick={() => handleStrategyTypeChange('strangle')}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                strategyType === 'strangle'
                  ? 'bg-terminal-accent text-terminal-bg'
                  : 'text-terminal-text hover:bg-terminal-border/50'
              }`}
            >
              STRANGLE
            </button>
          </div>
        </div>
      </div>

      {/* Strike Selection */}
      {selectedExpiry && availableStrikes.length > 0 && (
        <div className="px-4 py-2 border-b border-terminal-border/50 bg-terminal-border/20 flex items-center gap-3 flex-wrap">
          {strategyType === 'straddle' ? (
            <>
              <span className="text-xs text-terminal-text/60">Strike:</span>
              <select
                value={strike || ''}
                onChange={(e) => setStrike(Number(e.target.value))}
                className="bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text h-7 rounded hover:border-terminal-accent transition-colors"
              >
                <option value="">Select Strike</option>
                {availableStrikes.map((s) => (
                  <option key={s} value={s}>
                    {formatStrike(s)}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <span className="text-xs text-terminal-text/60">Call Strike:</span>
              <select
                value={callStrike || ''}
                onChange={(e) => setCallStrike(Number(e.target.value))}
                className="bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text h-7 rounded hover:border-terminal-accent transition-colors"
              >
                <option value="">Select Call Strike</option>
                {availableStrikes.map((s) => (
                  <option key={s} value={s}>
                    {formatStrike(s)}
                  </option>
                ))}
              </select>
              <span className="text-xs text-terminal-text/60">Put Strike:</span>
              <select
                value={putStrike || ''}
                onChange={(e) => setPutStrike(Number(e.target.value))}
                className="bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text h-7 rounded hover:border-terminal-accent transition-colors"
              >
                <option value="">Select Put Strike</option>
                {availableStrikes.map((s) => (
                  <option key={s} value={s}>
                    {formatStrike(s)}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {/* Strategy Price Display */}
      <div className="flex-1 overflow-auto p-4">
        {strategyPrice ? (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Price Summary */}
              <div className="bg-terminal-border/30 border border-terminal-border rounded p-4">
                <h3 className="text-sm font-bold text-terminal-accent mb-3 border-b border-terminal-border pb-2">
                  {strategyType.toUpperCase()} PRICE
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-terminal-text/60">LTP:</span>
                    <span className="font-semibold text-terminal-text">{formatPrice(strategyPrice.ltp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-text/60">Bid:</span>
                    <span className="text-terminal-text">{formatPrice(strategyPrice.bid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-text/60">Ask:</span>
                    <span className="text-terminal-text">{formatPrice(strategyPrice.ask)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-text/60">Spread:</span>
                    <span className="text-terminal-text">{formatPrice(strategyPrice.ask - strategyPrice.bid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-text/60">Bid Qty:</span>
                    <span className="text-terminal-text">{strategyPrice.bidQty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-text/60">Ask Qty:</span>
                    <span className="text-terminal-text">{strategyPrice.askQty}</span>
                  </div>
                </div>
              </div>

              {/* Greeks Summary */}
              <div className="bg-terminal-border/30 border border-terminal-border rounded p-4">
                <h3 className="text-sm font-bold text-terminal-accent mb-3 border-b border-terminal-border pb-2">
                  COMBINED GREEKS
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-terminal-text/60">Delta:</span>
                    <span className="text-terminal-text">{strategyPrice.totalDelta.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-text/60">Gamma:</span>
                    <span className="text-terminal-text">{strategyPrice.totalGamma.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-text/60">Theta:</span>
                    <span className="text-terminal-text">{strategyPrice.totalTheta.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-text/60">Vega:</span>
                    <span className="text-terminal-text">{strategyPrice.totalVega.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-text/60">Avg IV:</span>
                    <span className="text-terminal-text">
                      {strategyPrice.totalIV > 0 ? `${(strategyPrice.totalIV * 100).toFixed(2)}%` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Call Option Details */}
              {strategyPrice.call && (
                <div className="bg-terminal-border/30 border border-terminal-border rounded p-4">
                  <h3 className="text-sm font-bold text-terminal-accent mb-3 border-b border-terminal-border pb-2">
                    CALL ({formatStrike(strategyPrice.call.strike)})
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">LTP:</span>
                      <span className="text-terminal-text">{formatPrice(strategyPrice.call.lastPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">Bid/Ask:</span>
                      <span className="text-terminal-text">
                        {formatPrice(strategyPrice.call.bidPrice)} / {formatPrice(strategyPrice.call.askPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">IV:</span>
                      <span className="text-terminal-text">
                        {strategyPrice.call.iv > 0 ? `${(strategyPrice.call.iv * 100).toFixed(2)}%` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">Delta:</span>
                      <span className="text-terminal-text">{strategyPrice.call.delta.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">Gamma:</span>
                      <span className="text-terminal-text">{strategyPrice.call.gamma.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">Theta:</span>
                      <span className="text-terminal-text">{strategyPrice.call.theta.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">Vega:</span>
                      <span className="text-terminal-text">{strategyPrice.call.vega.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Put Option Details */}
              {strategyPrice.put && (
                <div className="bg-terminal-border/30 border border-terminal-border rounded p-4">
                  <h3 className="text-sm font-bold text-terminal-accent mb-3 border-b border-terminal-border pb-2">
                    PUT ({formatStrike(strategyPrice.put.strike)})
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">LTP:</span>
                      <span className="text-terminal-text">{formatPrice(strategyPrice.put.lastPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">Bid/Ask:</span>
                      <span className="text-terminal-text">
                        {formatPrice(strategyPrice.put.bidPrice)} / {formatPrice(strategyPrice.put.askPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">IV:</span>
                      <span className="text-terminal-text">
                        {strategyPrice.put.iv > 0 ? `${(strategyPrice.put.iv * 100).toFixed(2)}%` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">Delta:</span>
                      <span className="text-terminal-text">{strategyPrice.put.delta.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">Gamma:</span>
                      <span className="text-terminal-text">{strategyPrice.put.gamma.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">Theta:</span>
                      <span className="text-terminal-text">{strategyPrice.put.theta.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-terminal-text/60">Vega:</span>
                      <span className="text-terminal-text">{strategyPrice.put.vega.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-terminal-text">
            <p className="text-xs">
              {!selectedUnderlying
                ? 'Select an underlying to view strategy prices'
                : !selectedExpiry
                ? 'Select an expiry date'
                : strategyType === 'straddle' && !strike
                ? 'Select a strike price'
                : strategyType === 'strangle' && (!callStrike || !putStrike)
                ? 'Select call and put strike prices'
                : 'Loading strategy data...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

