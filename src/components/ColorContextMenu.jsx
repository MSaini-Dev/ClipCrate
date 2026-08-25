// src/components/ColorContextMenu.jsx
import React, { useEffect, useRef } from 'react';

// Utility function to convert hex to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Utility function to copy text to clipboard
const copyToClipboard = (text, showFeedback) => {
  navigator.clipboard.writeText(text).then(() => {
    showFeedback('Copied!', 'success');
  }).catch(err => {
    // Fallback for older browsers
    try {
      document.execCommand('copy');
      showFeedback('Copied!', 'success');
    } catch (fallbackErr) {
      console.error('Copy failed:', err);
      showFeedback('Copy failed!', 'error');
    }
  });
};

export default function ColorContextMenu({ x, y, color, paletteIndex, colorIndex, onClose, onColorDelete, showFeedback }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Add a small delay before adding the listeners to avoid immediate closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      
      // Add scroll listeners to the extension container and window
      const extensionRoot = document.getElementById('my-extension-root');
      const scrollBox = extensionRoot?.querySelector('.scrollbox');
      
      if (scrollBox) {
        scrollBox.addEventListener('scroll', handleScroll);
      }
      if (extensionRoot) {
        extensionRoot.addEventListener('scroll', handleScroll);
      }
      // Also listen for window scroll in case the page scrolls
      window.addEventListener('scroll', handleScroll);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      
      // Clean up scroll listeners
      const extensionRoot = document.getElementById('my-extension-root');
      const scrollBox = extensionRoot?.querySelector('.scrollbox');
      
      if (scrollBox) {
        scrollBox.removeEventListener('scroll', handleScroll);
      }
      if (extensionRoot) {
        extensionRoot.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [onClose]);

  useEffect(() => {
    // Position the menu and ensure it stays within bounds
    if (menuRef.current) {
      const menu = menuRef.current;
      const extensionRoot = document.getElementById('my-extension-root');
      
      if (extensionRoot) {
        const rootRect = extensionRoot.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        
        // Calculate position relative to the extension container
        let menuX = x - rootRect.left;
        let menuY = y - rootRect.top;
        
        // Ensure menu doesn't go outside the extension bounds
        if (menuX + menuRect.width > extensionRoot.offsetWidth) {
          menuX = extensionRoot.offsetWidth - menuRect.width - 10;
        }
        if (menuY + menuRect.height > extensionRoot.offsetHeight) {
          menuY = extensionRoot.offsetHeight - menuRect.height - 10;
        }
        
        // Ensure minimum distance from edges
        menuX = Math.max(10, menuX);
        menuY = Math.max(10, menuY);
        
        menu.style.left = `${menuX}px`;
        menu.style.top = `${menuY}px`;
      }
    }
  }, [x, y]);

  const rgb = hexToRgb(color);
  const rgbString = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : color;

  const menuItems = [
    { text: 'Copy HEX', action: () => copyToClipboard(color.toUpperCase(), showFeedback) },
    { text: 'Copy RGB', action: () => copyToClipboard(rgbString, showFeedback) },
    {
      text: 'Delete',
      action: () => onColorDelete(paletteIndex, colorIndex),
      danger: true
    }
  ];

  return (
    <div
      ref={menuRef}
      className="color-context-menu"
      style={{ 
        position: 'absolute', // Changed from fixed to absolute
        left: '0px', // Will be set by useEffect
        top: '0px'   // Will be set by useEffect
      }}
    >
      {menuItems.map((item, index) => (
        <div
          key={index}
          className={item.danger ? 'danger' : ''}
          onClick={() => {
            item.action();
            onClose();
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}