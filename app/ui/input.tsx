import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
};

export function Input({ label, hint, error, trailing, className = "", id, ...props }: Props) {
  const inputId = id || `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label className={`ui-field ${error ? "ui-field--error" : ""} ${className}`.trim()} htmlFor={inputId}>
      <span className="ui-field__label">{label}</span>
      <span className="ui-field__control">
        <input id={inputId} aria-invalid={Boolean(error) || undefined} {...props} />
        {trailing && <span className="ui-field__trailing">{trailing}</span>}
      </span>
      {error ? <small className="ui-field__error">{error}</small> : hint ? <small className="ui-field__hint">{hint}</small> : null}
    </label>
  );
}
