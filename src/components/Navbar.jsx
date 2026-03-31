import React from "react";
import viteLogo from "/chef-svgrepo-com.svg";
import UserMenu from "./UserMenu";
import {Link}from "react-router-dom";
export default function Navbar({user, onLoginClick, onLogout}) {
    return (
        <nav className="navbar">
        <div className = "logo-box">
        <img src={viteLogo} alt="Chef Find Logo" className="logo" />
        <h1>Chef Find</h1>
        </div>
        <div className="nav-right">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/saved-recipes" className="nav-link">Saved Recipes</Link>
            <Link to="/trash" className="nav-link">Trash</Link> 
        {!user ? (
        <button onClick={() => { console.log("login button clicked"); onLoginClick && onLoginClick(); }}>
         Login
        </button>
        ) : (
          <UserMenu user={user} onLogout={onLogout} openSaved={() => {}} openTrash={() => {}} />
        )}
      </div>
    </nav>
    );
}