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

/*Gets the synced meta data ofr firestore board*/

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


/*Check if boards are eqqual based on contents*/
const boardsAreEqual = (tabsA,tabsB) => {
  return (
    JSON.stringify(tabsA) ===
    JSON.stringify(tabsB)
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

  /*add variable for board conlfict*/
  const [
  boardConflict,
  setBoardConflict,
] = useState(() => {
  return safeParse(
    localStorage.getItem(
      CONFLICT_KEY
    ),
    null
  );
});
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

      localStorage.setItem(
  LAST_GOOD_KEY,
  JSON.stringify({
    savedAt:
      new Date().toISOString(),

    revision:
      remoteRevision,

    activeTabId:
      remote.activeTabId ||
      localActiveTabId,

    tabs:
      remote.tabs,
  })
);

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

  const existingConflict =
  safeParse(
    localStorage.getItem(
      CONFLICT_KEY
    ),
    null
  );

if (existingConflict) {
  const conflictRemoteTabs =
    existingConflict.remote?.tabs;


  /*
    If the user manually changed LOCAL
    back so that it matches the remote
    version we originally conflicted with,
    the conflict no longer exists.

    Clear the latch and allow the normal
    Firestore transaction below to verify
    against CURRENT Firestore.
  */
  const conflictResolvedLocally =
    Array.isArray(
      conflictRemoteTabs
    ) &&
    boardsAreEqual(
      tabs,
      conflictRemoteTabs
    );


  if (conflictResolvedLocally) {
    console.log(
      "Local board now matches conflict remote snapshot. Rechecking Firestore."
    );


    localStorage.removeItem(
      CONFLICT_KEY
    );


    setBoardConflict(
      null
    );


    /*
      IMPORTANT:
      Do NOT return.

      Fall through to the normal
      Firestore transaction below.

      That transaction will fetch CURRENT
      Firestore and make sure this is
      actually safe.
    */
  } else {
    /*
      Real conflict is still unresolved.

      Keep saving new LOCAL edits into the
      conflict snapshot, but do not touch
      Firestore yet.
    */
    const updatedConflict = {
      ...existingConflict,

      updatedAt:
        new Date().toISOString(),

      local: {
        tabs,
        activeTabId,
      },
    };


    localStorage.setItem(
      CONFLICT_KEY,
      JSON.stringify(
        updatedConflict
      )
    );


    setBoardConflict(
      updatedConflict
    );


    return;
  }
}

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
          const result =
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
                        meta.lastSyncedRevision ?? 0
                        )
                    ) {
                    const remoteData =
                        remoteSnapshot.data();


                /*
                    BASE = last board Firestore
                    successfully confirmed for us.
                */
                const lastGood =
                    safeParse(
                    localStorage.getItem(
                        LAST_GOOD_KEY
                    ),
                    null
                    );


                const baseTabs =
                    lastGood?.tabs;


                const localMatchesRemote =
                    boardsAreEqual(
                    tabs,
                    remoteData.tabs
                    );


                    /*
                        CASE 1:
                        The revisions differ, but the
                        actual board is identical.

                        Nothing meaningful conflicted.
                    */
                    if (localMatchesRemote) {
                        return {
                        revision:
                            remoteRevision,

                        action:
                            "already-current",

                        remoteData,
                        };
                    }


                    /*
                        We cannot safely perform a
                        three-way comparison without
                        knowing our BASE.

                        Fall back to conservative conflict
                        handling rather than guessing.
                    */
                    if (!baseTabs) {
                        const error =
                        new Error(
                            "BOARD_SYNC_CONFLICT"
                        );

                        error.remoteData =
                        remoteData;

                        throw error;
                    }


                    const remoteMatchesBase =
                        boardsAreEqual(
                        remoteData.tabs,
                        baseTabs
                        );


                    const localMatchesBase =
                        boardsAreEqual(
                        tabs,
                        baseTabs
                        );


                /*
                    CASE 2:
                    Remote board hasn't actually
                    changed since our BASE.

                    LOCAL is the only side with
                    meaningful board changes.

                    Safe to continue below and write it.
                */
                if (remoteMatchesBase) {
                    // deliberately continue
                }


                /*
                    CASE 3:
                    LOCAL hasn't changed from BASE,
                    but remote has.

                    Another device made the only
                    meaningful board changes.

                    Safely adopt remote.
                */
                else if (localMatchesBase) {
                    return {
                    revision:
                        remoteRevision,

                    action:
                        "adopt-remote",

                    remoteData,
                    };
                }


                /*
                    CASE 4:
                    Both sides changed differently.

                    REAL CONFLICT.
                */
                else {
                    const error =
                    new Error(
                        "BOARD_SYNC_CONFLICT"
                    );

                    error.remoteData =
                    remoteData;

                    throw error;
                }
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


               return {
                revision:
                    nextRevision,

                action:
                    "wrote-local",
                };
              }
            );


          /*
            Firebase confirmed the write.
          */
         /*
  Firebase transaction finished successfully.
*/
pendingSavesRef.current =
  Math.max(
    0,
    pendingSavesRef.current - 1
  );


