// src/components/PaletteContextMenu.jsx
import React, { useEffect, useRef } from "react";

export default function PaletteContextMenu({ x, y, paletteIndex, onClose, onPaletteDelete }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleScroll = () => onClose();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);

      const extensionRoot = document.getElementById("my-extension-root");
      const scrollBox = extensionRoot?.querySelector(".scrollbox");

      if (scrollBox) scrollBox.addEventListener("scroll", handleScroll);
      if (extensionRoot) extensionRoot.addEventListener("scroll", handleScroll);
      window.addEventListener("scroll", handleScroll);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);

      const extensionRoot = document.getElementById("my-extension-root");
      const scrollBox = extensionRoot?.querySelector(".scrollbox");

      if (scrollBox) scrollBox.removeEventListener("scroll", handleScroll);
      if (extensionRoot) extensionRoot.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [onClose]);

  useEffect(() => {
    // Position the menu at the click point, clamped to stay within the
    // extension bounds. Same approach as ColorContextMenu, since this
    // menu is rendered in the same place in the tree (a direct child of
    // .scrollbox, not nested inside anything positioned).
    if (menuRef.current) {
      const menu = menuRef.current;
      const extensionRoot = document.getElementById("my-extension-root");

      if (extensionRoot) {
        const rootRect = extensionRoot.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();

        let menuX = x - rootRect.left;
        let menuY = y - rootRect.top;

        if (menuX + menuRect.width > extensionRoot.offsetWidth) {
          menuX = extensionRoot.offsetWidth - menuRect.width - 10;
        }
        if (menuY + menuRect.height > extensionRoot.offsetHeight) {
          menuY = extensionRoot.offsetHeight - menuRect.height - 10;
        }

        menuX = Math.max(10, menuX);
        menuY = Math.max(10, menuY);

        menu.style.left = `${menuX}px`;
        menu.style.top = `${menuY}px`;
      }
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="color-context-menu"
      style={{ position: "absolute", left: "0px", top: "0px" }}
    >
      <div
        className="danger"
        onClick={() => {
          onPaletteDelete(paletteIndex);
          onClose();
        }}
      >
        Delete Palette
      </div>
    </div>
  );
}
