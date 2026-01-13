from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from pathlib import Path
import uuid
import config

transcription_bp = Blueprint('transcription', __name__)


@transcription_bp.route('/audio', methods=['POST'])
def transcribe_audio():
    """
    Upload and transcribe audio file.

    Expects multipart/form-data with 'audio' file field.

    Returns:
        JSON with transcribed text, language, and duration
    """
    try:
        whisper_service = current_app.config.get('WHISPER_SERVICE')
        if not whisper_service:
            return jsonify({'error': 'Whisper service not initialized'}), 500

        # Check if file is in request
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']

        # Check if file was selected
        if audio_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Validate file format
        if not whisper_service.is_supported_format(audio_file.filename):
            supported = ', '.join(whisper_service.supported_formats())
            return jsonify({
                'error': f'Unsupported audio format. Supported formats: {supported}'
            }), 400

        # Generate unique filename
        file_ext = Path(audio_file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        temp_path = config.UPLOADS_DIR / unique_filename

        # Save uploaded file temporarily
        audio_file.save(str(temp_path))
        print(f"Audio file saved: {temp_path}")

        # Validate file size
        is_valid, error_msg = whisper_service.validate_audio_file(
            str(temp_path),
            max_size_bytes=config.MAX_AUDIO_SIZE_BYTES
        )

        if not is_valid:
            # Clean up invalid file
            whisper_service.cleanup_temp_file(str(temp_path))
            return jsonify({'error': error_msg}), 400

        try:
            # Transcribe audio
            result = whisper_service.transcribe_audio(str(temp_path))

            # Clean up temp file
            whisper_service.cleanup_temp_file(str(temp_path))

            return jsonify({
                'text': result['text'],
                'language': result['language'],
                'duration': result['duration'],
                'message': 'Transcription successful'
            }), 200

        except Exception as transcribe_error:
            # Clean up temp file on error
            whisper_service.cleanup_temp_file(str(temp_path))
            raise transcribe_error

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return jsonify({'error': f'Transcription failed: {str(e)}'}), 500


@transcription_bp.route('/formats', methods=['GET'])
def get_supported_formats():
    """Get list of supported audio formats."""
    try:
        whisper_service = current_app.config.get('WHISPER_SERVICE')
        if not whisper_service:
            return jsonify({'error': 'Whisper service not initialized'}), 500

        return jsonify({
            'formats': whisper_service.supported_formats(),
            'max_size_mb': config.MAX_AUDIO_SIZE_MB
        }), 200

    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500
