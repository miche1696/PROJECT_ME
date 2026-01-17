import React from 'react';
import './OperationButton.css';

/**
 * Button for a single text operation
 *
 * @param {Object} props
 * @param {Object} props.operation - Operation definition
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.isActive - Whether this operation is currently running
 * @param {boolean} props.disabled - Whether the button is disabled
 */
const OperationButton = ({ operation, onClick, isActive, disabled }) => {
  return (
    <button
      className={`operation-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={operation.description}
      aria-label={operation.label}
    >
      <span className="operation-icon">{operation.icon}</span>
      <span className="operation-label">{operation.label}</span>
    </button>
  );
};

export default OperationButton;
