from typing import List, Optional
from pathlib import Path
from services.file_service import FileService


class NoteService:
    """High-level service for note operations."""

    def __init__(self, file_service: FileService):
        """Initialize note service with file service."""
        self.file_service = file_service

    def get_note(self, note_path: str) -> dict:
        """
        Get a note with its content.

        Args:
            note_path: Relative path to note

        Returns:
            Note dictionary with content

        Raises:
            ValueError: If path is invalid
            FileNotFoundError: If note doesn't exist
        """
        content = self.file_service.read_note(note_path)

        # Get note metadata from file system
        if not note_path.endswith('.txt'):
            note_path = f"{note_path}.txt"

        full_path = self.file_service._get_full_path(note_path)
        stat = full_path.stat()

        from models.note import Note
        from datetime import datetime

        note = Note(
            path=note_path.replace('.txt', ''),
            name=Path(note_path).stem,
            content=content,
            created_at=datetime.fromtimestamp(stat.st_ctime),
            modified_at=datetime.fromtimestamp(stat.st_mtime),
            size=stat.st_size
        )

        return note.to_dict()

    def list_notes(self, folder_path: str = "") -> List[dict]:
        """
        List notes in a folder (not recursive).

        Args:
            folder_path: Relative path to folder

        Returns:
            List of note metadata (without content)
        """
        return self.file_service.list_notes(folder_path)

    def list_all_notes(self) -> List[dict]:
        """
        List all notes recursively.

        Returns:
            List of all note metadata (without content)
        """
        return self.file_service.list_all_notes()

    def create_note(self, folder_path: str, name: str, content: str = "") -> dict:
        """
        Create a new note.

        Args:
            folder_path: Relative path to folder (empty string for root)
            name: Note name (without .txt extension)
            content: Initial note content

        Returns:
            Created note dictionary

        Raises:
            ValueError: If path or name is invalid
            FileExistsError: If note already exists
        """
        # Sanitize name
        name = self.file_service._sanitize_filename(name)
        if not name:
            raise ValueError("Invalid note name")

        # Build note path
        if folder_path:
            note_path = f"{folder_path}/{name}"
        else:
            note_path = name

        # Check if note already exists
        if self.file_service.note_exists(note_path):
            raise FileExistsError(f"Note already exists: {note_path}")

        # Write note
        self.file_service.write_note(note_path, content)

        # Return created note
        return self.get_note(note_path)

    def update_note(self, note_path: str, content: str) -> dict:
        """
        Update note content.

        Args:
            note_path: Relative path to note
            content: New content

        Returns:
            Updated note dictionary

        Raises:
            ValueError: If path is invalid
            FileNotFoundError: If note doesn't exist
        """
        # Check if note exists
        if not self.file_service.note_exists(note_path):
            raise FileNotFoundError(f"Note not found: {note_path}")

        # Write content
        self.file_service.write_note(note_path, content)

        # Return updated note
        return self.get_note(note_path)

    def delete_note(self, note_path: str) -> None:
        """
        Delete a note.

        Args:
            note_path: Relative path to note

        Raises:
            ValueError: If path is invalid
            FileNotFoundError: If note doesn't exist
        """
        self.file_service.delete_note(note_path)

    def rename_note(self, note_path: str, new_name: str) -> dict:
        """
        Rename a note.

        Args:
            note_path: Current relative path to note
            new_name: New name for note (without extension)

        Returns:
            Renamed note dictionary with new path

        Raises:
            ValueError: If path or name is invalid
            FileNotFoundError: If note doesn't exist
        """
        new_path = self.file_service.rename_note(note_path, new_name)

        # Return updated note
        return self.get_note(new_path.replace('.txt', ''))

    def move_note(self, note_path: str, target_folder: str) -> dict:
        """
        Move a note to a different folder.

        Args:
            note_path: Current relative path to note
            target_folder: Target folder path (empty string for root)

        Returns:
            Moved note dictionary with new path

        Raises:
            ValueError: If path is invalid
            FileNotFoundError: If note doesn't exist or target folder doesn't exist
            FileExistsError: If note with same name already exists in target folder
        """
        new_path = self.file_service.move_note(note_path, target_folder)

        # Return updated note
        return self.get_note(new_path)
