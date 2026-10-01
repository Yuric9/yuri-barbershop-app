import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type FieldProps = { label: string; hint?: ReactNode; className?: string };

function Wrapper({ id, label, hint, className = "", children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small className="field__hint">{hint}</small>}
    </div>
  );
}

export function TextField({ label, hint, className, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} className={className}>
      <input id={id} {...props} />
    </Wrapper>
  );
}

export function SelectField({ label, hint, className, children, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} className={className}>
      <select id={id} {...props}>
        {children}
      </select>
    </Wrapper>
  );
}

export function TextAreaField({ label, hint, className, ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} className={className}>
      <textarea id={id} rows={3} {...props} />
    </Wrapper>
  );
}

export function CheckboxField({ label, className = "", ...props }: { label: ReactNode; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`checkbox ${className}`.trim()}>
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
