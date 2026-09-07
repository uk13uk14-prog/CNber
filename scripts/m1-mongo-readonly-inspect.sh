#!/usr/bin/env bash
# Run on M1 only. Read-only inspection for CNber mongo-cnber.
# Does NOT stop/start/rm containers or volumes.
set -euo pipefail

echo "===== CNBER M1 MONGO READONLY INSPECT ====="
echo "HOSTNAME=$(hostname)"
echo "DATE=$(date)"

echo
echo "===== docker ps (cnber only) ====="
docker ps --filter name=mongo-cnber --filter name=cnber --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'

echo
echo "===== mongo-cnber inspect summary ====="
if ! docker inspect mongo-cnber >/dev/null 2>&1; then
  echo "MONGO_CONTAINER_FOUND=NO"
  exit 0
fi

echo "MONGO_CONTAINER_FOUND=YES"
docker inspect mongo-cnber --format 'NAME={{.Name}}
IMAGE={{.Config.Image}}
STATUS={{.State.Status}}
RESTART={{.HostConfig.RestartPolicy.Name}}
NETWORKS={{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}
PORTS={{range $p,$c := .NetworkSettings.Ports}}{{$p}}->{{if $c}}{{(index $c 0).HostPort}}{{end}} {{end}}
MOUNTS={{range .Mounts}}type={{.Type}} name={{.Name}} src={{.Source}} dst={{.Destination}}; {{end}}'

echo
echo "===== volumes matching mongo/cnber ====="
docker volume ls | grep -Ei 'mongo|cnber' || true

echo
echo "===== CNBER_M1_MONGO_READONLY_INSPECT_END ====="
