#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_ENV="${PROJECT_ROOT}/server/.env"
CLIENT_ENV="${PROJECT_ROOT}/client/.env"

# Get IMDSv2 token
TOKEN=$(curl -sS -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

if [ -z "$TOKEN" ]; then
  echo "Failed to get IMDSv2 token."
  exit 1
fi

# Get current public IPv4
PUBLIC_IP=$(curl -sS -H "X-aws-ec2-metadata-token: ${TOKEN}" \
  "http://169.254.169.254/latest/meta-data/public-ipv4")

if [ -z "$PUBLIC_IP" ]; then
  echo "Failed to get public IPv4 from EC2 metadata."
  exit 1
fi

echo "Current EC2 public IP: ${PUBLIC_IP}"

# Back up env files
cp "$SERVER_ENV" "${SERVER_ENV}.bak"
cp "$CLIENT_ENV" "${CLIENT_ENV}.bak"

# Update only the relevant lines
sed -i "s|^CLIENT_URL=.*|CLIENT_URL=http://${PUBLIC_IP}:5173|" "$SERVER_ENV"
sed -i "s|^VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://${PUBLIC_IP}:3001/api|" "$CLIENT_ENV"

echo "Updated:"
echo "  $SERVER_ENV"
echo "  $CLIENT_ENV"
echo
echo "New values:"
grep '^CLIENT_URL=' "$SERVER_ENV"
grep '^VITE_API_BASE_URL=' "$CLIENT_ENV"
echo
echo "Restart backend and frontend after this."
