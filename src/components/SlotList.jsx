// Folder: src/components/SlotList.jsx
import React from "react";
import Slot from "./Slot";
import { Droppable } from "react-beautiful-dnd";

export default function SlotList({ slots, onUpdateSlotText, onDeleteSlot, showFeedback }) {
  return (
    <Droppable droppableId="all-slots" type="SLOT">
      {(provided) => (
        <div id="slotscontainer" ref={provided.innerRef} {...provided.droppableProps}>
          {slots.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">No clips saved yet</div>
            </div>
          ) : (
            slots.map((slot, index) => (
              <Slot
                key={slot.id || slot.timestamp || index}
                slot={slot}
                index={index}
                onUpdateSlotText={onUpdateSlotText}
                onDeleteSlot={onDeleteSlot}
                showFeedback={showFeedback}
                len={slots.length - 1}
              />
            ))
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
