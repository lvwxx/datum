#!/usr/bin/env bash
set -euo pipefail
docker rm -f dbstudio-test-pg 2>/dev/null || true
docker run -d --name dbstudio-test-pg \
  -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
echo "等待 PG 就绪..."
until docker exec dbstudio-test-pg pg_isready -U postgres >/dev/null 2>&1; do sleep 0.5; done
docker exec -u postgres dbstudio-test-pg psql -c \
  "CREATE TABLE IF NOT EXISTS users(id int8 PRIMARY KEY, name text, email text);"
docker exec -u postgres dbstudio-test-pg psql -c \
  "INSERT INTO users VALUES (1,'Alice','a@x.com'),(2,'Bob','b@x.com') ON CONFLICT DO NOTHING;"
echo "就绪。停止用: docker rm -f dbstudio-test-pg"
