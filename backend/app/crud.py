from datetime import datetime
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from . import models, schemas
from .auth import hash_password


# ---------------- INGREDIENTS ----------------

async def create_ingredient(db: AsyncSession, ingredient: schemas.IngredientCreate):
    obj = models.Ingredient(name=ingredient.name)
    db.add(obj)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        q = select(models.Ingredient).where(models.Ingredient.name == ingredient.name)
        result = await db.execute(q)
        return result.scalars().first()

    await db.refresh(obj)
    return obj


async def list_ingredients(db: AsyncSession, limit: int = 100):
    q = select(models.Ingredient).order_by(models.Ingredient.created_at.desc()).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


# ---------------- RECIPES ----------------

async def create_recipe(db: AsyncSession, recipe_in: schemas.RecipeCreate):
    raw_ings = recipe_in.ingredients or []
    normalized_ings = []

    for i in raw_ings:
        if isinstance(i, dict):
            normalized_ings.append(i.get("name", str(i)))
        else:
            name = getattr(i, "name", None)
            normalized_ings.append(name if name else str(i))

    if recipe_in.spoonacular_id:
        q = select(models.Recipe).where(
            models.Recipe.spoonacular_id == recipe_in.spoonacular_id
        )
        result = await db.execute(q)
        existing = result.scalars().first()
        if existing:
            return existing

    obj = models.Recipe(
        spoonacular_id=recipe_in.spoonacular_id,
        title=recipe_in.title,
        image=recipe_in.image,
        instructions=recipe_in.instructions,
        ingredients=normalized_ings,
        cuisine=recipe_in.cuisine,
        diet=recipe_in.diet,
        meal_type=recipe_in.meal_type,
        calories=recipe_in.calories,
        dish_types=recipe_in.dish_types,
    )

    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_recipe(db: AsyncSession, recipe_id: int):
    q = select(models.Recipe).where(models.Recipe.id == recipe_id)
    result = await db.execute(q)
    return result.scalars().first()


async def list_recipes(db: AsyncSession, limit: int = 50, offset: int = 0):
    q = (
        select(models.Recipe)
        .order_by(models.Recipe.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(q)
    return result.scalars().all()


# ---------------- USERS ----------------

async def create_user(
    db: AsyncSession,
    email: str,
    password: str,
    name: str,
    verification_token: str = None,
    verification_code: str = None,
    verification_code_expiry=None,
):
    user = models.User(
        email=email,
        password=hash_password(password),
        name=name,
        verification_token=verification_token,
        verification_code=verification_code,
        verification_code_expiry=verification_code_expiry,
        is_verified=True,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(
        select(models.User).where(models.User.email == email)
    )
    return result.scalars().first()


async def get_user_by_id(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    return result.scalar_one_or_none()


async def get_user_by_reset_token(db: AsyncSession, token: str):
    result = await db.execute(
        select(models.User).where(models.User.reset_token == token)
    )
    return result.scalar_one_or_none()


async def get_user_by_email_and_code(db: AsyncSession, email: str, code: str):
    result = await db.execute(
        select(models.User).where(
            models.User.email == email,
            models.User.verification_code == code,
        )
    )
    return result.scalars().first()


# ---------------- SAVED RECIPES ----------------

async def save_recipe(
    db: AsyncSession,
    user_id: int,
    recipe_id: int,
    recipe_title: str,
    recipe_image: str = None,
):
    obj = models.SavedRecipe(
        recipe_id=recipe_id,
        recipe_title=recipe_title.strip() if recipe_title else None,
        recipe_image=recipe_image,
        user_id=user_id,
    )

    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_saved_recipes(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(models.SavedRecipe)
        .where(models.SavedRecipe.user_id == user_id)
        .where(models.SavedRecipe.is_deleted.is_(False))
    )
    return result.scalars().all()


async def get_deleted_recipes(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(models.SavedRecipe)
        .where(models.SavedRecipe.user_id == user_id)
        .where(models.SavedRecipe.is_deleted.is_(True))
    )
    return result.scalars().all()


# ---------------- DELETE / RESTORE (FIXED SECURITY) ----------------

async def delete_saved_recipe(db: AsyncSession, recipe_id: int):
    result = await db.execute(select(models.SavedRecipe).where(models.SavedRecipe.id == recipe_id))
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    recipe.is_deleted = True
    recipe.deleted_at = datetime.utcnow()

    await db.commit()
    return {"message": "Recipe moved to trash"}
async def restore_recipe(db: AsyncSession, recipe_id: int):
    result = await db.execute(
        select(models.SavedRecipe).where(models.SavedRecipe.id == recipe_id)
    )

    recipe = result.scalar_one_or_none()

    if recipe:
        recipe.is_deleted = False
        recipe.deleted_at = None
        await db.commit()
        await db.refresh(recipe)

    return recipe


async def permanently_delete_recipe(db: AsyncSession, recipe_id: int):
    result = await db.execute(
        select(models.SavedRecipe).where(models.SavedRecipe.id == recipe_id)
    )

    recipe = result.scalar_one_or_none()

    if recipe:
        await db.delete(recipe)
        await db.commit()

    return {"message": "Recipe permanently deleted"}