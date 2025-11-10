import { useEffect } from 'react';
import type {
  EnhancedOpenAiWidgetRuntime,
  OpenAiGlobals,
  OpenAiWidgetRuntime,
  ToolOutputEnvelope,
} from '../types/openai';

const DEFAULT_THEME = {
  mode: 'light' as const,
  accentColor: '#10a37f',
  backgroundColor: '#ffffff',
  surfaceColor: '#f7f7f8',
  textColor: '#111827',
  borderRadius: 12,
};

const DEFAULT_GLOBALS: OpenAiGlobals = {
  theme: DEFAULT_THEME,
  viewport: {
    safeAreaInset: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  },
};

type Listener = () => void;

type Observable<T> = {
  get: () => T;
  set: (value: T) => void;
  subscribe: (listener: Listener) => () => void;
};

const createObservable = <T,>(initial: T): Observable<T> => {
  let value = initial;
  const listeners = new Set<Listener>();

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  return {
    get: () => value,
    set: (next) => {
      value = next;
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

type RuntimeStores = {
  toolOutput: Observable<ToolOutputEnvelope | undefined>;
  globals: Observable<OpenAiGlobals>;
  widgetState: Observable<unknown>;
};

type InternalRuntime = OpenAiWidgetRuntime & {
  __stores?: RuntimeStores;
};

const ensureStores = (runtime: InternalRuntime): RuntimeStores => {
  if (runtime.__stores) {
    return runtime.__stores;
  }

  const stores: RuntimeStores = {
    toolOutput: createObservable(runtime.toolOutput),
    globals: createObservable(runtime.globals ?? DEFAULT_GLOBALS),
    widgetState: createObservable(runtime.widgetState),
  };

  Object.defineProperty(runtime, '__stores', {
    value: stores,
    enumerable: false,
    writable: false,
  });

  const defineReactiveProperty = <K extends keyof RuntimeStores>(
    property: K,
    observable: RuntimeStores[K]
  ) => {
    Object.defineProperty(runtime, property, {
      get: () => observable.get(),
      set: (value) => {
        observable.set(value as never);
      },
      configurable: true,
      enumerable: false,
    });
  };

  defineReactiveProperty('toolOutput', stores.toolOutput);
  defineReactiveProperty('globals', stores.globals);
  defineReactiveProperty('widgetState', stores.widgetState);

  return stores;
};

const ensureEnhancedMethods = (runtime: InternalRuntime): EnhancedOpenAiWidgetRuntime => {
  const stores = ensureStores(runtime);

  if (!runtime.subscribeToolOutput) {
    runtime.subscribeToolOutput = (listener: Listener) => stores.toolOutput.subscribe(listener);
  }

  if (!runtime.getToolOutputSnapshot) {
    runtime.getToolOutputSnapshot = () => stores.toolOutput.get();
  }

  if (!runtime.subscribeGlobals) {
    runtime.subscribeGlobals = (listener: Listener) => stores.globals.subscribe(listener);
  }

  if (!runtime.getGlobalsSnapshot) {
    runtime.getGlobalsSnapshot = () => stores.globals.get();
  }

  if (!runtime.subscribeWidgetState) {
    runtime.subscribeWidgetState = (listener: Listener) => stores.widgetState.subscribe(listener);
  }

  if (!runtime.getWidgetStateSnapshot) {
    runtime.getWidgetStateSnapshot = () => stores.widgetState.get();
  }

  if (!runtime.setWidgetState) {
    runtime.setWidgetState = (state: unknown) => {
      stores.widgetState.set(state);
    };
  }

  if (!runtime.callTool) {
    runtime.callTool = async (tool: string, payload: unknown) => {
      console.info('[OpenAI mock] callTool', tool, payload);
      return undefined;
    };
  }

  if (!runtime.sendFollowUpMessage) {
    runtime.sendFollowUpMessage = async (message: unknown) => {
      console.info('[OpenAI mock] sendFollowUpMessage', message);
    };
  }

  if (!runtime.requestDisplayMode) {
    runtime.requestDisplayMode = async (mode) => {
      console.info('[OpenAI mock] requestDisplayMode', mode);
    };
  }

  if (!runtime.openExternal) {
    runtime.openExternal = async (url: string) => {
      window.open(url, '_blank', 'noopener');
    };
  }

  runtime.__mock = {
    setToolOutput: (output) => stores.toolOutput.set(output),
    setGlobals: (globals) => {
      const next = { ...stores.globals.get(), ...globals };
      stores.globals.set(next);
    },
    setWidgetState: (state) => stores.widgetState.set(state),
  };

  return runtime as EnhancedOpenAiWidgetRuntime;
};

export const ensureOpenAiRuntime = (): EnhancedOpenAiWidgetRuntime => {
  if (typeof window === 'undefined') {
    throw new Error('OpenAI runtime is only available in the browser environment');
  }

  const runtime: InternalRuntime = window.openai ?? {};
  const enhanced = ensureEnhancedMethods(runtime);
  window.openai = enhanced;
  return enhanced;
};

export const applyGlobalsToCssVariables = (globals: OpenAiGlobals) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const theme = { ...DEFAULT_THEME, ...(globals.theme ?? {}) };
  const safeArea = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...(globals.viewport?.safeAreaInset ?? {}),
  };

  root.style.setProperty('--openai-theme-mode', theme.mode);
  root.style.setProperty('--openai-accent-color', theme.accentColor ?? DEFAULT_THEME.accentColor);
  root.style.setProperty('--openai-background-color', theme.backgroundColor ?? DEFAULT_THEME.backgroundColor);
  root.style.setProperty('--openai-surface-color', theme.surfaceColor ?? DEFAULT_THEME.surfaceColor);
  root.style.setProperty('--openai-text-color', theme.textColor ?? DEFAULT_THEME.textColor);
  root.style.setProperty('--openai-border-radius', `${theme.borderRadius ?? DEFAULT_THEME.borderRadius}px`);
  root.style.setProperty('--openai-safe-area-top', `${safeArea.top ?? 0}px`);
  root.style.setProperty('--openai-safe-area-right', `${safeArea.right ?? 0}px`);
  root.style.setProperty('--openai-safe-area-bottom', `${safeArea.bottom ?? 0}px`);
  root.style.setProperty('--openai-safe-area-left', `${safeArea.left ?? 0}px`);
  root.style.setProperty('color-scheme', theme.mode === 'dark' ? 'dark' : 'light');

  document.body.style.backgroundColor = theme.backgroundColor ?? DEFAULT_THEME.backgroundColor;
  document.body.style.color = theme.textColor ?? DEFAULT_THEME.textColor;
};

export const useApplyGlobalsEffect = (
  getSnapshot: () => OpenAiGlobals,
  subscribe: (listener: () => void) => () => void
) => {
  useEffect(() => {
    const apply = () => applyGlobalsToCssVariables(getSnapshot());
    apply();
    return subscribe(apply);
  }, [getSnapshot, subscribe]);
};

export { DEFAULT_GLOBALS };
