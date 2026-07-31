#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <full-git-sha>" >&2
  exit 2
fi

sha=$1
if [ "${#sha}" -ne 40 ]; then
  echo "deploy SHA must be exactly 40 lowercase hexadecimal characters" >&2
  exit 2
fi
case "$sha" in
  *[!0-9a-f]*)
    echo "deploy SHA must be exactly 40 lowercase hexadecimal characters" >&2
    exit 2
    ;;
esac

script_dir=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/../.." && pwd)
cd "$repo_root"

compose_file=infra/docker-compose.yml
# Production deploy runs from the self-hosted runner checkout, which has no
# gitignored infra/.env. The Pi keeps a readable copy at this path; override
# with PORTFOLIO_ENV_FILE for local dry-runs.
env_file=${PORTFOLIO_ENV_FILE:-/etc/portfolio/deploy.env}
if [ ! -r "$env_file" ]; then
  echo "environment file $env_file is missing or unreadable" >&2
  exit 2
fi

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

api_image="ghcr.io/joelitooo/portfolio-api:$sha"
web_image="ghcr.io/joelitooo/portfolio-web:$sha"
previous_api=$(docker inspect --format '{{.Config.Image}}' portfolio-api)
previous_web=$(docker inspect --format '{{.Config.Image}}' portfolio-web)
rollback_needed=0

wait_for_health() {
  deadline=$(($(date +%s) + 120))

  while [ "$(date +%s)" -lt "$deadline" ]; do
    api_status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' portfolio-api 2>/dev/null || true)
    web_status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' portfolio-web 2>/dev/null || true)

    if [ "$api_status" = healthy ] && [ "$web_status" = healthy ]; then
      return 0
    fi

    sleep 2
  done

  echo "timed out waiting for healthy API and web containers" >&2
  return 1
}

check_local_endpoints() {
  web_health=$(curl --fail --show-error --silent http://127.0.0.1:8080/healthz)
  [ "$web_health" = "ok" ] || {
    echo "web health response was not ok" >&2
    return 1
  }

  api_health=$(curl --fail --show-error --silent http://127.0.0.1:3000/health)
  case "$api_health" in
    *'"status":"ok"'*) ;;
    *)
      echo "API health response was not healthy: $api_health" >&2
      return 1
      ;;
  esac
}

finish() {
  status=$?
  trap - 0 HUP INT TERM

  if [ "$status" -ne 0 ] && [ "$rollback_needed" -eq 1 ]; then
    echo "deployment failed; restoring previous images" >&2
    # Use env so the assignments do not leak after this function returns.
    if env API_IMAGE="$previous_api" WEB_IMAGE="$previous_web" \
      compose up -d --no-build --no-deps api web &&
      wait_for_health &&
      check_local_endpoints; then
      echo "rollback succeeded: API=$previous_api WEB=$previous_web" >&2
    else
      echo "rollback failed; operator intervention is required" >&2
    fi
  fi

  exit "$status"
}

trap finish 0
trap 'exit 1' HUP INT TERM

docker pull "$api_image"
docker pull "$web_image"

# Validate interpolation before arming rollback. A missing env file or bad
# compose config must not trigger a phantom restore of the running stack.
if ! env API_IMAGE="$api_image" WEB_IMAGE="$web_image" compose config --quiet; then
  echo "compose configuration is invalid; nothing was changed" >&2
  exit 1
fi

# --no-deps keeps this to a two-service release. Without it Compose pulls in
# postgres as an api dependency, and a CI checkout resolves its bind mounts to
# different absolute paths than the running container, so every deploy would
# recreate the database.
rollback_needed=1
env API_IMAGE="$api_image" WEB_IMAGE="$web_image" \
  compose up -d --no-build --no-deps api web
wait_for_health
check_local_endpoints

# Published project images carry this source label. Remove only their dangling
# layers; tagged current and previous releases remain available for rollback.
for image_id in $(docker image ls \
  --filter dangling=true \
  --filter label=org.opencontainers.image.source=https://github.com/Joelitooo/about-me \
  --quiet); do
  docker image rm "$image_id" >/dev/null 2>&1 || true
done

echo "deployed $sha"
compose ps api web
rollback_needed=0
