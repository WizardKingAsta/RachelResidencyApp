import { useState } from "react";

export default function Card({
  card,
  columnId,
  onRename,
  onDelete,
  onOpen,
  onDragStart,
}) {
  const [isEditing, setIsEditing] =
    useState(false);

  const [editText, setEditText] =
    useState(card.title);

  const saveRename = () => {
    const newTitle = editText.trim();

    if (!newTitle) {
      setEditText(card.title);
      setIsEditing(false);
      return;
    }

    onRename(
      columnId,
      card.id,
      card.title,
      newTitle
    );

    setIsEditing(false);
  };

  const cancelRename = () => {
    setEditText(card.title);
    setIsEditing(false);
  };

  return (
    <div
      className="card"
      draggable={!isEditing}
      onDragStart={(e) =>
        onDragStart(
          e,
          card.id,
          columnId
        )
      }
    >
      {isEditing ? (
        <input
          className="inline-edit"
          autoFocus
          value={editText}
          onChange={(e) =>
            setEditText(
              e.target.value
            )
          }
          onBlur={saveRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              saveRename();
            }

            if (e.key === "Escape") {
              cancelRename();
            }
          }}
          onClick={(e) =>
            e.stopPropagation()
          }
        />
      ) : (
        <span
          onDoubleClick={(e) => {
            e.stopPropagation();

            setEditText(
              card.title
            );

            setIsEditing(true);
          }}
        >
          {card.title}
        </span>
      )}

      <div className="card-actions">
        <button
          className="delete-button"
          onClick={(e) => {
            e.stopPropagation();

            onDelete(
              columnId,
              card.id,
              card.title
            );
          }}
          title="Delete card"
        >
          ×
        </button>

        <button
          className="card-arrow"
          onClick={(e) => {
            e.stopPropagation();

            onOpen(card.id);
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}


