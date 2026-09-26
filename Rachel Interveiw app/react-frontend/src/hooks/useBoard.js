import {
  useEffect,
  useState,
} from "react";

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

export default function useBoard() {
  const [tabs, setTabs] =
    useState(() => {
      const savedTabs =
        localStorage.getItem("tabs");

      if (savedTabs) {
        return JSON.parse(savedTabs);
      }

      /*
        IMPORTANT:
        Preserves data from the older
        pre-tab version of the app.
      */
      const oldColumns =
        localStorage.getItem(
          "columns"
        );

      if (oldColumns) {
        return [
          {
            id: "main",
            title:
              "Residency Programs",
            columns:
              JSON.parse(
                oldColumns
              ),
          },
        ];
      }

      return initialTabs;
    });

  const [
    activeTabId,
    setActiveTabId,
  ] = useState(() => {
    return (
      localStorage.getItem(
        "activeTabId"
      ) || "main"
    );
  });

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

  const activeTab =
    tabs.find(
      (tab) =>
        tab.id === activeTabId
    );

  // -------------------------
  // TABS
  // -------------------------

  const addTab = (title) => {
    const newTab = {
      id: crypto.randomUUID(),
      title,
      columns: [
        {
          id: crypto.randomUUID(),
          title:
            "Programs Applied To",
          cards: [],
        },
      ],
    };

    setTabs((prev) => [
      ...prev,
      newTab,
    ]);

    setActiveTabId(
      newTab.id
    );
  };

  const deleteTab = (tabId) => {
    const tab =
      tabs.find(
        (tab) =>
          tab.id === tabId
      );

    if (!tab) return;

    const confirmed =
      window.confirm(
        `Delete "${tab.title}" and all of its columns and cards?`
      );

    if (!confirmed) return;

    const remainingTabs =
      tabs.filter(
        (tab) =>
          tab.id !== tabId
      );

    setTabs(
      remainingTabs
    );

    if (
      activeTabId === tabId
    ) {
      setActiveTabId(
        remainingTabs[0]?.id ||
          ""
      );
    }
  };

  const renameTab = (
    tabId,
    newTitle
  ) => {
    const title =
      newTitle.trim();

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

  // -------------------------
  // COLUMNS
  // -------------------------

  const addColumn = (
    title
  ) => {
    if (!activeTabId) return;

    const newColumn = {
      id: crypto.randomUUID(),
      title,
      cards: [],
    };

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id ===
        activeTabId
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
  };

  const deleteColumn = (
    columnId
  ) => {
    const column =
      activeTab?.columns.find(
        (column) =>
          column.id ===
          columnId
      );

    if (!column) return;

    const confirmed =
      window.confirm(
        `Delete "${column.title}" and all cards inside it?`
      );

    if (!confirmed) return;

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id ===
        activeTabId
          ? {
              ...tab,

              columns:
                tab.columns.filter(
                  (column) =>
                    column.id !==
                    columnId
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
    const title =
      newTitle.trim();

    if (!title) return;

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id ===
        activeTabId
          ? {
              ...tab,

              columns:
                tab.columns.map(
                  (column) =>
                    column.id ===
                    columnId
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

  // -------------------------
  // CARDS
  // -------------------------

  const addCard = (
    columnId,
    title
  ) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id ===
        activeTabId
          ? {
              ...tab,

              columns:
                tab.columns.map(
                  (column) =>
                    column.id ===
                    columnId
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
  };

  const deleteCard = (
    columnId,
    cardId,
    cardTitle
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${cardTitle}"?`
      );

    if (!confirmed) return;

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id ===
        activeTabId
          ? {
              ...tab,

              columns:
                tab.columns.map(
                  (column) =>
                    column.id ===
                    columnId
                      ? {
                          ...column,

                          cards:
                            column.cards.filter(
                              (
                                card
                              ) =>
                                card.id !==
                                cardId
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
    const title =
      newTitle.trim();

    if (!title) return;

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id ===
        activeTabId
          ? {
              ...tab,

              columns:
                tab.columns.map(
                  (column) =>
                    column.id ===
                    columnId
                      ? {
                          ...column,

                          cards:
                            column.cards.map(
                              (
                                card
                              ) =>
                                card.id ===
                                cardId
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

    /*
      IMPORTANT:
      Notes currently use the card title
      as their storage key.

      Renaming the card therefore also
      moves its notes.
    */
    const oldKey =
      `card-notes-${oldTitle}`;

    const newKey =
      `card-notes-${title}`;

    const savedNotes =
      localStorage.getItem(
        oldKey
      );

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

  // -------------------------
  // DRAG / DROP
  // -------------------------

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
    } = JSON.parse(
      dragData
    );

    if (
      sourceColumnId ===
      targetColumnId
    ) {
      return;
    }

    setTabs((prev) =>
      prev.map((tab) => {
        if (
          tab.id !==
          activeTabId
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
              card.id ===
              cardId
          );

        if (!card) {
          return tab;
        }

        return {
          ...tab,

          columns:
            tab.columns.map(
              (column) => {
                if (
                  column.id ===
                  sourceColumnId
                ) {
                  return {
                    ...column,

                    cards:
                      column.cards.filter(
                        (
                          currentCard
                        ) =>
                          currentCard.id !==
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

  return {
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
  };
}