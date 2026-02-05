from typing import List
from services.file_service import FileService


class FolderService:
    """High-level service for folder operations."""

    def __init__(self, file_service: FileService):
        """Initialize folder service with file service."""
        self.file_service = file_service

    def get_folder_tree(self, folder_path: str = "") -> dict:
        """
        Get recursive folder tree structure.

        Args:
            folder_path: Relative path to folder (empty string for root)

        Returns:
            Folder tree dictionary

        Raises:
            ValueError: If path is invalid
            FileNotFoundError: If folder doesn't exist
        """
        return self.file_service.get_folder_tree(folder_path)

    def create_folder(self, parent_path: str, name: str) -> dict:
        """
        Create a new folder.

        Args:
            parent_path: Relative path to parent folder (empty string for root)
            name: Folder name

        Returns:
            Created folder info dictionary

        Raises:
            ValueError: If path or name is invalid
            FileExistsError: If folder already exists
        """
        # Sanitize name
        name = self.file_service._sanitize_filename(name)
        if not name:
            raise ValueError("Invalid folder name")

        # Build folder path
        if parent_path:
            folder_path = f"{parent_path}/{name}"
        else:
            folder_path = name

        # Create folder
        self.file_service.create_folder(folder_path)

        return {
            'path': folder_path,
            'name': name,
            'message': 'Folder created successfully'
        }

    def rename_folder(self, folder_path: str, new_name: str) -> dict: # TODO : Where is this used?
        """
        Rename a folder.

        Args:
            folder_path: Current relative path to folder
            new_name: New name for folder

        Returns:
            Renamed folder info with new path

        Raises:
            ValueError: If path or name is invalid
            FileNotFoundError: If folder doesn't exist
        """
        new_path = self.file_service.rename_folder(folder_path, new_name)

        return {
            'old_path': folder_path,
            'new_path': new_path,
            'name': new_name,
            'message': 'Folder renamed successfully'
        }

    def delete_folder(self, folder_path: str, recursive: bool = False) -> dict: # TODO : Where is this used? There is no "delete" folder button/function.
        """
        Delete a folder.

        Args:
            folder_path: Relative path to folder
            recursive: If True, delete folder and all contents

        Returns:
            Success message dictionary

        Raises:
            ValueError: If path is invalid or trying to delete root
            FileNotFoundError: If folder doesn't exist
            OSError: If folder is not empty and recursive=False
        """
        self.file_service.delete_folder(folder_path, recursive)

        return {
            'path': folder_path,
            'message': 'Folder deleted successfully'
        }

    def folder_exists(self, folder_path: str) -> bool:
        """Check if folder exists."""
        return self.file_service.folder_exists(folder_path)

    def move_folder(self, folder_path: str, target_folder: str) -> dict:
        """
        Move a folder to a different parent folder.

        Args:
            folder_path: Current relative path to folder
            target_folder: Target parent folder path (empty string for root)

        Returns:
            Moved folder info with new path

        Raises:
            ValueError: If path is invalid, trying to move root, or moving folder into itself/descendant
            FileNotFoundError: If folder doesn't exist or target folder doesn't exist
            FileExistsError: If folder with same name already exists in target folder
        """
        new_path = self.file_service.move_folder(folder_path, target_folder)

        return {
            'old_path': folder_path,
            'new_path': new_path,
            'name': new_path.split('/')[-1] if new_path else 'root',
            'message': 'Folder moved successfully'
        }
