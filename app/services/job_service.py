from sqlalchemy.orm import Session

from app.db.transaction import transaction
from app.models.job import Job


def create_job(db: Session, job_data: dict) -> Job:

    job = Job(**job_data)

    with transaction(db):
        db.add(job)
        db.flush()

    db.refresh(job)

    return job