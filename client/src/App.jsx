import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VideoUploader from './components/VideoUploader.jsx';
import VideoPreview from './components/VideoPreview.jsx';
import TopBar from './components/TopBar.jsx';
import LeftSidebar from './components/LeftSidebar.jsx';
import PropertiesPanel from './components/PropertiesPanel.jsx';
import TransportBar from './components/TransportBar.jsx';
import TimelineRuler from './components/TimelineRuler.jsx';
import ClipTrack from './components/ClipTrack.jsx';
import RestoreBanner from './components/RestoreBanner.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import ShortcutOverlay from './components/ShortcutOverlay.jsx';
import MobileDrawer from './components/MobileDrawer.jsx';
import BottomSheet from './components/BottomSheet.jsx';
import PendingFilesBanner from './components/PendingFilesBanner.jsx';
import useEditor from './hooks/useEditor.js';
import useProjectAutosave from './hooks/useProjectAutosave.js';
import useExitConfirmation from './hooks/useExitConfirmation.js';
import useProjectState from './hooks/useProjectState.js';
import { getTrackWidth, clampZoom } from './lib/timelineScale.js';
import { TEMPLATES } from './lib/projectDefaults.js';

export default function App() {
  const project = useProjectState();
  const {
    files, clips, transitions, meta, setMeta,
    activeClipId, currentOffset, setCurrentOffset, selectedTextId, setSelectedTextId,
    fileById, activeClip, activeFile, activeClipDuration, pendingFiles, undo,
    handleFilesAdded, handleAddClip, handleDeleteClip, handleDuplicateClip, handleReorder,
    handleTrimChange, handleTransformChange, handleSpeedChange, handleAudioChange, handlePipChange,
    handleAddText, handleUpdateText, handleDeleteText, handleSplit, handleTransitionChange,
    handleSelectClip, handleApplyTemplate, handleReset, handleSaveProject, handleLoadProject,
    handleRestore,
  } = project;

  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [showGuides, setShowGuides] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [exportConfig, setExportConfig] = useState({ resolution: '1080', fps: 30, quality: 'high', platform: 'tiktok' });
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [timelineContainer, setTimelineContainer] = useState(null);
  const previewRef = useRef(null);
  const shuttleRef = useRef({ direction: 0, level: 0 });

  const { totalDuration, snapPoints, currentGlobalTime: getGlobalTime } = useEditor(clips, transitions);

  const trackWidth = useMemo(
    () => getTrackWidth(clips, timelineZoom),
    [clips, timelineZoom]
  );

  const currentGlobalTime = useMemo(() => {
    return getGlobalTime(activeClipId) + currentOffset;
  }, [getGlobalTime, activeClipId, currentOffset]);

  const handleTimelineZoomChange = useCallback((zoom) => {
    setTimelineZoom(clampZoom(zoom));
  }, []);

  const handleSeek = useCallback((offsetWithinClip) => {
    previewRef.current?.seekTo(offsetWithinClip);
    setCurrentOffset(offsetWithinClip);
  }, [setCurrentOffset]);

  const handleGlobalSeek = useCallback((globalTime) => {
    let cum = 0;
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipDur = (clip.sourceEnd - clip.sourceStart) / (clip.speed || 1);
      if (globalTime <= cum + clipDur || i === clips.length - 1) {
        const offsetInClip = Math.max(0, Math.min(clipDur, globalTime - cum));
        handleSelectClip(clip.id);
        setCurrentOffset(offsetInClip);
        previewRef.current?.seekTo(offsetInClip);
        return;
      }
      cum += clipDur;
      if (i < clips.length - 1) {
        const t = transitions[i];
        if (t && t.type && t.type !== 'none') {
          cum -= Number(t.durationSec) || 0;
        }
      }
    }
  }, [clips, transitions, handleSelectClip, setCurrentOffset]);

  const handleClipEnded = useCallback(() => {
    const idx = clips.findIndex((c) => c.id === activeClipId);
    if (idx >= 0 && idx < clips.length - 1) {
      handleSelectClip(clips[idx + 1].id);
    } else {
      setIsPlaying(false);
      if (clips.length > 0) {
        handleSelectClip(clips[0].id);
        previewRef.current?.seekTo(0);
      }
    }
  }, [clips, activeClipId, handleSelectClip]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && e.target.closest && e.target.closest('input,select,textarea,[contenteditable]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        undo.redo();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSplit();
      } else if (e.key === ' ') {
        e.preventDefault();
        shuttleRef.current = { direction: 0, level: 0 };
        previewRef.current?.stopRewind();
        setIsPlaying((p) => !p);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!isPlaying) previewRef.current?.stepFrame(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!isPlaying) previewRef.current?.stepFrame(1);
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        const s = shuttleRef.current;
        previewRef.current?.stopRewind();
        if (s.direction === -1) {
          s.level = Math.min(4, s.level + 1);
        } else {
          s.direction = -1;
          s.level = 1;
        }
        setIsPlaying(false);
        previewRef.current?.startRewind(s.level);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        shuttleRef.current = { direction: 0, level: 0 };
        previewRef.current?.stopRewind();
        previewRef.current?.setPlaybackSpeed(1);
        setIsPlaying(false);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        const s = shuttleRef.current;
        previewRef.current?.stopRewind();
        if (s.direction === 1) {
          s.level = Math.min(4, s.level + 1);
          previewRef.current?.setPlaybackSpeed(Math.pow(2, s.level - 1));
        } else {
          s.direction = 1;
          s.level = 1;
          setIsPlaying(true);
          previewRef.current?.setPlaybackSpeed(1);
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((s) => !s);
      } else if (e.key === 'Escape') {
        setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSplit, undo, isPlaying]);

  const hasFiles = files.length > 0;
  const { showConfirm, confirmExit, cancelExit } = useExitConfirmation(hasFiles);

  const autosaveState = useProjectAutosave({
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      duration: f.duration,
      waveform: f.waveform,
      filmstripBase64: f.filmstripBase64,
    })),
    clips,
    transitions,
    meta,
  });

  const onRestore = useCallback(async () => {
    const data = autosaveState.restore();
    if (!data) return;
    await handleRestore(data);
  }, [autosaveState, handleRestore]);

  return (
    <div className="h-full flex flex-col bg-editor-bg">
      <RestoreBanner onRestore={onRestore} onDismiss={autosaveState.dismiss} hasData={autosaveState.hasSavedData} />
      <PendingFilesBanner files={pendingFiles} />
      <TopBar
        files={files}
        clips={clips}
        transitions={transitions}
        meta={meta}
        totalDuration={totalDuration}
        onSave={handleSaveProject}
        onLoad={handleLoadProject}
        exportConfig={exportConfig}
        onExportConfigChange={setExportConfig}
        canUndo={undo.canUndo}
        canRedo={undo.canRedo}
        onUndo={undo.undo}
        onRedo={undo.redo}
        onToggleLeftSidebar={() => setMobileLeftOpen(true)}
        onToggleRightSidebar={() => setMobileRightOpen(true)}
        onToggleLeftCollapse={() => setLeftCollapsed((v) => !v)}
        onToggleRightCollapse={() => setRightCollapsed((v) => !v)}
        leftCollapsed={leftCollapsed}
        rightCollapsed={rightCollapsed}
        hasFiles={hasFiles}
      />

      {!hasFiles ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="w-full max-w-lg flex flex-col gap-6 animate-fade-in">
            <VideoUploader onFilesAdded={handleFilesAdded} compact={false} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-neutral-400">
              <div className="p-3 rounded-xl bg-glass-panel border border-glass-border">
                <div className="text-xl mb-1 text-gradient-accent font-bold">1</div>
                <div className="font-semibold text-neutral-200 text-xs">Upload</div>
                <p className="text-[11px] mt-1">Sube uno o varios videos (hasta 10, 500 MB c/u).</p>
              </div>
              <div className="p-3 rounded-xl bg-glass-panel border border-glass-border">
                <div className="text-xl mb-1 text-gradient-accent font-bold">2</div>
                <div className="font-semibold text-neutral-200 text-xs">Edit</div>
                <p className="text-[11px] mt-1">Corta con <span className="font-mono text-neutral-200">S</span>, reordena, ajusta trim y transiciones.</p>
              </div>
              <div className="p-3 rounded-xl bg-glass-panel border border-glass-border">
                <div className="text-xl mb-1 text-gradient-accent font-bold">3</div>
                <div className="font-semibold text-neutral-200 text-xs">Export</div>
                <p className="text-[11px] mt-1">FFmpeg compone todo a un MP4 vertical 1080x1920.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          <div className={['hidden md:flex shrink-0', leftCollapsed ? 'md:w-14' : 'md:w-[280px]'].join(' ')}>
            <LeftSidebar
              files={files}
              onAddClip={handleAddClip}
              onFilesAdded={handleFilesAdded}
              templates={TEMPLATES}
              onApplyTemplate={handleApplyTemplate}
              hasClips={clips.length > 0}
              onAddText={handleAddText}
              activeClip={activeClip}
              collapsed={leftCollapsed}
              onToggleCollapse={() => setLeftCollapsed((v) => !v)}
            />
          </div>

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 flex items-center justify-center bg-editor-bg overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-radial from-accent/[0.04] via-transparent to-transparent pointer-events-none" />
              <VideoPreview
                ref={previewRef}
                clip={activeClip}
                fileUrl={activeFile ? activeFile.url : null}
                isPlaying={isPlaying}
                onTimeUpdate={setCurrentOffset}
                onClipEnded={handleClipEnded}
                onPlayStateChange={setIsPlaying}
                meta={meta}
                onTransformChange={handleTransformChange}
                selectedTextId={selectedTextId}
                onSelectText={setSelectedTextId}
                onUpdateText={handleUpdateText}
                currentOffset={currentOffset}
                files={files}
                showGuides={showGuides}
              />
            </div>

            <TransportBar
              isPlaying={isPlaying}
              onPlayPause={() => {
                shuttleRef.current = { direction: 0, level: 0 };
                previewRef.current?.stopRewind();
                setIsPlaying((p) => !p);
              }}
              onSplit={handleSplit}
              onDelete={() => {
                if (activeClip && clips.length > 1) {
                  setConfirmAction({
                    title: 'Delete clip',
                    message: `Are you sure you want to delete clip #${clips.findIndex((c) => c.id === activeClip.id) + 1}?`,
                    onConfirm: () => { handleDeleteClip(activeClip.id); setConfirmAction(null); },
                  });
                }
              }}
              onReset={() => {
                setConfirmAction({
                  title: 'Reset project',
                  message: 'This will remove all clips and files. Are you sure?',
                  onConfirm: () => { handleReset(); setConfirmAction(null); setIsPlaying(false); },
                });
              }}
              onOpenProperties={() => setMobileRightOpen(true)}
              onOpenMedia={() => setMobileLeftOpen(true)}
              currentOffset={currentOffset}
              totalDuration={activeClipDuration}
              clipsCount={clips.length}
              canDelete={clips.length > 1}
              showGuides={showGuides}
              onToggleGuides={() => setShowGuides((g) => !g)}
            />

            <div className="h-48 md:h-52 flex flex-col bg-editor-panel/60 border-t border-glass-border shrink-0 backdrop-blur-md">
              <TimelineRuler
                totalDuration={totalDuration}
                onSeek={handleGlobalSeek}
                currentGlobalTime={currentGlobalTime}
                timelineZoom={timelineZoom}
                trackWidth={trackWidth}
                scrollContainer={timelineContainer}
                snapPoints={snapPoints}
                clips={clips}
                transitions={transitions}
              />
              <div className="flex-1 overflow-y-hidden px-2 py-2">
                <ClipTrack
                  ref={setTimelineContainer}
                  clips={clips}
                  activeClipId={activeClipId}
                  transitions={transitions}
                  fileById={fileById}
                  onSelect={handleSelectClip}
                  onDelete={handleDeleteClip}
                  onDuplicate={handleDuplicateClip}
                  onReorder={handleReorder}
                  onTransitionChange={handleTransitionChange}
                  timelineZoom={timelineZoom}
                  trackWidth={trackWidth}
                  onTimelineZoomChange={handleTimelineZoomChange}
                  currentGlobalTime={currentGlobalTime}
                  isPlaying={isPlaying}
                />
              </div>
            </div>
          </div>

          <div className={['hidden lg:flex shrink-0', rightCollapsed ? 'lg:w-14' : 'lg:w-[320px]'].join(' ')}>
            <PropertiesPanel
              meta={meta}
              onMetaChange={setMeta}
              activeClip={activeClip}
              activeFile={activeFile}
              selectedTextId={selectedTextId}
              onSelectText={setSelectedTextId}
              onAddText={handleAddText}
              onUpdateText={handleUpdateText}
              onDeleteText={handleDeleteText}
              onSpeedChange={handleSpeedChange}
              onAudioChange={handleAudioChange}
              onPipChange={handlePipChange}
              onTrimChange={handleTrimChange}
              onTransformChange={handleTransformChange}
              onSeek={handleSeek}
              files={files}
              currentOffset={currentOffset}
              collapsed={rightCollapsed}
              onToggleCollapse={() => setRightCollapsed((v) => !v)}
            />
          </div>
        </div>
      )}

      {hasFiles && (
        <>
          <MobileDrawer
            open={mobileLeftOpen}
            onClose={() => setMobileLeftOpen(false)}
            side="left"
            title="Media & Tools"
          >
            <LeftSidebar
              files={files}
              onAddClip={handleAddClip}
              onFilesAdded={handleFilesAdded}
              templates={TEMPLATES}
              onApplyTemplate={handleApplyTemplate}
              hasClips={clips.length > 0}
              onAddText={handleAddText}
              activeClip={activeClip}
              embedded
            />
          </MobileDrawer>

          <BottomSheet
            open={mobileRightOpen}
            onClose={() => setMobileRightOpen(false)}
            title="Properties"
          >
            <PropertiesPanel
              meta={meta}
              onMetaChange={setMeta}
              activeClip={activeClip}
              activeFile={activeFile}
              selectedTextId={selectedTextId}
              onSelectText={setSelectedTextId}
              onAddText={handleAddText}
              onUpdateText={handleUpdateText}
              onDeleteText={handleDeleteText}
              onSpeedChange={handleSpeedChange}
              onAudioChange={handleAudioChange}
              onPipChange={handlePipChange}
              onTrimChange={handleTrimChange}
              onTransformChange={handleTransformChange}
              onSeek={handleSeek}
              files={files}
              currentOffset={currentOffset}
              embedded
            />
          </BottomSheet>
        </>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title}
        message={confirmAction?.message}
        onConfirm={confirmAction?.onConfirm}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={showConfirm}
        title="Leave editor?"
        message="You have unsaved work in the editor. If you leave, your changes will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={confirmExit}
        onCancel={cancelExit}
        variant="danger"
      />
      <ShortcutOverlay isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <ToastContainer />
    </div>
  );
}
