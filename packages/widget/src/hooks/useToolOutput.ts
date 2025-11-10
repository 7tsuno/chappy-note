import { useSyncExternalStore } from 'react';
import type { ToolOutputEnvelope } from '../types/openai';
import { useOpenAiBridge } from '../providers/OpenAiBridgeProvider';

export const useToolOutput = <T = ToolOutputEnvelope | undefined>() => {
  const { getToolOutputSnapshot, subscribeToToolOutput } = useOpenAiBridge();
  return useSyncExternalStore(subscribeToToolOutput, getToolOutputSnapshot, getToolOutputSnapshot) as T;
};
