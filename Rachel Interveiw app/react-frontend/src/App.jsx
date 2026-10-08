import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";

import AnikaLoadingImage from "./assets/Anika_loading.png?inline";
import KaiLoadingImage from "./assets/Kai_loading.png?inline";

import "./App.css";

import { auth } from "./firebase.js";


import CardPage from "./pages/card-page.jsx";
import Tab from "./components/tab.jsx";
import Column from "./components/column.jsx";

import useBoard from "./hooks/useBoard.js";

import useInterviewMilestone from "./hooks/useInterviewMilestone.js";


/*
  APP
  ----
  Handles Firebase authentication only.

  The actual board does not mount until
  Firebase confirms that a user is signed in.
*/
export default function App() {
  const loading_images = [AnikaLoadingImage,KaiLoadingImage];
  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loginError, setLoginError] =
    useState("");

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (firebaseUser) => {
          setUser(firebaseUser);
          setAuthLoading(false);
        }
      );

    return unsubscribe;
  }, []);


  const handleLogin = async (e) => {
    e.preventDefault();

    setLoginError("");

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
    } catch (error) {
      console.error(
        "Login failed:",
        error
      );

      setLoginError(
        "Email or password is incorrect."
      );
    }
  };

  
  /*
    Wait until Firebase has determined
    whether a session already exists.
  */
  if (authLoading) {
    const rand_pic = Math.floor(Math.random() * (2 + 1));
  return (
    <div className="card-page loading-page">
      <img
        src={loading_images[rand_pic]}
        alt="Loading"
        className="loading-image"
      />

      <h1>Loading...</h1>
    </div>
  );
}


  /*
    No authenticated Firebase user:
    show login page.
  */
  if (!user) {
    return (
      <div className="card-page">
        <h1>
          Dr. Rachel Pilanias Board
        </h1>

        <form
          onSubmit={handleLogin}
          className="add-column"
          style={{
            maxWidth: "400px",
            flexDirection: "column",
          }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
          />

          <button type="submit">
            Sign In
          </button>

          {loginError && (
            <p>
              {loginError}
            </p>
          )}
        </form>
      </div>
    );
  }


  /*
    Authenticated:
    now mount the actual board.

    This is important because useBoard()
    will not run until authentication
    has succeeded.
  */
  return <BoardApp />;
}


/*
  BOARD APP
  ---------
  Your existing application.

  useBoard owns:
  - tabs
  - columns
  - cards
  - drag/drop
  - Firestore persistence
*/
function BoardApp() {
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
    moveColumnToTab,

    addCard,
    deleteCard,
    renameCard,

    handleDragStart,
    handleDrop,
  } = useBoard();

  /*Import easter egg logic*/ 
  const {showTenInterviewPopup,closeTenInterviewPopup,} = useInterviewMilestone(tabs);

  const [
    newTabTitle,
    setNewTabTitle,
  ] = useState("");

  const [
    newColumnTitle,
    setNewColumnTitle,
  ] = useState("");

  const [
    newCardTitles,
    setNewCardTitles,
  ] = useState({});


  /*
    CARD PAGE ROUTING
  */
  const [hash, setHash] =
  useState(
    window.location.hash
  );

  useEffect(() => {
  const handleHashChange = () => {
    setHash(
      window.location.hash
    );
  };

  window.addEventListener(
    "hashchange",
    handleHashChange
  );

  return () => {
    window.removeEventListener(
      "hashchange",
      handleHashChange
    );
  };
}, []);

  if (
    hash.startsWith("#card/")
  ) {
     const cardId =
    hash.replace(
      "#card/",
      ""
    );

  const card =
    tabs
      .flatMap(
        (tab) =>
          tab.columns
      )
      .flatMap(
        (column) =>
          column.cards
      )
      .find(
        (card) =>
          card.id === cardId
      );

  if (!card) {
    return (
      <div className="card-page">
        Card not found.
      </div>
    );
  }

  return (
    <CardPage
      cardId={card.id}
      cardTitle={card.title}
    />
  );
}


  const goToCard = (
  cardId
) => {
  window.location.hash =
    `card/${cardId}`;
};

  /*
    ADD TAB UI HANDLER
  */
  const handleAddTab = () => {
    const title =
      newTabTitle.trim();

    if (!title) return;

    addTab(title);

    setNewTabTitle("");
  };


  /*
    ADD COLUMN UI HANDLER
  */
  const handleAddColumn = () => {
    const title =
      newColumnTitle.trim();

    if (!title) return;

    addColumn(title);

    setNewColumnTitle("");
  };


  /*
    ADD CARD UI HANDLER
  */
  const handleAddCard = (
    columnId
  ) => {
    const title =
      newCardTitles[
        columnId
      ]?.trim();

    if (!title) return;

    addCard(
      columnId,
      title
    );

    setNewCardTitles(
      (prev) => ({
        ...prev,
        [columnId]: "",
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
            value={
              newTabTitle
            }
            onChange={(e) =>
              setNewTabTitle(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (
                e.key ===
                "Enter"
              ) {
                handleAddTab();
              }
            }}
          />

          <button
            onClick={
              handleAddTab
            }
          >
            + Add Tab
          </button>
        </div>
      </header>


      <div className="tabs">
        {tabs.map(
          (tab) => (
            <Tab
              key={tab.id}
              tab={tab}
              isActive={
                tab.id ===
                activeTabId
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
          )
        )}
      </div>


      <main className="board-wrapper">
        <div className="board">
          {activeTab?.columns.map(
            (column) => (
              <Column
                key={
                  column.id
                }

                column={
                  column
                }
                  tabs={tabs}
                  activeTabId={activeTabId}

                onMoveColumn={moveColumnToTab}

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
        
        {showTenInterviewPopup && (
  <div className="milestone-overlay">
    <div className="milestone-popup">
      <button
        className="milestone-close"
        onClick={
          closeTenInterviewPopup
        }
      >
        ×
      </button>

      <h2>
        10 INTERVIEWS 🎉
      </h2>
      <h3> (click full screen, bottom right of vid)</h3>

      <video
        src={
          `/RachelResidencyApp/easter-eggs/10_interviews_easter_egg.mov`
        }
        controls
        autoPlay
      />
    </div>
  </div>
)}
      </main>
    </div>
    
  );
  
}