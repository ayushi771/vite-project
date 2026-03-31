import React, { useMemo } from "react";

export default function FloatingIcons({ icons = [] }) {
 
  const foodIcons = useMemo(() => icons, [icons]);

  const positions = useMemo(() => {
    const rows = 3;
    const cols = 4;
    const rowHeight = 100 / rows;
    const colWidth = 100 / cols;
    const arr = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const baseTop = r * rowHeight + rowHeight / 2;
        const baseLeft = c * colWidth + colWidth / 2;
        arr.push({
          top: baseTop + (Math.random() - 0.5) * rowHeight * 0.2,
          left: baseLeft + (Math.random() - 0.5) * colWidth * 0.8,
        });
      }
    }
    return arr.map((pos, index) => ({
      id: index,
      src: foodIcons[index % foodIcons.length],
      ...pos,
      size: 35 + Math.random() * 10,
    }));
  }, [foodIcons]);

  return (
    <div className="recipe-floating-layer">
      {positions.map((icon) => (
        <img
          key={icon.id}
          src={icon.src}
          alt="Food icon"
          className="floating-item-static"
          style={{
            top: `${icon.top}%`,
            left: `${icon.left}%`,
            width: `${icon.size}px`,
            position: "absolute",
          }}
        />
      ))}
    </div>
  );
}