import React from "react";
import FoodScene3D from "./FoodScene3D";

/*
  Usage:
    import chefVideo from "../assets/chef.mp4";
    <Hero chefVideo={chefVideo} />
  Or to use the 3D scene instead of the video, swap the <video> block with:
    <div className="hero-3d"><FoodScene3D /></div>
*/

export default function Hero({ chefVideo }) {
  return (
    <div className="container">
      <div className="clay-card">
        <div className="hero-left">
          <h2 className="hero-title">
            What's cooking
            <br />
            <span style={{ color: "#f3d1d1" }}>today?</span> 
          </h2>
          <p className="hero-subtitle">
            Drop your ingredients below and let us find the perfect recipe for you!
          </p>
        </div>

        <div className="hero-media-wrap">
          {/* Option A: video */}
          {chefVideo ? (
            <div className="hero-media">
              <video
                src={chefVideo}
                autoPlay
                loop
                muted
                playsInline
                className="hero-video"
              />
            </div>
          ) : (
            /* Option B: fallback to 3D canvas (or you can use this instead of the video) */
            <div className="hero-media">
              <FoodScene3D />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}