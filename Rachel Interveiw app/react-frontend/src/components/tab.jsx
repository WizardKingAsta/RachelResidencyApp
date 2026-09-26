import { useState } from "react";

export default function Tab({
  tab,
  isActive,
  onSelect,
  onRename,
  onDelete,
}) {
  const [isEditing, setIsEditing] =
    useState(false);

  const [editText, setEditText] =
    useState(tab.title);

  const saveRename = () => {
    const title = editText.trim();

    if (!title) {
      setEditText(tab.title);
      setIsEditing(false);
      return;
    }

    onRename(
      tab.id,
      title
    );

    setIsEditing(false);
  };

  const cancelRename = () => {
    setEditText(tab.title);
    setIsEditing(false);
  };

  return (
    <div
      className={`tab-button ${
        isActive ? "active" : ""
      }`}
      onClick={() =>
        onSelect(tab.id)
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
            if (
              e.key === "Enter"
            ) {
              saveRename();
            }

            if (
              e.key === "Escape"
            ) {
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
              tab.title
            );

            setIsEditing(true);
          }}
        >
          {tab.title}
        </span>
      )}

      <button
        className="delete-button"
        onClick={(e) => {
          e.stopPropagation();

          onDelete(
            tab.id
          );
        }}
        title="Delete tab"
      >
        ×
      </button>
    </div>
  );
}