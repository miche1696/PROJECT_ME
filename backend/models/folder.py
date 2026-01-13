from dataclasses import dataclass
from typing import List


@dataclass
class Folder:
    """Represents a folder in the system."""
    path: str  # Relative path from notes/ directory
    name: str  # Folder name
    children: List['Folder']  # Nested folders
    notes: List[dict]  # Notes in this folder (as dicts with metadata)

    def to_dict(self) -> dict:
        """Serialize folder to dictionary (recursive)."""
        return {
            'path': self.path,
            'name': self.name,
            'children': [child.to_dict() for child in self.children],
            'notes': self.notes
        }
