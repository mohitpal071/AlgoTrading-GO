import { create } from 'zustand';
import { getInstruments, ParsedInstrument } from '../services/api';

interface InstrumentStore {
  instruments: ParsedInstrument[];
  isLoading: boolean;
  error: string | null;
  fetchInstruments: () => Promise<void>;
  getInstruments: () => ParsedInstrument[];
}

export const useInstrumentStore = create<InstrumentStore>((set, get) => ({
  instruments: [],
  isLoading: false,
  error: null,

  fetchInstruments: async () => {
    // Don't fetch if already loading or already loaded
    const { isLoading, instruments } = get();
    if (isLoading || instruments.length > 0) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const data = await getInstruments();
      set({ instruments: data, isLoading: false, error: null });
      console.log(`[InstrumentStore] Loaded ${data.length} instruments`);
      const optionInstruments = data.filter(instrument => (instrument.instrumentType=='PE' || instrument.instrumentType=='CE') && instrument.exchange=='NFO' && instrument.name=='HDFCBANK');
      console.log(optionInstruments);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load instruments';
      console.error('[InstrumentStore] Failed to load instruments:', error);
      set({ isLoading: false, error: errorMessage });
    }
  },

  getInstruments: () => {
    return get().instruments;
  },
}));

