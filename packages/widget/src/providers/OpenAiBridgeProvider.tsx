import { createContext, useCallback, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { ensureOpenAiRuntime, useApplyGlobalsEffect } from '../lib/openAiRuntime';
import type {
  EnhancedOpenAiWidgetRuntime,
  OpenAiDisplayMode,
  OpenAiGlobals,
  ToolOutputEnvelope,
} from '../types/openai';

interface OpenAiBridgeContextValue {
  callTool: (tool: string, payload: unknown) => Promise<unknown>;
  sendFollowUpMessage: (message: unknown) => Promise<void>;
  requestDisplayMode: (mode: OpenAiDisplayMode) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  setWidgetState: (next: unknown | ((previous: unknown) => unknown)) => void;
  getToolOutputSnapshot: () => ToolOutputEnvelope | undefined;
  subscribeToToolOutput: (listener: () => void) => () => void;
  getGlobalsSnapshot: () => OpenAiGlobals;
  subscribeToGlobals: (listener: () => void) => () => void;
  getWidgetStateSnapshot: () => unknown;
  subscribeToWidgetState: (listener: () => void) => () => void;
}

interface OpenAiBridgeProviderProps extends PropsWithChildren {
  runtime?: EnhancedOpenAiWidgetRuntime;
}

const OpenAiBridgeContext = createContext<OpenAiBridgeContextValue | null>(null);

export const OpenAiBridgeProvider = ({ children, runtime: providedRuntime }: OpenAiBridgeProviderProps): JSX.Element => {
  const runtime = useMemo(() => providedRuntime ?? ensureOpenAiRuntime(), [providedRuntime]);

  const getToolOutputSnapshot = useCallback(() => runtime.getToolOutputSnapshot(), [runtime]);
  const subscribeToToolOutput = useCallback(
    (listener: () => void) => runtime.subscribeToolOutput(listener),
    [runtime]
  );

  const getGlobalsSnapshot = useCallback(() => runtime.getGlobalsSnapshot(), [runtime]);
  const subscribeToGlobals = useCallback(
    (listener: () => void) => runtime.subscribeGlobals(listener),
    [runtime]
  );

  const getWidgetStateSnapshot = useCallback(() => runtime.getWidgetStateSnapshot(), [runtime]);
  const subscribeToWidgetState = useCallback(
    (listener: () => void) => runtime.subscribeWidgetState(listener),
    [runtime]
  );

  const callTool = useCallback(
    (tool: string, payload: unknown) => runtime.callTool(tool, payload),
    [runtime]
  );
  const sendFollowUpMessage = useCallback(
    (message: unknown) => runtime.sendFollowUpMessage(message),
    [runtime]
  );
  const requestDisplayMode = useCallback(
    (mode: OpenAiDisplayMode) => runtime.requestDisplayMode(mode),
    [runtime]
  );
  const openExternal = useCallback((url: string) => runtime.openExternal(url), [runtime]);
  const setWidgetState = useCallback(
    (next: unknown | ((previous: unknown) => unknown)) => {
      const previous = runtime.getWidgetStateSnapshot();
      const value = typeof next === 'function' ? (next as (prev: unknown) => unknown)(previous) : next;
      runtime.setWidgetState(value);
    },
    [runtime]
  );

  useApplyGlobalsEffect(getGlobalsSnapshot, subscribeToGlobals);

  const value = useMemo<OpenAiBridgeContextValue>(
    () => ({
      callTool,
      sendFollowUpMessage,
      requestDisplayMode,
      openExternal,
      setWidgetState,
      getToolOutputSnapshot,
      subscribeToToolOutput,
      getGlobalsSnapshot,
      subscribeToGlobals,
      getWidgetStateSnapshot,
      subscribeToWidgetState,
    }),
    [
      callTool,
      sendFollowUpMessage,
      requestDisplayMode,
      openExternal,
      setWidgetState,
      getToolOutputSnapshot,
      subscribeToToolOutput,
      getGlobalsSnapshot,
      subscribeToGlobals,
      getWidgetStateSnapshot,
      subscribeToWidgetState,
    ]
  );

  return <OpenAiBridgeContext.Provider value={value}>{children}</OpenAiBridgeContext.Provider>;
};

export const useOpenAiBridge = (): OpenAiBridgeContextValue => {
  const context = useContext(OpenAiBridgeContext);
  if (!context) {
    throw new Error('useOpenAiBridge must be used within an OpenAiBridgeProvider');
  }
  return context;
};

export const useOpenAiGlobals = () => {
  const { getGlobalsSnapshot, subscribeToGlobals } = useOpenAiBridge();
  useApplyGlobalsEffect(getGlobalsSnapshot, subscribeToGlobals);
  return getGlobalsSnapshot();
};

export { DEFAULT_GLOBALS } from '../lib/openAiRuntime';
