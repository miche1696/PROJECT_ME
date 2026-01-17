from flask import Flask, jsonify
from flask_cors import CORS
import config
from services.file_service import FileService
from services.note_service import NoteService
from services.folder_service import FolderService
from services.whisper_service import WhisperService
from services.text_processing_service import TextProcessingService
from api.notes import notes_bp
from api.folders import folders_bp
from api.transcription import transcription_bp
from api.text_processing import text_processing_bp


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Enable CORS for all routes
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
            "allow_headers": ["Content-Type"]
        }
    })

    # Configuration
    app.config['DEBUG'] = config.DEBUG
    app.config['NOTES_DIR'] = config.NOTES_DIR
    app.config['UPLOADS_DIR'] = config.UPLOADS_DIR

    # Initialize services
    file_service = FileService(config.NOTES_DIR)
    note_service = NoteService(file_service)
    folder_service = FolderService(file_service)

    # Initialize Whisper service (this may take a moment to load the model)
    print("Initializing Whisper service...")
    whisper_service = WhisperService(model_name=config.WHISPER_MODEL)

    # Initialize text processing service
    print("Initializing text processing service...")
    text_processing_service = TextProcessingService(llm_client=None)

    # Store services in app config for access in routes
    app.config['FILE_SERVICE'] = file_service
    app.config['NOTE_SERVICE'] = note_service
    app.config['FOLDER_SERVICE'] = folder_service
    app.config['WHISPER_SERVICE'] = whisper_service
    app.config['TEXT_PROCESSING_SERVICE'] = text_processing_service

    # Register blueprints
    app.register_blueprint(notes_bp, url_prefix='/api/notes')
    app.register_blueprint(folders_bp, url_prefix='/api/folders')
    app.register_blueprint(transcription_bp, url_prefix='/api/transcription')
    app.register_blueprint(text_processing_bp, url_prefix='/api/text')

    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'message': 'Note-taking API is running'
        }), 200

    # Root endpoint
    @app.route('/', methods=['GET'])
    def root():
        return jsonify({
            'name': 'Note-Taking API',
            'version': '1.0.0',
            'endpoints': {
                'notes': '/api/notes',
                'folders': '/api/folders',
                'transcription': '/api/transcription',
                'text': '/api/text',
                'health': '/api/health'
            }
        }), 200

    return app


if __name__ == '__main__':
    app = create_app()
    print(f"Starting Flask server on port {config.FLASK_PORT}")
    print(f"Notes directory: {config.NOTES_DIR}")
    print(f"Uploads directory: {config.UPLOADS_DIR}")
    app.run(
        host='0.0.0.0',
        port=config.FLASK_PORT,
        debug=config.DEBUG
    )
