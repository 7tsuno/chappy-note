declare module '@storybook/react' {
  import type { ReactNode } from 'react';

  export type StoryFn = () => ReactNode;
  export type Decorator = (Story: StoryFn, context: Record<string, unknown>) => ReactNode;

  export interface Meta<TComponent = unknown> {
    title: string;
    component: TComponent;
    parameters?: Record<string, unknown>;
    decorators?: Decorator[];
    render?: StoryFn;
    [key: string]: unknown;
  }

  export interface StoryObj<TMeta extends Meta = Meta> {
    name?: string;
    decorators?: Decorator[];
    args?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    render?: StoryFn;
    [key: string]: unknown;
  }

  export interface Preview {
    decorators?: Decorator[];
    parameters?: Record<string, unknown>;
  }
}
