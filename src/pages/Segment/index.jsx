import React, { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import withAuthCheck from "../../hoc/withAuthCheck";
import { decryptData } from "../../decode";
import { useNavigate } from "react-router-dom";
import { alright } from "../../lib/utils";
import axios from "axios";
import Cookies from "js-cookie";
import "./style2.css";
import { SegmentContext } from "../../context/SegmentContext";
import api from "../../api/api";
import VerificationLoader from "../../Components/VerificationLoader/VerificationLoader";
import { triggerWebhook } from "../../helper/usewebhook";
import { sendDataToMixpanel } from "../../lib/utils";

const Segment = ({ encryptedData }) => {
  const { segmentData, setSegmentData } = useContext(SegmentContext);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get("token");
  const navigate = useNavigate();
  const [esignDataStatus, setEsignDataStatus] = useState("");
  const [isEsigned, setIsEsigned] = useState(null);
  const [loading, setLoading] = useState(false);
  const [moduleSharedData, setModuleSharedData] = useState(null);

  
  console.log("Token from query param:", token);

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
    const parsed = JSON.parse(decryptData(encryptedData))[13][
      "segment_details"
    ];
    console.log("setSegmentData", parsed);
    setSegmentData(parsed);
  }, []);

  const segmentsData = encryptedData
    ? JSON.parse(decryptData(encryptedData))[13]["segment_details"]
    : [];

  const getInitialChecked = (exchange, segment) =>
    segmentsData?.find(
      (seg) => seg.exchange === exchange && seg.segment === segment
    )?.ticked || false;

  console.log(segmentsData);

  const [checkedStates, setCheckedStates] = useState({
    NSE_CASH: getInitialChecked("NSE", "CASH"),
    BSE_CASH: getInitialChecked("BSE", "CASH"),
    NSE_FNO: getInitialChecked("NSE", "FNO"),
    BSE_FNO: getInitialChecked("BSE", "FNO"),
  });
  console.log("in the first segment");

  const hasFNOSegment = segmentsData?.some((seg) => seg.segment === "FNO");
  const hasFNOSegmentisNull = segmentsData?.some(
    (seg) => seg.segment === "FNO" && seg.is_new === null
  );
  console.log("hasFNOSegmentisNull", hasFNOSegmentisNull);

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) throw new Error("No refresh token available");

      const res = await axios.post(
        "https://rekyc.meon.co.in/v1/user/token/refresh_token",
        { refresh: refreshToken },
        { headers: { "Content-Type": "application/json" } }
      );

      const newAccessToken = res.data.access;
      const newRefreshToken = res.data.refresh;

      localStorage.setItem("token", newAccessToken);
      localStorage.setItem("refresh_token", newRefreshToken);

      return newAccessToken;
    } catch (err) {
      console.error("Failed to refresh token:", err);
      throw err;
    }
  };

  const handleCheckboxChange = async (key) => {
    const [exchange, segment] = key.split("_");
    const newState = !checkedStates[key];

    const otherExchange = exchange === "NSE" ? "BSE" : "NSE";
    const otherKey = `${otherExchange}_${segment}`;

    const isOtherDisabled = segmentsData?.some(
      (seg) =>
        seg.exchange === otherExchange &&
        seg.segment === segment &&
        seg.ticked === true &&
        seg.is_new === false
    );

    const updatedStates = {
      ...checkedStates,
      [key]: newState,
      ...(isOtherDisabled ? {} : { [otherKey]: newState }),
    };

    setCheckedStates(updatedStates);

    const segment_data = Object.entries(updatedStates)
      .filter(([_, value]) => value === true)
      .map(([key]) => {
        const [exchange, segment] = key.split("_");
        return { exchange, segment };
      });

    setSegmentData(segment_data);

    try {
      setLoading(true);
      // const token = localStorage.getItem("token");
      const token = Cookies.get("access_token");

      await axios.post(
        "https://rekyc.meon.co.in/v1/user/update_user_segments",
        { segment_data },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Updated segments to API:", segment_data);
    } catch (err) {
      if (err.response?.status === 401) {
        console.log("Access token expired → refreshing…");
        try {
          const newToken = await refreshAccessToken();

          // retry request with new token
          await axios.post(
            "https://rekyc.meon.co.in/v1/user/update_user_segments",
            { segment_data },
            { headers: { Authorization: `Bearer ${newToken}` } }
          );

          console.log("Updated segments after refresh:", segment_data);
        } catch (refreshErr) {
          console.error("Refresh flow failed:", refreshErr);
        }
      } else {
        console.error("API update error:", err);
      }
    }
  };

  // const hasBothFNO =
  //   segmentData?.some(
  //     (seg) => seg.exchange === "NSE" && seg.segment === "FNO"
  //   ) &&
  //   segmentData?.some((seg) => seg.exchange === "BSE" && seg.segment === "FNO");

  const handleActivateFNO = async () => {
    console.log("getCheckedSegments", [
      ...(getCheckedSegments()?.segment_data || []),
      {
        exchange: "NSE",
        segment: "FNO",
      },
      {
        exchange: "BSE",
        segment: "FNO",
      },
    ]);
    const makeApiCall = async (accessToken) => {
      return axios.post(
        "https://rekyc.meon.co.in/v1/user/update_user_segments",
        {
          segment_data: [
            ...(getCheckedSegments()?.segment_data || []),
            {
              exchange: "NSE",
              segment: "FNO",
            },
            {
              exchange: "BSE",
              segment: "FNO",
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    };

    try {
      const accessToken = Cookies.get("access_token");
      await makeApiCall(accessToken);
      triggerWebhook({
        step: "trading segment",
        eSignCompleted: "no",
        finalUpdateExecuted: "no",
        userId: moduleSharedData?.clientcode || "<user-id>",
      });
      setSegmentData((prev) => [
        ...(prev || []),
        { exchange: "NSE", segment: "FNO", ticked: true, is_new: true },
      ]);
      navigate("/", { state: { segmentData: segmentData } });
    } catch (error) {
      if (error.response?.status === 401) {
        console.warn("Access token expired. Attempting to refresh...");

        const refreshToken = Cookies.get("refresh_token");
        if (!refreshToken) {
          console.error("No refresh token found.");
          return;
        }

        try {
          const res = await axios.post(
            "https://rekyc.meon.co.in/v1/user/token/refresh_token",
            {
              refresh: refreshToken,
            }
          );

          const newAccessToken = res.data.access;
          const newRefreshToken = res.data.refresh;

          Cookies.set("access_token", newAccessToken, {
            secure: true,
            sameSite: "Strict",
          });
          Cookies.set("refresh_token", newRefreshToken, {
            secure: true,
            sameSite: "Strict",
          });
          localStorage.setItem("token", newAccessToken);

          await makeApiCall(newAccessToken);

          setSegmentData((prev) => [
            ...(prev || []),
            { ...payload[0], ticked: true, is_new: true },
          ]);
          navigate("/");
        } catch (refreshErr) {
          console.error("Failed to refresh token:", refreshErr);
        }
      } else {
        console.error(
          "Error activating F&O segment:",
          error.response?.data || error.message
        );
      }
    }
  };

  useEffect(() => {
    getCheckedSegments();
    fetchEsignStatus();
  }, []);

  useEffect(() => {
    if (esignDataStatus.length > 0) {
      let links = esignDataStatus.filter((link) => !link.is_esigned);
      console.log("links", links);
      if (!links || links.length === 0) {
        setIsEsigned(true);
      } else {
        setIsEsigned(false);
      }
    }
  }, [esignDataStatus]);

  const fetchEsignStatus = async () => {
    try {
      const moduleRes = await api.post("/user/get_module_data", {
        page_id: "6",
      });

      let parsed;
      try {
        parsed = JSON.parse(decryptData(moduleRes.data.data));

        console.log("get_module_data (parsed) ->", parsed);
        let links = parsed?.["12"]?.links || [];
        console.log("links", links);
        setEsignDataStatus(links);
      } catch (err) {
        console.error("Failed to parse decrypted data:", err);
        parsed = {};
      }
    } catch (err) {
      console.error("Error fetching eSign data:", err);
    } finally {
    }
  };

  const getCheckedSegments = () => {
    const checked = [];

    for (const key in checkedStates) {
      if (checkedStates[key]) {
        const [exchange, segment] = key.split("_");
        checked.push({ exchange, segment });
      }
    }

    const formatted = { segment_data: checked };

    // Check if FNO exists for NSE and BSE
    const hasNSE_FNO = checked.some(
      (seg) => seg.exchange === "NSE" && seg.segment === "FNO"
    );
    const hasBSE_FNO = checked.some(
      (seg) => seg.exchange === "BSE" && seg.segment === "FNO"
    );

    let hasBothFNO = false;

    // Extract parsed data for is_new check
    const parsed = JSON.parse(decryptData(encryptedData))[13][
      "segment_details"
    ];

    // Check if any FNO segment exists in data
    const fnoSegment = parsed?.find((seg) => seg.segment === "FNO");

    if (fnoSegment) {
      if (fnoSegment.is_new === true || fnoSegment.is_new === null) {
        // Case 1: is_new true -> check esignDataStatus
        console.log("esignDataStatus", esignDataStatus);
        if (esignDataStatus.length > 0) {
          const pending = esignDataStatus.filter((link) => !link.is_esigned);
          console.log("pending", pending);
          hasBothFNO = pending.length === 0; // true only if all eSigns done
        } else {
          hasBothFNO = false; // no esign data means not yet complete
        }
      } else {
        // Case 2: is_new false -> always true
        hasBothFNO = true;
      }
    }

    return { ...formatted, hasBothFNO };
  };

  console.log("getCheckedSegments", getCheckedSegments());
  var { hasBothFNO } = getCheckedSegments();
  console.log("hasBothFNO, hasBothFNO", hasBothFNO, hasBothFNO, isEsigned);

  const getActiveSegments = (segmentsData) => {
    if (!segmentsData || segmentsData.length === 0) return "none";
    const hasEquity = segmentsData.some(
      (seg) => seg.segment === "CASH" && seg.ticked === true
    );
    const hasFNO = segmentsData.some(
      (seg) => seg.segment === "FNO" && seg.ticked === true
    );
    if (hasEquity && hasFNO) return "equity+f&o";
    if (hasEquity) return "equity";
    if (hasFNO) return "f&o";
    return "none";
  };

  useEffect(() => {
    if (!encryptedData) return;
    const parsed = JSON.parse(decryptData(encryptedData))[13][
      "segment_details"
    ];
    console.log("setSegmentData", parsed);
    setSegmentData(parsed);

    const isSegmentActive = getActiveSegments(parsed);

    sendDataToMixpanel("page_viewed", {
      page: "rekyc_segment_activation",
      is_segment_active: isSegmentActive,
    });
  }, [encryptedData]);

  return (
    <div>
      {loading && <VerificationLoader isVisible={loading} />}
      <header>
        <div className="header_div">
          <p className="trading_pre">Trading preference</p>
          <button className="back_btn_head" onClick={alright}>
            <img className="back_btn1" src="./Icon_apparrow.svg" alt="" />
          </button>
        </div>
      </header>

      <div className="mainnnn">
        <div className="segment_act">
          <p className="seg_act">Segment activation</p>
          <p className="here_your">
            Here is your segment information, showing whether each one is active
            or not
          </p>
        </div>
        <div className="card_1">
          <div className="card-title">
            <i className="same_design_seg">
              <img
                src="./currency_rupee_circle_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
              />
            </i>{" "}
            Equity <span className="badge">Active</span>
          </div>

          <div className="main_check">
            <label className="custom-checkbox">
              <input
                type="checkbox"
                name="nse"
                exchange="NSE"
                segment="CASH"
                checked={checkedStates.NSE_CASH}
                onChange={() => handleCheckboxChange("NSE_CASH")}
                disabled={segmentsData?.find(
                  (seg) =>
                    seg.exchange === "NSE" &&
                    seg.segment === "CASH" &&
                    seg.ticked === true &&
                    seg.is_new === false
                )}
              />
              <span className="checkmark"></span> NSE
            </label>

            <label className="custom-checkbox">
              <input
                type="checkbox"
                name="bse"
                exchange="BSE"
                segment="CASH"
                checked={checkedStates.BSE_CASH}
                onChange={() => handleCheckboxChange("BSE_CASH")}
                disabled={segmentsData?.find(
                  (seg) =>
                    seg.exchange === "BSE" &&
                    seg.segment === "CASH" &&
                    seg.ticked === true &&
                    seg.is_new === false
                )}
              />
              <span className="checkmark"></span> BSE
            </label>
          </div>
        </div>

        {/* Show Activate Banner if NOT both FNO present */}
        {(!hasBothFNO || (isEsigned == false && isEsigned != null)) && (
          <div className="card_1 card_2">
            <div className="card-title">
              <i className="same_design_seg">
                <img
                  src="./candlestick_chart_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                />
              </i>{" "}
              Futures & Options
            </div>
            <div className="banner">
              <button
                className="banner_img_btn"
                onClick={() => {
                  console.log("Banner image clicked");

                  sendDataToMixpanel("cta_clicked", {
                    page: "rekyc_segment_activation",
                    cta_clicked: "activate_fno",
                  });

                  handleActivateFNO();
                }}
              >
                <img
                  className="banner-image"
                  src="https://storage.googleapis.com/app-assets-univest/kyc_meon/futures_and_options.png"
                  alt="Chart Icon"
                />
              </button>
            </div>
          </div>
        )}
        {/* Show Active F&O if both NSE + BSE FNO present */}

        {hasBothFNO && (isEsigned === null || isEsigned === true) && (
          <div>
            <div className="card_1 card_3">
              <div className="card-title">
                <i className="same_design_seg">
                  <img
                    src="./candlestick_chart_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg"
                    alt="Candlestick Chart"
                  />
                </i>{" "}
                Futures & Options <span className="badge">Active</span>
              </div>
              {isEsigned === true ? (
                <div className="it_will">
                  <span className="it_will_span">
                    <img src="./timer_icon.svg" alt="Timer Icon" />
                  </span>
                  It will take up to 48 hours to update your request.
                </div>
              ) : (
                <div className="main_check">
                  {/* NSE */}
                  <label className="custom-checkbox">
                    <input
                      type="checkbox"
                      name="nse"
                      exchange="NSE"
                      segment="FNO"
                      checked={checkedStates.NSE_FNO}
                      onChange={() => {
                        handleActivateFNO();
                      }}
                      disabled={segmentsData?.some(
                        (seg) =>
                          seg.exchange === "NSE" &&
                          seg.segment === "FNO" &&
                          seg.ticked === true &&
                          seg.is_new === false
                      )}
                    />
                    <span className="checkmark"></span> NSE
                  </label>

                  {/* BSE */}
                  <label className="custom-checkbox">
                    <input
                      type="checkbox"
                      name="bse"
                      exchange="BSE"
                      segment="FNO"
                      checked={checkedStates.BSE_FNO}
                      onChange={() => {
                        handleActivateFNO();
                      }}
                      disabled={segmentsData?.some(
                        (seg) =>
                          seg.exchange === "BSE" &&
                          seg.segment === "FNO" &&
                          seg.ticked === true &&
                          seg.is_new === false
                      )}
                    />
                    <span className="checkmark"></span> BSE
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="s_footer">
        <p className="Note_modify">
          Note: To modify or delete any details, please write to us at
          support@unibrokers.in and our support team will help you out.
        </p>
      </footer>
    </div>
  );
};

export default withAuthCheck(Segment);
