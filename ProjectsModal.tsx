import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { Project } from '../../types/editor';
import { getAllProjects, deleteProject } from '../../services/storage';
import {
  X,
  FolderOpen,
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  Film,
  Calendar,
  Clock
} from 'lucide-react';

export const ProjectsModal: React.FC = () => {
  const {
    project,
    createNewProject,
    loadProjectById,
    exportProjectFile,
    importProjectFile,
    setActiveModal
  } = useEditor();

  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectAspect, setNewProjectAspect] = useState('1080p');
  const [isCreating, setIsCreating] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const fetchProjects = async () => {
    const list = await getAllProjects();
    setSavedProjects(list);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateNew = () => {
    const name = newProjectName.trim() || 'Untitled Project';
    createNewProject(name, newProjectAspect);
    setActiveModal(null);
  };

  const handleOpen = async (id: string) => {
    await loadProjectById(id);
    setActiveModal(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject(id);
      fetchProjects();
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await importProjectFile(e.target.files[0]);
      setActiveModal(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#16181d] border border-[#2b303c] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-12 bg-[#1c1f26] border-b border-[#2b303c] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm text-white">Project Manager</span>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[#222630]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="h-11 bg-[#14161b] border-b border-[#2b303c] px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-neutral-900 font-semibold rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>New Project</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".opencut,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#222630] hover:bg-[#2b303c] text-neutral-300 hover:text-white border border-[#2b303c] rounded transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Project</span>
            </button>

            <button
              onClick={exportProjectFile}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#222630] hover:bg-[#2b303c] text-neutral-300 hover:text-white border border-[#2b303c] rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .opencut</span>
            </button>
          </div>
        </div>

        {/* New Project Inline Form */}
        {isCreating && (
          <div className="p-4 bg-[#1b1f28] border-b border-[#2b303c] flex flex-col gap-3 text-xs">
            <span className="font-medium text-white text-xs">Create New Project</span>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Project title..."
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                className="bg-[#16181d] border border-[#2b303c] rounded px-3 py-1.5 text-white"
                autoFocus
              />

              <select
                value={newProjectAspect}
                onChange={e => setNewProjectAspect(e.target.value)}
                className="bg-[#16181d] border border-[#2b303c] rounded px-3 py-1.5 text-white"
              >
                <option value="1080p">16:9 Landscape (1920×1080)</option>
                <option value="vertical">9:16 Vertical (1080×1920)</option>
                <option value="square">1:1 Square (1080×1080)</option>
                <option value="cinema">21:9 Ultrawide Cinema</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => setIsCreating(false)}
                className="px-3 py-1 text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNew}
                className="px-3.5 py-1 bg-cyan-400 hover:bg-cyan-300 text-neutral-900 font-semibold rounded"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-2">
          {savedProjects.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              No saved projects found in local storage.
            </div>
          ) : (
            savedProjects.map(p => {
              const isCurrent = p.id === project.id;
              return (
                <div
                  key={p.id}
                  className={`p-3 rounded border flex items-center justify-between transition-colors ${
                    isCurrent
                      ? 'bg-[#1e2430] border-cyan-500/50 text-white'
                      : 'bg-[#1a1c22] border-[#2b303c] hover:border-neutral-500 text-neutral-300'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Film className={`w-4 h-4 ${isCurrent ? 'text-cyan-400' : 'text-neutral-500'}`} />
                      <span className="font-medium text-xs text-white">{p.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded font-mono">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                      <span>{p.settings.resolution.width}×{p.settings.resolution.height}</span>
                      <span>·</span>
                      <span>{p.clips?.length || 0} clips</span>
                      <span>·</span>
                      <span>{p.duration?.toFixed(1) || 10}s</span>
                      <span>·</span>
                      <span>{new Date(p.lastModified).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isCurrent && (
                      <button
                        onClick={() => handleOpen(p.id)}
                        className="px-3 py-1 bg-[#222630] hover:bg-[#2b303c] text-white rounded text-xs border border-[#2b303c] transition-colors"
                      >
                        Open
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 rounded hover:bg-[#222630]"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
