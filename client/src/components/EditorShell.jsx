import ResizeHandle from './ResizeHandle.jsx';

export default function EditorShell({
  toolRail,
  assetPanel,
  canvas,
  timeline,
  inspector,
  leftOpen,
  rightOpen,
  leftWidth,
  rightWidth,
  onLeftWidthChange,
  onRightWidthChange,
  onLeftWidthReset,
  onRightWidthReset,
  leftOverlayOpen,
  rightOverlayOpen,
  onCloseLeftOverlay,
  onCloseRightOverlay,
}) {
  return (
    <div className="flex-1 min-h-0 flex overflow-hidden relative">
      <div className="hidden md:flex shrink-0">{toolRail}</div>

      {leftOpen && (
        <>
          <aside className="hidden xl:flex shrink-0 min-w-0" style={{ width: leftWidth }}>
            {assetPanel}
          </aside>
          <div className="hidden xl:block">
            <ResizeHandle
              orientation="vertical"
              value={leftWidth}
              min={240}
              max={380}
              onChange={onLeftWidthChange}
              onReset={onLeftWidthReset}
              label="Redimensionar biblioteca"
            />
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        {canvas}
        {timeline}
      </main>

      {rightOpen && (
        <>
          <div className="hidden xl:block">
            <ResizeHandle
              orientation="vertical"
              value={rightWidth}
              min={300}
              max={440}
              onChange={onRightWidthChange}
              onReset={onRightWidthReset}
              label="Redimensionar inspector"
              reverse
            />
          </div>
          <aside className="hidden xl:flex shrink-0 min-w-0" style={{ width: rightWidth }}>
            {inspector}
          </aside>
        </>
      )}

      {leftOverlayOpen && (
        <div className="hidden md:block xl:hidden absolute inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onCloseLeftOverlay} aria-label="Cerrar biblioteca" />
          <aside className="absolute left-[60px] top-0 bottom-0 w-[min(360px,calc(100vw-60px))] animate-slide-in-left shadow-panel-lg">
            {assetPanel}
          </aside>
        </div>
      )}

      {rightOverlayOpen && (
        <div className="hidden md:block xl:hidden absolute inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onCloseRightOverlay} aria-label="Cerrar inspector" />
          <aside className="absolute right-0 top-0 bottom-0 w-[min(400px,calc(100vw-60px))] animate-slide-in-right shadow-panel-lg">
            {inspector}
          </aside>
        </div>
      )}
    </div>
  );
}
