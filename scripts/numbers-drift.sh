#!/usr/bin/env bash
# Re-measures every figure in numbers.json against the repository it came from,
# and reports what has drifted.
#
# WHY THIS IS NOT A GATE, AND MUST NOT BECOME ONE
#
# `service-numbers.sh` is the gate. It makes a number without an owner
# impossible, and it says plainly what it cannot do: "It CANNOT tell you a
# figure is still true. This repository has no access to the other
# repositories' test suites, and adding a network call to a publish gate would
# trade a silent staleness for a flaky deploy."
#
# That reasoning is right and this script does not touch it. A deploy must not
# depend on nine sibling checkouts being present, on a cargo build succeeding,
# or on GitHub answering. So this is a TOOL somebody runs, not a check that can
# block a publish, and it exits 0 whatever it finds. It prints; you decide.
#
# WHAT IT COST NOT TO HAVE IT
#
# The manifest is refreshed by hand, and by hand means "when somebody
# remembers". Twice now the answer to "when did anybody last look" has been
# "too long ago":
#
#   2026-08-04: four of seven figures stale, up to 196 tests out.
#   2026-08-20: five of eleven stale after ten days. trailryx by 6 tests,
#               tokenfuse by 10, idryx by 2 detectors, stack-k8s by 3 traps,
#               and agent-stack-go a whole release behind at v0.6.0.
#
# None was wrong when written. That is the point, and it is why the fix is not
# "be more careful": it is to make re-measuring cost one command instead of an
# hour of reading each repository's own gate.
#
# HOW A FIGURE IS RE-MEASURED
#
# Each entry carries a `check`, a runnable form of the prose in `command`, and
# a `repo_dir`, the sibling checkout to run it in. A null `repo_dir` means the
# figure is asked of GitHub rather than of a working tree. The prose stays
# because it says WHAT is counted, which a one-liner cannot: "test functions,
# not subtests" is the difference between a number somebody can reproduce and a
# number that merely looks precise.
#
# Slow checks (a full cargo test) are skipped unless --slow is passed, and the
# skip is reported rather than silently counted as agreement.

set -uo pipefail

cd "$(dirname "$0")/.."

run_slow=0
[ "${1:-}" = "--slow" ] && run_slow=1

siblings="${SIBLINGS_DIR:-$(cd .. && pwd)}"

python3 - "$siblings" "$run_slow" <<'PY'
import json
import pathlib
import subprocess
import sys

siblings = pathlib.Path(sys.argv[1])
run_slow = sys.argv[2] == "1"

data = json.loads(pathlib.Path("numbers.json").read_text())
entries = data.get("entries", [])
if not entries:
    print("numbers.json records no entries, so this measured nothing.")
    sys.exit(0)

agreed = drifted = skipped = unavailable = 0
drift_lines = []

for e in entries:
    claim = e["claim"]
    check = e.get("check")
    repo_dir = e.get("repo_dir")
    label = f"{e['page'].removeprefix('services/').removesuffix('.html'):<10} {claim}"

    if not check:
        print(f"  no check    {label}")
        skipped += 1
        continue

    if e.get("slow") and not run_slow:
        print(f"  slow, skipped {label}   (pass --slow to run it)")
        skipped += 1
        continue

    cwd = pathlib.Path(".")
    if repo_dir:
        cwd = siblings / repo_dir
        if not cwd.is_dir():
            print(f"  no checkout {label}   (looked in {cwd})")
            unavailable += 1
            continue

    try:
        out = subprocess.run(
            ["bash", "-c", check],
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=900,
        ).stdout.strip()
    except subprocess.TimeoutExpired:
        print(f"  TIMED OUT   {label}")
        unavailable += 1
        continue

    if not out:
        # A check that produced nothing is not agreement. This is the same
        # empty-subject rule the estate's gates carry, applied to a tool.
        print(f"  MEASURED NOTHING  {label}   (the check printed no value)")
        unavailable += 1
        continue

    # The claim is prose around a figure ("1,178 tests / 31 crates"), so the
    # test is whether the measured value appears in it, with thousands
    # separators allowed for.
    normalised = claim.replace(",", "")
    if out in normalised or out.lstrip("v") in normalised:
        print(f"  agrees      {label}   ({out})")
        agreed += 1
    else:
        print(f"  DRIFTED     {label}   -> measured {out}")
        drift_lines.append((e["page"], claim, out, e.get("measured_on", "?")))
        drifted += 1

print()
print(
    f"{agreed} agree, {drifted} drifted, {skipped} skipped, "
    f"{unavailable} could not be measured."
)

if drift_lines:
    print()
    print("Update the page AND numbers.json together, and move measured_on to")
    print("today. A refreshed figure beside a stale date is worse than either,")
    print("because it reads as checked.")
    for page, claim, got, when in drift_lines:
        print(f"  {page}: {claim!r} last measured {when}, now {got}")

# Never a failure exit. This is a tool, not a gate: see the header.
PY
