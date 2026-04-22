import React, { useEffect, useRef } from "react";
import "./ContextMenu.css";

function ContextMenu({ open, position, title, items = [], onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        top: position?.y ?? 0,
        left: position?.x ?? 0,
      }}
      role="menu"
    >
      {title ? <div className="context-menu__title">{title}</div> : null}
      {title ? <div className="context-menu__divider" /> : null}
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`context-menu__item ${item.danger ? "context-menu__item--danger" : ""}`}
          onClick={() => {
            item.onClick?.();
            onClose();
          }}
          role="menuitem"
        >
          {item.icon ? (
            <span className="context-menu__icon" aria-hidden="true">
              {item.icon}
            </span>
          ) : null}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default ContextMenu;
