import time
import threading
from typing import Dict, List, Tuple

_lock = threading.Lock()

# IP rate limiting: max requests within window
IP_WINDOW_SECONDS = 60
IP_MAX_ATTEMPTS = 15

# Username rate limiting: max failed attempts within window
USER_WINDOW_SECONDS = 60
USER_MAX_FAILURES = 5

_ip_attempts: Dict[str, List[float]] = {}
_user_failures: Dict[str, List[float]] = {}


def _cleanup_timestamps(ts_list: List[float], window: int, now: float) -> List[float]:
    cutoff = now - window
    return [t for t in ts_list if t > cutoff]


def check_login_rate_limit(client_ip: str, username: str = None) -> Tuple[bool, int, str]:
    """
    Check whether the given client IP or username has exceeded the login rate limits.
    Returns (is_allowed, retry_after_seconds, rejection_reason).
    """
    now = time.time()
    clean_ip = client_ip.strip() if client_ip else "unknown"
    clean_user = username.strip().lower() if username else None

    with _lock:
        # 1. Check IP rate limit
        ip_history = _cleanup_timestamps(_ip_attempts.get(clean_ip, []), IP_WINDOW_SECONDS, now)
        _ip_attempts[clean_ip] = ip_history

        if len(ip_history) >= IP_MAX_ATTEMPTS:
            oldest = ip_history[0]
            retry_after = max(1, int(IP_WINDOW_SECONDS - (now - oldest)))
            return False, retry_after, "Too many login attempts from this network. Please try again shortly."

        # 2. Check Username failure rate limit
        if clean_user:
            user_history = _cleanup_timestamps(_user_failures.get(clean_user, []), USER_WINDOW_SECONDS, now)
            _user_failures[clean_user] = user_history

            if len(user_history) >= USER_MAX_FAILURES:
                oldest = user_history[0]
                retry_after = max(1, int(USER_WINDOW_SECONDS - (now - oldest)))
                return False, retry_after, f"Too many failed login attempts for '{clean_user}'. Please try again in {retry_after} seconds."

    return True, 0, ""


def record_login_attempt(client_ip: str):
    """Record an inbound login attempt from an IP."""
    now = time.time()
    clean_ip = client_ip.strip() if client_ip else "unknown"
    with _lock:
        history = _cleanup_timestamps(_ip_attempts.get(clean_ip, []), IP_WINDOW_SECONDS, now)
        history.append(now)
        _ip_attempts[clean_ip] = history


def record_login_failure(client_ip: str, username: str = None):
    """Record a failed login attempt for an IP and a username."""
    now = time.time()
    clean_user = username.strip().lower() if username else None
    with _lock:
        if clean_user:
            history = _cleanup_timestamps(_user_failures.get(clean_user, []), USER_WINDOW_SECONDS, now)
            history.append(now)
            _user_failures[clean_user] = history


def reset_login_failures(username: str = None):
    """
    Reset failed login attempts upon successful login so legitimate wardens
    are never locked out.
    """
    if not username:
        return
    clean_user = username.strip().lower()
    with _lock:
        if clean_user in _user_failures:
            del _user_failures[clean_user]
