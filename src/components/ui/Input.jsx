import { useId } from 'react';

export function Input({ label, value, onChange, type = 'text', placeholder = '', required = false, className = '', suffix = '', prefix = '', disabled = false, step, list }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-[#65696F]">
          {label}{required && <span className="text-[#DC2626] ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-[#7A7D83] text-sm pointer-events-none">{prefix}</span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          step={step}
          list={list}
          className={`w-full bg-white border border-[#DCDAD2] rounded-lg text-sm text-[#1A1B1E] placeholder-[#AEB0B4]
            focus:outline-none focus:border-[#16284A] focus:ring-2 focus:ring-[#16284A]/10 transition-all
            disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-[#F6F6F4] num
            ${prefix ? 'pl-8' : 'pl-3'} ${suffix ? 'pr-12' : 'pr-3'} py-2.5`}
        />
        {suffix && (
          <span className="absolute right-3 text-[#7A7D83] text-xs pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
}

export function Select({ label, value, onChange, options = [], required = false, className = '', placeholder = 'Velg...' }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-[#65696F]">
          {label}{required && <span className="text-[#DC2626] ml-1">*</span>}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-white border border-[#DCDAD2] rounded-lg text-sm text-[#1A1B1E]
          focus:outline-none focus:border-[#16284A] focus:ring-2 focus:ring-[#16284A]/10 transition-all px-3 py-2.5 cursor-pointer"
      >
        <option value="" className="bg-white text-[#65696F]">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white">{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Textarea({ label, value, onChange, placeholder = '', required = false, className = '', rows = 3 }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-[#65696F]">
          {label}{required && <span className="text-[#DC2626] ml-1">*</span>}
        </label>
      )}
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className="w-full bg-white border border-[#DCDAD2] rounded-lg text-sm text-[#1A1B1E] placeholder-[#AEB0B4]
          focus:outline-none focus:border-[#16284A] focus:ring-2 focus:ring-[#16284A]/10 transition-all px-3 py-2.5 resize-none"
      />
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
        <div className={`w-10 h-5.5 rounded-full transition-colors duration-200 ${checked ? 'bg-[#15803D]' : 'bg-[#C7C6BD]'}`} />
        <div className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm ring-1 ring-black/[0.06] transition-transform duration-200 ${checked ? 'translate-x-[18px]' : 'translate-x-0'}`} />
      </div>
      {label && <span className="text-sm text-[#4B4E54] group-hover:text-[#1A1B1E] transition-colors">{label}</span>}
    </label>
  );
}
