import { useEffect, useState } from "react";
import "../App.css";


export default function CardPage({ cardTitle }) {
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