#!/usr/bin/env sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy --schema prisma/schema.prisma

echo "Starting server..."
node packages/server/dist/index.js
