import React from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  children?: React.ReactNode;
  variant?: string;
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDangerous = false,
  inputLabel,
  inputPlaceholder,
  inputValue = '',
  onInputChange,
  children,
  variant,
  isLoading,
}) => {
  const showInput = Boolean(onInputChange);

  return (
    <Transition show={isOpen}>
      <Dialog onClose={onClose} className="relative z-[100]">
        {/* Backdrop */}
        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </TransitionChild>

        {/* Modal positioning */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-xl bg-dds-bg border border-dds-border shadow-2xl transition-all flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-dds-border bg-dds-surface/50">
                <div className="flex items-center gap-3">
                  {isDangerous && (
                    <div className="w-9 h-9 rounded-lg bg-dds-red/10 border border-dds-red/20 flex items-center justify-center shadow-inner">
                      <AlertTriangle size={18} className="text-dds-red" />
                    </div>
                  )}
                  <DialogTitle className="text-base font-semibold text-dds-text-primary">
                    {title}
                  </DialogTitle>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-dds-text-muted hover:text-dds-white hover:bg-dds-surface transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {message && <p className="text-dds-text-secondary text-[13px] leading-relaxed">{message}</p>}
                {children}
                {showInput && (
                  <div className="mt-5">
                    {inputLabel && (
                      <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-2">
                        {inputLabel}
                      </label>
                    )}
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(event) => onInputChange?.(event.target.value)}
                      placeholder={inputPlaceholder}
                      className="w-full bg-dds-surface border border-dds-border rounded-md px-4 py-2.5 text-[13px] text-dds-text-primary placeholder-dds-text-muted focus:outline-none focus:border-dds-primary focus:ring-1 focus:ring-dds-primary/20 transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-5 bg-dds-surface/50 border-t border-dds-border mt-auto">
                <button
                  onClick={onClose}
                  className="btn-secondary"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`
                    px-5 py-2.5 text-[13px] font-medium rounded-md transition-all shadow-sm
                    ${
                      isDangerous
                        ? 'bg-dds-red hover:bg-dds-red/90 text-white shadow-dds-red/20'
                        : 'btn-primary'
                    }
                  `}
                >
                  {confirmLabel}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmModal;
