import React, { useState, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useNavigate } from "react-router-dom";
export default function UserMenu({ user, onLogout, openSaved, openTrash }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const Navigate = useNavigate();
  if (!user) return null;

  const toggleMenu = () => {
    setOpen(prev => !prev);
  };

  // close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="user-menu" ref={menuRef}>
      <div className="avatar" onClick={toggleMenu}>
        {user.name?.charAt(0).toUpperCase()}
      </div>

      {open && (
        <div className="dropdown">
          <button
            onClick={() => {
              Navigate("/saved-recipes");
              setOpen(false);
            }}
          >
            Saved Recipes
          </button>

          <button
            onClick={() => {
              Navigate("/trash");
              setOpen(false);
            }}
          >
            Trash
          </button>

          <button
            onClick={() => {
              onLogout();
              setOpen(false);
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}