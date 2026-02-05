export type TreeNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
};

export type TraceEntry = {
  id: string;
  createdAt: string;
  prompt: string;
  scope: string;
  model: string;
  patchPreview: string;
};
