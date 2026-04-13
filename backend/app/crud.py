from datetime import datetime
from os import name
import secrets
import hashlib
from sqlalchemy import select 
from sqlalchemy.ext.asyncio import AsyncSession
from . import models, schemas
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from .auth import hash_password

async def create_ingredient(db: AsyncSession, ingredient: schemas.IngredientCreate):
    obj = models.Ingredient(name=ingredient.name)
    db.add(obj)
    try:
        await db.commit()
    except IntegrityError:
        # Ingredient already exists -> rollback and return existing row
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

def _normalize_ingredient_item(item):
    # If it's a dict with 'name'
    if isinstance(item, dict):
        return item.get("name") or str(item)
    # If it's an object with attribute 'name' (e.g., Pydantic model)
    name = getattr(item, "name", None)
    if name is not None:
        return name
    # Otherwise coerce to string
    return str(item)

# Recipes
async def create_recipe(db: AsyncSession, recipe_in: schemas.RecipeCreate):
    # Normalize ingredients to a list of plain strings
    raw_ings = recipe_in.ingredients or []
    normalized_ings = [_normalize_ingredient_item(i) for i in raw_ings]
    if recipe_in.spoonacular_id:
        q = select(models.Recipe).where(models.Recipe.spoonacular_id == recipe_in.spoonacular_id)
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

        dish_types=recipe_in.dish_types
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
    q = select(models.Recipe).order_by(models.Recipe.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()

async def create_user(db: AsyncSession, email: str, password: str , name: str):
    # Hash the plain password exactly once here
    hashed = hash_password(password)

    user = models.User(
        name= name,
        email=email,
        password=hashed
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def get_user_by_email(db: AsyncSession, email: str):
    q = select(models.User).where(models.User.email == email)
    result = await db.execute(q)
    return result.scalars().first()

async def save_recipe(db: AsyncSession, user_id: int, recipe_id: int, recipe_title: str, recipe_image: str = None):
    if recipe_id is None:
        raise ValueError("recipe_id is required")

    obj = models.SavedRecipe(
        recipe_id=recipe_id,
        recipe_title=recipe_title.strip() if recipe_title else None,
        recipe_image=recipe_image,
        user_id=user_id
    )

    db.add(obj)
    await db.commit()
    await db.refresh(obj)

    return obj

async def get_saved_recipes(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(models.SavedRecipe).where(models.SavedRecipe.user_id == user_id).where(models.SavedRecipe.is_deleted == False)
    )
    return result.scalars().all()

async def get_deleted_recipes(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(models.SavedRecipe)
        .where(models.SavedRecipe.user_id == user_id)
        .where(models.SavedRecipe.is_deleted == True)
    )
    return result.scalars().all()



async def delete_saved_recipe(db: AsyncSession, recipe_id: int):
    result = await db.execute(
        select(models.SavedRecipe).where(models.SavedRecipe.id == recipe_id)
    )

    recipe = result.scalar_one_or_none()

    if not recipe:
        return {"error": "Recipe not found"}

    recipe.is_deleted = True
    recipe.deleted_at = datetime.utcnow()

    await db.commit()

    return {"message": "Recipe moved to trash"}

async def restore_recipe(db: AsyncSession, recipe_id: int):
    result = await db.execute(
        select(models.SavedRecipe).where(models.SavedRecipe.id == recipe_id)
    )

    recipe = result.scalars().first()

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

    recipe = result.scalars().first()

    if recipe:
        await db.delete(recipe)
        await db.commit()

    return {"message": "Recipe permanently deleted"}