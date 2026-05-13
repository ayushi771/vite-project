from pathlib import Path
import os
import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ✅ Only load local backend/.env when running locally
# On Render, use Render Environment settings instead.
if os.getenv("RENDER") != "true":
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        load_dotenv(env_path)

from .database import engine, Base
from .routers import router as api_router

app = FastAPI(title="ChefFind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger = logging.getLogger("uvicorn.error")
    for route in app.routes:
        logger.info(
            f"Registered route -> path={getattr(route, 'path', None)} methods={getattr(route, 'methods', None)}"
        )

@app.get("/")
async def root():
    return {"status": "ok", "message": "ChefFind API running"}