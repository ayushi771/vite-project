from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
import httpx
import logging
from datetime import datetime, timezone, timedelta

from .auth import verify_password, hash_password, generate_otp_code, otp_expiry
from . import crud, schemas
from .database import get_db

from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

# ---------------- AUTH SETUP ----------------

router = APIRouter(prefix="/api")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

SECRET_KEY = "your-secret"
ALGORITHM = "HS256"

logger = logging.getLogger("uvicorn.error")

SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")
SPOONACULAR_BASE = "https://api.spoonacular.com/recipes/complexSearch"


# ---------------- JWT DEPENDENCY ----------------

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = await crud.get_user_by_id(db, user_id)

        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return user

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------- INGREDIENTS ----------------

@router.post("/ingredients", response_model=schemas.IngredientOut)
async def add_ingredient(
    ingredient: schemas.IngredientCreate,
    db: AsyncSession = Depends(get_db),
):
    ingredient.name = ingredient.name.strip().lower()
    return await crud.create_ingredient(db, ingredient)


@router.get("/ingredients", response_model=List[schemas.IngredientOut])
async def get_ingredients(
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    return await crud.list_ingredients(db, limit=limit)


# ---------------- RECIPES ----------------

@router.get("/recipes", response_model=List[schemas.RecipeOut])
async def list_recipes(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    return await crud.list_recipes(db, limit=limit, offset=offset)


@router.post("/save_recipe", response_model=schemas.SavedRecipeOut)
async def save_recipe(
    payload: schemas.RecipeSave,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.recipe_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid recipe_id")

    return await crud.save_recipe(
        db,
        current_user.id,
        payload.recipe_id,
        payload.recipe_title,
        payload.recipe_image,
    )


# ---------------- AUTH ----------------

@router.post("/register")
async def register(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await crud.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = await crud.create_user(
        db,
        email=user.email,
        password=user.password,
        name=user.name,
        verification_token=None,
        verification_code=None,
        verification_code_expiry=None,
    )

    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
    }


@router.post("/login")
async def login(user: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    db_user = await crud.get_user_by_email(db, user.email)

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode(
        {
            "user_id": db_user.id,
            "exp": datetime.utcnow() + timedelta(days=7),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    return {
        "message": "Login successful",
        "access_token": token,
        "user": {
            "id": db_user.id,
            "name": db_user.name,
            "email": db_user.email,
        },
    }


@router.post("/forgot-password")
async def forgot_password(email: str, db: AsyncSession = Depends(get_db)):
    user = await crud.get_user_by_email(db, email)

    if not user:
        return {"message": "If email exists, reset token generated"}

    token = generate_otp_code(6)
    user.reset_token = token
    user.reset_token_expiry = otp_expiry(10)

    await db.commit()

    return {"message": "Reset token generated", "reset_token": token}


@router.post("/reset-password")
async def reset_password(payload: schemas.ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await crud.get_user_by_reset_token(db, payload.token)

    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    now = datetime.now(timezone.utc)
    expiry = user.reset_token_expiry

    if expiry and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)

    if not expiry or expiry < now:
        raise HTTPException(status_code=400, detail="Reset token expired")

    user.password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expiry = None

    await db.commit()

    return {"message": "Password reset successful"}


# ---------------- SAVED RECIPES (FIXED) ----------------

@router.get("/saved-recipes")
async def saved_recipes(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await crud.get_saved_recipes(db, current_user.id)


@router.get("/trash")
async def trash_recipes(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await crud.get_deleted_recipes(db, current_user.id)


@router.put("/delete-recipe/{recipe_id}")
async def delete_recipe(
    recipe_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await crud.delete_saved_recipe(db, recipe_id, current_user.id)


@router.put("/restore-recipe/{recipe_id}")
async def restore_recipe(recipe_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.restore_recipe(db, recipe_id)


@router.delete("/delete-permanently/{recipe_id}")
async def delete_permanently(recipe_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.permanently_delete_recipe(db, recipe_id)


# ---------------- SPOONACULAR ----------------

@router.get("/spoonacular/search")
async def search_recipes(
    ingredients: str = "",
    cuisine: str = "",
    diet: str = "",
    meal_type: str = "",
    max_calories: int | None = None,
    number: int = 12,
):
    if not SPOONACULAR_API_KEY:
        raise HTTPException(status_code=503, detail="API key missing")

    params = {"apiKey": SPOONACULAR_API_KEY, "number": number}

    if ingredients:
        params["includeIngredients"] = ingredients
    if cuisine:
        params["cuisine"] = cuisine
    if diet:
        params["diet"] = diet
    if meal_type:
        params["type"] = meal_type
    if max_calories is not None:
        params["maxCalories"] = max_calories

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(SPOONACULAR_BASE, params=params)
            res.raise_for_status()
            return res.json()
    except httpx.HTTPError as e:
        logger.exception("Spoonacular API failed")
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/spoonacular/autocomplete")
async def autocomplete(query: str):
    if not SPOONACULAR_API_KEY:
        raise HTTPException(status_code=503, detail="API key missing")

    url = "https://api.spoonacular.com/food/ingredients/autocomplete"

    params = {
        "apiKey": SPOONACULAR_API_KEY,
        "query": query,
        "number": 5,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url, params=params)
            res.raise_for_status()
            return res.json()
    except httpx.HTTPError as e:
        logger.exception("Autocomplete failed")
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/spoonacular/recipes/{recipe_id}")
async def get_recipe(recipe_id: int):
    if not SPOONACULAR_API_KEY:
        raise HTTPException(status_code=503, detail="API key missing")

    url = f"https://api.spoonacular.com/recipes/{recipe_id}/information"
    params = {
        "apiKey": SPOONACULAR_API_KEY,
        "includeNutrition": True,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url, params=params)
            res.raise_for_status()
            return res.json()
    except httpx.HTTPError as e:
        logger.exception("Get recipe failed")
        raise HTTPException(status_code=503, detail=str(e))