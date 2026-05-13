from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
import httpx
import re
import logging
from datetime import datetime, timezone
from .auth import verify_password, hash_password, generate_token, get_expiry, generate_otp_code, otp_expiry
from . import crud, schemas
from .database import get_db
from .email_utils import send_email

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api")

SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")
SPOONACULAR_BASE = "https://api.spoonacular.com/recipes/complexSearch"

# ---------------- INGREDIENTS ----------------

@router.post("/ingredients", response_model=schemas.IngredientOut)
async def add_ingredient(ingredient: schemas.IngredientCreate, db: AsyncSession = Depends(get_db)):
    ingredient.name = ingredient.name.strip().lower()
    return await crud.create_ingredient(db, ingredient)

@router.get("/ingredients", response_model=List[schemas.IngredientOut])
async def get_ingredients(limit: int = Query(100, ge=1, le=1000), db: AsyncSession = Depends(get_db)):
    return await crud.list_ingredients(db, limit=limit)

# ---------------- RECIPES ----------------
# Replace existing /save_recipe handler with this:

@router.post("/save_recipe", response_model=schemas.SavedRecipeOut)
async def save_recipe(payload: schemas.RecipeSave, db: AsyncSession = Depends(get_db)):
    """
    Accepts: { user_id, recipe_id, recipe_title, recipe_image }
    Creates a SavedRecipe using the existing crud/save function.
    """
    obj = await crud.save_recipe(db, payload.user_id, payload.recipe_id, payload.recipe_title, payload.recipe_image)
    return obj
@router.get("/recipes", response_model=List[schemas.RecipeOut])
async def list_recipes(limit: int = 50, offset: int = 0, db: AsyncSession = Depends(get_db)):
    return await crud.list_recipes(db, limit=limit, offset=offset)

@router.post("/register")
async def register(
    user: schemas.UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    existing = await crud.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    code = generate_otp_code(6)
    expires_at = otp_expiry(10)

    new_user = await crud.create_user(
        db,
        email=user.email,
        password=user.password,
        name=user.name,
        verification_token=None,              # not needed for OTP
        verification_code=code,
        verification_code_expiry=expires_at
    )

    body = (
        f"Hi {new_user.name},\n\n"
        f"Your verification code is: {code}\n"
        f"This code expires in 10 minutes.\n\n"
        f"If you did not request this, ignore this email."
    )

    background_tasks.add_task(
        send_email,
        user.email,
        "Verify your account",
        body
    )

    return {"message": "User registered. Check your email for the verification code."}

@router.post("/verify-code")
async def verify_code(payload: schemas.VerifyCode, db: AsyncSession = Depends(get_db)):
    user = await crud.get_user_by_email_and_code(db, payload.email, payload.code)

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or code")

    if user.is_verified:
        return {"message": "Already verified"}

    now = datetime.now(timezone.utc)

    expiry = user.verification_code_expiry

    # ✅ FIX (same as reset-password)
    if expiry and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)

    if not expiry or expiry < now:
        raise HTTPException(status_code=400, detail="Code expired")

    user.is_verified = True
    user.verification_code = None
    user.verification_code_expiry = None

    await db.commit()
    return {"message": "Email verified successfully"}

@router.get("/verify")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    user = await crud.get_user_by_token(db, token)

    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")

    user.is_verified = True
    user.verification_token = None

    await db.commit()

    return {"message": "Email verified successfully"}


@router.post("/login")
async def login(user: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    db_user = await crud.get_user_by_email(db, user.email)

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not db_user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email")

    return {
        "message": "Login successful",
        "user_id": db_user.id,
        "name": db_user.name,
        "email": db_user.email
    }

@router.post("/forgot-password")
async def forgot_password(
    email: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    user = await crud.get_user_by_email(db, email)

    if not user:
        # keep same behavior to not leak whether the email exists
        return {"message": "If email exists, reset code sent"}

    # generate 6-digit OTP
    token = generate_otp_code(6)

    user.reset_token = token
    user.reset_token_expiry = otp_expiry(10)

    await db.commit()

    body = (
        f"Hi {user.name},\n\n"
        f"Your password reset token is:\n\n"
        f"{token}\n\n"
        f"This expires in 10 minutes.\n\n"
        f"If you did not request this, ignore this email."
    )

    # ✅ send synchronously so failures are visible (no silent success)
    try:
        await send_email(
            email,
            "Password Reset Token",
            body
        )
    except Exception:
        logger.exception("❌ Forgot-password email failed")
        raise HTTPException(status_code=500, detail="Email could not be sent. Check SMTP settings.")

    return {"message": "Reset token sent"}
@router.post("/reset-password")
async def reset_password(
    payload: schemas.ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    user = await crud.get_user_by_reset_token(db, payload.token)

    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    now = datetime.now(timezone.utc)

    expiry = user.reset_token_expiry

    # 🔥 FIX timezone mismatch (ONLY FIX)
    if expiry and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)

    if not expiry or expiry < now:
        raise HTTPException(status_code=400, detail="Reset token expired")

    user.password = hash_password(payload.new_password)

    user.reset_token = None
    user.reset_token_expiry = None

    await db.commit()

    return {"message": "Password reset successful"}

@router.get("/saved-recipes")
async def saved_recipes(user_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.get_saved_recipes(db, user_id)

@router.get("/trash")
async def trash_recipes(user_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.get_deleted_recipes(db, user_id)

@router.put("/delete-recipe/{recipe_id}")
async def delete_recipe(recipe_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.delete_saved_recipe(db, recipe_id)

@router.put("/restore-recipe/{recipe_id}")
async def restore_recipe(recipe_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.restore_recipe(db, recipe_id)

@router.delete("/delete-permanently/{recipe_id}")
async def delete_permanently(recipe_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.permanently_delete_recipe(db, recipe_id)

@router.get("/spoonacular/search")
async def search_recipes(
    ingredients: str = "",
    cuisine: str = "",
    diet: str = "",
    meal_type: str = "",
    max_calories: int = None,
    number: int = 12
):
    if not SPOONACULAR_API_KEY:
        raise HTTPException(status_code=503, detail="API key missing")

    params = {
        "apiKey": SPOONACULAR_API_KEY,
        "number": number,
    }

    if ingredients:
        params["includeIngredients"] = ingredients
    if cuisine:
        params["cuisine"] = cuisine
    if diet:
        params["diet"] = diet
    if meal_type:
        params["type"] = meal_type
    if max_calories:
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
        "number": 5
    }

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
        return res.json()

@router.get("/spoonacular/recipes/{recipe_id}")
async def get_recipe(recipe_id: int):
    if not SPOONACULAR_API_KEY:
        raise HTTPException(status_code=503, detail="API key missing")

    url = f"https://api.spoonacular.com/recipes/{recipe_id}/information"

    params = {
        "apiKey": SPOONACULAR_API_KEY,
        "includeNutrition": True
    }

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
        return res.json()        