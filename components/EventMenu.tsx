'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface EventMenuProps {
  event: {
    id: string;
    title: string;
    recurringEventId?: string;
  };
  onEdit: () => void;
  onDelete: () => void;
}

export function EventMenu({ onEdit, onDelete }: EventMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity touch-manipulation"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-8 z-50 w-48 bg-card border border-border rounded-lg shadow-elevated overflow-hidden">
          <div className="py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onEdit();
              }}
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Modify
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onDelete();
              }}
              className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-accent flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

