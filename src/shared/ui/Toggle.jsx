import React from "react";

/** Compact switch control used across Settings. */
export default function Toggle({ checked, onChange, label, disabled, hint }) {
  return (
    <label className={`cc-toggle-row ${disabled ? "is-disabled" : ""}`}>
      <div className="cc-toggle-text">
        <span className="cc-toggle-label">{label}</span>
        {hint ? <span className="cc-toggle-hint">{hint}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`cc-toggle ${checked ? "is-on" : ""}`}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
      >
        <span className="cc-toggle-thumb" />
      </button>
    </label>
  );
}
