import {useEffect,useRef,useState,} from "react";
import {doc,getDoc,runTransaction,serverTimestamp,} from "firebase/firestore";
import { rachel_db } from "../firebase.js";

const BOARD_KEY = "tabs";
const ACTIVE_TAB_KEY = "activeTabId";

const BACKUPS_KEY = "tabs-backups-v1";
const SYNC_META_KEY = "board-sync-meta-v1";
const LAST_GOOD_KEY = "tabs-last-known-good";
const CONFLICT_KEY = "board-sync-conflict-v1";

const MAX_BACKUPS = 50;


const safeParse = (
  value,
  fallback
) => {
  try {
    return value
      ? JSON.parse(value)
      : fallback;
  } catch {
    return fallback;
  }
};


const getSyncMeta = () => {
  return safeParse(
    localStorage.getItem(
      SYNC_META_KEY
    ),
    {
      dirty: false,
      lastSyncedRevision: 0,
    }
  );
};


const updateSyncMeta = (
  updates
) => {
  const current =
    getSyncMeta();

  localStorage.setItem(
    SYNC_META_KEY,
    JSON.stringify({
      ...current,
      ...updates,
    })
  );
};


/*
  Saves a full previous version before
  anything destructive can replace it.
*/
const saveBackupSnapshot = (
  tabs,
  activeTabId,
  reason
) => {
  if (!Array.isArray(tabs)) {
    return;
  }

  try {
    const backups =
      safeParse(
        localStorage.getItem(
          BACKUPS_KEY
        ),
        []
      );

    const newest =
      backups[0];

    /*
      Avoid storing 50 identical copies.
    */
    const sameAsNewest =
      newest &&
      JSON.stringify(
        newest.tabs
      ) ===
        JSON.stringify(tabs) &&
      newest.activeTabId ===
        activeTabId;

    if (sameAsNewest) {
      return;
    }

    const snapshot = {
      id: crypto.randomUUID(),
      savedAt:
        new Date().toISOString(),
      reason,
      activeTabId,
      tabs,
    };

    const updated = [
      snapshot,
      ...backups,
    ].slice(
      0,
      MAX_BACKUPS
    );

    localStorage.setItem(
      BACKUPS_KEY,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error(
      "Could not create local backup:",
      error
    );
  }
};


const backupCurrentLocal = (
  reason
) => {
  const tabs =
    safeParse(
      localStorage.getItem(
        BOARD_KEY
      ),
      null
    );

  if (!tabs) {
    return;
  }

  const activeTabId =
    localStorage.getItem(
      ACTIVE_TAB_KEY
    ) || "main";

  saveBackupSnapshot(
    tabs,
    activeTabId,
    reason
  );
};

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
const pendingSavesRef =
  useRef(0);

    const skipNextSaveRef =
  useRef(false);

/*
  Serializes Firestore saves.

  This prevents two rapid edits on this
  device from racing each other.
*/
const saveQueueRef =
  useRef(
    Promise.resolve()
  );
  
  //Tabs use function
  const [tabs, setTabs] =
    useState(() => {
      const savedTabs =
        localStorage.getItem("tabs");

      if (savedTabs) {
        return JSON.parse(savedTabs);
      }

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

  const [
    firebaseLoaded,
    setFirebaseLoaded,
  ] = useState(false);

  /*
    LOAD FROM FIREBASE ON STARTUP

    Firebase is treated as the source
    of truth if a board already exists.
  */

  useEffect(() => {
  let cancelled = false;

  const loadBoard = async () => {
    try {
      const boardRef =
        doc(
          rachel_db,
          "boards",
          "main"
        );

      const snapshot =
        await getDoc(
          boardRef
        );

      if (cancelled) {
        return;
      }


      /*
        Nothing exists in Firestore yet.

        Keep our local board.
        It will be uploaded by the
        normal save effect below.
      */
      if (!snapshot.exists()) {
        return;
      }


      const remote =
        snapshot.data();

      const remoteRevision =
        Number(
          remote.revision ??
            0
        );

      const meta =
        getSyncMeta();

      const localTabs =
        safeParse(
          localStorage.getItem(
            BOARD_KEY
          ),
          null
        );

      const localActiveTabId =
        localStorage.getItem(
          ACTIVE_TAB_KEY
        ) || "main";


      /*
        CRITICAL FAILSAFE:

        If this browser has changes that
        never successfully reached Firebase,
        NEVER replace them with Firebase.
      */
      if (
        meta.dirty &&
        localTabs
      ) {
        console.warn(
          "Local unsynced changes found. Preserving local board."
        );

        /*
          Keep a copy of the cloud state too,
          so neither side can be lost.
        */
        if (remote.tabs) {
          saveBackupSnapshot(
            remote.tabs,
            remote.activeTabId ||
              "main",
            "cloud-copy-while-local-unsynced"
          );
        }

        return;
      }


      /*
        We're about to let Firebase replace
        localStorage.

        Back up local FIRST.
      */
      if (localTabs) {
        saveBackupSnapshot(
          localTabs,
          localActiveTabId,
          "before-firestore-load"
        );
      }


      /*
        Prevent the Firestore hydration
        itself from immediately triggering
        another cloud write.
      */
      skipNextSaveRef.current =
        true;


      if (remote.tabs) {
        setTabs(
          remote.tabs
        );

        localStorage.setItem(
          BOARD_KEY,
          JSON.stringify(
            remote.tabs
          )
        );
      }


      if (
        remote.activeTabId
      ) {
        setActiveTabId(
          remote.activeTabId
        );

        localStorage.setItem(
          ACTIVE_TAB_KEY,
          remote.activeTabId
        );
      }


      /*
        This local copy is known to match
        Firestore revision N.
      */
      updateSyncMeta({
        dirty: false,

        lastSyncedRevision:
          remoteRevision,
      });

    } catch (error) {
      console.error(
        "Could not load board from Firebase:",
        error
      );

      /*
        We intentionally do NOTHING
        destructive here.

        Whatever is in localStorage stays.
      */

    } finally {
      if (!cancelled) {
        setFirebaseLoaded(
          true
        );
      }
    }
  };


  loadBoard();


  return () => {
    cancelled = true;
  };
}, []);

  /*
    SAVE LOCALLY + FIREBASE

    IMPORTANT:
    Do not save until Firebase has
    finished its initial load.

    Otherwise your local/default state
    could overwrite existing cloud data.
  */
  useEffect(() => {
  if (!firebaseLoaded) {
    return;
  }


  /*
    Firestore just hydrated this state.

    Don't immediately write the exact same
    data back to Firestore.
  */
  if (
    skipNextSaveRef.current
  ) {
    skipNextSaveRef.current =
      false;

    return;
  }


  /*
    -------------------------
    LOCAL SAVE
    -------------------------

    Backup the PREVIOUS local version
    before replacing it.
  */
  const previousTabs =
    safeParse(
      localStorage.getItem(
        BOARD_KEY
      ),
      null
    );

  const previousActiveTabId =
    localStorage.getItem(
      ACTIVE_TAB_KEY
    ) || "main";


  if (previousTabs) {
    const changed =
      JSON.stringify(
        previousTabs
      ) !==
        JSON.stringify(tabs) ||
      previousActiveTabId !==
        activeTabId;

    if (changed) {
      saveBackupSnapshot(
        previousTabs,
        previousActiveTabId,
        "before-local-save"
      );
    }
  }


  /*
    localStorage is synchronous.

    Save here BEFORE attempting any
    network operation.
  */
  localStorage.setItem(
    BOARD_KEY,
    JSON.stringify(tabs)
  );

  localStorage.setItem(
    ACTIVE_TAB_KEY,
    activeTabId
  );


  /*
    Until Firestore confirms otherwise,
    consider this local copy UNSYNCED.
  */
  updateSyncMeta({
    dirty: true,
  });


  /*
    -------------------------
    FIRESTORE SAVE
    -------------------------

    Queue saves so rapid edits cannot race
    against one another on this device.
  */
 pendingSavesRef.current += 1;
  saveQueueRef.current =
    saveQueueRef.current.then(
      async () => {
        const boardRef =
          doc(
            rachel_db,
            "boards",
            "main"
          );


        try {
          const newRevision =
            await runTransaction(
              rachel_db,
              async (
                transaction
              ) => {
                const remoteSnapshot =
                  await transaction.get(
                    boardRef
                  );

                const meta =
                  getSyncMeta();

                const remoteRevision =
                  remoteSnapshot.exists()
                    ? Number(
                        remoteSnapshot.data()
                          .revision ??
                          0
                      )
                    : 0;


                /*
                  CONFLICT DETECTION

                  Another device changed the
                  board since this browser
                  last successfully synced.

                  DO NOT overwrite it.
                */
                if (
                  remoteSnapshot.exists() &&
                  remoteRevision !==
                    Number(
                      meta.lastSyncedRevision ??
                        0
                    )
                ) {
                  const error =
                    new Error(
                      "BOARD_SYNC_CONFLICT"
                    );

                  error.remoteData =
                    remoteSnapshot.data();

                  throw error;
                }


                const nextRevision =
                  remoteRevision +
                  1;


                transaction.set(
                  boardRef,
                  {
                    tabs,
                    activeTabId,

                    revision:
                      nextRevision,

                    updatedAt:
                      serverTimestamp(),
                  }
                );


                return nextRevision;
              }
            );


          /*
            Firebase confirmed the write.
          */
          pendingSavesRef.current -= 1;

updateSyncMeta({
  // Only mark clean when EVERY queued local change has reached Firebase.
  dirty:
    pendingSavesRef.current > 0,

  lastSyncedRevision:
    newRevision,
});


          /*
            Separate known-good recovery
            point.

            Only updated after Firebase has
            successfully committed.
          */
          localStorage.setItem(
            LAST_GOOD_KEY,
            JSON.stringify({
              savedAt:
                new Date().toISOString(),

              revision:
                newRevision,

              activeTabId,

              tabs,
            })
          );


          /*
            Clear an old conflict once
            we've successfully synchronized.
          */
          localStorage.removeItem(
            CONFLICT_KEY
          );


          console.log(
            "Board safely synced. Revision:",
            newRevision
          );

        } catch (error) {
             pendingSavesRef.current =
    Math.max(
      0,
      pendingSavesRef.current - 1
    );

          /*
            Another device changed Firestore.

            Save BOTH versions rather than
            choosing one automatically.
          */
          if (
            error.message ===
            "BOARD_SYNC_CONFLICT"
          ) {
            console.error(
              "Board sync conflict detected. Nothing was overwritten."
            );


            const remote =
              error.remoteData;


            if (remote?.tabs) {
              saveBackupSnapshot(
                remote.tabs,
                remote.activeTabId ||
                  "main",
                "firestore-conflict-copy"
              );
            }


            localStorage.setItem(
              CONFLICT_KEY,
              JSON.stringify({
                detectedAt:
                  new Date().toISOString(),

                local: {
                  tabs,
                  activeTabId,
                },

                remote:
                  remote || null,
              })
            );

            return;
          }


          /*
            Network error / permission error /
            Firebase outage.

            Local data remains intact and
            marked dirty.
          */
          console.error(
            "Firestore save failed. Local copy preserved:",
            error
          );
        }
      }
    );
}, [
  tabs,
  activeTabId,
  firebaseLoaded,
]);

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

  const deleteTab = (
    tabId
  ) => {
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

    if (!confirmed) {
      return;
    }

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
    if (!activeTabId) {
      return;
    }

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

    if (!column) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${column.title}" and all cards inside it?`
      );

    if (!confirmed) {
      return;
    }

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
                              id:
                                crypto.randomUUID(),
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

    if (!confirmed) {
      return;
    }

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

    /*
      IMPORTANT:
      Card notes are still currently
      stored separately in localStorage.
    */
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
      Notes currently use card title
      as their localStorage key.

      Preserve them when renaming.
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

    if (!dragData) {
      return;
    }

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

    firebaseLoaded,
  };
}