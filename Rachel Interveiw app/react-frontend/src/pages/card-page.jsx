import { useEffect, useRef,useState } from "react";
import "../App.css";
import RichTextEditor from "../components/RichTextEditor.jsx";
import {doc,getDoc,setDoc,serverTimestamp,} from "firebase/firestore";
import {rachel_db,} from "../firebase.js";

const EMPTY_NOTES = {
  strategicInfo:"",
  interviews: "",
  fit: "",
  pdQuestions: "",
  residentQuestions: "",
  staffQuestions:"",
  postInterviewNotes:""
};


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

export default function CardPage({ cardId, cardTitle }) {
  const storageKey =
  `card-notes-${cardId}`;

const backupKey =
  `card-notes-backup-${cardId}`;

const syncKey =
  `card-notes-sync-${cardId}`;

const lastGoodKey =
  `card-notes-last-good-${cardId}`;


/*
  encodeURIComponent is important because
  Firestore document IDs cannot safely use
  arbitrary card titles containing "/".
*/
const firestoreId =cardId;

  const [notes, setNotes] =
  useState(() => {
    return safeParse(
      localStorage.getItem(
        storageKey
      ),
      EMPTY_NOTES
    );
  });


const [firebaseLoaded, setFirebaseLoaded] =
  useState(false);


/*
  Prevent Firestore hydration from
  immediately triggering another save.
*/
const skipNextSaveRef =
  useRef(false);


/*
  Used to debounce Firestore writes.
*/
const saveTimerRef =
  useRef(null);
  useEffect(() => {
  let cancelled = false;


  const loadNotes = async () => {
    try {
      const noteRef =
        doc(
          rachel_db,
          "cardNotes",
          firestoreId
        );


      const snapshot =
        await getDoc(noteRef);


      if (
        cancelled ||
        !snapshot.exists()
      ) {
        return;
      }


      const remote =
        snapshot.data();


      const localNotes =
        safeParse(
          localStorage.getItem(
            storageKey
          ),
          null
        );


      const syncMeta =
        safeParse(
          localStorage.getItem(
            syncKey
          ),
          {
            dirty: false,
          }
        );


      /*
        CRITICAL:

        Local changes exist that Firebase
        has not confirmed.

        Never overwrite them.
      */
      if (
        syncMeta.dirty &&
        localNotes
      ) {
        console.warn(
          "Unsynced card notes found. Keeping local copy."
        );

        return;
      }


      /*
        Save local version BEFORE
        replacing it with cloud data.
      */
      if (localNotes) {
        localStorage.setItem(
          backupKey,
          JSON.stringify({
            savedAt:
              new Date().toISOString(),

            notes:
              localNotes,
          })
        );
      }


      const remoteNotes =
        remote.notes ??
        EMPTY_NOTES;


      skipNextSaveRef.current =
        true;


      setNotes(
        remoteNotes
      );


      localStorage.setItem(
        storageKey,
        JSON.stringify(
          remoteNotes
        )
      );


      localStorage.setItem(
        syncKey,
        JSON.stringify({
          dirty: false,
        })
      );

    } catch (error) {
      /*
        Do NOT touch local notes when
        Firebase fails.
      */
      console.error(
        "Could not load card notes:",
        error
      );

    } finally {
      if (!cancelled) {
        setFirebaseLoaded(
          true
        );
      }
    }
  };


  loadNotes();


  return () => {
    cancelled = true;
  };
}, [
  firestoreId,
  storageKey,
  backupKey,
  syncKey,
]);

  const handleChange = (
  field,
  value
) => {
  setNotes(
    (current) => ({
      ...current,
      [field]: value,
    })
  );
};
  useEffect(() => {
  if (!firebaseLoaded) {
    return;
  }


  /*
    This update came FROM Firebase.

    Don't immediately send it
    back to Firebase.
  */
  if (
    skipNextSaveRef.current
  ) {
    skipNextSaveRef.current =
      false;

    return;
  }


  /*
    Get previous local version before
    replacing it.
  */
  const previousNotes =
    safeParse(
      localStorage.getItem(
        storageKey
      ),
      null
    );


  if (
    previousNotes &&
    JSON.stringify(
      previousNotes
    ) !==
      JSON.stringify(notes)
  ) {
    /*
      Emergency previous-version backup.
    */
    localStorage.setItem(
      backupKey,
      JSON.stringify({
        savedAt:
          new Date().toISOString(),

        notes:
          previousNotes,
      })
    );
  }


  /*
    SAVE LOCAL IMMEDIATELY.

    This happens synchronously before
    touching the network.
  */
  localStorage.setItem(
    storageKey,
    JSON.stringify(notes)
  );


  /*
    Assume unsynced until Firestore
    explicitly confirms the write.
  */
  localStorage.setItem(
    syncKey,
    JSON.stringify({
      dirty: true,
    })
  );


  /*
    Reset debounce timer whenever
    she types another character.
  */
  if (
    saveTimerRef.current
  ) {
    clearTimeout(
      saveTimerRef.current
    );
  }


  saveTimerRef.current =
    setTimeout(
      async () => {
        try {
          const noteRef =
            doc(
              rachel_db,
              "cardNotes",
              firestoreId
            );


          await setDoc(
            noteRef,
            {
              cardTitle,

              notes,

              updatedAt:
                serverTimestamp(),
            }
          );


          /*
            Firestore confirmed the save.
          */
          localStorage.setItem(
            syncKey,
            JSON.stringify({
              dirty: false,
            })
          );


          /*
            Known-good version.

            Only updated after Firestore
            confirms success.
          */
          localStorage.setItem(
            lastGoodKey,
            JSON.stringify({
              savedAt:
                new Date().toISOString(),

              notes,
            })
          );


          console.log(
            "Card notes safely synced:",
            cardTitle
          );

        } catch (error) {
          /*
            Leave dirty=true.

            LocalStorage remains intact.
          */
          console.error(
            "Could not sync card notes. Local copy preserved:",
            error
          );
        }
      },

      600
    );


  return () => {
    if (
      saveTimerRef.current
    ) {
      clearTimeout(
        saveTimerRef.current
      );
    }
  };

}, [
  notes,
  firebaseLoaded,
  storageKey,
  backupKey,
  syncKey,
  lastGoodKey,
  firestoreId,
  cardTitle,
]);

  return (
    <div className="card-page">
      <div className="card-title-row">
        <h1>{cardTitle}</h1>
         <button className="card-page-button header-button"
        onClick={() => {
          window.location.hash = "";
          
        }}
      >
        ← Back
      </button>
      </div>
      

        <div className="card-description">
          <textarea
            placeholder="Strategic info"
            value={notes.strategicInfo}
            onChange={(e) =>
              handleChange(
                "strategicInfo",
                e.target.value
              )
            }
          />
        </div>

     

      <div className="card-sections">
        <div className="card-section">
          <h2>Info on the Program</h2>

          <RichTextEditor
            placeholder="Notes about interviews..."
            value={notes.interviews}
            onChange={(value) =>
              handleChange(
                "interviews",
                value
              )
            }
          />
        </div>

        <div className="card-section">
          <h2>How I Fit In</h2>

          <RichTextEditor
            placeholder="How do I fit into this program?"
            value={notes.fit}
            onChange={(value) =>
              handleChange(
                "fit",
                value
              )
            }
          />
        </div>

        <div className="card-section">
          <h2>Questions for PDs</h2>

          <RichTextEditor
            placeholder="Questions for program directors..."
            value={notes.pdQuestions}
            onChange={(value) =>
              handleChange(
                "pdQuestions",
                value
              )
            }
          />
        </div>

        <div className="card-section">
          <h2>Questions for Residents</h2>

          <RichTextEditor
            placeholder="Questions for residents..."
            value={notes.residentQuestions}
            onChange={(value) =>
              handleChange(
                "residentQuestions",
                value
              )
            }
          />
        </div>

        <div className="card-section">
          <h2>Questions for Staff</h2>

          <RichTextEditor
            placeholder="Questions for staff..."
            value={notes.staffQuestions}
            onChange={(value) =>
              handleChange(
                "staffQuestions",
                value
              )
            }
          />
        </div>

        <div className="card-section">
          <h2>Post Interview Notes</h2>

          <RichTextEditor
            placeholder="Notes after big sis CRUSHED IT..."
            value={notes.postInterviewNotes}
            onChange={(value) =>
              handleChange(
                "postInterviewNotes",
                value
              )
            }
          />
        </div>
      </div>
    </div>
  );
}