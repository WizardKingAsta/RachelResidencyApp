import { useState } from "react";

import Card from "./card.jsx";

export default function Column({
  column,
  newCardTitle,
  onNewCardTitleChange,
  onAddCard,
  onRenameColumn,
  onDeleteColumn,
  onRenameCard,
  onDeleteCard,
  onOpenCard,
  onDragStart,
  onDrop,
}) {
  const [isEditing, setIsEditing] =
    useState(false);

  const [editText, setEditText] =
    useState(column.title);

  const saveRename = () => {
    const title = editText.trim();

    if (!title) {
      setEditText(column.title);
      setIsEditing(false);
      return;
    }

    onRenameColumn(
      column.id,
      title
    );

    setIsEditing(false);
  };

  const cancelRename = () => {
    setEditText(column.title);
    setIsEditing(false);
  };

  return (
    <section
      className="column"
      onDragOver={(e) =>
        e.preventDefault()
      }
      onDrop={(e) =>
        onDrop(
          e,
          column.id
        )
      }
    >
      <div className="column-header">
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
          />
        ) : (
          <h2
            onDoubleClick={() => {
              setEditText(
                column.title
              );

              setIsEditing(true);
            }}
          >
            {column.title}
          </h2>
        )}

        <div className="column-header-actions">
          <span>
            {column.cards.length}
          </span>

          <button
            className="delete-button"
            onClick={() =>
              onDeleteColumn(
                column.id
              )
            }
            title="Delete column"
          >
            ×
          </button>
        </div>
      </div>

      <div className="cards">
        {column.cards.map(
          (card) => (
            <Card
              key={card.id}
              card={card}
              columnId={
                column.id
              }
              onRename={
                onRenameCard
              }
              onDelete={
                onDeleteCard
              }
              onOpen={
                onOpenCard
              }
              onDragStart={
                onDragStart
              }
            />
          )
        )}
      </div>

      <div className="add-card">
        <input
          type="text"
          placeholder="Add a card..."
          value={newCardTitle}
          onChange={(e) =>
            onNewCardTitleChange(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter"
            ) {
              onAddCard(
                column.id
              );
            }
          }}
        />

        <button
          onClick={() =>
            onAddCard(
              column.id
            )
          }
        >
          Add
        </button>
      </div>
    </section>
  );
}