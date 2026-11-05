
import uuid
import enum

from datetime import datetime, timezone

from sqlalchemy import (
    String,
    Integer,
    DateTime,
    ForeignKey,
    Enum,
    CheckConstraint,
    UniqueConstraint,
    Index,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    job_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    cpu_cores: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    memory_gb: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    priority: Mapped[JobPriority] = mapped_column(
        Enum(JobPriority, name="job_priority"),
        default=JobPriority.NORMAL,
        nullable=False
    )

    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status"),
        default=JobStatus.QUEUED,
        nullable=False
    )

    idempotency_key: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    owner: Mapped["User"] = relationship(
        back_populates="jobs"
    )

    __table_args__ = (
        CheckConstraint(
            "cpu_cores > 0",
            name="ck_jobs_cpu_positive"
        ),
        CheckConstraint(
            "memory_gb > 0",
            name="ck_jobs_memory_positive"
        ),
        UniqueConstraint(
            "user_id",
            "idempotency_key",
            name="uq_jobs_user_idempotency"
        ),
        Index(
            "ix_jobs_user_status",
            "user_id",
            "status"
        ),
        Index(
            "ix_jobs_status_created",
            "status",
            "created_at"
        ),
    )

    def __repr__(self):
        return (
            f"<Job(id={self.id}, "
            f"name={self.job_name}, "
            f"status={self.status.value})>"
        )
