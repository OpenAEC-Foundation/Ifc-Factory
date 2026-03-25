"""Allow running the CLI as ``python -m ifcx``."""
import sys
import os

# Add the cli/ directory to the path so we can import ifcx_cli
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'cli'))
from ifcx_cli import main

if __name__ == "__main__":
    raise SystemExit(main())
