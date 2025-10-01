

import React, { useEffect, useState } from "react";
import api from "../../api/api";
import "./broker.css";
import { alright } from "../../lib/utils";
import { sendDataToMixpanel } from "../../lib/utils";


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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
    const handleBackClick = () => {
    setShowConfirmModal(true);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  const handleLeaveAnyway = () => {
    
    window.history.back();
  };

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

      sendDataToMixpanel("page_viewed", {
    page: "rekyc_broker_details",
  });
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
          <div className="broker_account_det"> Broker account details</div>
          <button className="a_btn_header_broker" onClick={handleBackClick}>
            <img src="./Icon_apparrow.svg" alt="" />
          </button>
          
         
        </div>
      </header>

      <div className="belowheader">
        <h2>Broker account details</h2>
        <div className="gradient-border-wrapper">
          <div className="broker-box">


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

      {showConfirmModal && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <p>
              Unsaved changes will be lost. Are you sure you want to go back?
            </p>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
              {/* <button className="leave-btn" onClick={handleLeaveAnyway}>
                Leave anyway
              </button> */}
              <button className="leave-btn" onClick={alright}>
  Leave Anyway
</button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BrokerDetails;
