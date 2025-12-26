import { useWebSocket } from '../../hooks/useWebSocket';

interface StatusBarProps {
  status: 'connected' | 'disconnected' | 'connecting';
}

export default function StatusBar({ status }: StatusBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-terminal-border border-t-2 border-terminal-accent px-3 py-1 flex items-center justify-between text-xs z-40">
      <div className="flex items-center gap-3">
        <span className="text-terminal-text font-semibold">STATUS:</span>
        <span className={status === 'connected' ? 'text-terminal-green' : 'text-terminal-red'}>
          {status.toUpperCase()}
        </span>
        <span className="text-terminal-text opacity-50">|</span>
        <span className="text-terminal-text">LAST UPDATE:</span>
        <span className="text-terminal-accent">{new Date().toLocaleTimeString()}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-terminal-text opacity-70">HFT OPTION TERMINAL v1.0</span>
      </div>
    </div>
  );
}

