import React, { useEffect, useRef, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';

export interface InlineEditableTextProps {
  id?: string;
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  className?: string;
  textClassName?: string;
  inputClassName?: string;
  showPencil?: boolean;
  showPencilOnHover?: boolean;
  alwaysShowPencil?: boolean;
  multiline?: boolean;
  allowEmpty?: boolean;
  title?: string;
  ariaLabel?: string;
  as?: 'span' | 'div';
}

export const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  id,
  value,
  onSave,
  placeholder = 'Enter text...',
  className = '',
  textClassName = '',
  inputClassName = '',
  showPencil = true,
  showPencilOnHover,
  alwaysShowPencil = false,
  multiline = false,
  allowEmpty = false,
  title = 'Double-click or click pencil to edit inline',
  ariaLabel,
  as = 'span',
}) => {
  const effectiveShowPencil =
    typeof showPencilOnHover === 'boolean' ? showPencilOnHover : showPencil;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitSave = () => {
    const trimmed = draft.trim();
    if (!allowEmpty && !trimmed) {
      setDraft(value);
      setIsEditing(false);
      return;
    }
    if (trimmed !== value) {
      onSave(trimmed);
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setDraft(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <span
        className={`inline-flex items-center gap-1 max-w-full ${className}`}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {multiline ? (
          <textarea
            ref={(el) => {
              inputRef.current = el;
            }}
            value={draft}
            rows={2}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitSave}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitSave();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
              }
            }}
            className={`px-2 py-1 rounded border border-teal-500/60 bg-slate-950/95 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400 min-w-[140px] w-full ${inputClassName}`}
          />
        ) : (
          <input
            ref={(el) => {
              inputRef.current = el;
            }}
            type="text"
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitSave}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                commitSave();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
              }
            }}
            className={`px-2 py-0.5 rounded border border-teal-500/60 bg-slate-950/95 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400 min-w-[120px] ${inputClassName}`}
          />
        )}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            commitSave();
          }}
          title="Save (Enter)"
          className="p-1 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 transition shrink-0"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            cancelEdit();
          }}
          title="Cancel (Esc)"
          className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  }

  const WrapperTag = as;

  return (
    <WrapperTag
      id={id}
      aria-label={ariaLabel}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(value);
        setIsEditing(true);
      }}
      title={title}
      className={`group/inline inline-flex items-center gap-1.5 cursor-text rounded transition-colors hover:bg-slate-800/40 px-0.5 -mx-0.5 ${className}`}
    >
      <span className={textClassName}>{value || placeholder}</span>
      {effectiveShowPencil && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDraft(value);
            setIsEditing(true);
          }}
          title="Edit inline"
          className={`${
            alwaysShowPencil
              ? 'opacity-80 hover:opacity-100'
              : 'opacity-40 group-hover/inline:opacity-100 focus:opacity-100'
          } p-0.5 rounded text-slate-400 hover:text-teal-300 hover:bg-slate-800/80 transition shrink-0`}
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}
    </WrapperTag>
  );
};
