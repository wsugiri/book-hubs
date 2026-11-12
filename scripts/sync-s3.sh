#!/usr/bin/env bash
set -euo pipefail

# Resolve repository root regardless of where the script is invoked from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

S3_BASE="${S3_BASE:-s3://warsoo-tech/static/days-book}"
ACL="${ACL:-public-read}"

EXTRA_ARGS=()
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dryrun)
      DRY_RUN=true
      EXTRA_ARGS+=("--dryrun")
      ;;
    --delete)
      EXTRA_ARGS+=("--delete")
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: $0 [--dryrun] [--delete]"
      exit 1
      ;;
  esac
done

if ! command -v aws >/dev/null 2>&1; then
  echo "❌ Error: AWS CLI ('aws') tidak ditemukan di PATH."
  exit 1
fi

echo "🚀 Memulai sync ke ${S3_BASE} (ACL: ${ACL})..."
if [ "$DRY_RUN" = true ]; then
  echo "🧪 Mode DRY RUN aktif (tidak ada file yang benar-benar di-upload)."
fi

cd "$ROOT_DIR"

echo ""
echo "📚 [1/4] Syncing books/ -> ${S3_BASE}/books ..."
aws s3 sync ./books "${S3_BASE}/books" \
  --acl "${ACL}" \
  --exclude "*.DS_Store" \
  ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}

echo ""
echo "📝 [2/4] Syncing articles/ -> ${S3_BASE}/articles ..."
aws s3 sync ./articles "${S3_BASE}/articles" \
  --acl "${ACL}" \
  --exclude "*.DS_Store" \
  ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}

echo ""
echo "📖 [3/4] Uploading CATALOG.md -> ${S3_BASE}/CATALOG.md ..."
if [ "$DRY_RUN" = true ]; then
  aws s3 cp ./CATALOG.md "${S3_BASE}/CATALOG.md" --acl "${ACL}" --dryrun
else
  aws s3 cp ./CATALOG.md "${S3_BASE}/CATALOG.md" --acl "${ACL}"
fi

echo ""
echo "📰 [4/4] Uploading ARTICLES.md -> ${S3_BASE}/ARTICLES.md ..."
if [ "$DRY_RUN" = true ]; then
  aws s3 cp ./ARTICLES.md "${S3_BASE}/ARTICLES.md" --acl "${ACL}" --dryrun
else
  aws s3 cp ./ARTICLES.md "${S3_BASE}/ARTICLES.md" --acl "${ACL}"
fi

echo ""
echo "✅ Selesai! Semua konten books, articles, CATALOG.md, dan ARTICLES.md berhasil di-sync."

