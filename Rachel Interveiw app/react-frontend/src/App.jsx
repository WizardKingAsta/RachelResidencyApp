import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";
import "./App.css";

const initialTabs = [
];

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
    );
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
              handleChange(
                "interviews",
                e.target.value
              )
            }
          />
        </div>

        <div className="card-section">
          <h2>How I Fit In</h2>

          <textarea
            placeholder="How do I fit into this program?"
            value={notes.fit}
            onChange={(e) =>
              handleChange(
                "fit",
                e.target.value
              )
            }
          />
        </div>

        <div className="card-section">
          <h2>Questions for PDs</h2>

          <textarea
            placeholder="Questions for program directors..."
            value={notes.pdQuestions}
            onChange={(e) =>
              handleChange(
                "pdQuestions",
                e.target.value
              )
            }
          />
        </div>

        <div className="card-section">
          <h2>Questions for Residents</h2>

          <textarea
            placeholder="Questions for residents..."
            value={notes.residentQuestions}
            onChange={(e) =>
              handleChange(
                "residentQuestions",
                e.target.value
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tabs, setTabs] = useState(() => {
    const savedTabs =
      localStorage.getItem("tabs");

    if (savedTabs) {
      return JSON.parse(savedTabs);
    }

    /*
      IMPORTANT:
      This keeps your OLD saved columns instead
      of throwing them away when upgrading to tabs.
    */
    const oldColumns =
      localStorage.getItem("columns");

    if (oldColumns) {
      return [
        {
          id: "main",
          title: "Residency Programs",
          columns: JSON.parse(oldColumns),
        },
      ];
    }

    return initialTabs;
  });

  const [activeTabId, setActiveTabId] =
    useState(() => {
      return (
        localStorage.getItem("activeTabId") ||
        "main"
      );
    });

  const [newCardTitles, setNewCardTitles] =
    useState({});

  const [newColumnTitle, setNewColumnTitle] =
    useState("");

  const [newTabTitle, setNewTabTitle] =
    useState("");

  useEffect(() => {
    localStorage.setItem(
      "tabs",
      JSON.stringify(tabs)
    );
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem(
      "activeTabId",
      activeTabId
    );
  }, [activeTabId]);

  const activeTab = tabs.find(
    (tab) => tab.id === activeTabId
  );

  // Check whether URL is pointing at a card
  const hash = window.location.hash;

  if (hash.startsWith("#card/")) {
    const cardTitle = decodeURIComponent(
      window.location.hash.replace(
        "#card/",
        ""
      )
    );

    return (
      <CardPage cardTitle={cardTitle} />
    );
  }

  const goToCard = (cardTitle) => {
    window.location.hash =
      `card/${encodeURIComponent(cardTitle)}`;

    window.location.reload();
  };

  const addTab = () => {
    const title = newTabTitle.trim();

    if (!title) return;

    const newTab = {
      id: crypto.randomUUID(),
      title,
      columns: [
        {
          id: crypto.randomUUID(),
          title: "Programs Applied To",
          cards: [],
        },
      ],
    };

    setTabs((prev) => [
      ...prev,
      newTab,
    ]);

    setActiveTabId(newTab.id);
    setNewTabTitle("");
  };

  const addColumn = () => {
    const title =
      newColumnTitle.trim();

    if (!title) return;

    const newColumn = {
      id: crypto.randomUUID(),
      title,
      cards: [],
    };

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              columns: [
                ...tab.columns,
                newColumn,
              ],
            }
          : tab
      )
    ); // IMPORTANT: adds column only to active tab

    setNewColumnTitle("");
  };

  const addCard = (columnId) => {
    const title =
      newCardTitles[columnId]?.trim();

    if (!title) return;

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              columns: tab.columns.map(
                (column) =>
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
              ),
            }
          : tab
      )
    ); // IMPORTANT: adds card only inside active tab

    setNewCardTitles((prev) => ({
      ...prev,
      [columnId]: "",
    }));
  };

  const handleDragStart = (
    e,
    cardId,
    sourceColumnId
  ) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        cardId,
        sourceColumnId,
      })
    );
  };

  const handleDrop = (
    e,
    targetColumnId
  ) => {
    e.preventDefault();

    const dragData =
      e.dataTransfer.getData(
        "application/json"
      );

    if (!dragData) return;

    const {
      cardId,
      sourceColumnId,
    } = JSON.parse(dragData);

    if (
      sourceColumnId ===
      targetColumnId
    ) {
      return;
    }

    setTabs((prev) =>
      prev.map((tab) => {
        if (
          tab.id !== activeTabId
        ) {
          return tab;
        }

        const sourceColumn =
          tab.columns.find(
            (column) =>
              column.id ===
              sourceColumnId
          );

        const card =
          sourceColumn?.cards.find(
            (card) =>
              card.id === cardId
          );

        if (!card) return tab;

        return {
          ...tab,

          columns: tab.columns.map(
            (column) => {
              if (
                column.id ===
                sourceColumnId
              ) {
                return {
                  ...column,

                  cards:
                    column.cards.filter(
                      (card) =>
                        card.id !==
                        cardId
                    ),
                };
              }

              if (
                column.id ===
                targetColumnId
              ) {
                return {
                  ...column,

                  cards: [
                    ...column.cards,
                    card,
                  ],
                };
              }

              return column;
            }
          ),
        };
      })
    ); // IMPORTANT: cards only move within active tab
  };

  return (
    <div className="app">
      <header>
        <h1>
          Dr. Rachel Pilanias Board
        </h1>

        {/* TOP RIGHT IS NOW ADD TAB */}
        <div className="add-column">
          <input
            type="text"
            placeholder="New tab..."
            value={newTabTitle}
            onChange={(e) =>
              setNewTabTitle(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter"
              ) {
                addTab();
              }
            }}
          />

          <button onClick={addTab}>
            + Add Tab
          </button>
        </div>
      </header>

      {/* TAB BAR */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${
              tab.id === activeTabId
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTabId(tab.id)
            }
          >
            {tab.title}
          </button>
        ))}
      </div>

      <main className="board-wrapper">

        {/* ADD COLUMN NOW BELONGS TO THE ACTIVE TAB */}
        <div className="tab-controls">
          <div className="add-column">
            <input
              type="text"
              placeholder="New column..."
              value={newColumnTitle}
              onChange={(e) =>
                setNewColumnTitle(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  addColumn();
                }
              }}
            />

            <button
              onClick={addColumn}
            >
              + Add Column
            </button>
          </div>
        </div>

        <div className="board">
          {activeTab?.columns.map(
            (column) => (
              <section
                key={column.id}
                className="column"
                onDragOver={(e) =>
                  e.preventDefault()
                }
                onDrop={(e) =>
                  handleDrop(
                    e,
                    column.id
                  )
                }
              >
                <div className="column-header">
                  <h2>
                    {column.title}
                  </h2>

                  <span>
                    {
                      column.cards
                        .length
                    }
                  </span>
                </div>

                <div className="cards">
                  {column.cards.map(
                    (card) => (
                      <div
                        key={card.id}
                        className="card"
                        draggable
                        onDragStart={(
                          e
                        ) =>
                          handleDragStart(
                            e,
                            card.id,
                            column.id
                          )
                        }
                      >
                        <span>
                          {card.title}
                        </span>

                        <button
                          className="card-arrow"
                          onClick={(
                            e
                          ) => {
                            e.stopPropagation();

                            goToCard(
                              card.title
                            ); // IMPORTANT: opens card page
                          }}
                        >
                          →
                        </button>
                      </div>
                    )
                  )}
                </div>

                <div className="add-card">
                  <input
                    type="text"
                    placeholder="Add a card..."
                    value={
                      newCardTitles[
                        column.id
                      ] || ""
                    }
                    onChange={(e) =>
                      setNewCardTitles(
                        (prev) => ({
                          ...prev,

                          [column.id]:
                            e.target
                              .value,
                        })
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        addCard(
                          column.id
                        );
                      }
                    }}
                  />

                  <button
                    onClick={() =>
                      addCard(
                        column.id
                      )
                    }
                  >
                    Add
                  </button>
                </div>
              </section>
            )
          )}
        </div>
      </main>
    </div>
  );
}