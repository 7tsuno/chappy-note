import type { Decorator, Preview } from '@storybook/react';
import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { OpenAiBridgeProvider } from '../src/providers/OpenAiBridgeProvider';
import { createMockOpenAiRuntime } from '../src/lib/openAiRuntime';
import type { OpenAiGlobals, ToolOutputEnvelope } from '../src/types/openai';
import '../src/app.css';

type OpenAiMockParameters = {
  toolOutput?: ToolOutputEnvelope;
  themeMode?: 'light' | 'dark';
  globals?: OpenAiGlobals;
  widgetState?: unknown;
};

const MockRuntimeDecorator = ({
  mock,
  children,
}: PropsWithChildren<{ mock?: OpenAiMockParameters }>) => {
  const runtime = useMemo(() => {
    const globalsOverride =
      mock?.globals || mock?.themeMode
        ? {
            ...(mock?.globals ?? {}),
            theme: {
              ...(mock?.globals?.theme ?? {}),
              ...(mock?.themeMode ? { mode: mock.themeMode } : {}),
            },
          }
        : undefined;

    return createMockOpenAiRuntime({
      toolOutput: mock?.toolOutput,
      globals: globalsOverride,
      widgetState: mock?.widgetState,
    });
  }, [mock]);

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
