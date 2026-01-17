"""
Text Processing Service

Handles text transformation operations for the note editor.
Follows the same service pattern as WhisperService.
"""

import re
from typing import Optional, Dict, Any


class TextProcessingService:
    """Service for text transformation operations."""

    def __init__(self, llm_client: Optional[Any] = None):
        """
        Initialize text processing service.

        Args:
            llm_client: Optional LLM client for AI-powered operations.
                       Pass None for basic operations, can add LLM later.
        """
        self.llm_client = llm_client
        self.operations = {
            'clean-transcription': self.clean_transcription,
            'reorder-list': self.reorder_list,
            'summarize': self.summarize,
            'custom-prompt': self.custom_prompt,
        }
        print("TextProcessingService initialized")
        if llm_client:
            print("  LLM client configured")
        else:
            print("  LLM client not configured (AI operations will be limited)")

    def process(self, operation_id: str, text: str, options: Dict = None) -> Dict:
        """
        Execute a text processing operation.

        Args:
            operation_id: ID of operation to execute
            text: Input text to process
            options: Optional operation-specific parameters

        Returns:
            Dictionary with:
                - processed_text: The result
                - operation: Operation ID
                - original_length: Length of input
                - result_length: Length of output

        Raises:
            ValueError: If operation_id is unknown
            NotImplementedError: If operation requires LLM but none configured
        """
        if operation_id not in self.operations:
            raise ValueError(f"Unknown operation: {operation_id}")

        handler = self.operations[operation_id]
        result = handler(text, options or {})

        return {
            'processed_text': result,
            'operation': operation_id,
            'original_length': len(text),
            'result_length': len(result),
        }

    def clean_transcription(self, text: str, options: Dict) -> str:
        """
        Clean up transcribed text.

        Removes filler words, fixes basic punctuation, and normalizes whitespace.
        This is a rule-based implementation that works without LLM.

        Args:
            text: Raw transcription text
            options: Optional settings (unused currently)

        Returns:
            Cleaned text
        """
        result = text

        # Common filler words and phrases (case-insensitive)
        filler_patterns = [
            r'\b(um+|uh+|uhh+)\b',
            r'\b(like,?\s*)+\b(?=\s)',  # "like" as filler, not "I like"
            r'\b(you know,?\s*)+',
            r'\b(i mean,?\s*)+',
            r'\b(so,?\s*)+(?=[A-Z])',  # "so" at sentence start
            r'\b(well,?\s*)+(?=[A-Z])',  # "well" at sentence start
            r'\b(basically,?\s*)+',
            r'\b(actually,?\s*)+',
            r'\b(literally,?\s*)+',
        ]

        for pattern in filler_patterns:
            result = re.sub(pattern, '', result, flags=re.IGNORECASE)

        # Normalize whitespace
        result = re.sub(r'[ \t]+', ' ', result)  # Multiple spaces to single
        result = re.sub(r'\n\s*\n\s*\n+', '\n\n', result)  # Max 2 newlines

        # Fix common punctuation issues
        result = re.sub(r'\s+([.,!?;:])', r'\1', result)  # Remove space before punctuation
        result = re.sub(r'([.,!?;:])([A-Za-z])', r'\1 \2', result)  # Add space after punctuation
        result = re.sub(r'([.!?])\s*\1+', r'\1', result)  # Remove duplicate punctuation

        # Capitalize first letter of sentences
        result = re.sub(
            r'([.!?]\s+)([a-z])',
            lambda m: m.group(1) + m.group(2).upper(),
            result
        )

        # Capitalize first letter of text
        if result and result[0].islower():
            result = result[0].upper() + result[1:]

        return result.strip()

    def reorder_list(self, text: str, options: Dict) -> str:
        """
        Reorder list items.

        Args:
            text: Text containing list items (one per line)
            options:
                - order: 'asc' (default), 'desc', or 'reverse'

        Returns:
            Reordered list text
        """
        lines = text.strip().split('\n')
        order = options.get('order', 'asc')

        # Detect and preserve list prefixes (-, *, 1., etc.)
        list_items = []
        for line in lines:
            # Match common list prefixes
            match = re.match(r'^(\s*(?:[-*•]\s*|\d+[.)]\s*))(.*)', line)
            if match:
                list_items.append((match.group(1), match.group(2)))
            else:
                list_items.append(('', line))

        # Sort by content (ignoring prefix)
        if order == 'asc':
            list_items.sort(key=lambda x: x[1].lower())
        elif order == 'desc':
            list_items.sort(key=lambda x: x[1].lower(), reverse=True)
        elif order == 'reverse':
            list_items.reverse()

        # Reconstruct with original prefixes
        return '\n'.join(prefix + content for prefix, content in list_items)

    def summarize(self, text: str, options: Dict) -> str:
        """
        Summarize text.

        Requires LLM client to be configured.

        Args:
            text: Text to summarize
            options: LLM options (max_tokens, etc.)

        Returns:
            Summarized text

        Raises:
            NotImplementedError: If LLM client not configured
        """
        if not self.llm_client:
            raise NotImplementedError(
                "Summarization requires LLM integration. "
                "Configure an LLM client to enable this feature."
            )

        # Placeholder for LLM integration
        # Example implementation when LLM is configured:
        # prompt = f"Please summarize the following text concisely:\n\n{text}"
        # return self.llm_client.complete(prompt, max_tokens=options.get('max_tokens', 150))
        return text

    def custom_prompt(self, text: str, options: Dict) -> str:
        """
        Execute a custom prompt on the selected text.

        Requires LLM client to be configured.

        Args:
            text: Selected text to process
            options:
                - prompt: The instruction to apply to the text

        Returns:
            LLM response

        Raises:
            NotImplementedError: If LLM client not configured
            ValueError: If no prompt provided
        """
        if not self.llm_client:
            raise NotImplementedError(
                "Custom prompts require LLM integration. "
                "Configure an LLM client to enable this feature."
            )

        prompt = options.get('prompt')
        if not prompt:
            raise ValueError("Custom prompt operation requires 'prompt' in options")

        # Placeholder for LLM integration
        # Example implementation when LLM is configured:
        # full_prompt = f"{prompt}\n\nText:\n{text}"
        # return self.llm_client.complete(full_prompt)
        return text

    def get_available_operations(self) -> list:
        """
        Get list of available operation IDs.

        Returns:
            List of operation ID strings
        """
        return list(self.operations.keys())

    def get_operation_info(self) -> list:
        """
        Get detailed info about available operations.

        Returns:
            List of operation info dictionaries
        """
        info = []
        for op_id in self.operations:
            requires_llm = op_id in ['summarize', 'custom-prompt']
            available = not requires_llm or self.llm_client is not None

            info.append({
                'id': op_id,
                'requires_llm': requires_llm,
                'available': available,
            })
        return info
