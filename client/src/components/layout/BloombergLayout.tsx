import DraggableLayout from './DraggableLayout';
import PanelRestoreBar from './PanelRestoreBar';
import MaximizeControls from './MaximizeControls';
import StatusBar from './StatusBar';
import { useLayoutStore } from '../../store/layoutStore';
import { WebSocketStatus } from '../../services/websocket';

interface BloombergLayoutProps {
  wsStatus: WebSocketStatus;
}

export default function BloombergLayout({ wsStatus }: BloombergLayoutProps) {
  const { maximizedPanel } = useLayoutStore();
  
  return (
    <div className="h-full w-full relative bg-terminal-bg">
      <DraggableLayout />
      {maximizedPanel ? <MaximizeControls /> : <PanelRestoreBar />}
      <StatusBar status={wsStatus} />
    </div>
  );
}
