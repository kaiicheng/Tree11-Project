from dataclasses import dataclass, field
from pathlib import Path
import os

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
    primary_key: str = "globalid"

    def __post_init__(self):
        if self.pagination_strategy != "offset":
            raise ValueError(f"unsupported pagination strategy: {self.pagination_strategy}")
        if len(self.order_fields) < 2 or self.order_fields[-1] != self.primary_key:
            raise ValueError("deterministic ordering requires a primary-key tie-breaker")

    @property
    def order(self):
        return ",".join(self.order_fields)


SOURCES = {
    "service_requests": SourceConfig("mu46-p9is", ("updateddate", "globalid"), PageSizeConfig(10_000, 2_000, 30_000)),
    "inspections": SourceConfig("4pt5-3vv4", ("updateddate", "globalid")),
    "work_orders": SourceConfig("bdjm-n7q4", ("updateddate", "globalid")),
    "risk_assessments": SourceConfig("259a-b6s7", ("createddate", "globalid")),
}
DATASETS = {name: source.dataset_id for name, source in SOURCES.items()}
ORDER_FIELDS = {name: source.order for name, source in SOURCES.items()}
REQUIRED = {
    "service_requests": ("globalid", "createddate"),
    "inspections": ("globalid", "servicerequestglobalid"),
    "work_orders": ("globalid", "inspectionglobalid"),
    "risk_assessments": ("globalid", "inspectionglobalid"),
}


@dataclass
class Settings:
    root: Path
    timeout: int = 30
    retries: int = 4
    max_dataset_seconds: int = 1200
    max_source_rows: int = 2_000_000
    max_map_bytes: int = 5_000_000
    lookback_days: int = 30
    snapshot_retention: int = 26
    analysis_start: str = field(default_factory=lambda: os.getenv("TREE11_ANALYSIS_START", "2022-01-01T00:00:00.000"))
    count_drop_warning: float = 0.10
    count_drop_failure: float = 0.50
    app_token: str | None = field(default_factory=lambda: os.getenv("SOCRATA_APP_TOKEN"))

    @property
    def canonical_dir(self): return self.root / "data" / "canonical"

    @property
    def public_dir(self): return self.root / "public" / "data"
