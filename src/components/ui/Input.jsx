import { useId } from 'react';

const fieldBase =
  'w-full bg-surface-2 border-[1.5px] border-line-input rounded-xl text-sm font-bold text-ink placeholder:font-medium placeholder:text-faint ' +
  'focus:outline-none focus:border-brand focus:bg-surface transition-all ' +
  'disabled:opacity-50 disabled:cursor-not-allowed num';

export function Input({ label, value, onChange, type = 'text', placeholder = '', required = false, className = '', suffix = '', prefix = '', disabled = false, step, list, name, autoComplete }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-[12.5px] font-bold text-muted">
          {label}{required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3.5 text-muted-2 text-sm font-semibold pointer-events-none">{prefix}</span>
        )}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          step={step}
          list={list}
          autoComplete={autoComplete}
          className={`${fieldBase} ${prefix ? 'pl-9' : 'pl-3.5'} ${suffix ? 'pr-12' : 'pr-3.5'} py-[11px]`}
        />
        {suffix && (
          <span className="absolute right-3.5 text-muted-2 text-xs font-semibold pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
}

export function Select({ label, value, onChange, options = [], required = false, className = '', placeholder = 'Velg...', name }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-[12.5px] font-bold text-muted">
          {label}{required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={`${fieldBase} px-3.5 py-[11px] cursor-pointer`}
      >
        <option value="" className="bg-surface text-muted">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface">{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Textarea({ label, value, onChange, placeholder = '', required = false, className = '', rows = 3, name }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-[12.5px] font-bold text-muted">
          {label}{required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className={`${fieldBase} px-3.5 py-[11px] resize-none leading-relaxed`}
      />
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
        <div className={`w-10 h-[22px] rounded-full transition-colors duration-200 ${checked ? 'bg-brand' : 'bg-[#D7D1C3]'}`} />
        <div className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow-sm ring-1 ring-black/[0.06] transition-transform duration-200 ${checked ? 'translate-x-[18px]' : 'translate-x-0'}`} />
      </div>
      {label && <span className="text-sm font-semibold text-muted group-hover:text-ink transition-colors">{label}</span>}
    </label>
  );
}
