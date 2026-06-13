"""
Smoke test for bedrock-mantle. Loads credentials from backend/.env automatically.

  copy .env.example .env   # edit OPENAI_API_KEY
  pip install -r requirements.txt
  python bedrock_test.py
"""

import bedrock  # noqa: F401 — loads .env via bedrock._load_env
from bedrock import MODEL_ID, MANTLE_BASE_URL, _invoke

print(f"Base:  {MANTLE_BASE_URL}")
print(f"Model: {MODEL_ID}")

text = _invoke("Say hello in one sentence.", max_tokens=100)
if not text:
    raise SystemExit("No response — check backend/.env (OPENAI_API_KEY) and model access.")
print(text)
