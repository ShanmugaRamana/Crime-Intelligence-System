from fastapi import FastAPI
import uvicorn

app = FastAPI(
    title="Crime Intelligence System API",
    description="Backend API for the Crime Intelligence System",
    version="1.0.0"
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Crime Intelligence System API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)