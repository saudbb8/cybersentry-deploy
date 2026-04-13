"""
CyberSentry Geo Lookup.
Resolves attacker IP → country, city, ISP using free APIs.
No API key required — uses ip-api.com (45 req/min free).
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Optional
import urllib.request
import json


@dataclass
class GeoInfo:
    ip: str
    country: str
    country_code: str
    region: str
    city: str
    isp: str
    org: str
    lat: float
    lon: float
    timezone: str
    is_proxy: bool
    is_hosting: bool
    flag: str

    def summary(self) -> str:
        parts = []
        if self.city and self.city != self.country:
            parts.append(self.city)
        if self.country:
            parts.append(self.country)
        return ", ".join(parts) if parts else "Unknown"

    def to_dict(self) -> dict:
        return {
            "ip":           self.ip,
            "country":      self.country,
            "country_code": self.country_code,
            "region":       self.region,
            "city":         self.city,
            "isp":          self.isp,
            "org":          self.org,
            "lat":          self.lat,
            "lon":          self.lon,
            "timezone":     self.timezone,
            "is_proxy":     self.is_proxy,
            "is_hosting":   self.is_hosting,
            "flag":         self.flag,
            "summary":      self.summary(),
        }


PRIVATE_RANGES = [
    "127.", "10.", "192.168.", "172.16.", "172.17.", "172.18.",
    "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
    "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.",
    "172.31.", "169.254.", "::1", "0.0.0.0",
]

COUNTRY_FLAGS = {
    "US": "🇺🇸", "GB": "🇬🇧", "CN": "🇨🇳", "RU": "🇷🇺", "DE": "🇩🇪",
    "FR": "🇫🇷", "JP": "🇯🇵", "KR": "🇰🇷", "IN": "🇮🇳", "BR": "🇧🇷",
    "CA": "🇨🇦", "AU": "🇦🇺", "NL": "🇳🇱", "SE": "🇸🇪", "NO": "🇳🇴",
    "FI": "🇫🇮", "PL": "🇵🇱", "UA": "🇺🇦", "TR": "🇹🇷", "IR": "🇮🇷",
    "SA": "🇸🇦", "IL": "🇮🇱", "SG": "🇸🇬", "HK": "🇭🇰", "TW": "🇹🇼",
    "ID": "🇮🇩", "TH": "🇹🇭", "MY": "🇲🇾", "PH": "🇵🇭", "VN": "🇻🇳",
    "MX": "🇲🇽", "AR": "🇦🇷", "CL": "🇨🇱", "CO": "🇨🇴", "ZA": "🇿🇦",
    "NG": "🇳🇬", "EG": "🇪🇬", "PK": "🇵🇰", "BD": "🇧🇩", "RO": "🇷🇴",
    "IT": "🇮🇹", "ES": "🇪🇸", "PT": "🇵🇹", "CZ": "🇨🇿", "HU": "🇭🇺",
    "AT": "🇦🇹", "CH": "🇨🇭", "BE": "🇧🇪", "DK": "🇩🇰", "NZ": "🇳🇿",
}


def _is_private(ip: str) -> bool:
    return any(ip.startswith(r) for r in PRIVATE_RANGES)


def _make_local_geo(ip: str) -> GeoInfo:
    return GeoInfo(
        ip=ip, country="Local", country_code="LO",
        region="localhost", city="localhost",
        isp="Local Network", org="Local",
        lat=0.0, lon=0.0, timezone="UTC",
        is_proxy=False, is_hosting=False, flag="🏠",
    )


class GeoLookupEngine:
    """
    Free IP geolocation using ip-api.com.
    Rate limit: 45 requests/minute (free tier).
    Caches results to avoid hitting the limit.
    """

    def __init__(self, cache_ttl: int = 3600, max_cache: int = 10000):
        self._cache: dict[str, tuple[GeoInfo, float]] = {}
        self._cache_ttl = cache_ttl
        self._max_cache = max_cache
        self._lock = threading.Lock()
        self._last_request = 0.0
        self._min_interval = 1.4  # ~45 req/min safe

    def lookup(self, ip: str) -> GeoInfo:
        if _is_private(ip):
            return _make_local_geo(ip)

        with self._lock:
            cached = self._cache.get(ip)
            if cached:
                info, ts = cached
                if time.time() - ts < self._cache_ttl:
                    return info

        # Rate limit
        now = time.time()
        elapsed = now - self._last_request
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)

        try:
            url = f"http://ip-api.com/json/{ip}?fields=status,country,countryCode,region,regionName,city,isp,org,lat,lon,timezone,proxy,hosting"
            req = urllib.request.Request(url, headers={"User-Agent": "CyberSentry/0.2.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
            self._last_request = time.time()

            if data.get("status") == "success":
                country_code = data.get("countryCode", "")
                info = GeoInfo(
                    ip=ip,
                    country=data.get("country", "Unknown"),
                    country_code=country_code,
                    region=data.get("regionName", ""),
                    city=data.get("city", ""),
                    isp=data.get("isp", ""),
                    org=data.get("org", ""),
                    lat=data.get("lat", 0.0),
                    lon=data.get("lon", 0.0),
                    timezone=data.get("timezone", ""),
                    is_proxy=data.get("proxy", False),
                    is_hosting=data.get("hosting", False),
                    flag=COUNTRY_FLAGS.get(country_code, "🌍"),
                )
            else:
                info = self._fallback(ip)

        except Exception:
            info = self._fallback(ip)

        with self._lock:
            if len(self._cache) >= self._max_cache:
                oldest = min(self._cache.items(), key=lambda x: x[1][1])
                del self._cache[oldest[0]]
            self._cache[ip] = (info, time.time())

        return info

    def lookup_batch(self, ips: list[str]) -> dict[str, GeoInfo]:
        results = {}
        unique = list(set(ips))
        for ip in unique:
            results[ip] = self.lookup(ip)
        return results

    def get_cache_stats(self) -> dict:
        with self._lock:
            return {"cached_ips": len(self._cache), "max_cache": self._max_cache}

    def _fallback(self, ip: str) -> GeoInfo:
        return GeoInfo(
            ip=ip, country="Unknown", country_code="??",
            region="Unknown", city="Unknown",
            isp="Unknown", org="Unknown",
            lat=0.0, lon=0.0, timezone="UTC",
            is_proxy=False, is_hosting=False, flag="🌍",
        )


# Singleton
_engine: Optional[GeoLookupEngine] = None

def get_geo_engine() -> GeoLookupEngine:
    global _engine
    if _engine is None:
        _engine = GeoLookupEngine()
    return _engine


def lookup_ip(ip: str) -> GeoInfo:
    return get_geo_engine().lookup(ip)
