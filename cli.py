#!/usr/bin/env python3
import argparse
import json
import sys
from typing import Any

from jsonlang.interpreter import Interpreter
from jsonlang.errors import JsonLangError


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run a JSONLang program")
    parser.add_argument("file", help="Path to JSON program file")
    args = parser.parse_args(argv)

    try:
        with open(args.file, "r", encoding="utf-8") as f:
            program = json.load(f)
    except Exception as e:
        print(f"Failed to read JSON file: {e}", file=sys.stderr)
        return 1

    interp = Interpreter()
    try:
        interp.run(program)
    except JsonLangError as e:
        print(f"Runtime error: {e}", file=sys.stderr)
        return 2
    except Exception as e:
        print(f"Unhandled error: {e}", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())