from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

# TODO : Understand what data models are needed to make "parallel" requests. (Aka making a registration/llm call on a note, then moving to another before the first is finished to execute another registration/llm call)

@dataclass
class Note:
    """Represents a note in the system."""
    path: str  # Relative path from notes/ directory
    name: str  # Filename without extension
    content: str  # Note text content
    created_at: datetime
    modified_at: datetime
    size: int  # File size in bytes
    file_type: str = 'txt'  # 'txt' or 'md'

    @classmethod
    def from_file(cls, file_path: Path, notes_dir: Path) -> 'Note':
        """Create a Note instance from a file path."""
        stat = file_path.stat()

        # Get relative path from notes directory
        rel_path = file_path.relative_to(notes_dir)
        path_str = str(rel_path).replace('\\', '/')  # Normalize separators

        # Get name without extension
        name = file_path.stem

        # Get file type from extension
        extension = file_path.suffix.lower()
        file_type = 'md' if extension == '.md' else 'txt'

        # Read content
        try:
            content = file_path.read_text(encoding='utf-8')
        except Exception:
            content = ""

        return cls(
            path=path_str,
            name=name,
            content=content,
            created_at=datetime.fromtimestamp(stat.st_ctime),
            modified_at=datetime.fromtimestamp(stat.st_mtime),
            size=stat.st_size,
            file_type=file_type
        )

    def to_dict(self, include_content: bool = True) -> dict:
        """Serialize note to dictionary."""
        data = {
            'path': self.path,
            'name': self.name,
            'created_at': self.created_at.isoformat(),
            'modified_at': self.modified_at.isoformat(),
            'size': self.size,
            'file_type': self.file_type
        }

        if include_content:
            data['content'] = self.content

        return data
