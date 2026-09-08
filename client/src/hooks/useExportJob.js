import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  cancelExportJob,
  createExportJob,
  downloadExport,
  saveExportBlob,
  subscribeToExport,
} from '../lib/exportApi.js';
import { exportJobReducer, INITIAL_EXPORT_STATE } from '../lib/exportJobState.js';

export default function useExportJob(exportConfig) {
  const [state, dispatch] = useReducer(exportJobReducer, INITIAL_EXPORT_STATE);
  const jobIdRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const resetTimerRef = useRef(null);
  const operationRef = useRef(0);
  const abortRef = useRef(null);

  const closeSubscription = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  useEffect(() => () => {
    operationRef.current += 1;
    abortRef.current?.abort();
    closeSubscription();
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, [closeSubscription]);

  const fail = useCallback((error) => {
    closeSubscription();
    jobIdRef.current = null;
    dispatch({ type: 'fail', error: error?.message || String(error) });
  }, [closeSubscription]);

  const finishDownload = useCallback(async (jobId) => {
    dispatch({ type: 'downloading' });
    try {
      const blob = await downloadExport(jobId);
      saveExportBlob(blob, `codecut-${exportConfig.resolution}p-${Date.now()}.mp4`);
      dispatch({ type: 'complete' });
      resetTimerRef.current = setTimeout(() => dispatch({ type: 'reset' }), 2500);
    } catch (error) {
      fail(error);
    }
  }, [exportConfig.resolution, fail]);

  const start = useCallback(async (prepareFormData) => {
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    dispatch({ type: 'start' });
    try {
      const formData = await prepareFormData();
      if (operationRef.current !== operation) return;
      const jobId = await createExportJob(formData, abortRef.current.signal);
      if (operationRef.current !== operation) {
        await cancelExportJob(jobId).catch(() => {});
        return;
      }
      jobIdRef.current = jobId;
      dispatch({ type: 'processing', progress: 0 });
      unsubscribeRef.current = subscribeToExport(
        jobId,
        (update) => {
          if (jobIdRef.current !== jobId) return;
          const progress = Number(update.progress);
          if (Number.isFinite(progress)) dispatch({ type: 'progress', progress });
          if (update.status === 'ready') {
            closeSubscription();
            jobIdRef.current = null;
            finishDownload(jobId);
          } else if (update.status === 'error' || update.status === 'cancelled') {
            fail(new Error(update.error || `La exportación terminó con estado: ${update.status}.`));
          }
        },
        fail
      );
    } catch (error) {
      if (operationRef.current !== operation || error?.name === 'AbortError') return;
      fail(error);
    }
  }, [closeSubscription, fail, finishDownload]);

  const cancel = useCallback(async () => {
    operationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    const jobId = jobIdRef.current;
    jobIdRef.current = null;
    closeSubscription();
    dispatch({ type: 'reset' });
    if (!jobId) return;
    try {
      await cancelExportJob(jobId);
    } catch (error) {
      dispatch({ type: 'fail', error: error.message || 'No se pudo cancelar la exportación.' });
    }
  }, [closeSubscription]);

  return { ...state, start, cancel, fail };
}
