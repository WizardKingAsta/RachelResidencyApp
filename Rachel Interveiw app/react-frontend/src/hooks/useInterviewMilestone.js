import {
  useEffect,
  useState,
} from "react";

import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import {
  rachel_db,
} from "../firebase.js";


function countInterviewCards(tabs) {
  return tabs.reduce(
    (total, tab) =>
      total +
      tab.columns.reduce(
        (tabTotal, column) => {
          const isInterviewColumn =
            column.title
              ?.trim()
              .startsWith(
                "Interview"
              );

          if (!isInterviewColumn) {
            return tabTotal;
          }

          return (
            tabTotal +
            column.cards.length
          );
        },
        0
      ),
    0
  );
}


export default function useInterviewMilestone(
  tabs
) {
  const [
    showTenInterviewPopup,
    setShowTenInterviewPopup,
  ] = useState(false);


  useEffect(() => {
    if (!tabs?.length) {
      return;
    }

    const interviewCount =
      countInterviewCards(tabs);
    console.log(interviewCount)

    if (interviewCount < 10) {
      return;
    }


    const claimMilestone =
      async () => {
        try {
          const milestoneRef =
            doc(
              rachel_db,
              "appMeta",
              "easterEggs"
            );


          const shouldShow =
            await runTransaction(
              rachel_db,
              async (
                transaction
              ) => {
                const snapshot =
                  await transaction.get(
                    milestoneRef
                  );


                const data =
                  snapshot.exists()
                    ? snapshot.data()
                    : {};


                if (
                  data.tenInterviewsShown
                ) {
                  return false;
                }


                transaction.set(
                  milestoneRef,
                  {
                    tenInterviewsShown:
                      true,

                    tenInterviewsShownAt:
                      serverTimestamp(),
                  },
                  {
                    merge: true,
                  }
                );


                return true;
              }
            );


          if (shouldShow) {
            setShowTenInterviewPopup(
              true
            );
          }

        } catch (error) {
          console.error(
            "Could not claim 10 interview milestone:",
            error
          );
        }
      };


    claimMilestone();

  }, [tabs]);


  return {
    showTenInterviewPopup,

    closeTenInterviewPopup: () =>
      setShowTenInterviewPopup(
        false
      ),
  };
}