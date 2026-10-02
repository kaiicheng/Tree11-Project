from dataclasses import dataclass, field
from pathlib import Path
import os
from datetime import datetime, timedelta, timezone

SOCRATA_DOMAIN = "data.cityofnewyork.us"


@dataclass(frozen=True)
class PageSizeConfig:
    initial: int = 10_000
    minimum: int = 1_000
    maximum: int = 50_000
    target_seconds: float = 12.0

    def __post_init__(self):
        if not (0 < self.minimum <= self.initial <= self.maximum):
            raise ValueError("page sizes must satisfy 0 < minimum <= initial <= maximum")
        if self.target_seconds <= 0:
            raise ValueError("target request latency must be positive")


@dataclass(frozen=True)
class SourceConfig:
    dataset_id: str
    order_fields: tuple[str, ...]
    page_size: PageSizeConfig = field(default_factory=PageSizeConfig)
    pagination_strategy: str = "offset"
    cursor_fields: tuple[str, ...] = ()
    incremental: bool = False
    lookback_days: int | None = None
    incremental_field: str | None = None
    date_filter_mode: str = "comparison"
    primary_key: str = "globalid"

    def __post_init__(self):
        if self.pagination_strategy not in ("offset", "keyset"):
            raise ValueError(f"unsupported pagination strategy: {self.pagination_strategy}")
        if self.date_filter_mode not in ("comparison", "month_extract"):
            raise ValueError(f"unsupported date filter mode: {self.date_filter_mode}")
        if len(self.order_fields) < 2 or self.order_fields[-1] != self.primary_key:
            raise ValueError("deterministic ordering requires a primary-key tie-breaker")
        if self.pagination_strategy == "keyset" and tuple(self.order_fields) != tuple(self.cursor_fields):
            raise ValueError("keyset cursor fields must match the complete order")

    @property
    def order(self):
        return ",".join(self.order_fields)


SOURCES = {
    # Older service requests may have no updateddate. Using that nullable field
    # as a keyset cursor silently skips historical pages, so paginate on the
    # required creation timestamp and stable primary-key tie-breaker instead.
    "service_requests": SourceConfig("mu46-p9is", ("createddate", "globalid"), PageSizeConfig(10_000, 2_000, 30_000), "keyset", ("createddate", "globalid"), True, incremental_field="createddate", date_filter_mode="month_extract"),
    "inspections": SourceConfig("4pt5-3vv4", ("updateddate", "globalid"), pagination_strategy="keyset", cursor_fields=("updateddate", "globalid"), incremental=True, incremental_field="createddate", date_filter_mode="month_extract"),
    "work_orders": SourceConfig("bdjm-n7q4", ("updateddate", "globalid"), pagination_strategy="keyset", cursor_fields=("updateddate", "globalid"), incremental=True, incremental_field="createddate", date_filter_mode="month_extract"),
    "risk_assessments": SourceConfig("259a-b6s7", ("createddate", "globalid"), incremental=True, incremental_field="createddate", date_filter_mode="month_extract"),
}
DATASETS = {name: source.dataset_id for name, source in SOURCES.items()}
ORDER_FIELDS = {name: source.order for name, source in SOURCES.items()}
REQUIRED = {
    "service_requests": ("globalid", "createddate"),
    # Relationship fields may be null in the source; relationship quality
    # validation reports those rows separately instead of rejecting ingestion.
    "inspections": ("globalid",),
    "work_orders": ("globalid",),
    "risk_assessments": ("globalid",),
}


@dataclass
class Settings:
    root: Path
    timeout: int = 75
    connect_timeout: int = 10
    retries: int = 6
    max_dataset_seconds: int = 1200
    max_source_rows: int = 2_000_000
    max_map_bytes: int = 5_000_000
    snapshot_retention: int = 26
    # Full builds use the same rolling window as incremental builds unless an
    # explicit start date is supplied. This keeps CI and local runs bounded.
    analysis_start: str = field(default_factory=lambda: os.getenv("TREE11_ANALYSIS_START", (datetime.now(timezone.utc) - timedelta(days=270)).isoformat()))
    count_drop_warning: float = 0.10
    count_drop_failure: float = 0.50
    app_token: str | None = field(default_factory=lambda: os.getenv("SOCRATA_APP_TOKEN"))
    # GitHub Actions runners are ephemeral, so a rolling source window is the
    # reliable baseline when no local canonical cache is available.
    # Retain nine months of source history so all six completed reporting
    # months remain populated across calendar boundaries and delayed updates.
    # Canonical rows stay out of Git; only compact aggregates are published.
    lookback_days: int = field(default_factory=lambda: int(os.getenv("TREE11_LOOKBACK_DAYS", "270")))
    # Public dashboard builds store aggregates, not row-level historical
    # snapshots. Set this to false only for a dedicated research export.
    compact_public_history: bool = field(default_factory=lambda: os.getenv("TREE11_COMPACT_PUBLIC_HISTORY", "true").lower() not in {"0", "false", "no"})

    @property
    def canonical_dir(self): return self.root / "data" / "canonical"

    @property
    def public_dir(self): return self.root / "public" / "data"
