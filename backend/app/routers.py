from fastapi import APIRouter, Depends, HTTPException, Query , BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
import httpx
from . import crud, schemas
from .database import get_db
from .auth import verify_password
import re
import logging

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api")
SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")
SPOONACULAR_BASE = "https://api.spoonacular.com/recipes/complexSearch"


@router.post("/ingredients", response_model=schemas.IngredientOut)
async def add_ingredient(ingredient: schemas.IngredientCreate, db: AsyncSession = Depends(get_db)):
    ingredient.name = ingredient.name.strip().lower()
    return await crud.create_ingredient(db, ingredient)

@router.get("/ingredients", response_model=List[schemas.IngredientOut])
async def get_ingredients(limit: int = Query(100, ge=1, le=1000), db: AsyncSession = Depends(get_db)):
    return await crud.list_ingredients(db, limit=limit)

 
@router.post("/recipes", response_model=schemas.RecipeOut)
async def save_recipe(recipe: schemas.RecipeCreate, db: AsyncSession = Depends(get_db)):
    obj = await crud.create_recipe(db, recipe)
    return {
        "id": obj.id,
        "spoonacular_id": obj.spoonacular_id,
        "title": obj.title,
        "image": obj.image,
        "instructions": obj.instructions,
        "ingredients": obj.ingredients or [],
    }

@router.get("/recipes", response_model=List[schemas.RecipeOut])
async def list_recipes(limit: int = Query(50, ge=1, le=200), offset: int = 0, db: AsyncSession = Depends(get_db)):
    objs = await crud.list_recipes(db, limit=limit, offset=offset)
    return [
        {
            "id": o.id,
            "spoonacular_id": o.spoonacular_id,
            "title": o.title,
            "image": o.image,
            "instructions": o.instructions,
            "ingredients": o.ingredients or [],
        }
        for o in objs
    ]



@router.get("/spoonacular/recipes/{recipe_id}")
async def spoonacular_get_recipe_details(recipe_id: int):

    if not SPOONACULAR_API_KEY:
        raise HTTPException(status_code=503, detail="Spoonacular API key not configured")

    url = f"https://api.spoonacular.com/recipes/{recipe_id}/information"

    params = {
        "apiKey": SPOONACULAR_API_KEY,
        "includeNutrition": True
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(url, params=params)

    if resp.status_code != 200:
        logger.warning(f"Spoonacular error {resp.status_code}: {resp.text[:500]}")
        raise HTTPException(status_code=resp.status_code, detail="Failed to fetch recipe")

    data = resp.json()

    # nutrition
    nutrition = data.get("nutrition")

    # dish types
    dish_types = data.get("dishTypes", [])

    # calories
    calories = None
    if isinstance(nutrition, dict):
        nutrients = nutrition.get("nutrients", [])
        for n in nutrients:
            title = (n.get("title") or n.get("name") or "").lower()
            if "calorie" in title:
                try:
                    calories = int(round(n.get("amount", 0)))
                except Exception:
                    calories = n.get("amount")
                break

        ingredients = [
        ing.get("original") or ing.get("name")
        for ing in data.get("extendedIngredients", [])
    ]

    instructions = ""
    if data.get("instructions"):
        instructions = re.sub("<.*?>", "", data["instructions"]).strip()

    elif data.get("analyzedInstructions"):
        steps = []
        for block in data["analyzedInstructions"]:
            for step in block.get("steps", []):
                steps.append(step.get("step"))
        instructions = "\n".join(steps)
    result = {
        "id": data.get("id"),
        "spoonacular_id": data.get("id"),
        "title": data.get("title"),
        "image": data.get("image"),
        "sourceUrl": data.get("sourceUrl") or data.get("spoonacularSourceUrl"),
        "instructions": instructions,
        "ingredients": ingredients,
        "extendedIngredients": data.get("extendedIngredients"),
        "cuisines": data.get("cuisines", []),
        "diets": data.get("diets", []),
        "dishTypes": dish_types,
        "readyInMinutes": data.get("readyInMinutes"),
        "nutrition": nutrition,
        "calories": calories,
    }

    return result

@router.get("/spoonacular/autocomplete")
async def spoonacular_autocomplete(query: str = Query(..., min_length=1, max_length=60)):
    key = os.getenv("SPOONACULAR_API_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="Spoonacular API key not configured")
    url = "https://api.spoonacular.com/food/ingredients/autocomplete"
    params = {"query": query, "number": 8, "apiKey": key}
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        return r.json()

@router.get("/spoonacular/findByIngredients")
async def spoonacular_find_by_ingredients(ingredients: str = Query(..., min_length=1), number: int = 10):
    key = os.getenv("SPOONACULAR_API_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="Spoonacular API key not configured")
    url = "https://api.spoonacular.com/recipes/findByIngredients"
    params = {"ingredients": ingredients, "number": number, "apiKey": key}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        return r.json()


@router.post("/register")
async def register(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    new_user = await crud.create_user(db, user.email, user.password, user.name)
    return {"id": new_user.id, "email": new_user.email, "name": new_user.name}

@router.post("/login")
async def login(user: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    db_user = await crud.get_user_by_email(db, user.email)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
     
    return {"message": "Login successful", "user_id": db_user.id , "name": db_user.name , "email": db_user.email}

@router.post("/save_recipe")
async def save_recipe(
    recipe: schemas.RecipeSave,
    db: AsyncSession = Depends(get_db)
):
    if not recipe.recipe_id or not recipe.recipe_title:
        raise HTTPException(status_code=400, detail="recipe_id and recipe_title are required")

    return await crud.save_recipe(
        db,
        recipe.user_id,
        recipe.recipe_id,
        recipe.recipe_title,
        recipe.recipe_image  # ✅ ADD THIS
    )

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
    ingredients: str = Query("", description="Comma-separated ingredients"),
    cuisine: str = Query("", description="Cuisine type"),
    diet: str = Query("", description="Diet type"),
    meal_type: str = Query("", description="Meal type"),
    max_calories: int = Query(None, description="Maximum calories"),
    number: int = Query(12, description="Number of results")
):
    if not SPOONACULAR_API_KEY:
        raise HTTPException(status_code=503, detail="Spoonacular API key not configured")

    params = {
        "apiKey": SPOONACULAR_API_KEY,
        "number": number,
        "addRecipeInformation": True,
        "includeNutrition": True
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

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.get(SPOONACULAR_BASE, params=params)
            res.raise_for_status()
            return res.json()

        except httpx.HTTPStatusError as exc:
            body = exc.response.text[:1000]
            raise HTTPException(status_code=502, detail=f"Spoonacular error: {body}")

        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Spoonacular request failed: {str(exc)}")