import React from "react";

/** Full-width text action button for settings rows. */
export default function ActionButton({
  children,
  onClick,
  disabled,
  variant = "default",
  title,
}) {
  return (
    <button
      type="button"
      className={`cc-action-btn cc-action-btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
