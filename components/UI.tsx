import React from 'react';
import { LucideIcon, X } from 'lucide-react';

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  fullWidth?: boolean;
  icon?: LucideIcon;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  icon: Icon,
  isLoading,
  ...props 
}) => {
  // Increased py-3.5 to py-4 for larger touch target
  const baseStyles = "inline-flex items-center justify-center px-6 py-4 border text-[15px] font-semibold rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm";
  
  const variants = {
    primary: "border-transparent text-white bg-primary-600 hover:bg-primary-700 shadow-primary-600/20 shadow-lg",
    secondary: "border-transparent text-primary-700 bg-primary-100 hover:bg-primary-200",
    outline: "border-gray-200 text-gray-700 bg-white hover:bg-gray-50",
    danger: "border-transparent text-white bg-red-600 hover:bg-red-700 shadow-red-600/20 shadow-lg",
    ghost: "border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 shadow-none"
  };

  const width = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${width} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon ? (
        <Icon className="mr-2.5 -ml-1 h-5 w-5" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
};

// --- LABEL ---
interface LabelProps {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({ htmlFor, children, required }) => (
  <label htmlFor={htmlFor} className="block text-sm font-bold text-gray-700 mb-2 ml-1">
    {children} {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
}

export const Input: React.FC<InputProps> = ({ label, error, icon: Icon, className = '', ...props }) => (
  <div className={label ? "mb-6" : "mb-0"}>
    {label && <Label htmlFor={props.id || props.name || ''} required={props.required}>{label}</Label>}
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
      )}
      <input
        className={`block w-full rounded-2xl border-gray-200 focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-base py-4 px-4 ${Icon ? 'pl-11' : ''} ${error ? 'border-red-300 text-red-900 focus:ring-red-200 focus:border-red-500' : 'border border-gray-200'} placeholder-gray-400 transition-all shadow-sm ${className}`}
        {...props}
      />
    </div>
    {error && <p className="mt-1.5 ml-1 text-sm text-red-600 font-medium">{error}</p>}
  </div>
);

// --- SELECT ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, ...props }) => (
  <div className="mb-6">
    <Label htmlFor={props.id || props.name || ''} required={props.required}>{label}</Label>
    <div className="relative">
      <select
        className={`block w-full appearance-none rounded-2xl border-gray-200 focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-base py-4 px-4 bg-white shadow-sm ${error ? 'border-red-300 text-red-900' : 'border border-gray-200'}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
        </svg>
      </div>
    </div>
    {error && <p className="mt-1.5 ml-1 text-sm text-red-600 font-medium">{error}</p>}
  </div>
);

// --- BADGE ---
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'gray' | 'yellow' | 'red';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray', className = '' }) => {
  const variants = {
    blue: 'bg-blue-100 text-blue-700 ring-1 ring-blue-700/10',
    green: 'bg-green-100 text-green-700 ring-1 ring-green-700/10',
    gray: 'bg-gray-100 text-gray-600 ring-1 ring-gray-600/10',
    yellow: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-700/10',
    red: 'bg-red-100 text-red-700 ring-1 ring-red-700/10',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
          aria-hidden="true" 
          onClick={onClose}
        ></div>

        {/* Centering trick */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div className="relative inline-block align-bottom bg-white rounded-t-3xl sm:rounded-3xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-white px-6 py-5 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                {title}
              </h3>
              <button 
                onClick={onClose}
                className="bg-gray-50 rounded-full p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Body */}
          <div className="bg-white px-6 py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};