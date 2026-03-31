import { useEffect, useState } from "react"
import { getTrashRecipes, restoreRecipe, deletePermanent } from "/src/services/recipeApi"
import Navbar from "/src/components/Navbar";

export default function Trash({ user }) {

  const [recipes, setRecipes] = useState([])

  function handleLogout() {
    localStorage.removeItem("token")
    window.location.reload()
  }

  useEffect(() => {
    async function load() {
      const data = await getTrashRecipes(user.id)
      setRecipes(data)
    }
    load()
  }, [])

  async function restore(id) {
    await restoreRecipe(id)
    setRecipes(recipes.filter(r => r.id !== id))
  }

  async function remove(id) {
    await deletePermanent(id)
    setRecipes(recipes.filter(r => r.id !== id))
  }

  return (
    <div className="page">
      <Navbar user={user} onLogout={handleLogout} />

      <h2>Trash</h2>

      <div className="grid">
        {recipes.map(r => (
          <div className="card" key={r.id}>
            <h3>{r.recipe_title}</h3>

            <button onClick={() => restore(r.id)}>Restore</button>
            <button onClick={() => remove(r.id)}>Delete Forever</button>
          </div>
        ))}
      </div>
    </div>
  )
}