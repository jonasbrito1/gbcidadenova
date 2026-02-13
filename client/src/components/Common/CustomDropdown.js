import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

const CustomDropdown = ({ trigger, children, isOpen, onClose }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 2,
        left: rect.right - 200
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && triggerRef.current && !triggerRef.current.contains(e.target)) {
        const dropdown = document.getElementById('custom-dropdown-portal');
        if (dropdown && !dropdown.contains(e.target)) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const dropdownMenu = isOpen ? (
    <div
      id="custom-dropdown-portal"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 10000,
        minWidth: '200px',
        backgroundColor: 'white',
        border: '2px solid #dc3545',
        borderRadius: '0.375rem',
        boxShadow: '0 0.5rem 1rem rgba(0,0,0,0.3)',
        display: 'block'
      }}
    >
      {children}
    </div>
  ) : null;

  return (
    <>
      <span ref={triggerRef}>{trigger}</span>
      {dropdownMenu && ReactDOM.createPortal(dropdownMenu, document.body)}
    </>
  );
};

export default CustomDropdown;
