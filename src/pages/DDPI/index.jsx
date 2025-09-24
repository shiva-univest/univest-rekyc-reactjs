import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { decryptData } from "../../decode";
import api from "../../api/api";
import "./style.css";
import Cookies from "js-cookie";
import { triggerWebhook } from "../../helper/usewebhook";

const ActivateDDPI = () => {
  const [expanded, setExpanded] = useState(false);
  const [moduleData, setModuleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ddpiActive, setDdpiActive] = useState(false);
  const [esignDataStatus, setEsignDataStatus] = useState("");
  const [isEsigned, setIsEsigned] = useState(false);  
  const [moduleSharedData, setModuleSharedData] = useState(null);
  const navigate = useNavigate();

  const [checkboxes, setCheckboxes] = useState({
    main: true,
    transfer: true,
    pledging: true,
    mutualFund: true,
    tendering: true,
  });

  useEffect(() => {
    fetchEsignStatus();
  }, []);

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        const moduleDataResponse = await fetch(
          "https://rekyc.meon.co.in/v1/user/get_module_data",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Cookies.get("access_token")}`,
            },
            body: JSON.stringify({ page_id: "6" }),
          }
        );

        if (!moduleDataResponse.ok) {
          throw new Error("Failed to fetch module data");
        }

        const moduleData = await moduleDataResponse.json();
        console.log("Module Data Response:", moduleData);

        if (!moduleData?.data) {
          return { success: false, error: "No module data received" };
        }

        const { decryptData } = await import("../../decode");
        const decryptedData = JSON.parse(decryptData(moduleData.data));
        setModuleSharedData(decryptedData?.shared_data || null);
      } catch (moduleErr) {
        console.error("Failed to fetch or process module data:", moduleErr);
        return {
          success: false,
          error: "Failed to verify mobile number details",
        };
      }
    };

    fetchModuleData();
  }, [Cookies.get("access_token")]);

  useEffect(() => {
    if(esignDataStatus.length > 0)
    {
      let links = esignDataStatus.filter((link) => !link.is_esigned);
      if (!links || links.length === 0) {
        setIsEsigned(false)
      }
      else{
        setIsEsigned(true)
      }
    }
  }, [esignDataStatus]);
  
  const fetchEsignStatus = async () => {
    try {
      const moduleRes = await api.post("/user/get_module_data", {
        page_id: "6",
      });
      console.log("get_module_data (raw) ->", moduleRes.data);

      let parsed;
      try {
        parsed = JSON.parse(decryptData(moduleRes.data.data));
      } catch (err) {
        console.error("Failed to parse decrypted data:", err);
        parsed = {};
      }
      let links = parsed?.["12"]?.links || [];
      console.log("links", links)
      setEsignDataStatus(links);

    } catch (err) {
      console.error("Error fetching eSign data:", err);
    } finally {
    }
  };


  useEffect(() => {
    const fetchData = async () => {
      try {
        const payload = { page_id: "9" };

        if (moduleData?.["21"]?.ddpi === false) {
          payload.ddpi = "yes";
        }

        console.log("Payload being sent:", payload);

        const res = await api.post("user/get_module_data", payload);
        console.log("res.data", res, decryptData(res.data.data));

        if (res.data?.success && res.data?.data) {
          try {
            const decrypted = decryptData(res.data.data);
            console.log("Decrypted data of DDPI:", decrypted);

            try {
              const parsed = JSON.parse(decrypted);
              console.log("Parsed decrypted data:", parsed);
              setModuleData(parsed);


              if (parsed?.["21"]?.ddpi === true || parsed?.["21"]?.bo_poa === true) {
                if((esignDataStatus.length > 0 && isEsigned) || esignDataStatus.length == 0)
                {
                  setDdpiActive(true);
                }
                if(esignDataStatus.length > 0 && !isEsigned){
                  setDdpiActive(false);
                }
              } else {
                setDdpiActive(false);
              }

            } catch {
              setModuleData(decrypted);
            }
          } catch (decryptErr) {
            console.error("Decryption failed:", decryptErr);
          }
        } else {
          console.warn("API returned no record:", res.data.msg);
          setModuleData(null); // or {} depending on your UI
        }
      } catch (err) {
        console.error("Error fetching module data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [moduleData?.["21"]?.ddpi, esignDataStatus, isEsigned]);

  const proceedToEsign = async () => {
    try {
      const accessToken = Cookies.get("access_token");

      // Send your checkboxes state to API
      const payload = {
        ddpi: checkboxes.main,       // true/false
        ddpi_for_security: checkboxes.transfer,
        ddpi_for_pledge: checkboxes.pledging,
        ddpi_for_mtf: checkboxes.mutualFund,
        ddpi_for_offers: checkboxes.tendering,
      };

      console.log("DDPI Payload being sent:", payload);

      const response = await fetch(
        `https://rekyc.meon.co.in/v1/user/other_details`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save ddpi data");
      }

      const result = await response.json();
      console.log("DDPI save response:", result);
      if(result?.status)
      {
         triggerWebhook({
          step: "ddpi",
          eSignCompleted: "no",
          finalUpdateExecuted: "no",
         userId: moduleSharedData?.clientcode || "<user-id>",
        });
        callUserFormGeneration(accessToken)
      }

    } catch (error) {
      console.error("Save error:", error);
      setError(error.message);
    }
  };


  const callUserFormGeneration = async (accessToken) => {
    try {

      if (!accessToken) {
        alert("Authorization failed.");
        return;
      }

      const response = await fetch(
        "https://rekyc.meon.co.in/v1/user/user_form_generation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ re_esign: false }),
        }
      );

      const formData = await response.json();
      console.log("User form generation response:", formData);
      if (formData?.status === true) {
        
        console.log("Form generation successful, navigating to esign");
        fetchAndRedirectToEsignLink(accessToken)
      } else {
        alert(
          formData?.message || "Failed to generate user form. Please try again."
        );
      }
    } catch (error) {
      console.error("User form generation error:", error);
      alert("Failed to generate user form. Please try again.");
    }
  };

   const fetchAndRedirectToEsignLink = async (accessToken) => {
    try {
      const moduleRes = await fetch(
        "https://rekyc.meon.co.in/v1/user/get_module_data",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ page_id: "6" }),
        }
      );

      const moduleData = await moduleRes.json();
      console.log("get_module_data (raw) ->", moduleData);

      let parsed;
      try {
        parsed = JSON.parse(decryptData(moduleData.data));
      } catch (err) {
        console.error("Failed to parse decrypted data:", err);
        parsed = {};
      }

      let links = parsed?.["12"]?.links || [];

      links = links.filter((link) => !link.is_esigned);

      console.log("Filtered Links ->", links);

      if (!links || links.length === 0) {
        navigate("/congratulations");
      } else {
        const firstLink = links[0];
        window.open(`https://rekyc.meon.co.in${firstLink.url}`);
      }
    } catch (err) {
      console.error("Error fetching eSign data:", err);
      alert("Failed to get eSign link. Please try again.");
    }
  };


  if (loading) return <div>Loading...</div>;

  const allChecked = Object.values(checkboxes).every((val) => val);

  const handleMainChange = (e) => {
    const checked = e.target.checked;
    setCheckboxes({
      main: checked,
      transfer: checked,
      pledging: checked,
      mutualFund: checked,
      tendering: checked,
    });
  };

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setCheckboxes((prev) => {
      const updated = { ...prev, [name]: checked };

      const othersChecked = Object.entries(updated)
        .filter(([key]) => key !== "main")
        .every(([_, v]) => v);

      updated.main = othersChecked;
      return updated;
    });
  };

  return (
    <div>
      <header>
        <div className="a_header_main">
          <button className="a_btn_header">
            <img src="./Icon_app.svg" alt="app icon" />
          </button>
          <button className="a_btn_header">
            <img src="./Frame 1171276551.svg" alt="menu icon" />
          </button>
        </div>
      </header>

      {ddpiActive ? (
        <div className="ddpi-activated">
          <div className="check-icon">
            <img className="check_icon_img_ddpi" src="./91001-success 1.svg" />
          </div>
          <h2>DDPI Activated</h2>
          <p>
            Demat Debit and Pledge Instruction is active for your account.{" "}
            <br />
            For any queries, write to us at <br />
            <a href="mailto:support@unibrokers.in">support@unibrokers.in</a>
          </p>

          <div className="note-box">
            <strong>Note:</strong> DDPI is provided to our users as a
            complimentary benefit, completely free of charge!
          </div>

          <button
            className="alright-btn_ddpi"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            Alright!
          </button>
        </div>
      ) : (

        <div className="ddpi-container_ddpi">
          <h2 className="title">Activate DDPI</h2>
          <p className="subtitle">
            Break the hassle to enter TPIN everyday one time
          </p>

          <label className="checkbox_ddpi">
            <input
              type="checkbox"
              name="main"
              checked={checkboxes.main}
              onChange={handleMainChange}
            />
            <span className="checkmark_ddpi"></span>
            <span className="ddpi_span">
              I hereby provide my consent to opt for DDPI (Demat Debit and
              Pledge Instruction) in favour of Univest Broker Pvt. Ltd. to
              execute transactions as defined in SEBI regulation vide
              SEBI/HO/MIRSDOP/P/ CIR/2022/567 dated July 24, 2024.
            </span>
          </label>

          {!expanded ? (
            <p className="read-more" onClick={() => setExpanded(true)}>
              <img src="./Read more.svg" alt="Read more" />
            </p>
          ) : (
            <div className="more-section">
              <label className="checkbox_ddpi">
                <input
                  type="checkbox"
                  name="transfer"
                  checked={checkboxes.transfer}
                  onChange={handleChange}
                />
                <span className="checkmark_ddpi"></span>
                <span className="ddpi_span">
                  Transfer of securities held in the beneficial owner accounts
                  of the client towards Stock Exchange–related
                  deliveries/settlement obligations arising out of trades
                  executed by clients on the Stock Exchange.
                </span>
              </label>

              <label className="checkbox_ddpi">
                <input
                  type="checkbox"
                  name="pledging"
                  checked={checkboxes.pledging}
                  onChange={handleChange}
                />
                <span className="checkmark_ddpi"></span>
                <span className="ddpi_span">
                  Pledging / re-pledging of securities in favor of trading
                  member (TM) / clearing member (CM) for meeting margin
                  requirements of the clients in connection with trades executed
                  on the Stock Exchange.
                </span>
              </label>

              <label className="checkbox_ddpi">
                <input
                  type="checkbox"
                  name="mutualFund"
                  checked={checkboxes.mutualFund}
                  onChange={handleChange}
                />
                <span className="checkmark_ddpi"></span>
                <span className="ddpi_span">
                  Mutual Fund transactions being executed on Stock Exchange
                  order entry platforms.
                </span>
              </label>

              <label className="checkbox_ddpi">
                <input
                  type="checkbox"
                  name="tendering"
                  checked={checkboxes.tendering}
                  onChange={handleChange}
                />
                <span className="checkmark_ddpi"></span>
                <span className="ddpi_span">
                  Tendering shares in open offers through Stock Exchange
                  platforms.
                </span>
              </label>
            </div>
          )}

          <div className="ddpi_bottom_button">
            <p className="disclaimer">
              <strong className="disclai">Disclaimer: </strong> This is for
              general information and educational purposes only. The securities
              quoted are for illustration only and are not recommendatory. It
              cannot be construed as investment advice or PMS/basket
              recommendation. Investments in the securities market are subject
              to market risks. Read all related documents carefully before
              investing. For further disclosures, visit https://univest.in or
              Univest.
            </p>

            <button
              className={`univest-actions-btn ${allChecked ? "" : "disabled"}`}
              disabled={!allChecked}
              onClick={() => proceedToEsign()}
            >
              Proceed to E-Sign
            </button>

            <p className="trusted">Trusted by 1.5M+ users</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivateDDPI;