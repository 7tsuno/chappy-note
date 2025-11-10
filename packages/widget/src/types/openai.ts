type CustomOpenAiDisplayMode = {
  readonly __openAiDisplayModeBrand?: never;
};

export type OpenAiDisplayMode =
  | 'default'
  | 'compact'
  | 'expanded'
  | 'full-screen'
  | (string & CustomOpenAiDisplayMode);

export type ToolOutputStatus = 'idle' | 'in_progress' | 'completed' | 'error';

export interface ToolOutputEnvelope {
  status?: ToolOutputStatus;
  structuredContent?: unknown;
  toolName?: string;
  callId?: string;
  error?: { message: string; code?: string } | null;
}

export interface OpenAiTheme {
  mode: 'light' | 'dark';
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  borderRadius?: number;
}

export interface OpenAiViewport {
  safeAreaInset?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface OpenAiGlobals {
  theme?: OpenAiTheme;
  viewport?: OpenAiViewport;
}

export interface OpenAiWidgetRuntime {
  toolOutput?: ToolOutputEnvelope;
  widgetState?: unknown;
  globals?: OpenAiGlobals;
  callTool?: (tool: string, payload: unknown) => Promise<unknown>;
  sendFollowUpMessage?: (message: unknown) => Promise<void>;
  requestDisplayMode?: (mode: OpenAiDisplayMode) => Promise<void>;
  openExternal?: (url: string) => Promise<void>;
  setWidgetState?: (state: unknown) => void;
  subscribeToolOutput?: (listener: () => void) => () => void;
  getToolOutputSnapshot?: () => ToolOutputEnvelope | undefined;
  subscribeGlobals?: (listener: () => void) => () => void;
  getGlobalsSnapshot?: () => OpenAiGlobals;
  subscribeWidgetState?: (listener: () => void) => () => void;
  getWidgetStateSnapshot?: () => unknown;
  __mock?: {
    setToolOutput: (output: ToolOutputEnvelope | undefined) => void;
    setGlobals: (globals: OpenAiGlobals) => void;
    setWidgetState: (state: unknown) => void;
  };
}

export interface EnhancedOpenAiWidgetRuntime extends OpenAiWidgetRuntime {
  subscribeToolOutput: (listener: () => void) => () => void;
  getToolOutputSnapshot: () => ToolOutputEnvelope | undefined;
  subscribeGlobals: (listener: () => void) => () => void;
  getGlobalsSnapshot: () => OpenAiGlobals;
  subscribeWidgetState: (listener: () => void) => () => void;
  getWidgetStateSnapshot: () => unknown;
  setWidgetState: (state: unknown) => void;
  callTool: (tool: string, payload: unknown) => Promise<unknown>;
  sendFollowUpMessage: (message: unknown) => Promise<void>;
  requestDisplayMode: (mode: OpenAiDisplayMode) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    openai?: OpenAiWidgetRuntime;
  }
}
