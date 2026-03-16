import re
import httpx

# --- Step 2.2: Loopback Protection ---
# Patterns that indicate internal/loopback/private network addresses (SSRF protection)
_INTERNAL_PATTERNS = re.compile(
    r"(^localhost)"
    r"|(^127\.)"
    r"|(^10\.)"
    r"|(^172\.(1[6-9]|2[0-9]|3[0-1])\.)"
    r"|(^192\.168\.)"
    r"|(^::1)"
    r"|(^0\.0\.0\.0)",
    re.IGNORECASE,
)


def is_internal_url(url: str) -> bool:
    """
    Step 2.2: SSRF / Loopback Protection.
    Returns True if the URL resolves to a known internal or loopback address.
    """
    # Strip scheme to get host
    host = re.sub(r"^https?://", "", url, flags=re.IGNORECASE)
    host = host.split("/")[0].split(":")[0]  # Remove path and port
    return bool(_INTERNAL_PATTERNS.match(host))


async def resolve_url(url: str) -> str:
    """
    Step 2.1: The Async Resolver.
    Uses httpx to send a HEAD request and follow redirects, expanding shortened URLs.
    Returns the fully resolved destination URL.

    Raises:
        ValueError: if the URL points to an internal address (SSRF prevention).
        httpx.TimeoutException: if the server doesn't respond within timeout.
        httpx.RequestError: for any other network-level failure.
    """
    # Pre-check before even sending the request
    if is_internal_url(url):
        raise ValueError(f"Blocked: URL resolves to a protected internal address: {url}")

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=3.0,
    ) as client:
        response = await client.head(url)

    resolved_url = str(response.url)

    # Post-resolve check — an attacker could redirect through an external proxy to an internal IP
    if is_internal_url(resolved_url):
        raise ValueError(
            f"Blocked: Redirect chain resolved to a protected internal address: {resolved_url}"
        )

    return resolved_url
