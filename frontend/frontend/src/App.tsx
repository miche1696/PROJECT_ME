import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  createEntry,
  deleteEntry,
  fetchFile,
  fetchTrace,
  fetchTree,
  moveEntry,
  renameEntry,
  runAgent,
  saveFile,
} from "./api";
import type { TraceEntry, TreeNode } from "./types";
import { htmlToMarkdown, markdownToHtml } from "./markdown";

const EMPTY_MARKDOWN = "# Welcome\n\nSelect a file from the project tree to begin.";

type CollapsedMap = Record<string, boolean>;

type TreeViewProps = {
  node: TreeNode;
  onSelect: (path: string) => void;
  activePath: string | null;
  collapsed: CollapsedMap;
  onToggle: (path: string) => void;
  onDelete: (path: string) => void;
  onConfirmDelete: (path: string) => void;
  onCancelDelete: () => void;
  onCreate: (parentPath: string, type: "file" | "dir") => void;
  pendingDelete: string | null;
  renamingPath: string | null;
  onRenameStart: (path: string) => void;
  onRenameCommit: (path: string, newName: string) => void;
  onRenameCancel: () => void;
  onMove: (path: string, newPath: string) => void;
};

function TreeView({
  node,
  onSelect,
  activePath,
  collapsed,
  onToggle,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onCreate,
  pendingDelete,
  renamingPath,
  onRenameStart,
  onRenameCommit,
  onRenameCancel,
  onMove,
}: TreeViewProps) {
  const nodeKey = node.path === "." ? "__root__" : node.path;

  if (node.type === "file") {
    const isActive = activePath === node.path;
    const isPending = pendingDelete === node.path;
    const isRenaming = renamingPath === node.path;
    const baseName = node.name;

    return (
      <div
        className={`tree-row ${isActive ? "active" : ""}`}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", node.path);
        }}
      >
        {isRenaming ? (
          <input
            className="tree-rename-input"
            autoFocus
            defaultValue={baseName}
            onBlur={(event) => onRenameCommit(node.path, event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onRenameCommit(node.path, (event.target as HTMLInputElement).value);
              }
              if (event.key === "Escape") {
                onRenameCancel();
              }
            }}
          />
        ) : (
          <button
            className="tree-item"
            onClick={() => onSelect(node.path)}
            onDoubleClick={() => onRenameStart(node.path)}
          >
            {node.name}
          </button>
        )}
        <div className="tree-actions">
          {isPending ? (
            <div className="delete-inline">
              <button type="button" className="danger" onClick={() => onConfirmDelete(node.path)}>
                Sure?
              </button>
              <button type="button" className="ghost" onClick={onCancelDelete}>
                X
              </button>
            </div>
          ) : (
            <button type="button" className="delete" onClick={() => onDelete(node.path)}>
              Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  const isCollapsed = collapsed[nodeKey] ?? true;
  const hasChildren = (node.children ?? []).length > 0;
  const isPendingFolder = pendingDelete === node.path;
  const isRenaming = renamingPath === node.path;

  return (
    <div className="tree-group">
      <div
        className="tree-row"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const sourcePath = event.dataTransfer.getData("text/plain");
          if (!sourcePath) {
            return;
          }
          const targetPath = node.path === "." ? sourcePath.split("/").pop() ?? sourcePath : `${node.path}/${sourcePath.split("/").pop() ?? sourcePath}`;
          onMove(sourcePath, targetPath);
        }}
      >
        <button className="tree-folder" type="button" onClick={() => onToggle(nodeKey)}>
          <span className="tree-caret">{isCollapsed ? "▸" : "▾"}</span>
          {isRenaming ? (
            <input
              className="tree-rename-input"
              autoFocus
              defaultValue={node.name}
              onBlur={(event) => onRenameCommit(node.path, event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onRenameCommit(node.path, (event.target as HTMLInputElement).value);
                }
                if (event.key === "Escape") {
                  onRenameCancel();
                }
              }}
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <span onDoubleClick={(event) => {
              event.stopPropagation();
              onRenameStart(node.path);
            }}>{node.name}</span>
          )}
        </button>
        <div className="tree-actions">
          <button type="button" onClick={() => onCreate(node.path, "file")}>New file</button>
          <button type="button" onClick={() => onCreate(node.path, "dir")}>New folder</button>
          {node.path !== "." ? (
            isPendingFolder ? (
              <div className="delete-inline">
                <button type="button" className="danger" onClick={() => onConfirmDelete(node.path)}>
                  Sure?
                </button>
                <button type="button" className="ghost" onClick={onCancelDelete}>
                  X
                </button>
              </div>
            ) : (
              <button type="button" className="delete" onClick={() => onDelete(node.path)}>
                Delete
              </button>
            )
          ) : null}
        </div>
      </div>

      {!isCollapsed ? (
        <div className="tree-children">
          {hasChildren ? (
            (node.children ?? []).map((child) => (
              <TreeView
                key={child.path}
                node={child}
                onSelect={onSelect}
                activePath={activePath}
                collapsed={collapsed}
                onToggle={onToggle}
                onDelete={onDelete}
                onConfirmDelete={onConfirmDelete}
                onCancelDelete={onCancelDelete}
                onCreate={onCreate}
                pendingDelete={pendingDelete}
                renamingPath={renamingPath}
                onRenameStart={onRenameStart}
                onRenameCommit={onRenameCommit}
                onRenameCancel={onRenameCancel}
                onMove={onMove}
              />
            ))
          ) : (
            <div className="tree-empty">empty</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [agentPrompt, setAgentPrompt] = useState<string>("");
  const [agentResult, setAgentResult] = useState<string>("");
  const [showTrace, setShowTrace] = useState<boolean>(false);
  const [traceEntries, setTraceEntries] = useState<TraceEntry[]>([]);
  const [collapsedFolders, setCollapsedFolders] = useState<CollapsedMap>({});
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: markdownToHtml(EMPTY_MARKDOWN),
  });

  const initCollapsed = (data: TreeNode): CollapsedMap => {
    const collapsed: CollapsedMap = {};
    const collectFolders = (node: TreeNode) => {
      const key = node.path === "." ? "__root__" : node.path;
      if (node.type === "dir") {
        collapsed[key] = true;
        (node.children ?? []).forEach(collectFolders);
      }
    };
    collectFolders(data);
    return collapsed;
  };

  const refreshTree = async () => {
    const data = await fetchTree();
    setTree(data);
    setCollapsedFolders((prev) => (Object.keys(prev).length ? prev : initCollapsed(data)));
  };

  useEffect(() => {
    refreshTree().catch(() => setTree(null));
  }, []);

  useEffect(() => {
    if (!selectedPath || !editor) {
      return;
    }

    setStatus("Loading...");
    fetchFile(selectedPath)
      .then((content) => {
        editor.commands.setContent(markdownToHtml(content || ""));
        setStatus("");
      })
      .catch(() => {
        setStatus("Failed to load file");
      });
  }, [selectedPath, editor]);

  const selectionText = useMemo(() => {
    if (!editor) {
      return "";
    }
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, "\n");
  }, [editor, editor?.state.selection]);

  const handleSave = async () => {
    if (!editor || !selectedPath) {
      return;
    }
    setStatus("Saving...");
    const html = editor.getHTML();
    const markdown = htmlToMarkdown(html);
    try {
      await saveFile(selectedPath, markdown);
      setStatus("Saved");
      setTimeout(() => setStatus(""), 1200);
    } catch {
      setStatus("Failed to save");
    }
  };

  const handleRunAgent = async () => {
    if (!selectedPath || !agentPrompt.trim()) {
      return;
    }
    setAgentResult("Running...");
    try {
      const result = await runAgent(agentPrompt, selectedPath, selectionText);
      setAgentResult(result.patchPreview);
      if (showTrace) {
        const updatedTrace = await fetchTrace();
        setTraceEntries(updatedTrace);
      }
    } catch {
      setAgentResult("Agent call failed");
    }
  };

  const handleToggleTrace = async () => {
    const next = !showTrace;
    setShowTrace(next);
    if (next) {
      try {
        const entries = await fetchTrace();
        setTraceEntries(entries);
      } catch {
        setTraceEntries([]);
      }
    }
  };

  const handleToggleFolder = (path: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const promptForName = (label: string, initial = "") => {
    const value = window.prompt(label, initial);
    if (!value) {
      return null;
    }
    return value.trim();
  };

  const handleCreate = async (parentPath: string, type: "file" | "dir") => {
    const name = promptForName(type === "file" ? "New file name (.md)" : "New folder name");
    if (!name) {
      return;
    }
    const normalizedName = type === "file" && !name.endsWith(".md") ? `${name}.md` : name;
    const path = parentPath === "." ? normalizedName : `${parentPath}/${normalizedName}`;
    await createEntry(path, type);
    await refreshTree();
  };

  const handleDelete = (path: string) => {
    setPendingDelete(path);
  };

  const confirmDelete = async (path: string) => {
    await deleteEntry(path);
    if (selectedPath === path) {
      setSelectedPath(null);
    }
    if (pendingDelete === path) {
      setPendingDelete(null);
    }
    await refreshTree();
  };

  const cancelDelete = () => {
    setPendingDelete(null);
  };

  const handleRenameStart = (path: string) => {
    setRenamingPath(path);
  };

  const handleRenameCancel = () => {
    setRenamingPath(null);
  };

  const handleRenameCommit = async (path: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === path.split("/").pop()) {
      setRenamingPath(null);
      return;
    }
    await renameEntry(path, trimmed);
    if (selectedPath === path) {
      const parent = path.split("/").slice(0, -1).join("/");
      setSelectedPath(parent ? `${parent}/${trimmed}` : trimmed);
    }
    setRenamingPath(null);
    await refreshTree();
  };

  const handleMove = async (path: string, newPath: string) => {
    if (path === newPath) {
      return;
    }
    await moveEntry(path, newPath);
    if (selectedPath === path) {
      setSelectedPath(newPath);
    }
    await refreshTree();
  };

  const handleCreateFromMenu = async (type: "file" | "dir") => {
    const parent = tree?.path ?? ".";
    await handleCreate(parent, type);
    setMenuOpen(false);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Notes</div>
        <div className="actions">
          <div className="menu">
            <button className="menu-button" type="button" onClick={() => setMenuOpen((prev) => !prev)}>
              •••
            </button>
            {menuOpen ? (
              <div className="menu-dropdown">
                <button type="button" onClick={() => handleCreateFromMenu("file")}>
                  New file
                </button>
                <button type="button" onClick={() => handleCreateFromMenu("dir")}>
                  New folder
                </button>
              </div>
            ) : null}
          </div>
          <button onClick={handleSave} disabled={!selectedPath} className="primary">
            Save
          </button>
          <button onClick={handleToggleTrace} className="ghost">
            {showTrace ? "Hide Trace" : "Show Trace"}
          </button>
          <span className={`status ${status ? "active" : ""}`}>{status}</span>
        </div>
      </header>

      <div className="layout">
        <aside className="panel tree-panel">
          <div className="panel-title">Project Tree</div>
          {tree ? (
            <TreeView
              node={tree}
              onSelect={setSelectedPath}
              activePath={selectedPath}
              collapsed={collapsedFolders}
              onToggle={handleToggleFolder}
              onDelete={handleDelete}
              onConfirmDelete={confirmDelete}
              onCancelDelete={cancelDelete}
              onCreate={handleCreate}
              pendingDelete={pendingDelete}
              renamingPath={renamingPath}
              onRenameStart={handleRenameStart}
              onRenameCommit={handleRenameCommit}
              onRenameCancel={handleRenameCancel}
              onMove={handleMove}
            />
          ) : (
            <div className="panel-empty">No project folder loaded.</div>
          )}
        </aside>

        <main className="panel editor-panel">
          <div className="panel-title">Editor</div>
          <EditorContent editor={editor} className="editor" />
        </main>

        <aside className="panel agent-panel">
          <div className="panel-title">Agent</div>
          <label className="field">
            Prompt
            <textarea
              value={agentPrompt}
              onChange={(event) => setAgentPrompt(event.target.value)}
              placeholder="Ask the agent to rewrite, summarize, or apply a change"
            />
          </label>
          <label className="field">
            Selection (read-only)
            <textarea value={selectionText} readOnly placeholder="Select text in the editor" />
          </label>
          <button onClick={handleRunAgent} disabled={!agentPrompt.trim()}>
            Run
          </button>
          <div className="agent-result">
            <div className="panel-subtitle">Patch Preview</div>
            <pre>{agentResult}</pre>
          </div>
          {showTrace ? (
            <div className="trace">
              <div className="panel-subtitle">Trace (dev)</div>
              {traceEntries.length === 0 ? (
                <div className="panel-empty">No trace entries yet.</div>
              ) : (
                traceEntries.map((entry) => (
                  <div key={entry.id} className="trace-entry">
                    <div className="trace-meta">{entry.createdAt}</div>
                    <div className="trace-prompt">{entry.prompt}</div>
                    <div className="trace-scope">{entry.scope}</div>
                    <pre>{entry.patchPreview}</pre>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
