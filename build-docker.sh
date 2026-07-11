#!/usr/bin/env sh
set -e

IMAGE_NAME="${IMAGE_NAME:-rustyclaw}"
DOCKERFILE="${1:-Dockerfile}"
TAG="${2:-latest}"

case "$DOCKERFILE" in
  Dockerfile|Dockerfile-SelfService)
    ;;
  *)
    echo "Usage: $0 [Dockerfile|Dockerfile-SelfService] [tag]"
    echo ""
    echo "  Default: build Dockerfile with tag 'latest'"
    exit 1
    ;;
esac

echo "==> Building ${IMAGE_NAME}:${TAG} using ${DOCKERFILE}..."

docker build \
  --file "$DOCKERFILE" \
  --tag "${IMAGE_NAME}:${TAG}" \
  --no-cache \
  .

echo "==> Done: ${IMAGE_NAME}:${TAG}"
