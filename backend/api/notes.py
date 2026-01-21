from flask import Blueprint, request, jsonify, current_app
from werkzeug.exceptions import BadRequest

notes_bp = Blueprint('notes', __name__)


@notes_bp.route('', methods=['GET'])
def list_notes():
    """List all notes or notes in a specific folder."""
    try:
        note_service = current_app.config['NOTE_SERVICE']

        # Get optional folder path query parameter
        folder_path = request.args.get('folder', '')

        if folder_path:
            # List notes in specific folder
            notes = note_service.list_notes(folder_path)
        else:
            # List all notes recursively
            notes = note_service.list_all_notes()

        return jsonify({
            'notes': notes,
            'count': len(notes)
        }), 200

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@notes_bp.route('/<path:note_path>', methods=['GET'])
def get_note(note_path):
    """Get a specific note with content."""
    try:
        note_service = current_app.config['NOTE_SERVICE']
        note = note_service.get_note(note_path)
        return jsonify(note), 200

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@notes_bp.route('', methods=['POST'])
def create_note():
    """Create a new note."""
    try:
        note_service = current_app.config['NOTE_SERVICE']

        # Parse request body
        data = request.get_json()
        if not data:
            raise BadRequest("Request body must be JSON")

        name = data.get('name')
        if not name:
            return jsonify({'error': 'Note name is required'}), 400

        folder_path = data.get('folder', '')
        content = data.get('content', '')
        file_type = data.get('file_type', 'txt')

        # Validate file_type
        if file_type not in ['txt', 'md']:
            return jsonify({'error': 'Invalid file_type. Must be "txt" or "md"'}), 400

        # Create note
        note = note_service.create_note(folder_path, name, content, file_type)

        return jsonify(note), 201

    except FileExistsError as e:
        return jsonify({'error': str(e)}), 409
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@notes_bp.route('/<path:note_path>', methods=['PUT'])
def update_note(note_path):
    """Update note content."""
    try:
        note_service = current_app.config['NOTE_SERVICE']

        # Parse request body
        data = request.get_json()
        if not data:
            raise BadRequest("Request body must be JSON")

        content = data.get('content')
        if content is None:
            return jsonify({'error': 'Content is required'}), 400

        # Update note
        note = note_service.update_note(note_path, content)

        return jsonify(note), 200

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@notes_bp.route('/<path:note_path>', methods=['DELETE'])
def delete_note(note_path):
    """Delete a note."""
    try:
        note_service = current_app.config['NOTE_SERVICE']
        note_service.delete_note(note_path)

        return jsonify({'message': 'Note deleted successfully'}), 200

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@notes_bp.route('/<path:note_path>/rename', methods=['PATCH'])
def rename_note(note_path):
    """Rename a note."""
    try:
        note_service = current_app.config['NOTE_SERVICE']

        # Parse request body
        data = request.get_json()
        if not data:
            raise BadRequest("Request body must be JSON")

        new_name = data.get('new_name')
        if not new_name:
            return jsonify({'error': 'New name is required'}), 400

        # Rename note
        note = note_service.rename_note(note_path, new_name)

        return jsonify(note), 200

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@notes_bp.route('/<path:note_path>/move', methods=['PATCH'])
def move_note(note_path):
    """Move a note to a different folder."""
    try:
        note_service = current_app.config['NOTE_SERVICE']

        # Parse request body
        data = request.get_json()
        if not data:
            raise BadRequest("Request body must be JSON")

        target_folder = data.get('target_folder')
        if target_folder is None:
            return jsonify({'error': 'target_folder is required'}), 400

        # Move note
        note = note_service.move_note(note_path, target_folder)

        return jsonify(note), 200

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except FileExistsError as e:
        return jsonify({'error': str(e)}), 409
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500
