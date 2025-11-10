import { useSyncExternalStore } from 'react';
import { useOpenAiBridge } from '../providers/OpenAiBridgeProvider';

export const useWidgetState = <T = unknown>() => {
  const { getWidgetStateSnapshot, subscribeToWidgetState } = useOpenAiBridge();
  return useSyncExternalStore(subscribeToWidgetState, getWidgetStateSnapshot, getWidgetStateSnapshot) as T;
};
