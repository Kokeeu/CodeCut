import { useState, useEffect } from 'react';
import useDebouncedCallback from '../hooks/useDebouncedCallback.js';

export default function TextContentInput({ value, onChange, ...props }) {
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
    <input
      value={localValue}
      onChange={handleChange}
      {...props}
    />
  );
}
