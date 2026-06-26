import React, { useRef, useState, useEffect } from 'react';

/**
 * Magnet is a performance-first visual component that tracking cursor coordinates.
 * When the mouse cursor comes near the element, it pulls the element organic-style.
 * Returns beautifully to origin via custom transitions when leaving the trigger threshold.
 */
export default function Magnet({ children, strength = 18, padding = 45, className = '', style = {} }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      // Calculate pull boundary
      const maxDistance = Math.max(rect.width, rect.height) / 2 + padding;
      
      if (distance < maxDistance) {
        setIsHovered(true);
        // Calculate physics factor
        const ratio = (maxDistance - distance) / maxDistance; // 1 at center, 0 at boundary
        const pullX = (distanceX / maxDistance) * strength * ratio;
        const pullY = (distanceY / maxDistance) * strength * ratio;
        setPosition({ x: pullX, y: pullY });
      } else {
        if (isHovered) {
          setIsHovered(false);
          setPosition({ x: 0, y: 0 });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [strength, padding, isHovered]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: isHovered ? 'transform 0.08s cubic-bezier(0.25, 1, 0.5, 1)' : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
        willChange: 'transform',
        display: 'inline-block'
      }}
    >
      {children}
    </div>
  );
}
