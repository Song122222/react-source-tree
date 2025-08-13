import io
import sys
import unittest

from jsonlang.interpreter import Interpreter


class TestJSONLang(unittest.TestCase):
    def run_program(self, program):
        interp = Interpreter()
        return interp.run(program)

    def capture_stdout(self, func, *args, **kwargs):
        buf = io.StringIO()
        old = sys.stdout
        sys.stdout = buf
        try:
            func(*args, **kwargs)
        finally:
            sys.stdout = old
        return buf.getvalue()

    def test_arithmetic(self):
        program = {
            "type": "Program",
            "body": [
                {"type": "Let", "name": "x", "value": {"type": "Number", "value": 2}},
                {"type": "Let", "name": "y", "value": {"type": "Number", "value": 3}},
                {"type": "Expr", "expr": {"type": "Binary", "op": "+", "left": {"type": "Var", "name": "x"}, "right": {"type": "Var", "name": "y"}}}
            ]
        }
        out = self.capture_stdout(self.run_program, program)
        self.assertEqual(out, "")

    def test_if_while_and_print(self):
        program = {
            "type": "Program",
            "body": [
                {"type": "Let", "name": "i", "value": {"type": "Number", "value": 0}},
                {
                    "type": "While",
                    "test": {"type": "Binary", "op": "<", "left": {"type": "Var", "name": "i"}, "right": {"type": "Number", "value": 3}},
                    "body": [
                        {"type": "Expr", "expr": {"type": "Call", "callee": {"type": "Var", "name": "print"}, "args": [{"type": "Var", "name": "i"}]}},
                        {"type": "Assign", "name": "i", "value": {"type": "Binary", "op": "+", "left": {"type": "Var", "name": "i"}, "right": {"type": "Number", "value": 1}}}
                    ]
                }
            ]
        }
        out = self.capture_stdout(self.run_program, program)
        self.assertEqual(out, "0\n1\n2\n")

    def test_function_and_return(self):
        program = {
            "type": "Program",
            "body": [
                {"type": "Function", "name": "add", "params": ["a", "b"], "body": [
                    {"type": "Return", "value": {"type": "Binary", "op": "+", "left": {"type": "Var", "name": "a"}, "right": {"type": "Var", "name": "b"}}}
                ]},
                {"type": "Expr", "expr": {"type": "Call", "callee": {"type": "Var", "name": "print"}, "args": [
                    {"type": "Call", "callee": {"type": "Var", "name": "add"}, "args": [
                        {"type": "Number", "value": 2}, {"type": "Number", "value": 5}
                    ]}
                ]}}
            ]
        }
        out = self.capture_stdout(self.run_program, program)
        self.assertEqual(out, "7\n")

    def test_arrays_objects_and_builtins(self):
        program = {
            "type": "Program",
            "body": [
                {"type": "Let", "name": "arr", "value": {"type": "Array", "elements": []}},
                {"type": "Expr", "expr": {"type": "Call", "callee": {"type": "Var", "name": "push"}, "args": [
                    {"type": "Var", "name": "arr"}, {"type": "Number", "value": 10}
                ]}},
                {"type": "Expr", "expr": {"type": "Call", "callee": {"type": "Var", "name": "push"}, "args": [
                    {"type": "Var", "name": "arr"}, {"type": "Number", "value": 20}
                ]}},
                {"type": "Expr", "expr": {"type": "Call", "callee": {"type": "Var", "name": "print"}, "args": [
                    {"type": "Var", "name": "arr"}, {"type": "String", "value": "len:"}, {"type": "Call", "callee": {"type": "Var", "name": "len"}, "args": [{"type": "Var", "name": "arr"}]}
                ]}}
            ]
        }
        out = self.capture_stdout(self.run_program, program)
        self.assertEqual(out, "[10, 20] len: 2\n")


if __name__ == '__main__':
    unittest.main()