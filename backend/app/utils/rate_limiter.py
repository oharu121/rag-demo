"""
レート制限機能
"""

import time
from collections import defaultdict
from threading import Lock


class RateLimiter:
    """シンプルなインメモリレート制限"""

    def __init__(self, requests_per_minute: int = 15):
        self.requests_per_minute = requests_per_minute
        self.requests: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check_limit(self, client_id: str) -> bool:
        """
        レート制限をチェック

        Args:
            client_id: クライアント識別子 (IPアドレスなど)

        Returns:
            True: リクエスト許可
            False: レート制限超過
        """
        now = time.time()
        minute_ago = now - 60

        with self._lock:
            # 古いリクエストを削除
            self.requests[client_id] = [
                t for t in self.requests[client_id] if t > minute_ago
            ]

            if len(self.requests[client_id]) >= self.requests_per_minute:
                return False

            self.requests[client_id].append(now)
            return True

    def get_remaining(self, client_id: str) -> int:
        """残りリクエスト数を取得"""
        now = time.time()
        minute_ago = now - 60

        with self._lock:
            recent_requests = [
                t for t in self.requests[client_id] if t > minute_ago
            ]
            return max(0, self.requests_per_minute - len(recent_requests))

    def get_reset_time(self, client_id: str) -> float:
        """リセットまでの秒数を取得"""
        if client_id not in self.requests or not self.requests[client_id]:
            return 0

        oldest_request = min(self.requests[client_id])
        reset_time = oldest_request + 60 - time.time()
        return max(0, reset_time)


# グローバルインスタンス
rate_limiter = RateLimiter()
