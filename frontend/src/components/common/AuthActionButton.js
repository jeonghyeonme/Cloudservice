import React from 'react';
import './AuthActionButton.css';

function AuthActionButton({
  children,
  onClick,
  variant = 'ghost',
  type = 'button',
  className = '',
  ...props
}) {
  const classes = ['auth-action-button', `auth-action-button--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} onClick={onClick} {...props}>
      <span className="auth-action-button__label">{children}</span>
    </button>
  );
}

export default AuthActionButton;
