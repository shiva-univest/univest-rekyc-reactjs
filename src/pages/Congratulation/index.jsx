// import React from "react";
// import { useLocation } from "react-router-dom"; // ✅ import useLocation
// import "./styles.css";
// import { alright } from "../../lib/utils";
// import { triggerWebhook } from "../../helper/usewebhook";
// import { decryptData } from "../../decode";
// import api from "../../api/api";
// import Cookies from "js-cookie";

// triggerWebhook({
//       step: "bank",
//       eSignCompleted: "yes",
//       finalUpdateExecuted: "no",
//       userId: clientcode,
//     });

// const Congratulation = () => {
//   const location = useLocation();
//   const fromPersonalInfo = location.state?.from === "personalInfo"; // check state

//   return (
//     <div>
//       <div className="upper_main">
//         <img src="./91001-success 1.svg" alt="success" />
//         <p className="c_congratulations">Congratulations!</p>
//         <p className="c_request">
//           {fromPersonalInfo
//             ? "Details updated successfully"
//             : "Request submitted successfully"}
//         </p>
//       </div>
//       <footer className="conFooter">

//         <button className="univest-actions-btn c_alright" onClick={alright} >Alright</button>
//       </footer>
//     </div>
//   );
// };

// export default Congratulation;

import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./styles.css";
import { alright } from "../../lib/utils";
import { triggerWebhook } from "../../helper/usewebhook";
import { decryptData } from "../../decode";
import api from "../../api/api";
import { ServerCog } from "lucide-react";
import Cookies from "js-cookie";

const Congratulation = () => {
  const location = useLocation();
  const fromPersonalInfo = location.state?.from === "personalInfo";

  useEffect(() => {
    console.log("fetchData called in Congratulation");
    async function fetchData() {
      try {
        const modulmap = await api.post("/user/page_module_mapping", {
          page_id: 6,
        });
        let pageModuleMapping = null;
        let sharedData = null;
        console.log(modulmap);
        if (modulmap?.data) {
          const decrypted = decryptData(modulmap?.data?.data);
          pageModuleMapping =
            typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;
          console.log("✅ Decrypted data:", pageModuleMapping);
        } else {
          console.warn("⚠️ No `data` in API response.");
        }

        const res6 = await api.post("/user/get_module_data", { page_id: 6 });
        console.log(res6);
        const decrypted_moduledata = decryptData(res6?.data?.data);
        sharedData =
          typeof decrypted_moduledata === "string"
            ? JSON.parse(decrypted_moduledata)
            : decrypted_moduledata;
        console.log(sharedData);
        var clientcode = sharedData?.shared_data?.clientcode;

        if (!clientcode) {
          console.warn(" clientcode missing in sharedData:", sharedData);
          return;
        }

        if (
          pageModuleMapping?.data?.workflow_info?.workflow_name ===
          "modification"
        ) {
          const res1 = await api.post("/user/get_module_data", { page_id: 1 });
          const decrypted = JSON.parse(decryptData(res1.data));
          decrypted["1"]?.contact_detail_data
            ?.filter((contact) => contact.is_new === true)
            .forEach(() =>
              triggerWebhook({
                step: "mobile",
                eSignCompleted: "no",
                finalUpdateExecuted: "no",
                userId: clientcode,
              })
            );

          decrypted["3"]?.contact_detail_data
            ?.filter((contact) => contact.is_new === true)
            .forEach(() =>
              triggerWebhook({
                step: "email",
                eSignCompleted: "no",
                finalUpdateExecuted: "no",
                userId: clientcode,
              })
            );

          console.log(" Module data (page 1):", res1.data);
        } else {
          var workflowName =
            pageModuleMapping?.data?.workflow_info?.workflow_name;
          var stepName =
            workflowName === "bank_modification"
              ? "bank"
              : workflowName == "segments_modification"
              ? "trading segment"
              : workflowName == "nominee_modification"
              ? "nominee"
              : workflowName == "ddpi_modification"
              ? "ddpi"
              : "";
          triggerWebhook({
            step: stepName,
            eSignCompleted: "yes",
            finalUpdateExecuted: "no",
            userId: clientcode,
          });
        }
      } catch (err) {
        console.error(" Error in Congratulation API chain:", err);
      }
    }

    fetchData();
  }, [Cookies.get("access_token")]);

  return (
    <div>
      <div className="upper_main">
        <img src="./91001-success 1.svg" alt="success" />
        <p className="c_congratulations">Congratulations!</p>
        <p className="c_request">
          {fromPersonalInfo
            ? "Details updated successfully"
            : "Request submitted successfully"}
        </p>
      </div>
      <footer className="conFooter">
        <button className="univest-actions-btn c_alright" onClick={alright}>
          Alright
        </button>
      </footer>
    </div>
  );
};

export default Congratulation;
