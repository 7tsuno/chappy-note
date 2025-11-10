import './app.css';
import { OpenAiBridgeProvider } from './providers/OpenAiBridgeProvider';
import { WidgetShell } from './components/WidgetShell/WidgetShell';

const App = () => {
  return (
    <OpenAiBridgeProvider>
      <WidgetShell />
    </OpenAiBridgeProvider>
  );
};

export default App;
