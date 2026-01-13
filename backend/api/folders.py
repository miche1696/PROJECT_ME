from flask import Blueprint, request, jsonify, current_app
from werkzeug.exceptions import BadRequest

folders_bp = Blueprint('folders', __name__)


@folders_bp.route('', methods=['GET'])
def get_folder_tree():
    """Get the complete folder tree structure with notes."""
    try:
        folder_service = current_app.config['FOLDER_SERVICE']

        # Get optional folder path query parameter
        folder_path = request.args.get('path', '')

        # Get folder tree
        tree = folder_service.get_folder_tree(folder_path)

        return jsonify(tree), 200

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@folders_bp.route('', methods=['POST'])
def create_folder():
    """Create a new folder."""
    try:
        folder_service = current_app.config['FOLDER_SERVICE']

        # Parse request body
        data = request.get_json()
        if not data:
            raise BadRequest("Request body must be JSON")

        name = data.get('name')
        if not name:
            return jsonify({'error': 'Folder name is required'}), 400

        parent_path = data.get('parent', '')

        # Create folder
        result = folder_service.create_folder(parent_path, name)

        return jsonify(result), 201

    except FileExistsError as e:
        return jsonify({'error': str(e)}), 409
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@folders_bp.route('/<path:folder_path>/rename', methods=['PATCH'])
def rename_folder(folder_path):
    """Rename a folder."""
    try:
        folder_service = current_app.config['FOLDER_SERVICE']

        # Parse request body
        data = request.get_json()
        if not data:
            raise BadRequest("Request body must be JSON")

        new_name = data.get('new_name')
        if not new_name:
            return jsonify({'error': 'New name is required'}), 400

        # Rename folder
        result = folder_service.rename_folder(folder_path, new_name)

        return jsonify(result), 200

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@folders_bp.route('/<path:folder_path>', methods=['DELETE'])
def delete_folder(folder_path):
    """Delete a folder."""
    try:
        folder_service = current_app.config['FOLDER_SERVICE']

        # Get optional recursive parameter
        recursive = request.args.get('recursive', 'false').lower() == 'true'

        # Delete folder
        result = folder_service.delete_folder(folder_path, recursive)

        return jsonify(result), 200

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except OSError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@folders_bp.route('/<path:folder_path>/move', methods=['PATCH'])
def move_folder(folder_path):
    """Move a folder to a different parent folder."""
    try:
        folder_service = current_app.config['FOLDER_SERVICE']

        # Parse request body
        data = request.get_json()
        if not data:
            raise BadRequest("Request body must be JSON")

        target_folder = data.get('target_folder')
        if target_folder is None:
            return jsonify({'error': 'target_folder is required'}), 400

        # Move folder
        result = folder_service.move_folder(folder_path, target_folder)

        return jsonify(result), 200

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
