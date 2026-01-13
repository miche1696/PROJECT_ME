import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).parent.parent

# Flask configuration
FLASK_ENV = os.getenv('FLASK_ENV', 'development')
FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))
DEBUG = FLASK_ENV == 'development'

# Directory paths
NOTES_DIR = BASE_DIR / os.getenv('NOTES_DIR', 'notes')
UPLOADS_DIR = BASE_DIR / os.getenv('UPLOADS_DIR', 'uploads')

# Whisper configuration
WHISPER_MODEL = os.getenv('WHISPER_MODEL', 'base')
MAX_AUDIO_SIZE_MB = int(os.getenv('MAX_AUDIO_SIZE_MB', 100))
MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024

# Ensure directories exist
NOTES_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Supported file formats
SUPPORTED_AUDIO_FORMATS = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm']
SUPPORTED_TEXT_FORMATS = ['.txt']
