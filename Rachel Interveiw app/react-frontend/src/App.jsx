import { useEffect, useState } from "react";
import "./App.css";

const initialColumns = [
  {
    id: "todo",
    title: "Programs Applied To",
    cards: [],
  }];

function CardPage({ cardTitle }) {
  const storageKey = `card-notes-${cardTitle}`;

  const [notes, setNotes] = useState(() => {
    const savedNotes = localStorage.getItem(storageKey);

    return savedNotes
      ? JSON.parse(savedNotes)
      : {
          interviews: "",
          fit: "",
          pdQuestions: "",
          residentQuestions: "",
        };
  });

  const handleChange = (field, value) => {
    const updatedNotes = {
      ...notes,
      [field]: value,
    };

    setNotes(updatedNotes);

    localStorage.setItem(
      storageKey,
      JSON.stringify(updatedNotes)
    ); // IMPORTANT: saves all 4 boxes uniquely for this card
  };

  return (
    <div className="card-page">
      <h1>{cardTitle}</h1>
      <button
        onClick={() => {
          window.location.hash = "";
          window.location.reload();
        }}
      >
        ← Back
      </button>

      <div className="card-sections">
  <div className="card-section">
    <h2>Info on the Program</h2>
    <textarea
      placeholder="Notes about interviews..."
      value={notes.interviews}
      onChange={(e) =>
        handleChange("interviews", e.target.value)
      }
    />
  </div>

  <div className="card-section">
    <h2>How I Fit In</h2>
    <textarea
      placeholder="How do I fit into this program?"
      value={notes.fit}
      onChange={(e) =>
        handleChange("fit", e.target.value)
      }
    />
  </div>

  <div className="card-section">
    <h2>Questions for PDs</h2>
    <textarea
      placeholder="Questions for program directors..."
      value={notes.pdQuestions}
      onChange={(e) =>
        handleChange("pdQuestions", e.target.value)
      }
    />
  </div>

  <div className="card-section">
    <strong><h2>Questions for Residents</h2></strong>
    <textarea
      placeholder="Questions for residents..."
      value={notes.residentQuestions}
      onChange={(e) =>
        handleChange("residentQuestions", e.target.value)
      }
    />
  </div>
</div>
    </div>
  );
}

export default function App() {
  const [columns, setColumns] = useState(() => {
  const savedColumns = localStorage.getItem("columns");

  return savedColumns
    ? JSON.parse(savedColumns)
    : initialColumns; // IMPORTANT: falls back to default board
});

useEffect(() => {
  localStorage.setItem(
    "columns",
    JSON.stringify(columns)
  );
}, [columns]);
  const [newCardTitles, setNewCardTitles] = useState({});
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // NEW: check whether URL is pointing at a card
  const hash = window.location.hash;

  if (hash.startsWith("#card/")) {
    const cardTitle = decodeURIComponent(
  window.location.hash.replace("#card/", "")
);

    return <CardPage cardTitle={cardTitle} />;
  }

  // NEW: go to the card's own page
  const goToCard = (cardTitle) => {
    window.location.hash = `card/${cardTitle}`; // IMPORTANT: each card gets a unique URL
    window.location.reload();
  };

  const addCard = (columnId) => {
    const title = newCardTitles[columnId]?.trim();

    if (!title) return;

    setColumns((prev) =>
      prev.map((column) =>
        column.id === columnId
          ? {
              ...column,
              cards: [
                ...column.cards,
                {
                  id: crypto.randomUUID(),
                  title,
                },
              ],
            }
          : column
      )
    );

    setNewCardTitles((prev) => ({
      ...prev,
      [columnId]: "",
    }));
  };

  const addColumn = () => {
    const title = newColumnTitle.trim();

    if (!title) return;

    const newColumn = {
      id: crypto.randomUUID(),
      title,
      cards: [],
    };

    setColumns((prev) => [...prev, newColumn]);
    setNewColumnTitle("");
  };

  const handleDragStart = (e, cardId, sourceColumnId) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        cardId,
        sourceColumnId,
      })
    );
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();

    const dragData = e.dataTransfer.getData("application/json");

    if (!dragData) return;

    const { cardId, sourceColumnId } = JSON.parse(dragData);

    if (sourceColumnId === targetColumnId) return;

    setColumns((prev) => {
      const sourceColumn = prev.find(
        (column) => column.id === sourceColumnId
      );

      const card = sourceColumn?.cards.find(
        (card) => card.id === cardId
      );

      if (!card) return prev;

      return prev.map((column) => {
        if (column.id === sourceColumnId) {
          return {
            ...column,
            cards: column.cards.filter(
              (card) => card.id !== cardId
            ),
          };
        }

        if (column.id === targetColumnId) {
          return {
            ...column,
            cards: [...column.cards, card],
          };
        }

        return column;
      });
    });
  };

  return (
    <div className="app">
      <header>
        <h1>Dr. Rachel Pilanias Board</h1>

        <div className="add-column">
          <input
            type="text"
            placeholder="New column..."
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addColumn();
              }
            }}
          />

          <button onClick={addColumn}>
            + Add Column
          </button>
        </div>
      </header>

      <main className="board-wrapper">
        <div className="board">
          {columns.map((column) => (
            <section
              key={column.id}
              className="column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="column-header">
                <h2>{column.title}</h2>
                <span>{column.cards.length}</span>
              </div>

              <div className="cards">
                {column.cards.map((card) => (
                  <div
                    key={card.id}
                    className="card"
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(
                        e,
                        card.id,
                        column.id
                      )
                    }
                  >
                    <span>{card.title}</span>

                    <button
                      className="card-arrow"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToCard(card.title); // IMPORTANT: opens this card's unique page
                      }}
                    >
                      →
                    </button>
                  </div>
                ))}
              </div>

              <div className="add-card">
                <input
                  type="text"
                  placeholder="Add a card..."
                  value={newCardTitles[column.id] || ""}
                  onChange={(e) =>
                    setNewCardTitles((prev) => ({
                      ...prev,
                      [column.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addCard(column.id);
                    }
                  }}
                />

                <button
                  onClick={() => addCard(column.id)}
                >
                  Add
                </button>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}