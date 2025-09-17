// import React, { useEffect, useState } from "react";
// import './broker.css';

// const BrokerDetails = () => {
//   const [brokerData, setBrokerData] = useState({
//     client_code: "",
//     boid: "",
//     dp_id: "",
//     participant: "",
//     depository: "",
//     exchanges: [],
//     kra_status: ""
//   });

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const res = await fetch("http://35.244.37.205:8555/TechBoRest/api/entry/client_list");
//         const data = await res.json();
//         setBrokerData(data);
//       } catch (error) {
//         console.error("API error:", error);
//       }
//     };

//     fetchData();
//   }, []);

//   const infoList = [
//     { label: "Unique client code", key: "client_code" },
//     { label: "Demat acc number (BOID)", key: "boid" },
//     { label: "DP ID", key: "dp_id" },
//     { label: "Depository participant", key: "participant" },
//     { label: "Depository name", key: "depository" },
//     { label: "Exchanges", key: "exchanges" },
//     { label: "KRA status", key: "kra_status" }
//   ];

//   const getValue = (key) => {
//     const value = brokerData[key];
//     if (Array.isArray(value)) return value.join(", ");
//     return value || " ";
//   };

//   return (

//     <div className="broker-details-container">
//       <header>
//         <div className="a_header_main3">
//           <button className="a_btn_header">
//             <img src="./Icon_apparrow.svg" alt="" />
//           </button>
//           Broker account details
//         </div>
//       </header>
//       <div className="belowheader">

//       <h2>Broker account details</h2>
//       <div className="gradient-border-wrapper">
//       <div className="broker-box">
//         {infoList.map((item, index) => (
//           <div key={index} className="info-item">
//             <label>{item.label}</label>
//             <div className="value-row">
//               <strong>{getValue(item.key)}</strong>
//               <button
//                 className="copy-btn"
//                 onClick={() => navigator.clipboard.writeText(getValue(item.key))}
//               >
//                  <img src="./content_copy_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24 1.svg" alt="" />
//               </button>
//             </div>
//           </div>
//         ))}
//       </div>
//       </div>
//       </div>
//     </div>
//   );
// };

// export default BrokerDetails;

import React, { useEffect, useState } from "react";
import api from "../../api/api";
import "./broker.css";

const BrokerDetails = () => {
  const [brokerData, setBrokerData] = useState({
    client_code: "",
    boid: "",
    dp_id: "",
    participant: "Univest Stock Broker Private Limited", // static value
    depository: "",
    exchanges: "",
    kra_status: "",
  });

  const [copiedIndex, setCopiedIndex] = useState(null); // track which item was copied

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("user/get_user_other_data");
        console.log("API Response:", res.data);

        if (res.data?.data) {
          const d = res.data.data;

          setBrokerData({
            client_code: d.clientcode || "",
            boid: d.demat_id || "",
            dp_id: d.dpid || "",
            participant: "Univest Stock Broker Private Limited",
            depository: d.dp_type || "",
            exchanges: d.exchanges || "",
            kra_status: d.kra === "Y" ? "Yes" : "No",
          });
        }
      } catch (error) {
        console.error("API error:", error);
      }
    };

    fetchData();
  }, []);

  const infoList = [
    { label: "Unique client code", key: "client_code" },
    { label: "Demat acc number (BOID)", key: "boid" },
    { label: "DP ID", key: "dp_id" },
    { label: "Depository participant", key: "participant" },
    { label: "Depository name", key: "depository" },
    { label: "Exchanges", key: "exchanges" },
    { label: "KRA status", key: "kra_status" },
  ];

  const getValue = (key) => brokerData[key] || " ";

  const handleCopy = async (value, index) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);

      setTimeout(() => {
        setCopiedIndex(null); // reset after 2s
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="broker-details-container">
      <header>
        <div className="a_header_main3">
          <button className="a_btn_header">
            <img src="./Icon_apparrow.svg" alt="" />
          </button>
          Broker account details
        </div>
      </header>

      <div className="belowheader">
        <h2>Broker account details</h2>
        <div className="gradient-border-wrapper">
          <div className="broker-box">


            {/* {infoList.map((item, index) => (
              <div key={index} className="info-item">
                <label>{item.label}</label>
                <div className="value-row">
                  <strong>{getValue(item.key)}</strong>

                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(getValue(item.key), index)}
                  >
                    <img
                      src="./content_copy_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24 1.svg"
                      alt=""
                    />
                    <span className="tooltip">
                      {copiedIndex === index ? "Copied!" : "Copy"}
                    </span>
                  </button>
                </div>
              </div>
            ))} */}

            {infoList.map((item, index) => (
              <div key={index} className="info-item">
                <label>{item.label}</label>
                <div className="value-row">
                  <strong>
                    {getValue(item.key)}
                    {item.key === "kra_status" && getValue(item.key) === "Yes" && (
                      <img
                        src="./App Icon.svg"   // ✅ replace with your actual icon path
                        alt="Verified"
                        className="verified-icon"
                      />
                    )}
                  </strong>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(getValue(item.key), index)}
                  >
                    <img
                      src="./content_copy_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24 1.svg"
                      alt=""
                    />
                    <span className="tooltip">
                      {copiedIndex === index ? "Copied!" : "Copy"}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrokerDetails;
