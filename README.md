# JSONLang

A tiny programming language expressed entirely as JSON. This repository includes a Python interpreter, CLI, examples, and tests.

## Quick start

- Run an example:

```bash
python3 /workspace/cli.py /workspace/examples/hello.json
```

- Run tests:

```bash
python3 -m unittest discover -s /workspace/tests -p "test_*.py"
```

## Program shape

A program is a JSON object with `type: "Program"` and `body` as a list of statements.

### Expressions

- Literals: `Number`, `String`, `Boolean`, `Null`
- Variables: `Var`
- Arithmetic/logic: `Unary` with `op` in `-`, `!`; `Binary` with `op` in `+`, `-`, `*`, `/`, `%`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `and`, `or`
- Collections: `Array`, `Object`, `Index`, `Member`
- Functions: `Function` (anonymous expression), `Call`

### Statements

- `Let` declare a variable: `{ "type": "Let", "name": "x", "value": expr }`
- `Assign` update a variable by name or target: `{ "type": "Assign", "name": "x", "value": expr }`
- `SetIndex`/`SetMember` mutate arrays/objects
- `If` with `then` and optional `else`
- `While`, `Break`, `Continue`
- `Function` declaration with `name`, `params`, `body`
- `Return`
- `Expr` to evaluate an expression for side effects

### Builtins

- `print(...values)`
- `len(value)` for list/dict/string
- `range(n)` returns `[0..n)`
- `push(list, value)`, `pop(list)`
- `str(value)`

## Example

```json
{
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
```

Outputs:

```
0
1
2
```

   