import React, { useState, useRef, useEffect } from 'react';
import { StickyNote } from 'lucide-react';

export default function TimelineNotes({ notes, setNotes, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(notes);
  const textareaRef = useRef(null);

  // Sync local value when notes prop changes (from remote updates)
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(notes);
    }
  }, [notes, isEditing]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleSave = () => {
    setNotes(localValue);
    onSave(localValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(notes);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-bold text-slate-800">Timeline Notes</h2>
        </div>
        {isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full h-32 p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none text-slate-700"
            placeholder="Add notes about this timeline..."
          />
          <p className="text-xs text-slate-400 mt-1">
            Press Ctrl+Enter to save, Escape to cancel
          </p>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="min-h-[80px] p-3 border-2 border-transparent hover:border-slate-200 rounded-lg cursor-text transition"
        >
          {notes ? (
            <p className="text-slate-700 whitespace-pre-wrap">{notes}</p>
          ) : (
            <p className="text-slate-400 italic">Click to add notes about this timeline...</p>
          )}
        </div>
      )}
    </div>
  );
}
