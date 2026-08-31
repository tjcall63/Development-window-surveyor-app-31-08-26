import { useState, useEffect, useRef } from 'react';
import { NumberInput } from '@/components/ui';
import { num } from '@/lib/calc';

export function EditableNumber({
  value,
  onChange,
  placeholder,
  className,
  onSave,
}: {
  value: number | null | undefined;
  onChange: (n: number | null) => void;
  placeholder?: string;
  className?: string;
  onSave?: (n: number | null) => void;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const [focused, setFocused] = useState(false);
  const lastExternal = useRef(value);

  useEffect(() => {
    if (!focused) {
      const next = value == null ? '' : String(value);
      setText(next);
      lastExternal.current = value;
    }
  }, [value, focused]);

  function handleBlur() {
    setFocused(false);
    const parsed = num(text);
    if (onSave) {
      onSave(parsed);
    } else {
      onChange(parsed);
    }
    const next = parsed == null ? '' : String(parsed);
    setText(next);
  }

  function handleFocus() {
    setFocused(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value);
    const parsed = num(e.target.value);
    onChange(parsed);
  }

  return (
    <NumberInput
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      className={className}
    />
  );
}
