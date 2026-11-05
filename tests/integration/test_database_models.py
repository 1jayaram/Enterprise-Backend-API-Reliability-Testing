
import uuid

import pytest

from sqlalchemy.exc import IntegrityError

from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.job import Job, JobStatus, JobPriority


@pytest.fixture
def test_user():
    db = SessionLocal()

    user = User(
        username=f"test_{uuid.uuid4().hex[:8]}",
        email=f"test_{uuid.uuid4().hex}@example.com",
        password_hash="test_hash",
        role=UserRole.USER,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

        yield user

    finally:
        db.delete(user)
        db.commit()
        db.close()


def test_user_can_be_created(test_user):
    assert test_user.id is not None
    assert test_user.username.startswith("test_")
    assert test_user.role == UserRole.USER


def test_job_can_be_created(test_user):
    db = SessionLocal()

    job = Job(
        user_id=test_user.id,
        job_name="integration_test_job",
        cpu_cores=4,
        memory_gb=16,
        priority=JobPriority.NORMAL,
        status=JobStatus.QUEUED,
    )

    try:
        db.add(job)
        db.commit()
        db.refresh(job)

        assert job.id is not None
        assert job.status == JobStatus.QUEUED

    finally:
        db.delete(job)
        db.commit()
        db.close()


def test_job_rejects_negative_cpu(test_user):
    db = SessionLocal()

    job = Job(
        user_id=test_user.id,
        job_name="invalid_cpu_job",
        cpu_cores=-1,
        memory_gb=16,
        priority=JobPriority.NORMAL,
        status=JobStatus.QUEUED,
    )

    try:
        db.add(job)

        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()

    finally:
        db.close()


def test_job_rejects_zero_memory(test_user):
    db = SessionLocal()

    job = Job(
        user_id=test_user.id,
        job_name="invalid_memory_job",
        cpu_cores=4,
        memory_gb=0,
        priority=JobPriority.NORMAL,
        status=JobStatus.QUEUED,
    )

    try:
        db.add(job)

        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()

    finally:
        db.close()
