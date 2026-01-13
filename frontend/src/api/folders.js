import apiClient from './client';

export const foldersApi = {
  /**
   * Get folder tree structure
   * @param {string} path - Optional folder path (empty string for root)
   * @returns {Promise} Promise with folder tree
   */
  getFolderTree: async (path = '') => {
    const params = path ? { path } : {};
    const response = await apiClient.get('/folders', { params });
    return response.data;
  },

  /**
   * Create a new folder
   * @param {string} name - Folder name
   * @param {string} parent - Parent folder path (empty string for root)
   * @returns {Promise} Promise with created folder data
   */
  createFolder: async (name, parent = '') => {
    const response = await apiClient.post('/folders', {
      name,
      parent,
    });
    return response.data;
  },

  /**
   * Rename a folder
   * @param {string} folderPath - Current relative path to folder
   * @param {string} newName - New name for folder
   * @returns {Promise} Promise with updated folder data
   */
  renameFolder: async (folderPath, newName) => {
    const response = await apiClient.patch(`/folders/${folderPath}/rename`, {
      new_name: newName,
    });
    return response.data;
  },

  /**
   * Delete a folder
   * @param {string} folderPath - Relative path to folder
   * @param {boolean} recursive - Whether to delete contents recursively
   * @returns {Promise} Promise with success message
   */
  deleteFolder: async (folderPath, recursive = false) => {
    const response = await apiClient.delete(`/folders/${folderPath}`, {
      params: { recursive },
    });
    return response.data;
  },

  /**
   * Move a folder to a different parent folder
   * @param {string} folderPath - Current relative path to folder
   * @param {string} targetFolder - Target parent folder path (empty string for root)
   * @returns {Promise} Promise with updated folder data
   */
  moveFolder: async (folderPath, targetFolder) => {
    const response = await apiClient.patch(`/folders/${folderPath}/move`, {
      target_folder: targetFolder,
    });
    return response.data;
  },
};
