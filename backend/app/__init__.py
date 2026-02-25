from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.data import router as data_router

app = FastAPI(
    title="Crime Intelligence System API",
    description="Backend API for the Crime Intelligence System",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router)
app.include_router(data_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Crime Intelligence System API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
