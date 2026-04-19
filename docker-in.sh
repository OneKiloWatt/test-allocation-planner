#!/usr/bin/env bash
set -eu

if [ ! -f docker/supabase/.env.local ]; then
  cp docker/supabase/.env.example docker/supabase/.env.local
  echo "Created docker/supabase/.env.local from docker/supabase/.env.example"
fi

docker compose --env-file docker/supabase/.env.local exec app sh
