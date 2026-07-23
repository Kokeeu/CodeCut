import { useState } from 'react';
import FilePool from './FilePool.jsx';
import TemplatesPanel from './TemplatesPanel.jsx';
import VideoUploader from './VideoUploader.jsx';

const TABS = [
  { id: 'media', icon: '📁', label: 'Media' },
  { id: 'text', icon: '📝', label: 'Text' },
  { id: 'templates', icon: '🎨', label: 'Templates' },
];

export default function LeftSidebar({ files, onAddClip, onFilesAdded, templates, onApplyTemplate, hasClips, onAddText, activeClip }) {
  const [activeTab, setActiveTab] = useState('media');

  return (
    <div className="flex bg-editor-panel border-r border-editor-border shrink-0">
      <div className="w-14 flex flex-col items-center py-2 gap-1 border-r border-editor-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'w-10 h-10 rounded-lg flex flex-col items-center justify-center text-sm transition-colors',
              activeTab === tab.id
                ? 'bg-accent-bg text-accent'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-editor-surface',
            ].join(' ')}
            title={tab.label}
          >
            <span className="text-base leading-none">{tab.icon}</span>
          </button>
        ))}
      </div>

      <div className="w-56 flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-editor-border">
          <h3 className="text-xs font-semibold text-neutral-300">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {activeTab === 'media' && (
            <div className="flex flex-col gap-2">
              <FilePool files={files} onAddClip={onAddClip} onFilesAdded={onFilesAdded} vertical />
              <VideoUploader onFilesAdded={onFilesAdded} compact />
            </div>
          )}

          {activeTab === 'text' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={onAddText}
                disabled={!activeClip}
                className="w-full px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                + Add text to clip
              </button>
              {!activeClip && (
                <p className="text-[10px] text-neutral-500 text-center py-2">
                  Select a clip first
                </p>
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
      </div>
    </div>
  );
}
