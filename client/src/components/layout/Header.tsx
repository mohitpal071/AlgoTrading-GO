import { Link, useLocation } from 'react-router-dom';
import { WebSocketStatus } from '../../services/websocket';

interface HeaderProps {
  status: WebSocketStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function Header({ status, onConnect, onDisconnect }: HeaderProps) {
  const location = useLocation();
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-terminal-green';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-terminal-red';
      default:
        return 'bg-gray-500';
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="h-8 bg-terminal-border border-b-2 border-terminal-accent flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-terminal-accent"></div>
          <h1 className="text-sm font-bold text-terminal-accent tracking-wider">HFT OPTION TERMINAL</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
          <span className="text-xs capitalize text-terminal-text">{status}</span>
        </div>
        <nav className="flex items-center gap-1 ml-4">
          <Link
            to="/watchlist"
            className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
              isActive('/watchlist')
                ? 'bg-terminal-accent text-terminal-bg'
                : 'text-terminal-text hover:bg-terminal-border/50'
            }`}
          >
            WATCHLIST
          </Link>
          <Link
            to="/option-chain"
            className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
              isActive('/option-chain')
                ? 'bg-terminal-accent text-terminal-bg'
                : 'text-terminal-text hover:bg-terminal-border/50'
            }`}
          >
            OPTION CHAIN
          </Link>
          <Link
            to="/positions"
            className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
              isActive('/positions')
                ? 'bg-terminal-accent text-terminal-bg'
                : 'text-terminal-text hover:bg-terminal-border/50'
            }`}
          >
            POSITIONS
          </Link>
          <Link
            to="/orders"
            className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
              isActive('/orders')
                ? 'bg-terminal-accent text-terminal-bg'
                : 'text-terminal-text hover:bg-terminal-border/50'
            }`}
          >
            ORDERS
          </Link>
        </nav>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-xs text-terminal-text">
          {new Date().toLocaleTimeString()}
        </div>
        {status === 'connected' ? (
          <button
            onClick={onDisconnect}
            className="px-2 py-0.5 bg-terminal-red text-white rounded text-xs hover:opacity-80 font-semibold"
          >
            DISCONNECT
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="px-2 py-0.5 bg-terminal-green text-terminal-bg rounded text-xs hover:opacity-80 font-semibold"
          >
            CONNECT
          </button>
        )}
      </div>
    </header>
  );
}

