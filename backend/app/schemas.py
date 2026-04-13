

from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

class IngredientCreate(BaseModel):
    name: str

class IngredientOut(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

class RecipeCreate(BaseModel):
    spoonacular_id: Optional[int] = None
    title: str
    image: Optional[str] = None
    instructions: Optional[str] = None
    ingredients: Optional[List[str]] = None

    cuisine: Optional[str] = None
    diet: Optional[str] = None
    meal_type: Optional[str] = None

    calories: Optional[int] = None
    dish_types: Optional[List[str]] = None

class RecipeOut(BaseModel):
    id: int
    spoonacular_id: Optional[int] = None

    title: str
    image: Optional[str] = None
    instructions: Optional[str] = None

    ingredients: Optional[List[str]] = None

    created_at: Optional[datetime] = None

    cuisine: Optional[str] = None
    diet: Optional[str] = None
    meal_type: Optional[str] = None

    calories: Optional[int] = None
    dish_types: Optional[List[str]] = None

    model_config = {
        "from_attributes": True
    }

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str            

class RecipeSave(BaseModel):
    user_id: int
    recipe_id: int
    recipe_title: str
    recipe_image: str | None = None   


