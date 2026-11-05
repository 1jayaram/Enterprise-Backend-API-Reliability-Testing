from fastapi import FastAPI

app = FastAPI(
    title="Enterprise Workload Management API",
    description="Backend API for workload management and reliability testing",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "Enterprise Workload Management API",
        "status": "running",
        "documentation": "/docs",
        "health": "/health"
    }