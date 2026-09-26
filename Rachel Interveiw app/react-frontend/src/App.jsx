import { useEffect, useState } from "react";
import "./App.css";

const initialTabs = [
  {
    id: "main",
    title: "Residency Programs",
    columns: [
      {
        id: "todo",
        title: "Programs Applied To",
        cards: [],
      },
    ],
  },
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

  // NEW: inline editing state
  const [editingTabId, setEditingTabId] =
    useState(null);

  const [editingColumnId, setEditingColumnId] =
    useState(null);

  const [editingCardId, setEditingCardId] =
    useState(null);

  const [editText, setEditText] =
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

  const deleteTab = (tabId) => {
    const tab = tabs.find(
      (tab) => tab.id === tabId
    );

    if (!tab) return;

    const confirmed = window.confirm(
      `Delete "${tab.title}" and all of its columns and cards?`
    );

    if (!confirmed) return;

    const remainingTabs = tabs.filter(
      (tab) => tab.id !== tabId
    );

    setTabs(remainingTabs);

    if (activeTabId === tabId) {
      setActiveTabId(
        remainingTabs[0]?.id || ""
      );
    }
  };

  const renameTab = (tabId) => {
    const title = editText.trim();

    if (!title) {
      setEditingTabId(null);
      return;
    }

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              title,
            }
          : tab
      )
    ); // IMPORTANT: updates only the selected tab title

    setEditingTabId(null);
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
    );

    setNewColumnTitle("");
  };

  const deleteColumn = (columnId) => {
    const column = activeTab?.columns.find(
      (column) => column.id === columnId
    );

    if (!column) return;

    const confirmed = window.confirm(
      `Delete "${column.title}" and all cards inside it?`
    );

    if (!confirmed) return;

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              columns: tab.columns.filter(
                (column) =>
                  column.id !== columnId
              ),
            }
          : tab
      )
    );
  };

  const renameColumn = (columnId) => {
    const title = editText.trim();

    if (!title) {
      setEditingColumnId(null);
      return;
    }

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
                        title,
                      }
                    : column
              ),
            }
          : tab
      )
    ); // IMPORTANT: updates only the selected column title

    setEditingColumnId(null);
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
    );

    setNewCardTitles((prev) => ({
      ...prev,
      [columnId]: "",
    }));
  };

  const deleteCard = (
    columnId,
    cardId,
    cardTitle
  ) => {
    const confirmed = window.confirm(
      `Delete "${cardTitle}"?`
    );

    if (!confirmed) return;

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
                        cards:
                          column.cards.filter(
                            (card) =>
                              card.id !== cardId
                          ),
                      }
                    : column
              ),
            }
          : tab
      )
    );

    localStorage.removeItem(
      `card-notes-${cardTitle}`
    );
  };

  const renameCard = (
    columnId,
    cardId,
    oldTitle
  ) => {
    const title = editText.trim();

    if (!title) {
      setEditingCardId(null);
      return;
    }

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
                        cards:
                          column.cards.map(
                            (card) =>
                              card.id === cardId
                                ? {
                                    ...card,
                                    title,
                                  }
                                : card
                          ),
                      }
                    : column
              ),
            }
          : tab
      )
    ); // IMPORTANT: updates only this card's title

    // IMPORTANT:
    // Your notes are currently stored using the title,
    // so move them to the new title too.
    const oldKey =
      `card-notes-${oldTitle}`;

    const newKey =
      `card-notes-${title}`;

    const savedNotes =
      localStorage.getItem(oldKey);

    if (
      savedNotes &&
      oldTitle !== title
    ) {
      localStorage.setItem(
        newKey,
        savedNotes
      );

      localStorage.removeItem(
        oldKey
      );
    }

    setEditingCardId(null);
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
    );
  };

  return (
    <div className="app">
      <header>
        <h1>
          Dr. Rachel Pilanias Board
        </h1>

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

      <div className="tabs">
        {tabs.map((tab) => (
          <div
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
            {editingTabId ===
            tab.id ? (
              <input
                className="inline-edit"
                autoFocus
                value={editText}
                onChange={(e) =>
                  setEditText(
                    e.target.value
                  )
                }
                onBlur={() =>
                  renameTab(tab.id)
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    "Enter"
                  ) {
                    renameTab(
                      tab.id
                    );
                  }

                  if (
                    e.key ===
                    "Escape"
                  ) {
                    setEditingTabId(
                      null
                    );
                  }
                }}
                onClick={(e) =>
                  e.stopPropagation()
                }
              />
            ) : (
              <span
                onDoubleClick={(
                  e
                ) => {
                  e.stopPropagation();

                  setEditingTabId(
                    tab.id
                  );

                  setEditText(
                    tab.title
                  );
                }}
              >
                {tab.title}
              </span>
            )}

            <button
              className="delete-button"
              onClick={(e) => {
                e.stopPropagation();

                deleteTab(
                  tab.id
                );
              }}
              title="Delete tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <main className="board-wrapper">
        {activeTab && (
          <div className="tab-controls">
            <div className="add-column">
              <input
                type="text"
                placeholder="New column..."
                value={
                  newColumnTitle
                }
                onChange={(e) =>
                  setNewColumnTitle(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    "Enter"
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
        )}

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
                  {editingColumnId ===
                  column.id ? (
                    <input
                      className="inline-edit"
                      autoFocus
                      value={
                        editText
                      }
                      onChange={(
                        e
                      ) =>
                        setEditText(
                          e.target
                            .value
                        )
                      }
                      onBlur={() =>
                        renameColumn(
                          column.id
                        )
                      }
                      onKeyDown={(
                        e
                      ) => {
                        if (
                          e.key ===
                          "Enter"
                        ) {
                          renameColumn(
                            column.id
                          );
                        }

                        if (
                          e.key ===
                          "Escape"
                        ) {
                          setEditingColumnId(
                            null
                          );
                        }
                      }}
                    />
                  ) : (
                    <h2
                      onDoubleClick={() => {
                        setEditingColumnId(
                          column.id
                        );

                        setEditText(
                          column.title
                        );
                      }}
                    >
                      {
                        column.title
                      }
                    </h2>
                  )}

                  <div className="column-header-actions">
                    <span>
                      {
                        column.cards
                          .length
                      }
                    </span>

                    <button
                      className="delete-button"
                      onClick={() =>
                        deleteColumn(
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
                      <div
                        key={card.id}
                        className="card"
                        draggable={
                          editingCardId !==
                          card.id
                        }
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
                        {editingCardId ===
                        card.id ? (
                          <input
                            className="inline-edit"
                            autoFocus
                            value={
                              editText
                            }
                            onChange={(
                              e
                            ) =>
                              setEditText(
                                e
                                  .target
                                  .value
                              )
                            }
                            onBlur={() =>
                              renameCard(
                                column.id,
                                card.id,
                                card.title
                              )
                            }
                            onKeyDown={(
                              e
                            ) => {
                              if (
                                e.key ===
                                "Enter"
                              ) {
                                renameCard(
                                  column.id,
                                  card.id,
                                  card.title
                                );
                              }

                              if (
                                e.key ===
                                "Escape"
                              ) {
                                setEditingCardId(
                                  null
                                );
                              }
                            }}
                            onClick={(
                              e
                            ) =>
                              e.stopPropagation()
                            }
                          />
                        ) : (
                          <span
                            onDoubleClick={(
                              e
                            ) => {
                              e.stopPropagation();

                              setEditingCardId(
                                card.id
                              );

                              setEditText(
                                card.title
                              );
                            }}
                          >
                            {
                              card.title
                            }
                          </span>
                        )}

                        <div className="card-actions">
                          <button
                            className="delete-button"
                            onClick={(e) => {
                              e.stopPropagation();

                              deleteCard(
                                column.id,
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

                              goToCard(
                                card.title
                              );
                            }}
                          >
                            →
                          </button>
                        </div>
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