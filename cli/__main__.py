"""Allow running the CLI as ``python -m cli``."""
from ifcx_cli import main

if __name__ == "__main__":
    raise SystemExit(main())
