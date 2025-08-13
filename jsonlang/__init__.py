"""JSONLang: a tiny JSON-based language interpreter."""

from .interpreter import Interpreter, run
from .runtime import Environment
from .errors import JsonLangError

__all__ = [
    "Interpreter",
    "run",
    "Environment",
    "JsonLangError",
]