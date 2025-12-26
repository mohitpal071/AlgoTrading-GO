import DraggableLayout from './DraggableLayout';
import PanelRestoreBar from './PanelRestoreBar';
import MaximizeControls from './MaximizeControls';
import StatusBar from './StatusBar';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useLayoutStore } from '../../store/layoutStore';

export default function BloombergLayout() {
  const { status } = useWebSocket('ws://localhost:8080/ws');
  const { maximizedPanel } = useLayoutStore();
  
  return (
    <div className="h-full w-full relative bg-terminal-bg">
      <DraggableLayout />
      {maximizedPanel ? <MaximizeControls /> : <PanelRestoreBar />}
      <StatusBar status={status} />
    </div>
  );
}
