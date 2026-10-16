import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { rachel_db } from "../firebase";


let firstInterviewClaimPromise = null;


export default function useFirstInterviewMilestone() {
  const [
    showFirstInterviewPopup,
    setShowFirstInterviewPopup,
  ] = useState(false);


  useEffect(() => {
    let cancelled = false;


    const checkMilestone =
      async () => {
        const interviewTime =
          new Date(
            "2026-10-20T18:00:00-05:00"
          );
          console.log("FIRST INTERVIEW PROD DEBUG", {
  href: window.location.href,
  now: new Date().toString(),
  nowMs: Date.now(),
  interviewTime: interviewTime.toString(),
  interviewMs: interviewTime.getTime(),
  tooEarly: new Date() < interviewTime,
});

        if (
          new Date() <
          interviewTime
        ) {
          return;
        }


        const metaRef =
          doc(
            rachel_db,
            "appMeta",
            "easterEggs"
          );


        try {
          /*
            Important:
            both Strict Mode mounts share
            the SAME transaction promise.
          */
          if (
            !firstInterviewClaimPromise
          ) {
            firstInterviewClaimPromise =
              runTransaction(
                rachel_db,
                async (
                  transaction
                ) => {
                  const snapshot =
                    await transaction.get(
                      metaRef
                    );


                  const data =
                    snapshot.exists()
                      ? snapshot.data()
                      : {};


                  if (
                    data.shown === true
                  ) {
                    return false;
                  }


                  transaction.set(
                    metaRef,
                    {
                      shown: true,

                      shownAt:
                        serverTimestamp(),
                    },
                    {
                      merge: true,
                    }
                  );


                  return true;
                }
              );
          }


          const shouldShow =
            await firstInterviewClaimPromise;


          if (
            shouldShow &&
            !cancelled
          ) {
            setShowFirstInterviewPopup(
              true
            );
          }

        } catch (error) {
          console.error(
            "Failed checking first interview milestone:",
            error
          );

          /*
            Allow another attempt after
            an actual transaction failure.
          */
          firstInterviewClaimPromise =
            null;
        }
      };


    checkMilestone();


    return () => {
      cancelled = true;
    };
  }, []);


  return {
    showFirstInterviewPopup,

    closeFirstInterviewPopup: () =>
      setShowFirstInterviewPopup(
        false
      ),
  };
}