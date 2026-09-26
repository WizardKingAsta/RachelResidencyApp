import { useState } from "react";

import "./App.css";

import CardPage from "./pages/card-page.jsx";
import Tab from "./components/tab.jsx";
import Column from "./components/column.jsx";
import useBoard from "./hooks/useBoard.js";

export default function App() {
  const {
    tabs,
    activeTabId,
    activeTab,

    setActiveTabId,

    addTab,
    deleteTab,
    renameTab,

    addColumn,
    deleteColumn,
    renameColumn,

    addCard,
    deleteCard,
    renameCard,

    handleDragStart,
    handleDrop,
  } = useBoard();

  const [newTabTitle, setNewTabTitle] =
    useState("");

  const [newColumnTitle, setNewColumnTitle] =
    useState("");

  const [newCardTitles, setNewCardTitles] =
    useState({});

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

  const handleAddTab = () => {
    const title = newTabTitle.trim();

    if (!title) return;

    addTab(title);

    setNewTabTitle("");
  };

  const handleAddColumn = () => {
    const title = newColumnTitle.trim();

    if (!title) return;

    addColumn(title);

    setNewColumnTitle("");
  };

  const handleAddCard = (columnId) => {
    const title =
      newCardTitles[columnId]?.trim();

    if (!title) return;

    addCard(
      columnId,
      title
    );

    setNewCardTitles((prev) => ({
      ...prev,
      [columnId]: "",
    }));
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
                handleAddTab();
              }
            }}
          />

          <button
            onClick={handleAddTab}
          >
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
            onSelect={
              setActiveTabId
            }
            onRename={
              renameTab
            }
            onDelete={
              deleteTab
            }
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

                onAddCard={
                  handleAddCard
                }

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

                onDrop={
                  handleDrop
                }
              />
            )
          )}

          {activeTab && (
            <div className="add-column-inline">
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
                      handleAddColumn();
                    }
                  }}
                />

                <button
                  onClick={
                    handleAddColumn
                  }
                >
                  + Add Column
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}