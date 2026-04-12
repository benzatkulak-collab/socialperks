/**
 * Social Perks -- Webhook Verification Examples
 *
 * Code examples in multiple languages for verifying webhook signatures.
 * These are exported for use in documentation endpoints, onboarding UIs,
 * and developer portal pages.
 *
 * Signature format:
 *   Header: `X-SocialPerks-Signature: sha256=<hex>`
 *   Body:   raw JSON string
 *   Secret: the webhook endpoint's signing secret (whsec_...)
 */

export const WEBHOOK_VERIFICATION_EXAMPLES = {
  node: `const crypto = require('crypto');

/**
 * Verify a Social Perks webhook signature.
 * @param {string} body      - Raw request body (JSON string)
 * @param {string} signature - Value of the X-SocialPerks-Signature header
 * @param {string} secret    - Your webhook signing secret (whsec_...)
 * @returns {boolean}
 */
function verifyWebhook(body, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (expected.length !== signature.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express.js example
app.post('/webhooks/socialperks', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-socialperks-signature'];
  const isValid = verifyWebhook(req.body.toString(), signature, process.env.WEBHOOK_SECRET);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(req.body);
  console.log('Received event:', event.event, event.payload);

  res.status(200).json({ received: true });
});`,

  python: `import hmac
import hashlib
from flask import Flask, request, jsonify

def verify_webhook(body: bytes, signature: str, secret: str) -> bool:
    """
    Verify a Social Perks webhook signature.

    Args:
        body:      Raw request body bytes
        signature: Value of the X-SocialPerks-Signature header
        secret:    Your webhook signing secret (whsec_...)

    Returns:
        True if the signature is valid
    """
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)


app = Flask(__name__)

@app.route('/webhooks/socialperks', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-SocialPerks-Signature', '')
    is_valid = verify_webhook(request.data, signature, WEBHOOK_SECRET)

    if not is_valid:
        return jsonify({'error': 'Invalid signature'}), 401

    event = request.get_json()
    print(f"Received event: {event['event']} - {event['payload']}")

    return jsonify({'received': True}), 200`,

  ruby: `require 'openssl'
require 'sinatra'
require 'json'

# Verify a Social Perks webhook signature.
def verify_webhook(body, signature, secret)
  expected = 'sha256=' + OpenSSL::HMAC.hexdigest('sha256', secret, body)
  Rack::Utils.secure_compare(expected, signature)
end

post '/webhooks/socialperks' do
  request.body.rewind
  body = request.body.read
  signature = request.env['HTTP_X_SOCIALPERKS_SIGNATURE'] || ''

  unless verify_webhook(body, signature, ENV['WEBHOOK_SECRET'])
    halt 401, { error: 'Invalid signature' }.to_json
  end

  event = JSON.parse(body)
  puts "Received event: #{event['event']} - #{event['payload']}"

  content_type :json
  { received: true }.to_json
end`,

  go: `package main

import (
\t"crypto/hmac"
\t"crypto/sha256"
\t"encoding/hex"
\t"encoding/json"
\t"fmt"
\t"io"
\t"net/http"
\t"os"
)

// verifyWebhook checks the HMAC-SHA256 signature of a webhook payload.
func verifyWebhook(body []byte, signature, secret string) bool {
\tmac := hmac.New(sha256.New, []byte(secret))
\tmac.Write(body)
\texpected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
\treturn hmac.Equal([]byte(expected), []byte(signature))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
\tbody, err := io.ReadAll(r.Body)
\tif err != nil {
\t\thttp.Error(w, "Bad request", http.StatusBadRequest)
\t\treturn
\t}

\tsignature := r.Header.Get("X-SocialPerks-Signature")
\tif !verifyWebhook(body, signature, os.Getenv("WEBHOOK_SECRET")) {
\t\thttp.Error(w, "Invalid signature", http.StatusUnauthorized)
\t\treturn
\t}

\tvar event map[string]interface{}
\tjson.Unmarshal(body, &event)
\tfmt.Printf("Received event: %s\\n", event["event"])

\tw.Header().Set("Content-Type", "application/json")
\tw.WriteHeader(http.StatusOK)
\tw.Write([]byte(\`{"received": true}\`))
}

func main() {
\thttp.HandleFunc("/webhooks/socialperks", webhookHandler)
\thttp.ListenAndServe(":8080", nil)
}`,

  curl: `# Verify a webhook signature manually with curl + openssl
#
# 1. Capture the raw body and signature from the webhook request
# 2. Compute the expected HMAC-SHA256 signature
# 3. Compare the two

WEBHOOK_SECRET="whsec_your_signing_secret_here"
BODY='{"event":"campaign.created","payload":{"campaignId":"camp_123"},"timestamp":"2026-01-01T00:00:00Z"}'
SIGNATURE="sha256=<value-from-x-socialperks-signature-header>"

# Compute expected signature
EXPECTED="sha256=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')"

echo "Expected:  $EXPECTED"
echo "Received:  $SIGNATURE"

if [ "$EXPECTED" = "$SIGNATURE" ]; then
  echo "Signature valid"
else
  echo "Signature INVALID"
fi

# ── Send a test webhook (useful for local development) ──
# curl -X POST http://localhost:3000/webhooks/socialperks \\
#   -H "Content-Type: application/json" \\
#   -H "X-SocialPerks-Signature: $EXPECTED" \\
#   -H "X-SocialPerks-Event: campaign.created" \\
#   -d "$BODY"`,
} as const;

export type WebhookExampleLanguage = keyof typeof WEBHOOK_VERIFICATION_EXAMPLES;

/**
 * Get a webhook verification example for a specific language.
 */
export function getWebhookExample(language: WebhookExampleLanguage): string {
  return WEBHOOK_VERIFICATION_EXAMPLES[language];
}

/**
 * Get all available example languages.
 */
export function getAvailableLanguages(): WebhookExampleLanguage[] {
  return Object.keys(WEBHOOK_VERIFICATION_EXAMPLES) as WebhookExampleLanguage[];
}
