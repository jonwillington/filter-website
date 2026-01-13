#!/bin/bash

# Script to trigger a fresh deployment by creating an empty commit
# Use this when CMS content has changed but there are no code changes to push

echo "Creating empty commit to trigger rebuild..."
git commit --allow-empty -m "chore: trigger rebuild for CMS content update"
git push

echo "✓ Empty commit pushed. Deployment should trigger automatically."
