import { useState, useEffect } from 'react';
import useDebouncedCallback from '../hooks/useDebouncedCallback.js';

export default function TextContentInput({ value, onChange, className = '', rows = 2, ...props }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const debouncedOnChange = useDebouncedCallback((newValue) => {
    onChange(newValue);
  }, 200);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  return (
    <textarea
      rows={rows}
      value={localValue}
      onChange={handleChange}
      className={`resize-none overflow-y-auto ${className}`}
      {...props}
    />
  );
}
