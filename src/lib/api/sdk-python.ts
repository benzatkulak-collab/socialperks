/**
 * Python SDK Generator
 *
 * Generates a fully typed Python client for the Social Perks API.
 * Served via GET /api/v1/sdk/python as a downloadable .py file.
 */

export function generatePythonSDK(): string {
  return `"""
Social Perks Python SDK
========================

Fully typed Python client for the Social Perks REST API.
Supports Bearer token and API key authentication,
automatic retries, pagination helpers, and all major endpoints.

Install dependencies:
    pip install requests

Usage:
    from social_perks import SocialPerksClient

    client = SocialPerksClient(
        base_url="https://socialperks.app",
        api_key="sk_live_abc123...",
    )

    campaigns = client.list_campaigns(state="active")
    for c in campaigns.data:
        print(c["name"], c["state"])
"""

from __future__ import annotations

import time
import requests
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List


# ── Response Types ──────────────────────────────────────────────────────────


@dataclass
class Pagination:
    """Pagination metadata returned by list endpoints."""

    page: int = 1
    per_page: int = 20
    total: int = 0
    total_pages: int = 0


@dataclass
class PaginatedResponse:
    """Wrapper for paginated list responses."""

    data: List[Dict[str, Any]] = field(default_factory=list)
    pagination: Pagination = field(default_factory=Pagination)
    success: bool = True


@dataclass
class APIResponse:
    """Wrapper for single-object responses."""

    data: Dict[str, Any] = field(default_factory=dict)
    success: bool = True


# ── Exceptions ──────────────────────────────────────────────────────────────


class SocialPerksError(Exception):
    """Base exception for SDK errors."""

    def __init__(self, code: str, message: str, status: int = 400):
        self.code = code
        self.message = message
        self.status = status
        super().__init__(f"[{code}] {message} (HTTP {status})")


class RateLimitError(SocialPerksError):
    """Raised when the API returns 429 Too Many Requests."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 60):
        self.retry_after = retry_after
        super().__init__("RATE_LIMITED", message, 429)


class AuthenticationError(SocialPerksError):
    """Raised when the API returns 401 Unauthorized."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__("UNAUTHORIZED", message, 401)


# ── Client ──────────────────────────────────────────────────────────────────


class SocialPerksClient:
    """
    Social Perks API Client.

    Args:
        base_url: Base URL of the Social Perks instance (e.g. "https://socialperks.app").
        api_key: API key for authentication (recommended for server-to-server).
        token: Bearer token for authentication (from login flow).
        retries: Number of retries for 5xx errors (default: 2).
        timeout: Request timeout in seconds (default: 10).
    """

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        token: Optional[str] = None,
        retries: int = 2,
        timeout: int = 10,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.token = token
        self.retries = retries
        self.timeout = timeout
        self._session = requests.Session()

    # ── Internal Helpers ────────────────────────────────────────────────

    def _headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "social-perks-python-sdk/1.0.0",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        elif self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = self._url(path)
        last_error: Optional[Exception] = None

        for attempt in range(self.retries + 1):
            try:
                resp = self._session.request(
                    method=method,
                    url=url,
                    headers=self._headers(),
                    params=params,
                    json=json_body,
                    timeout=self.timeout,
                )

                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", "60"))
                    if attempt < self.retries:
                        time.sleep(min(retry_after, 5))
                        continue
                    raise RateLimitError(retry_after=retry_after)

                if resp.status_code == 401:
                    raise AuthenticationError()

                body = resp.json()

                if not body.get("success", False):
                    error = body.get("error", {})
                    raise SocialPerksError(
                        code=error.get("code", "UNKNOWN"),
                        message=error.get("message", "Unknown error"),
                        status=resp.status_code,
                    )

                return body

            except (requests.ConnectionError, requests.Timeout) as e:
                last_error = e
                if attempt < self.retries:
                    time.sleep(2 ** attempt)
                    continue
                raise SocialPerksError(
                    code="NETWORK_ERROR",
                    message=str(e),
                    status=0,
                ) from e

        raise last_error or SocialPerksError(  # type: ignore[misc]
            code="RETRY_EXHAUSTED",
            message="Max retries exceeded",
            status=0,
        )

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self._request("GET", path, params=params)

    def _post(self, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self._request("POST", path, json_body=body)

    def _put(self, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self._request("PUT", path, json_body=body)

    def _delete(self, path: str) -> Dict[str, Any]:
        return self._request("DELETE", path)

    def _paginated(self, path: str, params: Optional[Dict[str, Any]] = None) -> PaginatedResponse:
        body = self._get(path, params)
        data = body.get("data", {})
        items = data.get("items", data) if isinstance(data, dict) else data
        pag = data.get("pagination", {}) if isinstance(data, dict) else {}
        return PaginatedResponse(
            data=items if isinstance(items, list) else [items],
            pagination=Pagination(
                page=pag.get("page", 1),
                per_page=pag.get("perPage", 20),
                total=pag.get("total", 0),
                total_pages=pag.get("totalPages", 0),
            ),
        )

    # ── Auth ────────────────────────────────────────────────────────────

    def login(self, email: str, password: str) -> APIResponse:
        """Authenticate and store the access token."""
        body = self._post("/api/v1/auth", {
            "action": "login",
            "email": email,
            "password": password,
        })
        data = body.get("data", {})
        self.token = data.get("accessToken")
        return APIResponse(data=data)

    def signup(
        self,
        email: str,
        password: str,
        name: str,
        role: str = "business",
    ) -> APIResponse:
        """Create a new account."""
        body = self._post("/api/v1/auth", {
            "action": "signup",
            "email": email,
            "password": password,
            "name": name,
            "role": role,
        })
        data = body.get("data", {})
        self.token = data.get("accessToken")
        return APIResponse(data=data)

    def validate_session(self) -> APIResponse:
        """Validate the current session token."""
        body = self._get("/api/v1/auth")
        return APIResponse(data=body.get("data", {}))

    # ── Campaigns ───────────────────────────────────────────────────────

    def list_campaigns(
        self,
        state: Optional[str] = None,
        business_id: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> PaginatedResponse:
        """List campaigns with optional filters."""
        params: Dict[str, Any] = {"page": page, "perPage": per_page}
        if state:
            params["state"] = state
        if business_id:
            params["businessId"] = business_id
        return self._paginated("/api/v1/campaigns", params)

    def create_campaign(
        self,
        name: str,
        platform: str,
        action_type: str,
        reward: Dict[str, Any],
        requirements: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> APIResponse:
        """Create and launch a new campaign."""
        body: Dict[str, Any] = {
            "name": name,
            "platform": platform,
            "actionType": action_type,
            "reward": reward,
        }
        if requirements:
            body["requirements"] = requirements
        body.update(kwargs)
        result = self._post("/api/v1/campaigns", body)
        return APIResponse(data=result.get("data", {}))

    def update_campaign(self, campaign_id: str, **fields: Any) -> APIResponse:
        """Update campaign fields or lifecycle state."""
        body = {"id": campaign_id, **fields}
        result = self._put("/api/v1/campaigns", body)
        return APIResponse(data=result.get("data", {}))

    # ── Submissions ─────────────────────────────────────────────────────

    def list_submissions(
        self,
        campaign_id: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> PaginatedResponse:
        """List submissions with optional filters."""
        params: Dict[str, Any] = {"page": page, "perPage": per_page}
        if campaign_id:
            params["campaignId"] = campaign_id
        if status:
            params["status"] = status
        return self._paginated("/api/v1/submissions", params)

    def create_submission(
        self,
        campaign_id: str,
        proof_url: str,
        proof_type: str = "url",
        notes: Optional[str] = None,
    ) -> APIResponse:
        """Submit proof of a completed marketing action."""
        body: Dict[str, Any] = {
            "campaignId": campaign_id,
            "proofUrl": proof_url,
            "proofType": proof_type,
        }
        if notes:
            body["notes"] = notes
        result = self._post("/api/v1/submissions", body)
        return APIResponse(data=result.get("data", {}))

    def review_submission(
        self,
        submission_id: str,
        action: str,
        reason: Optional[str] = None,
    ) -> APIResponse:
        """Approve or reject a submission."""
        body: Dict[str, Any] = {
            "submissionId": submission_id,
            "action": action,
        }
        if reason:
            body["reason"] = reason
        result = self._post("/api/v1/submissions/review", body)
        return APIResponse(data=result.get("data", {}))

    # ── AI ──────────────────────────────────────────────────────────────

    def ai_generate(self, business_id: str, **kwargs: Any) -> APIResponse:
        """Generate campaign suggestions using AI."""
        body = {"businessId": business_id, **kwargs}
        result = self._post("/api/v1/ai/generate", body)
        return APIResponse(data=result.get("data", {}))

    def ai_recommend(
        self,
        business_id: str,
        industry: Optional[str] = None,
        goals: Optional[List[str]] = None,
    ) -> APIResponse:
        """Get AI-powered optimization recommendations."""
        body: Dict[str, Any] = {"businessId": business_id}
        if industry:
            body["industry"] = industry
        if goals:
            body["goals"] = goals
        result = self._post("/api/v1/ai/recommend", body)
        return APIResponse(data=result.get("data", {}))

    def ai_campaign_agent(self, business_id: str, **kwargs: Any) -> APIResponse:
        """Get a full AI marketing plan."""
        body = {"businessId": business_id, **kwargs}
        result = self._post("/api/v1/ai/campaign-agent", body)
        return APIResponse(data=result.get("data", {}))

    # ── Programs ────────────────────────────────────────────────────────

    def list_programs(self, page: int = 1, per_page: int = 20) -> PaginatedResponse:
        """List perk programs."""
        return self._paginated("/api/v1/programs", {"page": page, "perPage": per_page})

    def create_program(self, name: str, **kwargs: Any) -> APIResponse:
        """Create a new perk program."""
        body = {"name": name, **kwargs}
        result = self._post("/api/v1/programs", body)
        return APIResponse(data=result.get("data", {}))

    def get_program(self, program_id: str) -> APIResponse:
        """Get program details."""
        result = self._get(f"/api/v1/programs/{program_id}")
        return APIResponse(data=result.get("data", {}))

    def update_program(self, program_id: str, **fields: Any) -> APIResponse:
        """Update a program."""
        result = self._put(f"/api/v1/programs/{program_id}", fields)
        return APIResponse(data=result.get("data", {}))

    def delete_program(self, program_id: str) -> APIResponse:
        """End a program."""
        result = self._delete(f"/api/v1/programs/{program_id}")
        return APIResponse(data=result.get("data", {}))

    def enroll_member(self, program_id: str, member_id: str, **kwargs: Any) -> APIResponse:
        """Enroll a member in a program."""
        body = {"memberId": member_id, **kwargs}
        result = self._post(f"/api/v1/programs/{program_id}/members", body)
        return APIResponse(data=result.get("data", {}))

    def submit_program_action(
        self,
        program_id: str,
        action_type: str,
        proof_url: str,
        **kwargs: Any,
    ) -> APIResponse:
        """Submit an action for a perk program."""
        body = {"actionType": action_type, "proofUrl": proof_url, **kwargs}
        result = self._post(f"/api/v1/programs/{program_id}/submit", body)
        return APIResponse(data=result.get("data", {}))

    # ── Exchange ────────────────────────────────────────────────────────

    def list_opportunities(self) -> PaginatedResponse:
        """List market opportunities (public)."""
        return self._paginated("/api/v1/exchange/opportunities")

    def get_market_data(self) -> APIResponse:
        """Get real-time market data (public)."""
        result = self._get("/api/v1/exchange/market")
        return APIResponse(data=result.get("data", {}))

    def place_order(self, order_type: str, **kwargs: Any) -> APIResponse:
        """Place a buy or sell order."""
        body = {"type": order_type, **kwargs}
        result = self._post("/api/v1/exchange/orders", body)
        return APIResponse(data=result.get("data", {}))

    # ── Reference Data ──────────────────────────────────────────────────

    def get_pricing(self) -> APIResponse:
        """Get pricing oracle data (public, cached)."""
        result = self._get("/api/v1/pricing")
        return APIResponse(data=result.get("data", {}))

    def list_actions(self) -> APIResponse:
        """Get the full action library (107 marketing actions)."""
        result = self._get("/api/v1/actions")
        return APIResponse(data=result.get("data", {}))

    def get_benchmarks(self, industry: Optional[str] = None) -> APIResponse:
        """Get industry benchmarks (public, cached)."""
        params: Dict[str, Any] = {}
        if industry:
            params["industry"] = industry
        result = self._get("/api/v1/benchmarks", params)
        return APIResponse(data=result.get("data", {}))

    def search_influencers(
        self,
        platform: Optional[str] = None,
        min_followers: Optional[int] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> PaginatedResponse:
        """Search influencers."""
        params: Dict[str, Any] = {"page": page, "perPage": per_page}
        if platform:
            params["platform"] = platform
        if min_followers is not None:
            params["minFollowers"] = min_followers
        return self._paginated("/api/v1/influencers", params)

    def get_recommendations(self, business_id: Optional[str] = None) -> APIResponse:
        """Get ML-powered recommendations."""
        params: Dict[str, Any] = {}
        if business_id:
            params["businessId"] = business_id
        result = self._get("/api/v1/recommendations", params)
        return APIResponse(data=result.get("data", {}))

    # ── Health ──────────────────────────────────────────────────────────

    def health(self) -> APIResponse:
        """Check API health status."""
        result = self._get("/api/v1/health")
        return APIResponse(data=result.get("data", {}))
`;
}
