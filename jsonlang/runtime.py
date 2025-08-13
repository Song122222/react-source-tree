from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional
import sys


class Environment:
    """Lexically-scoped environment for variables and functions."""

    def __init__(self, parent: Optional["Environment"] = None):
        self._values: Dict[str, Any] = {}
        self.parent = parent

    def define(self, name: str, value: Any) -> None:
        self._values[name] = value

    def assign(self, name: str, value: Any) -> None:
        env = self._resolve(name)
        if env is None:
            raise NameError(f"Undefined variable '{name}'")
        env._values[name] = value

    def get(self, name: str) -> Any:
        env = self._resolve(name)
        if env is None:
            raise NameError(f"Undefined variable '{name}'")
        return env._values[name]

    def _resolve(self, name: str) -> Optional["Environment"]:
        if name in self._values:
            return self
        if self.parent is not None:
            return self.parent._resolve(name)
        return None


@dataclass
class JsonFunction:
    name: Optional[str]
    params: List[str]
    body: List[dict]
    closure: Environment

    def __call__(self, interpreter: "Interpreter", args: List[Any]) -> Any:
        # Create function-local environment chained to closure
        local_env = Environment(self.closure)
        if len(args) != len(self.params):
            raise TypeError(
                f"Function '{self.name or '<anonymous>'}' expected {len(self.params)} args, got {len(args)}"
            )
        for param_name, arg_value in zip(self.params, args):
            local_env.define(param_name, arg_value)
        # Execute body
        return interpreter.execute_block(self.body, local_env, allow_return=True)


# Builtins

def _builtin_print(*values: Any) -> None:
    print(*values, file=sys.stdout)
    return None


def _builtin_len(value: Any) -> int:
    if isinstance(value, (list, dict, str)):
        return len(value)
    raise TypeError("len() expects a list, dict, or string")


def _builtin_range(n: Any) -> List[int]:
    if not isinstance(n, (int, float)):
        raise TypeError("range() expects a number")
    n_int = int(n)
    if n_int < 0:
        return []
    return list(range(n_int))


def _builtin_push(array: Any, value: Any) -> Any:
    if not isinstance(array, list):
        raise TypeError("push() expects a list as first argument")
    array.append(value)
    return value


def _builtin_pop(array: Any) -> Any:
    if not isinstance(array, list):
        raise TypeError("pop() expects a list")
    if not array:
        return None
    return array.pop()


def _builtin_str(value: Any) -> str:
    return str(value)


BUILTINS: Dict[str, Callable[..., Any]] = {
    "print": _builtin_print,
    "len": _builtin_len,
    "range": _builtin_range,
    "push": _builtin_push,
    "pop": _builtin_pop,
    "str": _builtin_str,
}