from flask import Blueprint, request, jsonify, current_app

trace_bp = Blueprint('trace', __name__)


@trace_bp.route('/client', methods=['POST'])
def log_client_trace():
    """Ingest trace events from the frontend and write to frontend trace log."""
    trace_logger = current_app.config.get('FRONTEND_TRACE_LOGGER')
    if not trace_logger:
        return jsonify({'error': 'Trace logger not configured'}), 500

    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({'error': 'Request body must be JSON'}), 400

    event = payload.get('event', 'client.event')
    data = payload.get('data', payload)

    trace_logger.write(event, data=data)
    return jsonify({'ok': True}), 200
