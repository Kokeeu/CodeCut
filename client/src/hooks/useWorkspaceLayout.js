import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  WORKSPACE_LAYOUT_DEFAULTS,
  clampLayoutValue,
  readWorkspaceLayout,
  writeWorkspaceLayout,
} from '../lib/workspaceLayout.js';

export default function useWorkspaceLayout() {
  const [layout, setLayout] = useState(() => (
    readWorkspaceLayout(typeof window === 'undefined' ? null : window.localStorage)
  ));

  useEffect(() => {
    const timer = setTimeout(() => {
      writeWorkspaceLayout(window.localStorage, layout);
    }, 120);
    return () => clearTimeout(timer);
  }, [layout]);

  const setDimension = useCallback((key, value) => {
    setLayout((current) => ({ ...current, [key]: clampLayoutValue(key, value) }));
  }, []);

  const setPanelOpen = useCallback((key, open) => {
    setLayout((current) => ({ ...current, [key]: Boolean(open) }));
  }, []);

  const togglePanel = useCallback((key) => {
    setLayout((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const resetDimension = useCallback((key) => {
    setLayout((current) => ({ ...current, [key]: WORKSPACE_LAYOUT_DEFAULTS[key] }));
  }, []);

  const setLeftWidth = useCallback((value) => setDimension('leftWidth', value), [setDimension]);
  const setRightWidth = useCallback((value) => setDimension('rightWidth', value), [setDimension]);
  const setTimelineHeight = useCallback((value) => setDimension('timelineHeight', value), [setDimension]);
  const setLeftOpen = useCallback((open) => setPanelOpen('leftOpen', open), [setPanelOpen]);
  const setRightOpen = useCallback((open) => setPanelOpen('rightOpen', open), [setPanelOpen]);
  const toggleLeft = useCallback(() => togglePanel('leftOpen'), [togglePanel]);
  const toggleRight = useCallback(() => togglePanel('rightOpen'), [togglePanel]);
  const resetLeftWidth = useCallback(() => resetDimension('leftWidth'), [resetDimension]);
  const resetRightWidth = useCallback(() => resetDimension('rightWidth'), [resetDimension]);
  const resetTimelineHeight = useCallback(() => resetDimension('timelineHeight'), [resetDimension]);

  return useMemo(() => ({
    ...layout,
    setLeftWidth,
    setRightWidth,
    setTimelineHeight,
    setLeftOpen,
    setRightOpen,
    toggleLeft,
    toggleRight,
    resetLeftWidth,
    resetRightWidth,
    resetTimelineHeight,
  }), [
    layout,
    resetLeftWidth,
    resetRightWidth,
    resetTimelineHeight,
    setLeftOpen,
    setLeftWidth,
    setRightOpen,
    setRightWidth,
    setTimelineHeight,
    toggleLeft,
    toggleRight,
  ]);
}
