import os
from typing import Optional

from openai import OpenAI


class OpenAIClient:
    def __init__(self, api_key: Optional[str], model: Optional[str], trace_logger=None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("OPENAI_MODEL")
        self.trace_logger = trace_logger
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None

    def _get_pricing(self, model: str) -> Optional[dict]:
        pricing_table = {
            "gpt-5.2": {"input": 1.75, "cached_input": 0.175, "output": 14.00},
            "gpt-5.1": {"input": 1.25, "cached_input": 0.125, "output": 10.00},
            "gpt-5": {"input": 1.25, "cached_input": 0.125, "output": 10.00},
            "gpt-5-mini": {"input": 0.25, "cached_input": 0.025, "output": 2.00},
            "gpt-5-nano": {"input": 0.05, "cached_input": 0.005, "output": 0.40},
        }

        if not model:
            return None

        for key, pricing in pricing_table.items():
            if model == key or model.startswith(f"{key}-"):
                return pricing
        return None

    def _extract_usage(self, response) -> dict:
        usage = getattr(response, "usage", None)
        if usage is None:
            return {}

        def _get_value(obj, field):
            if obj is None:
                return None
            if isinstance(obj, dict):
                return obj.get(field)
            return getattr(obj, field, None)

        input_tokens = _get_value(usage, "input_tokens")
        output_tokens = _get_value(usage, "output_tokens")
        total_tokens = _get_value(usage, "total_tokens")

        details = _get_value(usage, "input_tokens_details")
        cached_tokens = _get_value(details, "cached_tokens")

        return {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "cached_tokens": cached_tokens,
        }

    def _estimate_cost(self, usage: dict, model: str) -> Optional[float]:
        pricing = self._get_pricing(model)
        if not pricing:
            return None

        input_tokens = usage.get("input_tokens")
        output_tokens = usage.get("output_tokens")
        cached_tokens = usage.get("cached_tokens") or 0

        if input_tokens is None or output_tokens is None:
            return None

        billable_input = max(input_tokens - cached_tokens, 0)
        cost = (
            (billable_input / 1_000_000) * pricing["input"]
            + (cached_tokens / 1_000_000) * pricing["cached_input"]
            + (output_tokens / 1_000_000) * pricing["output"]
        )
        return round(cost, 6)

    def is_configured(self) -> bool:
        return bool(self.client and self.model)

    def modify_selection(self, instruction: str, selected_text: str, before: str, after: str) -> str:
        if not self.is_configured():
            raise NotImplementedError("OpenAI client is not configured")

        system_prompt = (
            "You are an assistant inside a document editor. "
            "You must return ONLY the replacement text for the selected passage. "
            "Return Markdown-ready text with correct formatting (headings, lists, indentation) "
            "when appropriate. Do not include code fences, quotes, or commentary."
        )

        user_prompt = (
            "User instruction:\n"
            f"{instruction}\n\n"
            "Selected text:\n"
            "<<<<\n"
            f"{selected_text}\n"
            ">>>>\n\n"
            "Context before (up to 200 chars):\n"
            "<<<<\n"
            f"{before}\n"
            ">>>>\n\n"
            "Context after (up to 200 chars):\n"
            "<<<<\n"
            f"{after}\n"
            ">>>>\n\n"
            "Return ONLY the replacement Markdown for the selected text."
        )

        if self.trace_logger:
            self.trace_logger.write(
                "llm.modify.request",
                data={
                    "model": self.model,
                    "instruction_length": len(instruction),
                    "selection_length": len(selected_text),
                    "before_length": len(before),
                    "after_length": len(after),
                },
            )

        response = self.client.responses.create(
            model=self.model,
            instructions=system_prompt,
            input=user_prompt,
        )

        output_text = getattr(response, "output_text", None) or ""
        usage = self._extract_usage(response)
        cost_usd = self._estimate_cost(usage, self.model)

        if self.trace_logger:
            self.trace_logger.write(
                "llm.modify.response",
                data={
                    "model": self.model,
                    "output_length": len(output_text),
                    "usage": usage,
                    "cost_usd": cost_usd,
                },
            )

        if output_text.strip() == "":
            return selected_text

        return output_text
