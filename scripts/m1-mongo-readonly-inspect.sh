#!/usr/bin/env bash
# Run on M1 only. Read-only inspection for CNber mongo-cnber.
# Does NOT stop/start/rm containers or volumes.
set -euo pipefail

echo "===== CNBER M1 MONGO READONLY INSPECT ====="
echo "HOSTNAME=$(hostname)"
echo "DATE=$(date)"

echo
echo "===== expected (M1 verified baseline) ====="
echo "CONTAINER=mongo-cnber"
echo "IMAGE=mongo:7"
echo "NETWORK=bridge"
echo "DATA_VOLUME=d2319608a2ae5f1502a725cca8274762efd3e02d3bee9363d8223528b722bcca"
echo "CONFIG_VOLUME=f5e04826694f87ac4d5afd660b5282550221bf1b87a9b1550ccc67ba3fbe1fdb"
echo "HOST_PORT=27017"
echo "TEMP_MONGO_URL=mongodb://host.docker.internal:27017/cnber"

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
IP={{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}
PORTS={{range $p,$c := .NetworkSettings.Ports}}{{$p}}->{{if $c}}{{(index $c 0).HostPort}}{{end}} {{end}}
MOUNTS={{range .Mounts}}type={{.Type}} name={{.Name}} src={{.Source}} dst={{.Destination}}; {{end}}'

echo
echo "===== volumes matching mongo/cnber ====="
docker volume ls | grep -Ei 'mongo|cnber|d2319608|f5e04826' || true

echo
echo "===== backend runtime hints (read-only) ====="
echo "CNBER_RUNTIME_ROOT_HINT=/Users/agent001/Desktop/CNber/CNber_backend"
echo "Confirm public/uploads public/downloads logs under that root before Phase-1 up."

echo
echo "===== CNBER_M1_MONGO_READONLY_INSPECT_END ====="
