#!/usr/bin/env bash
# Runs once after the dev container is created.
set -euo pipefail

# Docker creates new named volumes owned by root.
sudo chown node:node node_modules /home/node/.claude

npm ci
npm run db:migrate

# Seed only on first setup, so an existing data.db is never wiped.
if [ ! -f data.db ]; then
  npm run db:seed
fi
