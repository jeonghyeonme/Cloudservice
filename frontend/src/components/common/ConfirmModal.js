import React, { useState } from "react";
import "./ConfirmModal.css";

function ConfirmModal({
  open,
  title = "정말로 삭제하시겠습니까?",
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  onConfirm,
  onCancel,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) {
    return null;
  }

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      onCancel?.();
    }
  };

  return (
    <div className="confirm-modal__overlay" onClick={handleOverlayClick}>
      <div className="confirm-modal">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}

        <div className="confirm-modal__actions">
          <button
            type="button"
            className="confirm-modal__button confirm-modal__button--ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="confirm-modal__button confirm-modal__button--danger"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
