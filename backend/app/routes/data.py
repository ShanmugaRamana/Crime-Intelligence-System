import io
import os
import json
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.dependencies import verify_api_key

router = APIRouter()

REQUIRED_COLUMNS = {"Year", "Month", "Police Station", "Crime Type", "Under Investigation", "Closed"}
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "stored_data")
DATA_FILE = os.path.join(DATA_DIR, "current_dataset.json")


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), api_key: str = Depends(verify_api_key)):
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Only .csv and .xlsx/.xls files are supported")

    # Read contents
    contents = await file.read()

    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    # Validate columns
    actual_columns = set(df.columns.str.strip())
    missing = REQUIRED_COLUMNS - actual_columns
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required columns: {', '.join(sorted(missing))}. "
                   f"Required columns are: {', '.join(sorted(REQUIRED_COLUMNS))}"
        )

    # Clean and prepare data
    df.columns = df.columns.str.strip()
    result = {
        "success": True,
        "message": "File uploaded successfully",
        "filename": file.filename,
        "rows": len(df),
        "columns": list(df.columns),
        "data": df.fillna("").to_dict(orient="records")
    }

    # Save to disk for persistence
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, default=str)

    return result


@router.get("/dataset")
async def get_current_dataset(api_key: str = Depends(verify_api_key)):
    if not os.path.exists(DATA_FILE):
        return {"success": False, "message": "No dataset uploaded yet"}

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    return data


@router.delete("/dataset")
async def delete_dataset(api_key: str = Depends(verify_api_key)):
    if os.path.exists(DATA_FILE):
        os.remove(DATA_FILE)
    return {"success": True, "message": "Dataset cleared"}
