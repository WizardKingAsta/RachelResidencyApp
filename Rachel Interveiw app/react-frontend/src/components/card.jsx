import { useState,useRef } from "react";

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

   const [showTooltip,setShowTooltip,] = useState(false);

   const [strategicInfo,setStrategicInfo,] = useState(null);

   const hoverTimerRef =useRef(null);

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

  //Function to handle hover tool tip for cards
  const handleMouseEnter = () => {
  hoverTimerRef.current =
    setTimeout(
      async () => {
        try {
          /*
            First check this browser's local copy.

            This may actually be newer than
            Firestore if an edit hasn't synced yet.
          */
          const localNotes =
            localStorage.getItem(
              `card-notes-${card.id}`
            );

          if (localNotes) {
            const parsed =
              JSON.parse(
                localNotes
              );

            if (
              parsed.strategicInfo?.trim()
            ) {
              setStrategicInfo(
                parsed.strategicInfo
              );

              setShowTooltip(
                true
              );

              return;
            }
          }


          /*
            If there isn't useful local data,
            get the shared Firestore copy.
          */
          const snapshot =
            await getDoc(
              doc(
                rachel_db,
                "cardNotes",
                card.id
              )
            );


          if (snapshot.exists()) {
            const info =
              snapshot.data()
                ?.notes
                ?.strategicInfo;

            setStrategicInfo(
              info || ""
            );
          } else {
            setStrategicInfo("");
          }


          setShowTooltip(true);

        } catch (error) {
          console.error(
            "Could not load strategic info:",
            error
          );
        }
      },

      1500
    );
};


const handleMouseLeave = () => {
  if (
    hoverTimerRef.current
  ) {
    clearTimeout(
      hoverTimerRef.current
    );
  }

  setShowTooltip(false);
};
  return (
    <div
      className="card"
      onMouseEnter={
    handleMouseEnter
  }
  onMouseLeave={
    handleMouseLeave
  }
      draggable={!isEditing}
      onDragStart={(e) =>
        onDragStart(
          e,
          card.id,
          columnId
        )
      }
    >
        {showTooltip &&
  strategicInfo && (
    <div className="strategic-tooltip">
      {strategicInfo}
    </div>
  )}
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


