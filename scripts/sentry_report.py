#!/usr/bin/env python3
"""Read-only Sentry issue summary. Never export raw Sentry payloads."""
import datetime as dt
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ORG = os.environ.get("SENTRY_ORG", "eljaymedia-5k")
PROJECT = os.environ.get("SENTRY_PROJECT", "ticketiv")
ENVIRONMENT = os.environ.get("SENTRY_ENVIRONMENT", "production")
TOKEN = os.environ.get("SENTRY_AUTH_TOKEN")
if not TOKEN:
    raise SystemExit("Missing SENTRY_AUTH_TOKEN GitHub Actions secret")

BASE = "https://sentry.io/api/0/projects/{}/{}/issues/".format(
    urllib.parse.quote(ORG, safe=""), urllib.parse.quote(PROJECT, safe="")
)
REDACTIONS = [
    (re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"), "[email]"),
    (re.compile(r"(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])"), "[ip]"),
    (re.compile(r"https?://\S+", re.I), "[url]"),
    (re.compile(r"(?i)(bearer|token|password|secret|api[_-]?key)\s*[:=]\s*\S+"), "[credential]"),
]

def safe(value, length=180):
    text = str(value or "").replace("\n", " ").replace("\r", " ").replace("|", "/")
    for pattern, replacement in REDACTIONS:
        text = pattern.sub(replacement, text)
    return text[:length]

def fetch(period):
    params = urllib.parse.urlencode({
        "statsPeriod": period,
        "environment": ENVIRONMENT,
        "query": "is:unresolved",
        "sort": "freq",
        "limit": "50",
    })
    request = urllib.request.Request(
        BASE + "?" + params,
        headers={
            "Authorization": "Bearer " + TOKEN,
            "Accept": "application/json",
            "User-Agent": "ticketiv-sentry-report/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Do not print response bodies; they may contain sensitive diagnostics.
        raise SystemExit("Sentry API request failed with HTTP {}".format(error.code))
    except urllib.error.URLError:
        raise SystemExit("Sentry API network request failed")

def normalize(issue):
    return {
        "id": safe(issue.get("id"), 32),
        "short_id": safe(issue.get("shortId"), 40),
        "title": safe(issue.get("title"), 180),
        "status": safe(issue.get("status"), 40),
        "level": safe(issue.get("level"), 30),
        "count": int(issue.get("count") or 0),
        "user_count": int(issue.get("userCount") or 0),
        "first_seen": safe(issue.get("firstSeen"), 40),
        "last_seen": safe(issue.get("lastSeen"), 40),
        "permalink": "https://sentry.io/organizations/{}/issues/{}/".format(
            urllib.parse.quote(ORG, safe=""), urllib.parse.quote(str(issue.get("id", "")), safe="")
        ),
    }

report = {
    "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
    "organization": ORG,
    "project": PROJECT,
    "environment": ENVIRONMENT,
    "query": "is:unresolved",
    "windows": {},
}
for period in ("24h", "7d"):
    raw = fetch(period)
    if not isinstance(raw, list):
        raise SystemExit("Unexpected Sentry API response")
    report["windows"][period] = [normalize(issue) for issue in raw][:50]

output = Path("sentry-report")
output.mkdir(exist_ok=True)
(output / "issues.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
lines = [
    "# Ticketiv Sentry production errors",
    "",
    "Generated (UTC): " + report["generated_at_utc"],
    "Project: " + PROJECT + " | Environment: " + safe(ENVIRONMENT),
    "",
    "Read-only report of unresolved issues. Counts are Sentry issue-list values;",
    "verify the date-window semantics in Sentry before interpreting them as period-only totals.",
]
for period, issues in report["windows"].items():
    lines += [
        "",
        "## Last " + period,
        "",
        "| Issue | Title | Events | Users | Last seen |",
        "|---|---|---:|---:|---|",
    ]
    if not issues:
        lines.append("| None returned | — | — | — | — |")
    for issue in issues:
        lines.append("| [{}]({}) | {} | {} | {} | {} |".format(
            issue["short_id"], issue["permalink"], issue["title"],
            issue["count"], issue["user_count"], issue["last_seen"]
        ))
(output / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("Sanitized Sentry report generated for {} windows.".format(len(report["windows"])))
