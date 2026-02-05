import type { TraceEntry, TreeNode } from "./types";

export async function fetchTree(): Promise<TreeNode> {
  const res = await fetch("/api/tree");
  if (!res.ok) {
    throw new Error("Failed to load project tree");
  }
  return res.json();
}

export async function fetchFile(path: string): Promise<string> {
  const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    throw new Error("Failed to load file");
  }
  const data = await res.json();
  return data.content as string;
}

export async function saveFile(path: string, content: string): Promise<void> {
  const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    throw new Error("Failed to save file");
  }
}

export async function runAgent(prompt: string, scope: string, selection: string): Promise<{ patchPreview: string }> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, scope, selection }),
  });
  if (!res.ok) {
    throw new Error("Failed to run agent");
  }
  return res.json();
}

export async function fetchTrace(): Promise<TraceEntry[]> {
  const res = await fetch("/api/trace");
  if (!res.ok) {
    throw new Error("Failed to load trace entries");
  }
  return res.json();
}

export async function createEntry(path: string, type: "file" | "dir"): Promise<void> {
  const res = await fetch("/api/entry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, type }),
  });
  if (!res.ok) {
    throw new Error("Failed to create entry");
  }
}

export async function renameEntry(path: string, newName: string): Promise<void> {
  const res = await fetch("/api/rename", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, new_name: newName }),
  });
  if (!res.ok) {
    throw new Error("Failed to rename entry");
  }
}

export async function moveEntry(path: string, newPath: string): Promise<void> {
  const res = await fetch("/api/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, new_path: newPath }),
  });
  if (!res.ok) {
    throw new Error("Failed to move entry");
  }
}

export async function deleteEntry(path: string): Promise<void> {
  const res = await fetch(`/api/entry?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete entry");
  }
}
