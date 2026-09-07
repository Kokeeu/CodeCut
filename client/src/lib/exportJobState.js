export const INITIAL_EXPORT_STATE = {
  status: 'idle',
  progress: 0,
  error: null,
};

export function exportJobReducer(state, action) {
  switch (action.type) {
    case 'start':
      return { status: 'uploading', progress: 0, error: null };
    case 'processing':
      return { status: 'processing', progress: action.progress ?? state.progress, error: null };
    case 'progress':
      return {
        ...state,
        progress: Math.max(state.progress, Math.min(1, Math.max(0, action.progress))),
      };
    case 'downloading':
      return { status: 'downloading', progress: 1, error: null };
    case 'complete':
      return { status: 'done', progress: 1, error: null };
    case 'fail':
      return { status: 'idle', progress: 0, error: action.error };
    case 'reset':
      return { ...INITIAL_EXPORT_STATE };
    default:
      return state;
  }
}