/*
  CASE: another device changed the board,
  while our local board had not changed
  from BASE.

  Safely adopt the newer remote board.
*/
if (
  result.action ===
  "adopt-remote"
) {
  const remote =
    result.remoteData;


  saveBackupSnapshot(
    tabs,
    activeTabId,
    "before-auto-adopt-remote"
  );


  /*
    Prevent the setTabs/setActiveTabId below
    from immediately firing another save.
  */
  skipNextSaveRef.current =
    true;


  setTabs(
    remote.tabs
  );


  /*
    Keep her current tab if it still exists.
    Otherwise use remote's tab / first tab.
  */
  const nextActiveTabId =
    remote.tabs.some(
      (tab) =>
        tab.id === activeTabId
    )
      ? activeTabId
      : (
          remote.activeTabId ||
          remote.tabs[0]?.id ||
          ""
        );


  setActiveTabId(
    nextActiveTabId
  );


  localStorage.setItem(
    BOARD_KEY,
    JSON.stringify(
      remote.tabs
    )
  );


  localStorage.setItem(
    ACTIVE_TAB_KEY,
    nextActiveTabId
  );


  updateSyncMeta({
    dirty:
      pendingSavesRef.current > 0,

    lastSyncedRevision:
      result.revision,
  });


  localStorage.setItem(
    LAST_GOOD_KEY,
    JSON.stringify({
      savedAt:
        new Date()
          .toISOString(),

      revision:
        result.revision,

      activeTabId:
        nextActiveTabId,

      tabs:
        remote.tabs,
    })
  );


  localStorage.removeItem(
    CONFLICT_KEY
  );

  setBoardConflict(
    null
  );


  console.log(
    "Remote board safely adopted. Revision:",
    result.revision
  );


  return;
}


/*
  CASE:
  - normal local write
  OR
  - revision differed but actual boards
    were already identical.

  Either way, we now know which Firestore
  revision this board corresponds to.
*/
updateSyncMeta({
  dirty:
    pendingSavesRef.current > 0,

  lastSyncedRevision:
    result.revision,
});


localStorage.setItem(
  LAST_GOOD_KEY,
  JSON.stringify({
    savedAt:
      new Date().toISOString(),

    revision:
      result.revision,

    activeTabId,

    tabs,
  })
);


localStorage.removeItem(
  CONFLICT_KEY
);

setBoardConflict(
  null
);


