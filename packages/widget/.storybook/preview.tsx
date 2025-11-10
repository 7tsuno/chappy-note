import type { Decorator, Preview } from '@storybook/react';
import React, { useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { OpenAiBridgeProvider } from '../src/providers/OpenAiBridgeProvider';
import { createMockOpenAiRuntime } from '../src/lib/openAiRuntime';
import type { OpenAiGlobals, OpenAiTheme, ToolOutputEnvelope } from '../src/types/openai';
import '../src/app.css';

type OpenAiMockParameters = {
  toolOutput?: ToolOutputEnvelope;
  themeMode?: 'light' | 'dark';
  globals?: OpenAiGlobals;
  widgetState?: unknown;
};

const resolveGlobalsOverride = (mock?: OpenAiMockParameters): OpenAiGlobals | undefined => {
  if (!mock?.globals && !mock?.themeMode) {
    return undefined;
  }

  const globalsOverride = { ...(mock?.globals ?? {}) };
  const baseTheme: Partial<OpenAiTheme> = mock?.globals?.theme ?? {};
  const themeOverride = {
    ...baseTheme,
    mode: mock?.themeMode ?? baseTheme.mode ?? 'light',
  } satisfies OpenAiTheme;

  return {
    ...globalsOverride,
    theme: themeOverride,
  };
};

const serialize = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const MockRuntimeDecorator = ({
  mock,
  children,
}: PropsWithChildren<{ mock?: OpenAiMockParameters }>) => {
  const globalsOverride = resolveGlobalsOverride(mock);
  const [runtime] = useState(() =>
    createMockOpenAiRuntime({
      toolOutput: mock?.toolOutput,
      globals: globalsOverride,
      widgetState: mock?.widgetState,
    })
  );

  const appliedRef = useRef({
    toolOutput: serialize(mock?.toolOutput),
    widgetState: serialize(mock?.widgetState),
    globals: serialize(globalsOverride),
  });

  useEffect(() => {
    const serialized = serialize(mock?.toolOutput);
    if (serialized === appliedRef.current.toolOutput) return;
    runtime.__mock?.setToolOutput(mock?.toolOutput);
    appliedRef.current.toolOutput = serialized;
  }, [mock?.toolOutput, runtime]);

  useEffect(() => {
    const serialized = serialize(mock?.widgetState);
    if (serialized === appliedRef.current.widgetState) return;
    runtime.__mock?.setWidgetState(mock?.widgetState);
    appliedRef.current.widgetState = serialized;
  }, [mock?.widgetState, runtime]);

  useEffect(() => {
    const serialized = serialize(globalsOverride);
    if (serialized === appliedRef.current.globals) return;
    if (globalsOverride) {
      runtime.__mock?.setGlobals(globalsOverride);
    }
    appliedRef.current.globals = serialized;
  }, [globalsOverride, runtime]);

  return <OpenAiBridgeProvider runtime={runtime}>{children}</OpenAiBridgeProvider>;
};

const withProviders: Decorator = (Story, context) => (
  <MockRuntimeDecorator mock={context.parameters.openaiMock as OpenAiMockParameters | undefined}>
    <Story />
  </MockRuntimeDecorator>
);

const preview: Preview = {
  decorators: [withProviders],
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
