from __future__ import annotations

from typing import Any, Dict, List, Optional
import json

from .errors import JsonLangError, ReturnSignal, BreakSignal, ContinueSignal
from .runtime import Environment, JsonFunction, BUILTINS


class Interpreter:
    def __init__(self):
        self.globals = Environment()
        # Install builtins
        for name, func in BUILTINS.items():
            self.globals.define(name, func)

    # ------------- Public API -------------
    def run(self, program: Dict[str, Any]) -> Any:
        if not isinstance(program, dict) or program.get("type") != "Program":
            raise JsonLangError("Top-level JSON must be an object with type 'Program'")
        return self.execute_block(program.get("body", []), self.globals, allow_return=False)

    def execute_block(self, statements: List[dict], env: Environment, allow_return: bool) -> Any:
        last_value = None
        try:
            for stmt in statements:
                last_value = self._exec_stmt(stmt, env)
        except ReturnSignal as rs:
            if allow_return:
                return rs.value
            raise JsonLangError("'return' outside of function")
        return last_value

    # ------------- Statements -------------
    def _exec_stmt(self, stmt: Dict[str, Any], env: Environment) -> Any:
        stype = self._require_type(stmt)
        if stype == "Let":
            name = self._require_key(stmt, "name", str)
            value = self._eval_expr(stmt.get("value"), env)
            env.define(name, value)
            return None
        if stype == "Assign":
            if "name" in stmt:
                name = self._require_key(stmt, "name", str)
                value = self._eval_expr(stmt.get("value"), env)
                env.assign(name, value)
                return value
            # Targeted assignment: SetIndex/SetMember via target expression
            target = stmt.get("target")
            if target is None:
                raise JsonLangError("Assign requires either 'name' or 'target'")
            return self._assign_to_target(target, stmt.get("value"), env)
        if stype == "SetIndex":
            obj = self._eval_expr(stmt.get("object"), env)
            idx = self._eval_expr(stmt.get("index"), env)
            val = self._eval_expr(stmt.get("value"), env)
            if not isinstance(obj, list):
                raise TypeError("SetIndex expects a list as 'object'")
            i = int(idx)
            if i < 0 or i >= len(obj):
                raise IndexError("index out of range")
            obj[i] = val
            return val
        if stype == "SetMember":
            obj = self._eval_expr(stmt.get("object"), env)
            prop = self._require_key(stmt, "property", str)
            val = self._eval_expr(stmt.get("value"), env)
            if not isinstance(obj, dict):
                raise TypeError("SetMember expects an object as 'object'")
            obj[prop] = val
            return val
        if stype == "If":
            test = self._eval_expr(stmt.get("test"), env)
            if self._is_truthy(test):
                return self.execute_block(stmt.get("then", []), Environment(env), allow_return=False)
            else_block = stmt.get("else")
            if else_block is not None:
                return self.execute_block(else_block, Environment(env), allow_return=False)
            return None
        if stype == "While":
            result = None
            while self._is_truthy(self._eval_expr(stmt.get("test"), env)):
                try:
                    result = self.execute_block(stmt.get("body", []), Environment(env), allow_return=False)
                except BreakSignal:
                    break
                except ContinueSignal:
                    continue
            return result
        if stype == "Break":
            raise BreakSignal()
        if stype == "Continue":
            raise ContinueSignal()
        if stype == "Function":
            name = self._require_key(stmt, "name", str)
            params = stmt.get("params", [])
            if not isinstance(params, list) or not all(isinstance(p, str) for p in params):
                raise JsonLangError("Function 'params' must be a list of strings")
            body = stmt.get("body", [])
            if not isinstance(body, list):
                raise JsonLangError("Function 'body' must be a list of statements")
            func = JsonFunction(name=name, params=params, body=body, closure=env)
            env.define(name, func)
            return None
        if stype == "Return":
            value = self._eval_expr(stmt.get("value"), env)
            raise ReturnSignal(value)
        if stype == "Expr":
            return self._eval_expr(stmt.get("expr"), env)
        if stype == "Program":
            # Allow nested program blocks
            return self.execute_block(stmt.get("body", []), Environment(env), allow_return=False)
        raise JsonLangError(f"Unknown statement type: {stype}")

    def _assign_to_target(self, target: Dict[str, Any], value_node: Dict[str, Any], env: Environment) -> Any:
        ttype = self._require_type(target)
        value = self._eval_expr(value_node, env)
        if ttype == "Var":
            name = self._require_key(target, "name", str)
            env.assign(name, value)
            return value
        if ttype == "Index":
            obj = self._eval_expr(target.get("object"), env)
            idx = self._eval_expr(target.get("index"), env)
            if not isinstance(obj, list):
                raise TypeError("assignment index target expects a list")
            i = int(idx)
            if i < 0 or i >= len(obj):
                raise IndexError("index out of range")
            obj[i] = value
            return value
        if ttype == "Member":
            obj = self._eval_expr(target.get("object"), env)
            prop = self._require_key(target, "property", str)
            if not isinstance(obj, dict):
                raise TypeError("assignment member target expects an object")
            obj[prop] = value
            return value
        raise JsonLangError("Invalid assignment target")

    # ------------- Expressions -------------
    def _eval_expr(self, node: Optional[Dict[str, Any]], env: Environment) -> Any:
        if node is None:
            return None
        ntype = self._require_type(node)
        if ntype in ("Number", "String", "Boolean"):
            return node.get("value")
        if ntype == "Null":
            return None
        if ntype == "Var":
            name = self._require_key(node, "name", str)
            return env.get(name)
        if ntype == "Array":
            elements = node.get("elements", [])
            if not isinstance(elements, list):
                raise JsonLangError("Array 'elements' must be a list")
            return [self._eval_expr(e, env) for e in elements]
        if ntype == "Object":
            props = node.get("properties", {})
            if not isinstance(props, dict):
                raise JsonLangError("Object 'properties' must be an object")
            return {k: self._eval_expr(v, env) for k, v in props.items()}
        if ntype == "Unary":
            op = self._require_key(node, "op", str)
            value = self._eval_expr(node.get("value"), env)
            if op == "-":
                if isinstance(value, bool):
                    return -int(value)
                if isinstance(value, int):
                    return -value
                return -float(value)
            if op == "!":
                return not self._is_truthy(value)
            raise JsonLangError(f"Unknown unary operator: {op}")
        if ntype == "Binary":
            op = self._require_key(node, "op", str)
            if op in ("and", "or"):
                left_val = self._eval_expr(node.get("left"), env)
                if op == "and":
                    return self._eval_expr(node.get("right"), env) if self._is_truthy(left_val) else left_val
                else:
                    return left_val if self._is_truthy(left_val) else self._eval_expr(node.get("right"), env)
            left = self._eval_expr(node.get("left"), env)
            right = self._eval_expr(node.get("right"), env)
            if op == "+":
                if isinstance(left, str) or isinstance(right, str):
                    return str(left) + str(right)
                if isinstance(left, bool):
                    left = int(left)
                if isinstance(right, bool):
                    right = int(right)
                if isinstance(left, int) and isinstance(right, int):
                    return left + right
                return float(left) + float(right)
            if op == "-":
                if isinstance(left, bool):
                    left = int(left)
                if isinstance(right, bool):
                    right = int(right)
                if isinstance(left, int) and isinstance(right, int):
                    return left - right
                return float(left) - float(right)
            if op == "*":
                if isinstance(left, bool):
                    left = int(left)
                if isinstance(right, bool):
                    right = int(right)
                if isinstance(left, int) and isinstance(right, int):
                    return left * right
                return float(left) * float(right)
            if op == "/":
                return float(left) / float(right)
            if op == "%":
                if isinstance(left, bool):
                    left = int(left)
                if isinstance(right, bool):
                    right = int(right)
                if isinstance(left, int) and isinstance(right, int):
                    return left % right
                return float(left) % float(right)
            if op == "==":
                return left == right
            if op == "!=":
                return left != right
            if op == "<":
                return float(left) < float(right)
            if op == "<=":
                return float(left) <= float(right)
            if op == ">":
                return float(left) > float(right)
            if op == ">=":
                return float(left) >= float(right)
            raise JsonLangError(f"Unknown binary operator: {op}")
        if ntype == "Index":
            obj = self._eval_expr(node.get("object"), env)
            idx = self._eval_expr(node.get("index"), env)
            if isinstance(obj, list):
                return obj[int(idx)]
            if isinstance(obj, dict):
                return obj[str(idx)]
            raise TypeError("Index expects list or object")
        if ntype == "Member":
            obj = self._eval_expr(node.get("object"), env)
            prop = self._require_key(node, "property", str)
            if isinstance(obj, dict):
                return obj.get(prop)
            raise TypeError("Member expects an object")
        if ntype == "Call":
            callee_val = self._eval_expr(node.get("callee"), env)
            args_nodes = node.get("args", [])
            if not isinstance(args_nodes, list):
                raise JsonLangError("Call 'args' must be a list")
            args = [self._eval_expr(a, env) for a in args_nodes]
            if isinstance(callee_val, JsonFunction):
                return callee_val(self, args)
            if callable(callee_val):
                return callee_val(*args)
            raise TypeError("Attempted to call a non-callable value")
        if ntype == "Function":
            # Anonymous function expression
            params = node.get("params", [])
            if not isinstance(params, list) or not all(isinstance(p, str) for p in params):
                raise JsonLangError("Function 'params' must be a list of strings")
            body = node.get("body", [])
            if not isinstance(body, list):
                raise JsonLangError("Function 'body' must be a list of statements")
            return JsonFunction(name=None, params=params, body=body, closure=env)
        raise JsonLangError(f"Unknown expression type: {ntype}")

    # ------------- Helpers -------------
    @staticmethod
    def _require_type(node: Dict[str, Any]) -> str:
        if not isinstance(node, dict):
            raise JsonLangError("Node must be an object with a 'type' field")
        ntype = node.get("type")
        if not isinstance(ntype, str):
            raise JsonLangError("Node missing string 'type'")
        return ntype

    @staticmethod
    def _require_key(node: Dict[str, Any], key: str, expected_type: type) -> Any:
        value = node.get(key)
        if not isinstance(value, expected_type):
            raise JsonLangError(f"Node requires key '{key}' of type {expected_type.__name__}")
        return value

    @staticmethod
    def _is_truthy(value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return value != 0
        if isinstance(value, str):
            return len(value) > 0
        if isinstance(value, (list, dict)):
            return len(value) > 0
        return True


def run(program_json: Dict[str, Any]) -> Any:
    return Interpreter().run(program_json)