from flask import Blueprint, request, jsonify, current_app

text_processing_bp = Blueprint('text_processing', __name__)


@text_processing_bp.route('/process', methods=['POST'])
def process_text():
    """
    Process text with specified operation.

    Request body (JSON):
        {
            "operation": "clean-transcription",
            "text": "um so like the meeting was...",
            "options": {}  // Optional operation-specific options
        }

    Response:
        {
            "processed_text": "the meeting was...",
            "operation": "clean-transcription",
            "original_length": 35,
            "result_length": 20
        }

    Error Response:
        {
            "error": "Error message"
        }
    """
    try:
        service = current_app.config.get('TEXT_PROCESSING_SERVICE')
        if not service:
            return jsonify({'error': 'Text processing service not initialized'}), 500

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400

        operation = data.get('operation')
        text = data.get('text')
        options = data.get('options', {})

        if not operation:
            return jsonify({'error': 'Operation ID required'}), 400
        if text is None:
            return jsonify({'error': 'Text required'}), 400

        result = service.process(operation, text, options)
        trace_logger = current_app.config.get('TRACE_LOGGER')
        if trace_logger:
            trace_logger.write(
                "text.process",
                data={
                    "operation": operation,
                    "input": text,
                    "output": result.get("processed_text"),
                    "options": options,
                },
            )
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except NotImplementedError as e:
        return jsonify({'error': str(e)}), 501
    except Exception as e:
        print(f"Text processing error: {str(e)}")
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500


@text_processing_bp.route('/operations', methods=['GET'])
def list_operations():
    """
    List available text processing operations.

    Response:
        {
            "operations": ["clean-transcription", "reorder-list", ...]
        }
    """
    try:
        service = current_app.config.get('TEXT_PROCESSING_SERVICE')
        if not service:
            return jsonify({'error': 'Text processing service not initialized'}), 500

        return jsonify({
            'operations': service.get_available_operations()
        }), 200

    except Exception as e:
        return jsonify({'error': f'Internal error: {str(e)}'}), 500


@text_processing_bp.route('/operations/info', methods=['GET'])
def get_operations_info():
    """
    Get detailed info about available operations.

    Response:
        {
            "operations": [
                {
                    "id": "clean-transcription",
                    "requires_llm": false,
                    "available": true
                },
                ...
            ]
        }
    """
    try:
        service = current_app.config.get('TEXT_PROCESSING_SERVICE')
        if not service:
            return jsonify({'error': 'Text processing service not initialized'}), 500

        return jsonify({
            'operations': service.get_operation_info()
        }), 200

    except Exception as e:
        return jsonify({'error': f'Internal error: {str(e)}'}), 500
