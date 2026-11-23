#!/usr/bin/env bash
# Netlify "ignore" command: exit 0 = skip this build, exit 1 = build it.
#
# Netlify Free gives 300 credits a month and a production deploy costs 15,
# so at most ~20 deploys a month. When credits run out the whole site
# pauses until the next billing cycle. main gets several merges a day, so
# deploying every push would take the site down within a week.
#
# A production build goes ahead only when:
#   - it is the site's first build, or a retry of the deployed commit
#     (Netlify sets CACHED_COMMIT_REF == COMMIT_REF then);
#   - it was started by a build hook (the "Deploy to Netlify" GitHub
#     workflow uses one); or
#   - the newest commit message contains "[deploy]".
# Deploy previews and branch deploys are skipped: CI already builds every
# PR, and their traffic still counts toward the request meter.

set -u

if [ "${CONTEXT:-}" != "production" ]; then
  echo "netlify-ignore: skipping ${CONTEXT:-unknown} build (only production deploys run)"
  exit 0
fi

if [ -n "${INCOMING_HOOK_TITLE:-}" ] || [ -n "${INCOMING_HOOK_URL:-}" ]; then
  echo "netlify-ignore: build hook '${INCOMING_HOOK_TITLE:-}', building"
  exit 1
fi

if [ -z "${CACHED_COMMIT_REF:-}" ] || [ "${CACHED_COMMIT_REF:-}" = "${COMMIT_REF:-}" ]; then
  echo "netlify-ignore: first build or retry of the deployed commit, building"
  exit 1
fi

if git log -1 --format=%B "${COMMIT_REF:-HEAD}" 2>/dev/null | grep -qF "[deploy]"; then
  echo "netlify-ignore: commit message has [deploy], building"
  exit 1
fi

echo "netlify-ignore: skipping production build to save credits."
echo "  To deploy: run the 'Deploy to Netlify' GitHub workflow, or put [deploy] in the merge commit message."
exit 0
