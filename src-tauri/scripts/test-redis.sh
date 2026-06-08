#!/usr/bin/env bash
set -euo pipefail
docker rm -f dbstudio-test-redis 2>/dev/null || true
docker run -d --name dbstudio-test-redis -p 6379:6379 redis:7
echo "等待 Redis 就绪..."
until docker exec dbstudio-test-redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 0.5; done
docker exec dbstudio-test-redis redis-cli SET greeting hello >/dev/null
docker exec dbstudio-test-redis redis-cli HSET user:1 name Alice age 30 >/dev/null
echo "就绪。停止用: docker rm -f dbstudio-test-redis"
