import DraggableLayout from './DraggableLayout';
import PanelRestoreBar from './PanelRestoreBar';
import StatusBar from './StatusBar';
import { useWebSocket } from '../../hooks/useWebSocket';

export default function BloombergLayout() {
  const { status } = useWebSocket('ws://localhost:8080/ws');
  
  return (
    <div className="h-full w-full relative bg-terminal-bg">
      <DraggableLayout />
      <PanelRestoreBar />
      <StatusBar status={status} />
    </div>
  );
}
