import { useEffect, useState } from "react";

import "./App.css";

import CardPage from "./pages/card-page.jsx";
import Tab from "./components/tab.jsx";
import Column from "./components/column.jsx";

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

export default function App() {
  const [tabs, setTabs] = useState(() => {
    const savedTabs = localStorage.getItem("tabs");

    if (savedTabs) {
      return JSON.parse(savedTabs);
    }

    const oldColumns = localStorage.getItem("columns");

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

  const [activeTabId, setActiveTabId] = useState(() => {
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

  const renameTab = (
    tabId,
    newTitle
  ) => {
    const title = newTitle.trim();

    if (!title) return;

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              title,
            }
          : tab
      )
    );
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

  const renameColumn = (
    columnId,
    newTitle
  ) => {
    const title = newTitle.trim();

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
                        title,
                      }
                    : column
              ),
            }
          : tab
      )
    );
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
    oldTitle,
    newTitle
  ) => {
    const title = newTitle.trim();

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
    );

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
          <Tab
            key={tab.id}
            tab={tab}
            isActive={
              tab.id === activeTabId
            }
            onSelect={setActiveTabId}
            onRename={renameTab}
            onDelete={deleteTab}
          />
        ))}
      </div>

      <main className="board-wrapper">
        <div className="board">
          {activeTab?.columns.map(
            (column) => (
              <Column
                key={column.id}
                column={column}
                newCardTitle={
                  newCardTitles[
                    column.id
                  ] || ""
                }
                onNewCardTitleChange={(
                  value
                ) =>
                  setNewCardTitles(
                    (prev) => ({
                      ...prev,
                      [column.id]:
                        value,
                    })
                  )
                }
                onAddCard={addCard}
                onRenameColumn={
                  renameColumn
                }
                onDeleteColumn={
                  deleteColumn
                }
                onRenameCard={
                  renameCard
                }
                onDeleteCard={
                  deleteCard
                }
                onOpenCard={
                  goToCard
                }
                onDragStart={
                  handleDragStart
                }
                onDrop={handleDrop}
              />
            )
          )}

          <div className="add-column-inline">
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

              <button onClick={addColumn}>
                + Add Column
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}