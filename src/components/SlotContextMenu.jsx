// src/components/SlotContextMenu.jsx
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function SlotContextMenu({
  x,
  y,
  onClose,
  onCopy,
  onPaste,
  onEdit,
  onDelete,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleScroll = () => onClose();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    // Small delay so the click that opened the menu doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);

      const extensionRoot = document.getElementById('my-extension-root');
      const scrollBox = extensionRoot?.querySelector('.scrollbox');

      if (scrollBox) scrollBox.addEventListener('scroll', handleScroll);
      if (extensionRoot) extensionRoot.addEventListener('scroll', handleScroll);
      window.addEventListener('scroll', handleScroll);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);

      const extensionRoot = document.getElementById('my-extension-root');
      const scrollBox = extensionRoot?.querySelector('.scrollbox');

      if (scrollBox) scrollBox.removeEventListener('scroll', handleScroll);
      if (extensionRoot) extensionRoot.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [onClose]);

  useEffect(() => {
    // Position at the click point, clamped to stay inside the extension bounds
    if (menuRef.current) {
      const menu = menuRef.current;
      const extensionRoot = document.getElementById('my-extension-root');

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

  const menuItems = [
    { text: 'Copy', action: onCopy },
    { text: 'Paste', action: onPaste },
    { text: 'Edit', action: onEdit },
    { text: 'Delete', action: onDelete, danger: true },
  ];

  const extensionRoot = document.getElementById('my-extension-root');

  const menu = (
    <div
      ref={menuRef}
      className="color-context-menu"
      style={{ position: 'absolute', left: '0px', top: '0px' }}
    >
      {menuItems.map((item, index) => (
        <div
          key={index}
          className={item.danger ? 'danger' : ''}
          onClick={(e) => {
            e.stopPropagation();
            item.action?.(e);
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );

  // Portal into the extension root so the menu escapes the slot's own
  // stacking context / overflow and can overlap everything above it,
  // exactly like ColorContextMenu / PaletteContextMenu.
  return extensionRoot ? createPortal(menu, extensionRoot) : menu;
}