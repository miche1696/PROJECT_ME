import os
import shutil
from pathlib import Path
from typing import List, Optional
from models.note import Note
from models.folder import Folder


class FileService:
    """Service for file system operations on notes and folders."""

    def __init__(self, notes_dir: Path):
        """Initialize file service with notes directory."""
        self.notes_dir = Path(notes_dir).resolve()
        self.notes_dir.mkdir(parents=True, exist_ok=True)

    def validate_path(self, path: str) -> bool:
        """
        Validate path to prevent directory traversal attacks.

        Args:
            path: Relative path from notes directory

        Returns:
            True if path is valid and safe, False otherwise
        """
        if not path:
            return True  # Empty path is valid (root)

        # Reject paths with dangerous patterns
        if '..' in path or path.startswith('/') or path.startswith('\\'):
            return False

        # Reject absolute paths
        if os.path.isabs(path):
            return False

        try:
            # Resolve full path and ensure it's within notes directory
            full_path = (self.notes_dir / path).resolve()
            return full_path.is_relative_to(self.notes_dir)
        except (ValueError, OSError):
            return False

    def _get_full_path(self, relative_path: str) -> Path:
        """
        Convert relative path to full filesystem path with validation.

        Args:
            relative_path: Path relative to notes directory

        Returns:
            Full filesystem path

        Raises:
            ValueError: If path is invalid or unsafe
        """
        if not self.validate_path(relative_path):
            raise ValueError(f"Invalid or unsafe path: {relative_path}")

        return (self.notes_dir / relative_path).resolve()

    # ========== NOTE OPERATIONS ==========

    def read_note(self, note_path: str) -> str:
        """
        Read note content from file.

        Args:
            note_path: Relative path to note (with or without .txt extension)

        Returns:
            Note content as string

        Raises:
            ValueError: If path is invalid
            FileNotFoundError: If note doesn't exist
        """
        if not note_path.endswith('.txt'):
            note_path = f"{note_path}.txt"

        full_path = self._get_full_path(note_path)

        if not full_path.exists():
            raise FileNotFoundError(f"Note not found: {note_path}")

        return full_path.read_text(encoding='utf-8')

    def write_note(self, note_path: str, content: str) -> None:
        """
        Write note content to file.

        Args:
            note_path: Relative path to note (with or without .txt extension)
            content: Note content to write

        Raises:
            ValueError: If path is invalid
        """
        if not note_path.endswith('.txt'):
            note_path = f"{note_path}.txt"

        full_path = self._get_full_path(note_path)

        # Create parent directories if they don't exist
        full_path.parent.mkdir(parents=True, exist_ok=True)

        # Write content
        full_path.write_text(content, encoding='utf-8')

    def delete_note(self, note_path: str) -> None:
        """
        Delete a note file.

        Args:
            note_path: Relative path to note (with or without .txt extension)

        Raises:
            ValueError: If path is invalid
            FileNotFoundError: If note doesn't exist
        """
        if not note_path.endswith('.txt'):
            note_path = f"{note_path}.txt"

        full_path = self._get_full_path(note_path)

        if not full_path.exists():
            raise FileNotFoundError(f"Note not found: {note_path}")

        full_path.unlink()

    def rename_note(self, old_path: str, new_name: str) -> str:
        """
        Rename a note.

        Args:
            old_path: Current relative path to note
            new_name: New name for the note (without path, without extension)

        Returns:
            New relative path of renamed note

        Raises:
            ValueError: If path is invalid or new name is invalid
            FileNotFoundError: If note doesn't exist
        """
        if not old_path.endswith('.txt'):
            old_path = f"{old_path}.txt"

        # Sanitize new name
        new_name = self._sanitize_filename(new_name)
        if not new_name:
            raise ValueError("Invalid new name")

        full_old_path = self._get_full_path(old_path)

        if not full_old_path.exists():
            raise FileNotFoundError(f"Note not found: {old_path}")

        # Build new path in same directory
        new_full_path = full_old_path.parent / f"{new_name}.txt"

        # Ensure new path is also safe
        try:
            new_full_path = new_full_path.resolve()
            if not new_full_path.is_relative_to(self.notes_dir):
                raise ValueError("Invalid target path")
        except (ValueError, OSError):
            raise ValueError("Invalid target path")

        # Rename
        full_old_path.rename(new_full_path)

        # Return new relative path
        return str(new_full_path.relative_to(self.notes_dir)).replace('\\', '/')

    def move_note(self, note_path: str, target_folder: str) -> str:
        """
        Move a note to a different folder.

        Args:
            note_path: Current relative path to note
            target_folder: Target folder path (empty string for root)

        Returns:
            New relative path of moved note

        Raises:
            ValueError: If path is invalid
            FileNotFoundError: If note doesn't exist or target folder doesn't exist
            FileExistsError: If note with same name already exists in target folder
        """
        if not note_path.endswith('.txt'):
            note_path = f"{note_path}.txt"

        # Get full paths
        full_note_path = self._get_full_path(note_path)

        if not full_note_path.exists():
            raise FileNotFoundError(f"Note not found: {note_path}")

        if not full_note_path.is_file():
            raise ValueError(f"Path is not a note: {note_path}")

        # Get target folder path
        full_target_folder = self._get_full_path(target_folder)

        if not full_target_folder.exists():
            raise FileNotFoundError(f"Target folder not found: {target_folder}")

        if not full_target_folder.is_dir():
            raise ValueError(f"Target path is not a folder: {target_folder}")

        # Build new note path in target folder
        note_name = full_note_path.name
        new_full_path = full_target_folder / note_name

        # Check if note already exists in target
        if new_full_path.exists():
            raise FileExistsError(f"Note already exists in target folder: {note_name}")

        # Ensure new path is safe
        try:
            new_full_path = new_full_path.resolve()
            if not new_full_path.is_relative_to(self.notes_dir):
                raise ValueError("Invalid target path")
        except (ValueError, OSError):
            raise ValueError("Invalid target path")

        # Move the file
        shutil.move(str(full_note_path), str(new_full_path))

        # Return new relative path
        return str(new_full_path.relative_to(self.notes_dir)).replace('\\', '/').replace('.txt', '')

    def list_notes(self, folder_path: str = "") -> List[dict]:
        """
        List all notes in a folder (not recursive).

        Args:
            folder_path: Relative path to folder (empty string for root)

        Returns:
            List of note metadata dictionaries

        Raises:
            ValueError: If path is invalid
            FileNotFoundError: If folder doesn't exist
        """
        full_path = self._get_full_path(folder_path)

        if not full_path.exists():
            raise FileNotFoundError(f"Folder not found: {folder_path}")

        if not full_path.is_dir():
            raise ValueError(f"Path is not a folder: {folder_path}")

        notes = []
        for file_path in full_path.glob('*.txt'):
            if file_path.is_file():
                try:
                    note = Note.from_file(file_path, self.notes_dir)
                    notes.append(note.to_dict(include_content=False))
                except Exception:
                    # Skip files that can't be read
                    continue

        # Sort by modified date (newest first)
        notes.sort(key=lambda n: n['modified_at'], reverse=True)

        return notes

    def list_all_notes(self) -> List[dict]:
        """
        List all notes recursively from all folders.

        Returns:
            List of all note metadata dictionaries
        """
        notes = []

        for file_path in self.notes_dir.rglob('*.txt'):
            if file_path.is_file():
                try:
                    note = Note.from_file(file_path, self.notes_dir)
                    notes.append(note.to_dict(include_content=False))
                except Exception:
                    continue

        # Sort by modified date (newest first)
        notes.sort(key=lambda n: n['modified_at'], reverse=True)

        return notes

    # ========== FOLDER OPERATIONS ==========

    def create_folder(self, folder_path: str) -> None:
        """
        Create a new folder.

        Args:
            folder_path: Relative path for new folder

        Raises:
            ValueError: If path is invalid
            FileExistsError: If folder already exists
        """
        full_path = self._get_full_path(folder_path)

        if full_path.exists():
            raise FileExistsError(f"Folder already exists: {folder_path}")

        full_path.mkdir(parents=True, exist_ok=False)

    def delete_folder(self, folder_path: str, recursive: bool = False) -> None:
        """
        Delete a folder.

        Args:
            folder_path: Relative path to folder
            recursive: If True, delete folder and all contents

        Raises:
            ValueError: If path is invalid or trying to delete root
            FileNotFoundError: If folder doesn't exist
            OSError: If folder is not empty and recursive=False
        """
        if not folder_path:
            raise ValueError("Cannot delete root folder")

        full_path = self._get_full_path(folder_path)

        if not full_path.exists():
            raise FileNotFoundError(f"Folder not found: {folder_path}")

        if not full_path.is_dir():
            raise ValueError(f"Path is not a folder: {folder_path}")

        if recursive:
            shutil.rmtree(full_path)
        else:
            # Only delete if empty
            try:
                full_path.rmdir()
            except OSError as e:
                raise OSError(f"Folder not empty: {folder_path}") from e

    def rename_folder(self, old_path: str, new_name: str) -> str:
        """
        Rename a folder.

        Args:
            old_path: Current relative path to folder
            new_name: New name for the folder (just the name, not full path)

        Returns:
            New relative path of renamed folder

        Raises:
            ValueError: If path is invalid or new name is invalid
            FileNotFoundError: If folder doesn't exist
        """
        if not old_path:
            raise ValueError("Cannot rename root folder")

        # Sanitize new name
        new_name = self._sanitize_filename(new_name)
        if not new_name:
            raise ValueError("Invalid new name")

        full_old_path = self._get_full_path(old_path)

        if not full_old_path.exists():
            raise FileNotFoundError(f"Folder not found: {old_path}")

        if not full_old_path.is_dir():
            raise ValueError(f"Path is not a folder: {old_path}")

        # Build new path in same parent directory
        new_full_path = full_old_path.parent / new_name

        # Ensure new path is safe
        try:
            new_full_path = new_full_path.resolve()
            if not new_full_path.is_relative_to(self.notes_dir):
                raise ValueError("Invalid target path")
        except (ValueError, OSError):
            raise ValueError("Invalid target path")

        # Rename
        full_old_path.rename(new_full_path)

        # Return new relative path
        return str(new_full_path.relative_to(self.notes_dir)).replace('\\', '/')

    def move_folder(self, folder_path: str, target_folder: str) -> str:
        """
        Move a folder to a different parent folder.

        Args:
            folder_path: Current relative path to folder
            target_folder: Target parent folder path (empty string for root)

        Returns:
            New relative path of moved folder

        Raises:
            ValueError: If path is invalid, trying to move root, or moving folder into itself/descendant
            FileNotFoundError: If folder doesn't exist or target folder doesn't exist
            FileExistsError: If folder with same name already exists in target folder
        """
        if not folder_path:
            raise ValueError("Cannot move root folder")

        # Get full paths
        full_folder_path = self._get_full_path(folder_path)

        if not full_folder_path.exists():
            raise FileNotFoundError(f"Folder not found: {folder_path}")

        if not full_folder_path.is_dir():
            raise ValueError(f"Path is not a folder: {folder_path}")

        # Get target folder path
        full_target_folder = self._get_full_path(target_folder)

        if not full_target_folder.exists():
            raise FileNotFoundError(f"Target folder not found: {target_folder}")

        if not full_target_folder.is_dir():
            raise ValueError(f"Target path is not a folder: {target_folder}")

        # Prevent moving folder into itself or its descendants
        try:
            target_resolved = full_target_folder.resolve()
            folder_resolved = full_folder_path.resolve()
            
            # Check if target is the same as source
            if target_resolved == folder_resolved:
                raise ValueError("Cannot move folder into itself")

            # Check if target is a descendant of source
            try:
                target_resolved.relative_to(folder_resolved)
                raise ValueError("Cannot move folder into its own descendant")
            except ValueError:
                # This is expected - target is not a descendant, which is good
                pass
        except (ValueError, OSError) as e:
            if "Cannot move" in str(e):
                raise
            raise ValueError("Invalid path resolution")

        # Build new folder path in target folder
        folder_name = full_folder_path.name
        new_full_path = full_target_folder / folder_name

        # Check if folder already exists in target
        if new_full_path.exists():
            raise FileExistsError(f"Folder already exists in target: {folder_name}")

        # Ensure new path is safe
        try:
            new_full_path = new_full_path.resolve()
            if not new_full_path.is_relative_to(self.notes_dir):
                raise ValueError("Invalid target path")
        except (ValueError, OSError):
            raise ValueError("Invalid target path")

        # Move the folder
        shutil.move(str(full_folder_path), str(new_full_path))

        # Return new relative path
        return str(new_full_path.relative_to(self.notes_dir)).replace('\\', '/')

    def get_folder_tree(self, folder_path: str = "") -> dict:
        """
        Get recursive folder tree structure with notes.

        Args:
            folder_path: Relative path to folder (empty string for root)

        Returns:
            Folder tree as dictionary

        Raises:
            ValueError: If path is invalid
            FileNotFoundError: If folder doesn't exist
        """
        full_path = self._get_full_path(folder_path)

        if not full_path.exists():
            raise FileNotFoundError(f"Folder not found: {folder_path}")

        if not full_path.is_dir():
            raise ValueError(f"Path is not a folder: {folder_path}")

        return self._build_folder_tree(full_path)

    def _build_folder_tree(self, path: Path) -> dict:
        """
        Recursively build folder tree structure.

        Args:
            path: Full filesystem path to folder

        Returns:
            Folder dictionary with children and notes
        """
        # Get relative path
        rel_path = str(path.relative_to(self.notes_dir)).replace('\\', '/')
        if rel_path == '.':
            rel_path = ''

        # Get folder name
        name = path.name if path != self.notes_dir else 'root'

        # Get notes in this folder
        notes = []
        for file_path in path.glob('*.txt'):
            if file_path.is_file():
                try:
                    note = Note.from_file(file_path, self.notes_dir)
                    notes.append(note.to_dict(include_content=False))
                except Exception:
                    continue

        # Sort notes by modified date
        notes.sort(key=lambda n: n['modified_at'], reverse=True)

        # Get subfolders recursively
        children = []
        for subfolder in sorted(path.iterdir()):
            if subfolder.is_dir() and not subfolder.name.startswith('.'):
                children.append(self._build_folder_tree(subfolder))

        return {
            'path': rel_path,
            'name': name,
            'children': children,
            'notes': notes
        }

    # ========== HELPER METHODS ==========

    def _sanitize_filename(self, name: str) -> str:
        """
        Sanitize filename to remove dangerous characters.

        Args:
            name: Filename to sanitize

        Returns:
            Sanitized filename
        """
        # Remove leading/trailing whitespace
        name = name.strip()

        # Remove or replace dangerous characters
        dangerous_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '\0']
        for char in dangerous_chars:
            name = name.replace(char, '-')

        # Remove leading/trailing dots (hidden files on Unix)
        name = name.strip('.')

        return name

    def note_exists(self, note_path: str) -> bool:
        """Check if a note exists."""
        try:
            if not note_path.endswith('.txt'):
                note_path = f"{note_path}.txt"
            full_path = self._get_full_path(note_path)
            return full_path.exists() and full_path.is_file()
        except ValueError:
            return False

    def folder_exists(self, folder_path: str) -> bool:
        """Check if a folder exists."""
        try:
            full_path = self._get_full_path(folder_path)
            return full_path.exists() and full_path.is_dir()
        except ValueError:
            return False
