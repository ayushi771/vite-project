from sqlalchemy import Boolean, Column, Integer, String, Text , DateTime , JSON
from .database import Base 
from sqlalchemy.sql import func
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship


class Ingredient(Base):
    __tablename__ = "ingredients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    

class Recipe(Base):
    __tablename__ = "recipes"
    id = Column(Integer, primary_key=True, index=True)
    spoonacular_id = Column(Integer, nullable=True, index=True)
    title = Column(String(512), nullable=False, index=True)
    image = Column(String(1024), nullable=True)
    instructions = Column(Text, nullable=True)
    ingredients = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    cuisine = Column(String, nullable=True)
    diet = Column(String, nullable=True)

    meal_type = Column(String, nullable=True)

    calories = Column(Integer, nullable=True)

    dish_types = Column(JSON, nullable=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    

    saved_recipes = relationship("SavedRecipe", back_populates="user")


class SavedRecipe(Base):
    __tablename__ = "saved_recipes"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer)
    user_id = Column(Integer, ForeignKey("users.id"))
    recipe_image = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    recipe_title = Column(String)
    user = relationship("User", back_populates="saved_recipes")
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)