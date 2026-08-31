import React, { useState, useRef, useEffect } from 'react';
import SlotContextMenu from './SlotContextMenu';
import { Draggable } from 'react-beautiful-dnd';

export default function Slot({ slot, index, onUpdateSlotText, onDeleteSlot, showFeedback, len }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [editedText, setEditedText] = useState(slot?.text || "Empty Clip");
  const [copyBtnText, setCopyBtnText] = useState('Copy');
  const [pasteBtnText, setPasteBtnText] = useState('Paste');
  const textareaRef = useRef(null);
  const slotRef = useRef(null);

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isExpanded]);

  // Keep local edit buffer in sync when parent updates the slot
  // (e.g. after import or AI add) and the user is not currently editing.
  useEffect(() => {
    if (!isExpanded) {
      setEditedText(slot?.text || "Empty Clip");
    }
  }, [slot?.text, isExpanded]);

  const handleCopy = (e) => {
    e?.stopPropagation();
    if (slot?.text) {
      navigator.clipboard.writeText(slot.text)
        .then(() => {
          setCopyBtnText('Copied');
          showFeedback('Copied!', 'success');
          setTimeout(() => setCopyBtnText('Copy'), 1500);
        })
        .catch((err) => {
          console.error("Copy failed:", err);
          showFeedback('Copy failed!', 'error');
          setTimeout(() => setCopyBtnText('Copy'), 1500);
        });
    }
    setIsContextMenuOpen(false);
  };

  const handlePaste = async (e) => {
    e?.stopPropagation();
    try {
      const text = await navigator.clipboard.readText();
      setEditedText(text);
      onUpdateSlotText(index, text);
      setPasteBtnText('Pasted');
      showFeedback('Pasted!', 'success');
      setTimeout(() => {
        setPasteBtnText('Paste');
      }, 500);
    } catch (err) {
      console.error("Paste failed:", err);
      showFeedback('Paste failed!', 'error');
      setTimeout(() => setPasteBtnText('Paste'), 500);
    }
    setIsContextMenuOpen(false);
  };

  const handleToggleExpand = () => {
    if (isExpanded) {
      if (editedText !== slot?.text) {
        onUpdateSlotText(index, editedText);
      }
    }
    setIsExpanded(!isExpanded);
    setIsContextMenuOpen(false);
  };

  const handleDelete = (e) => {
    e?.stopPropagation();
    onDeleteSlot(index);
    setIsContextMenuOpen(false);
  };

  const handleSlotRightClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  };

  const handleTextareaChange = (e) => {
    setEditedText(e.target.value);
  };

  const handleTextareaKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleToggleExpand();
    }
    if (e.key === 'Escape') {
      setEditedText(slot?.text || "Empty Clip");
      setIsExpanded(false);
    }
  };

  return (
    <Draggable draggableId={`slot-${slot.id || index}`} index={index} isDragDisabled={isExpanded}>
      {(provided) => <div
        ref={(element) => {
          slotRef.current = element;
          provided.innerRef(element);
        }}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        id={`text${index === len ? "last" : index}`}
        className={`slot ${isExpanded ? 'editing' : ''}`}
        onContextMenu={handleSlotRightClick}
      >
        <div
          className={`slotpreview ${isExpanded ? 'editing' : ''}`}
          onClick={handleToggleExpand}
        >
          {isExpanded ? (
            <textarea
              ref={textareaRef}
              className="slottextarea"
              value={editedText}
              onChange={handleTextareaChange}
              onKeyDown={handleTextareaKeyDown}
              onBlur={handleToggleExpand}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <>
              {editedText.slice(0, 40)}
              {editedText.length > 40 ? "..." : ""}
            </>
          )}
        </div>
        {isContextMenuOpen && (
          <SlotContextMenu
            x={menuPos.x}
            y={menuPos.y}
            onClose={() => setIsContextMenuOpen(false)}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onEdit={handleToggleExpand}
            onDelete={handleDelete}
          />
        )}
      </div>}
    </Draggable>
  );
}
