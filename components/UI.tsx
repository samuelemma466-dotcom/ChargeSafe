import React from 'react';
import { LucideIcon, X, LayoutGrid, History, Users, UserCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';

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
  onClick,
  ...props 
}) => {
  // Use Settings Context for Sound
  let playSound: any = () => {};
  try {
     const settings = useSettings();
     playSound = settings.playSound;
  } catch(e) {
      // Fallback if used outside provider (e.g. login before auth)
  }

  const baseStyles = "inline-flex items-center justify-center px-6 py-4 border text-[15px] font-bold rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 shadow-lg";
  
  const variants = {
    primary: "border-transparent text-white bg-primary-600 hover:bg-primary-500 shadow-primary-900/50",
    secondary: "border-transparent text-primary-300 bg-slate-800 hover:bg-slate-700",
    outline: "border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white",
    danger: "border-transparent text-white bg-red-600 hover:bg-red-500 shadow-red-900/50",
    ghost: "border-transparent text-slate-400 hover:bg-slate-800 hover:text-white shadow-none"
  };

  const width = fullWidth ? "w-full" : "";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!props.disabled && !isLoading) {
      playSound('click');
    }
    if (onClick) onClick(e);
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${width} ${className}`} 
      disabled={isLoading || props.disabled}
      onClick={handleClick}
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
  <label htmlFor={htmlFor} className="block text-sm font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider text-[11px]">
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
          <Icon className="h-5 w-5 text-slate-500" aria-hidden="true" />
        </div>
      )}
      <input
        className={`block w-full rounded-2xl border bg-slate-900 focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-base py-4 px-4 ${Icon ? 'pl-11' : ''} ${error ? 'border-red-500/50 text-red-200 focus:ring-red-500/20' : 'border-slate-800 text-white'} placeholder-slate-600 transition-all shadow-sm outline-none ${className}`}
        {...props}
      />
    </div>
    {error && <p className="mt-1.5 ml-1 text-sm text-red-400 font-medium">{error}</p>}
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
        className={`block w-full appearance-none rounded-2xl border bg-slate-900 focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-base py-4 px-4 shadow-sm text-white ${error ? 'border-red-500/50 text-red-200' : 'border-slate-800'}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
        </svg>
      </div>
    </div>
    {error && <p className="mt-1.5 ml-1 text-sm text-red-400 font-medium">{error}</p>}
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
    blue: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
    green: 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20',
    gray: 'bg-slate-700/50 text-slate-300 ring-1 ring-slate-600/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20',
    red: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${variants[variant]} ${className}`}>
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
          aria-hidden="true" 
          onClick={onClose}
        ></div>

        {/* Centering trick */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div className="relative inline-block align-bottom bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl text-left overflow-hidden shadow-2xl shadow-black transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-slate-900 px-6 py-5 border-b border-slate-800">
            <div className="flex justify-between items-center">
              <h3 className="text-xl leading-6 font-bold text-white" id="modal-title">
                {title}
              </h3>
              <button 
                onClick={onClose}
                className="bg-slate-800 rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Body */}
          <div className="bg-slate-900 px-6 py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SKELETON LOADER ---
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-800 rounded-xl ${className}`} />
);

// --- BOTTOM NAV ---
export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Use Settings Context for Sound
  let playSound: any = () => {};
  try {
     const settings = useSettings();
     playSound = settings.playSound;
  } catch(e) {}

  const navItems = [
    { id: '/', label: 'Home', icon: LayoutGrid },
    { id: '/history', label: 'History', icon: History },
    { id: '/customers', label: 'People', icon: Users },
    { id: '/profile', label: 'Profile', icon: UserCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 px-6 py-2 flex justify-between items-center z-30 pb-safe transition-colors">
      {navItems.map((item) => {
        const isActive = location.pathname === item.id;
        return (
          <button 
            key={item.id}
            onClick={() => {
                playSound('click');
                navigate(item.id);
            }}
            className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 ${
              isActive ? 'text-primary-500 scale-110' : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-bold mt-1 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};