import { useState } from 'react';
import FilePool from './FilePool.jsx';
import TemplatesPanel from './TemplatesPanel.jsx';
import VideoUploader from './VideoUploader.jsx';
import YouTubeImporter from './YouTubeImporter.jsx';
import { MAX_MEDIA_FILES } from '../lib/mediaImport.js';

const TABS = [
  { id: 'media', label: 'Media' },
  { id: 'text', label: 'Text' },
  { id: 'templates', label: 'Templates' },
];

function MediaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 11l4-3 3 2 3-2 4 3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 4h12M3 9h12M3 14h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="10" y="2" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="10" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="10" y="10" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function CollapseIcon({ collapsed }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function LeftSidebar({
  files, onAddClip, onFilesAdded, templates, onApplyTemplate,
  hasClips, onAddText, activeClip, collapsed, onToggleCollapse, embedded,
}) {
  const [activeTab, setActiveTab] = useState('media');

  const tabIcons = {
    media: MediaIcon,
    text: TextIcon,
    templates: TemplateIcon,
  };

  if (collapsed) {
    return (
      <div className="w-14 h-full flex flex-col items-center py-2 gap-1 bg-editor-panel/60 backdrop-blur-xl border-r border-glass-border shrink-0">
        {TABS.map((tab) => {
          const Icon = tabIcons[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); onToggleCollapse?.(); }}
              className={[
                'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150',
                activeTab === tab.id
                  ? 'bg-accent/15 text-accent'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5',
              ].join(' ')}
              title={tab.label}
            >
              <Icon />
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={onToggleCollapse}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-all"
          title="Expand panel"
        >
          <CollapseIcon collapsed />
        </button>
      </div>
    );
  }

  return (
    <aside
      className={[
        'flex flex-col bg-editor-panel/60 backdrop-blur-xl border-glass-border',
        embedded
          ? 'w-full h-full border-r-0'
          : 'w-full md:w-72 h-full border-r',
      ].join(' ')}
    >
      <div className="flex border-b border-glass-border shrink-0">
        {TABS.map((tab) => {
          const Icon = tabIcons[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-medium transition-all duration-150 relative',
                activeTab === tab.id
                  ? 'text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-300',
              ].join(' ')}
            >
              <Icon />
              <span className="hidden sm:inline">{tab.label}</span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-accent-dim to-accent rounded-full" />
              )}
            </button>
          );
        })}
        {!embedded && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex w-9 items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-colors"
            title="Collapse panel"
          >
            <CollapseIcon />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {activeTab === 'media' && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <FilePool files={files} onAddClip={onAddClip} onFilesAdded={onFilesAdded} vertical />
            <VideoUploader onFilesAdded={onFilesAdded} remainingSlots={MAX_MEDIA_FILES - files.length} compact />
            <YouTubeImporter onFilesAdded={onFilesAdded} currentFileCount={files.length} compact />
          </div>
        )}

        {activeTab === 'text' && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <button
              onClick={onAddText}
              disabled={!activeClip}
              className="group flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-xl bg-gradient-accent-soft border border-accent/20 text-xs font-semibold text-accent disabled:opacity-40 disabled:cursor-not-allowed hover:border-accent/40 hover:bg-accent/15 transition-all duration-150 focus-ring"
            >
              <PlusIcon />
              Add text to clip
            </button>
            {!activeClip && (
              <div className="p-3 rounded-xl bg-glass-panel border border-glass-border">
                <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
                  Select a clip in the timeline to add text overlays
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <TemplatesPanel
            templates={templates}
            onApply={onApplyTemplate}
            hasClips={hasClips}
            vertical
          />
        )}
      </div>
    </aside>
  );
}
