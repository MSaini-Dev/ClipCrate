import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Plus } from "lucide-react";

export default function Palette({
  palette,
  index,
  onAddColor,
  onReplaceColor,
  onShowContextMenu,
  onShowPaletteContextMenu,
}) {
  const handlePaletteRightClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onShowPaletteContextMenu(e, index);
  };

  return (
    <div
      className="color-history-cover"
      onContextMenu={handlePaletteRightClick}
    >
      <Droppable droppableId={`colors-${index}`} type={`COLOR-${index}`} direction="horizontal">
        {(provided) => (
          <div
            className="color-history"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {palette.colors.length === 0 ? (
              <div className="empty-state-text">No colors yet</div>
            ) : (
              palette.colors.map((color, colorIndex) => (
                <Draggable
                  key={`${index}-${colorIndex}`}
                  draggableId={`color-${index}-${colorIndex}`}
                  index={colorIndex}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="color-box"
                      style={{
                        backgroundColor: color,
                        ...provided.draggableProps.style,
                      }}
                      title={color}
                      onClick={() => onReplaceColor(index, colorIndex)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onShowContextMenu(e, color, index, colorIndex);
                      }}
                    />
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
            <button
              className="add-color-btn"
              onClick={() => onAddColor(index)}
            >
              <Plus />
            </button>
          </div>
        )}
      </Droppable>
    </div>
  );
}
