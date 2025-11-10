import type { Decorator, Preview } from '@storybook/react';
import { OpenAiBridgeProvider } from '../src/providers/OpenAiBridgeProvider';
import '../src/app.css';

const withProviders: Decorator = (Story) => (
  <OpenAiBridgeProvider>
    <Story />
  </OpenAiBridgeProvider>
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