console.log(
  result.action ===
    "already-current"
    ? "Board already matched Firestore. Metadata self-healed. Revision:"
    : "Board safely synced. Revision:",
  result.revision
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


            const conflict = {
  detectedAt:
    new Date().toISOString(),

  local: {
    tabs,
    activeTabId,
  },

  remote:
    remote || null,
};


localStorage.setItem(
  CONFLICT_KEY,
  JSON.stringify(
    conflict
  )
);


setBoardConflict(
  conflict
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
    const resolveConflictUseLocal =
  async () => {
    const conflict =
      boardConflict ||
      safeParse(
        localStorage.getItem(
          CONFLICT_KEY
        ),
        null
      );


    if (!conflict) {
      console.log(
        "No board conflict to resolve."
      );

      return false;
    }


    try {
      /*
        Finish anything already queued
        before making the explicit choice.
      */
      await saveQueueRef.current;


      const boardRef =
        doc(
          rachel_db,
          "boards",
          "main"
        );


      const result =
        await runTransaction(
          rachel_db,

          async (
            transaction
          ) => {
            const snapshot =
              await transaction.get(
                boardRef
              );


            const remote =
              snapshot.exists()
                ? snapshot.data()
                : null;


            const remoteRevision =
              Number(
                remote?.revision ??
                0
              );


            const nextRevision =
              remoteRevision + 1;


            /*
              EXPLICIT HUMAN DECISION:
              this device's current board wins.
            */
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


            return {
              revision:
                nextRevision,

              replacedRemote:
                remote,
            };
          }
        );


      /*
        Preserve the exact cloud board
        that we intentionally replaced.
      */
      if (
        result.replacedRemote
          ?.tabs
      ) {
        saveBackupSnapshot(
          result.replacedRemote.tabs,

          result.replacedRemote
            .activeTabId ||
            "main",

          "remote-before-local-wins"
        );
      }


      updateSyncMeta({
        dirty: false,

        lastSyncedRevision:
          result.revision,
      });


      localStorage.setItem(
        LAST_GOOD_KEY,
        JSON.stringify({
          savedAt:
            new Date()
              .toISOString(),

          revision:
            result.revision,

          activeTabId,

          tabs,
        })
      );


      localStorage.removeItem(
        CONFLICT_KEY
      );


      setBoardConflict(
        null
      );


      console.log(
        "Conflict resolved: LOCAL board chosen. Revision:",
        result.revision
      );


      return true;

    } catch (error) {
      console.error(
        "Could not resolve conflict using local board. Local data was preserved:",
        error
      );


      return false;
    }
  };
  const resolveConflictUseRemote =
  async () => {
    const conflict =
      boardConflict ||
      safeParse(
        localStorage.getItem(
          CONFLICT_KEY
        ),
        null
      );


    if (!conflict) {
      console.log(
        "No board conflict to resolve."
      );

      return false;
    }


    try {
      /*
        Make sure an older save isn't still
        running before choosing cloud.
      */
      await saveQueueRef.current;


      const boardRef =
        doc(
          rachel_db,
          "boards",
          "main"
        );


      /*
        Get CURRENT Firestore instead of
        trusting the possibly-old snapshot
        stored when conflict was detected.
      */
      const snapshot =
        await getDoc(
          boardRef
        );


      if (!snapshot.exists()) {
        throw new Error(
          "Remote board no longer exists."
        );
      }


      const remote =
        snapshot.data();


      const remoteRevision =
        Number(
          remote.revision ?? 0
        );


      if (!Array.isArray(
        remote.tabs
      )) {
        throw new Error(
          "Remote board is invalid."
        );
      }


      /*
        Preserve LOCAL before intentionally
        replacing it.
      */
      saveBackupSnapshot(
        tabs,
        activeTabId,
        "local-before-remote-wins"
      );


      skipNextSaveRef.current =
        true;


      setTabs(
        remote.tabs
      );


      const nextActiveTabId =
        remote.tabs.some(
          (tab) =>
            tab.id === activeTabId
        )
          ? activeTabId
          : (
              remote.activeTabId ||
              remote.tabs[0]?.id ||
              ""
            );


      setActiveTabId(
        nextActiveTabId
      );


      localStorage.setItem(
        BOARD_KEY,
        JSON.stringify(
          remote.tabs
        )
      );


      localStorage.setItem(
        ACTIVE_TAB_KEY,
        nextActiveTabId
      );


      updateSyncMeta({
        dirty: false,

        lastSyncedRevision:
          remoteRevision,
      });


      localStorage.setItem(
        LAST_GOOD_KEY,
        JSON.stringify({
          savedAt:
            new Date()
              .toISOString(),

          revision:
            remoteRevision,

          activeTabId:
            nextActiveTabId,

          tabs:
            remote.tabs,
        })
      );


      localStorage.removeItem(
        CONFLICT_KEY
      );


      setBoardConflict(
        null
      );


      console.log(
        "Conflict resolved: REMOTE board chosen. Revision:",
        remoteRevision
      );


      return true;

    } catch (error) {
      console.error(
        "Could not resolve conflict using remote board. Local data was preserved:",
        error
      );


      return false;
    }
  };

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

  //Function to add a column
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

  //Function to delete a column
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

  //Function to rename a column
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
  
  //Function to move a column from one tab to another
  const moveColumnToTab = (
  columnId,
  targetTabId
) => {
  if (
    !activeTabId ||
    !targetTabId ||
    activeTabId === targetTabId
  ) {
    return;
  }

  setTabs((prev) => {
    const sourceTab =
      prev.find(
        (tab) =>
          tab.id === activeTabId
      );

    const columnToMove =
      sourceTab?.columns.find(
        (column) =>
          column.id === columnId
      );

    if (!columnToMove) {
      return prev;
    }

    return prev.map(
      (tab) => {
        if (
          tab.id === activeTabId
        ) {
          return {
            ...tab,

            columns:
              tab.columns.filter(
                (column) =>
                  column.id !==
                  columnId
              ),
          };
        }

        if (
          tab.id === targetTabId
        ) {
          return {
            ...tab,

            columns: [
              ...tab.columns,
              columnToMove,
            ],
          };
        }

        return tab;
      }
    );
  });
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
    moveColumnToTab,

    addCard,
    deleteCard,
    renameCard,

    handleDragStart,
    handleDrop,

    boardConflict,

    resolveConflictUseLocal,
    resolveConflictUseRemote,

    firebaseLoaded,
  };
}