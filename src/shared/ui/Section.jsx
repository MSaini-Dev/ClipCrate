import React from "react";

/** Settings section card with title + optional description. */
export default function Section({ title, description, children, danger }) {
  return (
    <section className={`cc-section ${danger ? "is-danger" : ""}`}>
      {(title || description) && (
        <header className="cc-section-header">
          {title ? <h4 className="cc-section-title">{title}</h4> : null}
          {description ? <p className="cc-section-desc">{description}</p> : null}
        </header>
      )}
      <div className="cc-section-body">{children}</div>
    </section>
  );
}
