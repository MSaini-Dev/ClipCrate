import React from "react";
import Palette from "./Palette";
import { Droppable, Draggable } from "react-beautiful-dnd";

export default function PaletteList({
  palettes,
  onToggleCollapse,
  onDeletePalette,
  onAddColor,
  onReplaceColor,
  onDeleteColor,
  onShowContextMenu,
  onShowPaletteContextMenu,
  showFeedback,
}) {
  return (
    <Droppable droppableId="all-palettes" type="PALETTE">
      {(provided) => (
        <div
          id="palettes-container"
          ref={provided.innerRef}
          {...provided.droppableProps}
        >
          {palettes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">No color palettes yet. Use the eyedropper!</div>
            </div>
          ) : (
            palettes.map((palette, index) => (
              <Draggable key={`palette-${index}`} draggableId={`palette-${index}`} index={index}>
                {(provided) => (
                  <div
                    id="palette-div"
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <Palette
                      palette={palette}
                      index={index}
                      onAddColor={onAddColor}
                      onReplaceColor={onReplaceColor}
                      onDeleteColor={onDeleteColor}
                      onShowContextMenu={onShowContextMenu}
                      onShowPaletteContextMenu={onShowPaletteContextMenu}
                      showFeedback={showFeedback}
                    />
                  </div>
                )}
              </Draggable>
            ))
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}